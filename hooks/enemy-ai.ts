import {
  Enemy,
  EnemyAbilityId,
  EnemyAction,
  Player,
  Position,
  Direction,
  OnDeathEffectId,
} from "@/types/game";
import {
  ENEMY_TEMPLATES,
  GRID_HALF,
  inBounds,
  isOuterRing,
  posKey,
  cardinalNeighbors,
  getTemplateTier,
  TENTACLE_CYCLE,
  spawnPoolForTurn,
  REGROW_AMOUNT,
} from "@/data/game-data";

export function generateId() {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createEnemy(position: Position, templateId: string): Enemy {
  const t = ENEMY_TEMPLATES[templateId];
  if (!t) throw new Error(`Unknown enemy template: ${templateId}`);
  const abilities: EnemyAbilityId[] = t.ability ? [t.ability] : [];
  const onDeathEffects: OnDeathEffectId[] = t.onDeathEffect ? [t.onDeathEffect] : [];
  const enemy: Enemy = {
    id: generateId(),
    type: "enemy",
    position,
    stackCount: 1,
    health: t.health,
    maxHealth: t.health,
    word: t.word,
    emoji: t.emoji,
    range: t.range,
    damage: t.damage,
    speed: t.speed,
    points: t.points,
    templateId: t.id,
    abilities,
    onDeathEffects,
    behavior: t.behavior.map((a) => ({ ...a })),
    behaviorIndex: 0,
  };
  if (t.id === "octopus") {
    enemy.spawnCycleIndex = 0;
    enemy.bonusSpawns = 0;
  }
  return enemy;
}

/** Deep-copy an enemy so callers can mutate freely without touching state. */
export function cloneEnemy(e: Enemy): Enemy {
  return {
    ...e,
    position: { ...e.position },
    abilities: [...e.abilities],
    onDeathEffects: [...e.onDeathEffects],
    behavior: e.behavior.map((a) => ({ ...a })),
  };
}

// ---------------------------------------------------------------------------
// Merge helper
// ---------------------------------------------------------------------------

/**
 * Merge `source` into `target` in-place.
 *
 * The higher-tier unit's identity (speed, range, templateId, word, emoji,
 * behavior script) is preserved. Hp, damage, abilities, and on-death effects
 * are combined from both units.
 */
export function mergeInto(source: Enemy, target: Enemy): void {
  const sourceTier = getTemplateTier(source.templateId);
  const targetTier = getTemplateTier(target.templateId);

  if (sourceTier > targetTier) {
    const targetKeepRange = ENEMY_TEMPLATES[target.templateId]?.keepRange;
    target.templateId = source.templateId;
    target.word = source.word;
    target.emoji = source.emoji;
    target.speed = source.speed;
    if (!targetKeepRange) {
      target.range = source.range;
    }
    target.behavior = source.behavior.map((a) => ({ ...a }));
    target.behaviorIndex = source.behaviorIndex;
  }

  target.health += source.health;
  target.maxHealth += source.maxHealth;
  target.damage += source.damage;
  target.points += source.points;

  for (const ab of source.abilities) {
    if (!target.abilities.includes(ab)) {
      target.abilities.push(ab);
    }
  }

  for (const effect of source.onDeathEffects) {
    if (!target.onDeathEffects.includes(effect)) {
      target.onDeathEffects.push(effect);
    }
  }
}

/**
 * Same-species stack: `target` and `source` are the SAME template. They do NOT
 * evolve into another species — the two simply fuse into a bigger version of the
 * same creature, pooling HP, damage, and points. `source` is discarded by the
 * caller.
 */
export function stackMerge(target: Enemy, source: Enemy): void {
  target.stackCount += source.stackCount;
  target.maxHealth += source.maxHealth;
  target.health += source.health;
  target.damage += source.damage;
  target.points += source.points;
}

// ---------------------------------------------------------------------------
// Animation events
// ---------------------------------------------------------------------------

export type AnimEvent = {
  type: "attack" | "hurt" | "die" | "merge" | "spawn" | "heal" | "buff";
  unitId: string;
  /** Slam direction — set on YOUR attack so the lunge overshoots the right way. */
  dir?: Direction;
  /** YOUR attack only: true if YOU slid to reach the target (vs an in-place slam).
   *  A traveling slam rides its momentum into the hit; an in-place slam jabs. */
  traveled?: boolean;
};

// ---------------------------------------------------------------------------
// 2048-style slide + slam
// ---------------------------------------------------------------------------

export interface SlideResult {
  enemies: Enemy[];
  player: Player;
  animations: AnimEvent[];
  /** True if anything changed (position, merge, or slam) — i.e. a valid turn. */
  moved: boolean;
  /** Enemies destroyed by the player's slam this slide. */
  killedIds: string[];
  /** The killed enemy objects (with final positions) — kept for the death fade. */
  killed: Enemy[];
  /** Points earned from slam kills. */
  earnedPoints: number;
}

/** Item-granted modifiers that reshape a slam (from stackable pickups). */
export interface SlamMods {
  /** Extra enemies the slam punches through, beyond the first. */
  pierce?: number;
  /** Splash damage to tiles cardinally adjacent to each slam target. */
  splash?: number;
  /** Chance [0..1] for each slam hit to deal double damage. */
  critChance?: number;
  /** A slam finishes any enemy left at or below this HP. */
  executeThreshold?: number;
  /** Randomness source (injectable for tests). Defaults to Math.random. */
  rng?: () => number;
}

/**
 * Resolve a single slide in `dir`. YOU and every enemy slide toward the wall.
 * Along each lane, LIKE enemies that collide merge into the next tier (2048-style,
 * one merge per tile per slide), and YOU slams the first enemy blocking its path,
 * dealing `player.attack`. YOU never take damage.
 *
 * `mods` layers on item effects (pierce / splash / crit / execute); with no mods
 * the slam behaves exactly like the plain single-target hit.
 */
export function resolveSlide(
  dir: Direction,
  enemiesIn: Enemy[],
  playerIn: Player,
  mods: SlamMods = {},
): SlideResult {
  const enemies = enemiesIn.map(cloneEnemy);
  const player: Player = { ...playerIn, position: { ...playerIn.position } };

  const rng = mods.rng ?? Math.random;
  const execThreshold = mods.executeThreshold ?? 0;
  const pierceCount = mods.pierce ?? 0;
  const splashDamage = mods.splash ?? 0;
  const splashTargets: string[] = [];

  const horizontal = dir === "left" || dir === "right";
  const towardMin = dir === "left" || dir === "up"; // slide toward the -GRID_HALF wall

  const laneOf = (p: Position) => (horizontal ? p.y : p.x);
  const axisOf = (p: Position) => (horizontal ? p.x : p.y);
  const makePos = (lane: number, axis: number): Position =>
    horizontal ? { x: axis, y: lane } : { x: lane, y: axis };
  const slotCoord = (i: number) => (towardMin ? -GRID_HALF + i : GRID_HALF - i);

  const animations: AnimEvent[] = [];
  const killedIds: string[] = [];
  const killed: Enemy[] = [];
  const removed = new Set<string>();
  let earnedPoints = 0;
  let slamOccurred = false;
  let mergeOccurred = false;

  const originalPos = new Map<string, string>();
  for (const e of enemies) originalPos.set(e.id, posKey(e.position));
  const playerOrigKey = posKey(player.position);

  type Ent = { kind: "enemy"; e: Enemy } | { kind: "player" };

  // The single "YOU attack" event, captured so we can flag travel once positions
  // settle (a traveling slam gets momentum easing; an in-place one gets a jab).
  let playerSlamAnim: AnimEvent | undefined;

  // Resolve a single slam hit on `target`: crit, then execute, then kill/hurt.
  const slam = (target: Enemy) => {
    let dmg = player.attack;
    if (mods.critChance && rng() < mods.critChance) dmg *= 2;
    target.health -= dmg;
    slamOccurred = true;
    if (!playerSlamAnim) {
      playerSlamAnim = { type: "attack", unitId: player.id, dir };
      animations.push(playerSlamAnim);
    }
    if (target.health > 0 && execThreshold > 0 && target.health <= execThreshold) {
      target.health = 0;
    }
    if (target.health <= 0) {
      animations.push({ type: "die", unitId: target.id });
      removed.add(target.id);
      killedIds.push(target.id);
      killed.push(target);
      earnedPoints += target.points;
    } else {
      animations.push({ type: "hurt", unitId: target.id });
    }
  };

  for (let lane = -GRID_HALF; lane <= GRID_HALF; lane++) {
    const ents: { ent: Ent; axis: number }[] = [];
    for (const e of enemies) {
      if (laneOf(e.position) === lane) ents.push({ ent: { kind: "enemy", e }, axis: axisOf(e.position) });
    }
    if (laneOf(player.position) === lane) {
      ents.push({ ent: { kind: "player" }, axis: axisOf(player.position) });
    }
    if (ents.length === 0) continue;

    // Order from the wall we push toward (nearest the wall first).
    ents.sort((a, b) => (towardMin ? a.axis - b.axis : b.axis - a.axis));

    const placed: { ent: Ent; slot: number; merged: boolean }[] = [];
    let nextSlot = 0;

    for (const { ent } of ents) {
      const last = placed[placed.length - 1];

      if (ent.kind === "player") {
        if (last && last.ent.kind === "enemy") {
          // Slam the enemy directly ahead. YOU take no damage — ever.
          const target = last.ent.e;
          slam(target);
          if (splashDamage > 0) splashTargets.push(target.id);

          // Harpoon: keep punching through the enemies stacked ahead (nearer the wall).
          let hits = 0;
          for (let k = placed.length - 2; k >= 0 && hits < pierceCount; k--) {
            const behind = placed[k];
            if (behind.ent.kind !== "enemy" || removed.has(behind.ent.e.id)) continue;
            slam(behind.ent.e);
            if (splashDamage > 0) splashTargets.push(behind.ent.e.id);
            hits++;
          }
        }
        placed.push({ ent, slot: nextSlot, merged: false });
        nextSlot++;
      } else {
        // enemy: only LIKE items merge — same species, stats stacked (no evolve).
        if (
          last &&
          last.ent.kind === "enemy" &&
          !last.merged &&
          last.ent.e.templateId === ent.e.templateId
        ) {
          stackMerge(last.ent.e, ent.e);
          last.merged = true;
          removed.add(ent.e.id);
          mergeOccurred = true;
          animations.push({ type: "merge", unitId: last.ent.e.id });
        } else {
          placed.push({ ent, slot: nextSlot, merged: false });
          nextSlot++;
        }
      }
    }

    for (const p of placed) {
      const c = slotCoord(p.slot);
      if (p.ent.kind === "player") player.position = makePos(lane, c);
      else p.ent.e.position = makePos(lane, c);
    }
  }

  let survivors = enemies.filter((e) => !removed.has(e.id));

  // Riptide splash: once positions settle, splash each slam target's neighbors.
  if (splashDamage > 0 && splashTargets.length > 0) {
    const hitOnce = new Set<string>();
    for (const tid of splashTargets) {
      const targetPos = enemies.find((e) => e.id === tid)?.position;
      if (!targetPos) continue;
      for (const npos of cardinalNeighbors(targetPos)) {
        const victim = survivors.find(
          (e) => !removed.has(e.id) && posKey(e.position) === posKey(npos),
        );
        if (!victim || hitOnce.has(victim.id)) continue;
        hitOnce.add(victim.id);
        victim.health -= splashDamage;
        if (victim.health <= 0) {
          animations.push({ type: "die", unitId: victim.id });
          removed.add(victim.id);
          killedIds.push(victim.id);
          killed.push(victim);
          earnedPoints += victim.points;
        } else {
          animations.push({ type: "hurt", unitId: victim.id });
        }
      }
    }
    survivors = enemies.filter((e) => !removed.has(e.id));
  }

  // Fire on-death effects for slam/splash kills now that positions are settled.
  for (const dead of killed) {
    const dr = triggerOnDeathEffects(dead, survivors);
    animations.push(...dr.animations);
  }

  // Now that YOUR final tile is known, mark whether the slam had travel behind it.
  if (playerSlamAnim) playerSlamAnim.traveled = posKey(player.position) !== playerOrigKey;

  let moved = slamOccurred || mergeOccurred;
  if (!moved) {
    if (posKey(player.position) !== playerOrigKey) moved = true;
    else {
      for (const e of survivors) {
        if (originalPos.get(e.id) !== posKey(e.position)) {
          moved = true;
          break;
        }
      }
    }
  }

  return {
    enemies: survivors,
    player,
    animations,
    moved,
    killedIds,
    killed,
    earnedPoints,
  };
}

// ---------------------------------------------------------------------------
// Passive: Regrow — enemies with the ability heal a little after every move
// ---------------------------------------------------------------------------

/**
 * Heal every enemy with the `regrow` ability by REGROW_AMOUNT (capped at
 * maxHealth). Mutates the enemies in place and returns a heal animation for
 * each unit that actually gained HP.
 */
export function applyRegrow(enemies: Enemy[]): { animations: AnimEvent[] } {
  const animations: AnimEvent[] = [];
  for (const e of enemies) {
    if (!e.abilities.includes("regrow")) continue;
    if (e.health >= e.maxHealth) continue;
    e.health = Math.min(e.maxHealth, e.health + REGROW_AMOUNT);
    animations.push({ type: "heal", unitId: e.id });
  }
  return { animations };
}

// ---------------------------------------------------------------------------
// Item turn-start ticks — Whirlpool (one random enemy) and Tempest (all)
// ---------------------------------------------------------------------------

export interface TurnDamageMods {
  /** Damage dealt to one random enemy each turn. */
  whirlpoolDamage?: number;
  /** Damage dealt to every enemy each turn. */
  tempestDamage?: number;
}

export interface TurnDamageResult {
  enemies: Enemy[];
  animations: AnimEvent[];
  killed: Enemy[];
  killedIds: string[];
  earnedPoints: number;
}

/**
 * Apply per-turn item damage. Mutates `enemies` in place, removes anything that
 * dies (firing its on-death effects) and reports the survivors + kill payout.
 */
export function applyItemTurnDamage(
  enemies: Enemy[],
  mods: TurnDamageMods,
  rng: () => number = Math.random,
): TurnDamageResult {
  const animations: AnimEvent[] = [];
  const damaged = new Set<string>();
  const tempest = mods.tempestDamage ?? 0;
  const whirl = mods.whirlpoolDamage ?? 0;

  if (tempest > 0) {
    for (const e of enemies) {
      e.health -= tempest;
      damaged.add(e.id);
    }
  }
  if (whirl > 0) {
    const alive = enemies.filter((e) => e.health > 0);
    if (alive.length > 0) {
      const target = alive[Math.floor(rng() * alive.length)];
      target.health -= whirl;
      damaged.add(target.id);
    }
  }

  const killed: Enemy[] = [];
  const killedIds: string[] = [];
  let earnedPoints = 0;
  const survivors: Enemy[] = [];
  for (const e of enemies) {
    if (e.health <= 0) {
      killed.push(e);
      killedIds.push(e.id);
      earnedPoints += e.points;
      animations.push({ type: "die", unitId: e.id });
    } else {
      if (damaged.has(e.id)) animations.push({ type: "hurt", unitId: e.id });
      survivors.push(e);
    }
  }

  for (const dead of killed) {
    const dr = triggerOnDeathEffects(dead, survivors);
    animations.push(...dr.animations);
  }

  return { enemies: survivors, animations, killed, killedIds, earnedPoints };
}

// ---------------------------------------------------------------------------
// Intent computation (telegraphs)
// ---------------------------------------------------------------------------

/** The action an enemy will run next turn (respecting its script pointer). */
export function nextAction(enemy: Enemy): EnemyAction {
  if (enemy.behavior.length === 0) return { kind: "idle" };
  return enemy.behavior[enemy.behaviorIndex % enemy.behavior.length];
}

function inAttackRange(enemy: Enemy, playerPos: Position): boolean {
  const dx = Math.abs(enemy.position.x - playerPos.x);
  const dy = Math.abs(enemy.position.y - playerPos.y);
  return enemy.damage > 0 && dx + dy <= enemy.range;
}

// ---------------------------------------------------------------------------
// Ability execution
// ---------------------------------------------------------------------------

/** Run every ability this enemy has (invoked by a scripted "special" action). */
function runSpecial(
  enemy: Enemy,
  enemies: Enemy[],
  player: Player,
): { enemies: Enemy[]; animations: AnimEvent[] } {
  let allAnimations: AnimEvent[] = [];

  for (const abId of enemy.abilities) {
    const result = runAbility(abId, enemy, enemies, player);
    enemies = result.enemies;
    allAnimations = [...allAnimations, ...result.animations];
  }

  return { enemies, animations: allAnimations };
}

function runAbility(
  abilityId: string,
  enemy: Enemy,
  enemies: Enemy[],
  player: Player,
): { enemies: Enemy[]; animations: AnimEvent[] } {
  switch (abilityId) {
    case "spawn_fish":
      return execSpawnFish(enemy, enemies, player);
    case "devour":
      return execDevour(enemy, enemies);
    case "heal_lowest":
      return execHealLowest(enemy, enemies);
    case "spawn_tentacle":
      return execSpawnTentacle(enemy, enemies, player);
    case "self_sacrifice":
      return execSelfSacrifice(enemy, enemies);
    default:
      return { enemies, animations: [] };
  }
}

function execSpawnFish(
  enemy: Enemy,
  enemies: Enemy[],
  player: Player,
): { enemies: Enemy[]; animations: AnimEvent[] } {
  const animations: AnimEvent[] = [];
  const playerKey = posKey(player.position);

  for (const pos of cardinalNeighbors(enemy.position)) {
    if (!inBounds(pos)) continue;
    if (posKey(pos) === playerKey) continue;

    const existing = enemies.find((e) => posKey(e.position) === posKey(pos));
    const fish = createEnemy(pos, "fish");

    if (existing) {
      mergeInto(fish, existing);
      animations.push({ type: "merge", unitId: existing.id });
    } else {
      enemies = [...enemies, fish];
    }
  }

  return { enemies, animations };
}

/**
 * Devour: pull every enemy on the shark's row (same y) and column (same x)
 * and merge them all into the shark.
 */
function execDevour(
  shark: Enemy,
  enemies: Enemy[],
): { enemies: Enemy[]; animations: AnimEvent[] } {
  const animations: AnimEvent[] = [];

  const onAxis = enemies.filter(
    (e) =>
      e.id !== shark.id &&
      (e.position.x === shark.position.x || e.position.y === shark.position.y),
  );

  for (const victim of onAxis) {
    mergeInto(victim, shark);
    animations.push({ type: "die", unitId: victim.id });
  }

  if (onAxis.length > 0) {
    const consumed = new Set(onAxis.map((e) => e.id));
    enemies = enemies.filter((e) => !consumed.has(e.id));
    animations.push({ type: "merge", unitId: shark.id });
  }

  return { enemies, animations };
}

/**
 * Heal Lowest: heals the enemy with the lowest current HP (including self)
 * by this unit's attack value, capped at maxHealth.
 */
function execHealLowest(
  healer: Enemy,
  enemies: Enemy[],
): { enemies: Enemy[]; animations: AnimEvent[] } {
  const animations: AnimEvent[] = [];

  const candidates = enemies.filter((e) => e.health < e.maxHealth);
  if (candidates.length === 0) return { enemies, animations };

  candidates.sort((a, b) => a.health - b.health);
  const target = candidates[0];

  target.health = Math.min(target.maxHealth, target.health + healer.damage);
  animations.push({ type: "heal", unitId: target.id });

  return { enemies, animations };
}

/**
 * Spawn Tentacle: spawns 1 tentacle (+ bonus spawns) on the outer ring,
 * cycling through front → side → back. Avoids the octopus's own tile and
 * the player tile. Merges into existing enemies if the tile is occupied.
 */
function execSpawnTentacle(
  octopus: Enemy,
  enemies: Enemy[],
  player: Player,
): { enemies: Enemy[]; animations: AnimEvent[] } {
  const animations: AnimEvent[] = [];
  const octopusKey = posKey(octopus.position);
  const playerKey = posKey(player.position);

  const ring = getOuterRingPositions().filter(
    (p) => posKey(p) !== octopusKey && posKey(p) !== playerKey,
  );
  if (ring.length === 0) return { enemies, animations };

  const spawnCount = 1 + (octopus.bonusSpawns ?? 0);
  octopus.bonusSpawns = 0;

  let cycleIdx = octopus.spawnCycleIndex ?? 0;

  for (let i = 0; i < spawnCount; i++) {
    const templateId = TENTACLE_CYCLE[cycleIdx % TENTACLE_CYCLE.length];
    cycleIdx++;

    const occupied = new Set(enemies.map((e) => posKey(e.position)));
    const emptyTiles = ring.filter((p) => !occupied.has(posKey(p)));

    if (emptyTiles.length > 0) {
      const pos = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
      const tentacle = createEnemy(pos, templateId);
      enemies = [...enemies, tentacle];
      animations.push({ type: "spawn", unitId: tentacle.id });
    } else {
      const ringEnemies = enemies
        .filter((e) => e.id !== octopus.id && ring.some((p) => posKey(p) === posKey(e.position)))
        .sort((a, b) => getTemplateTier(a.templateId) - getTemplateTier(b.templateId));
      if (ringEnemies.length > 0) {
        const target = ringEnemies[0];
        const tentacle = createEnemy(target.position, templateId);
        mergeInto(tentacle, target);
        animations.push({ type: "merge", unitId: target.id });
      }
    }
  }

  octopus.spawnCycleIndex = cycleIdx;
  return { enemies, animations };
}

/**
 * Self Sacrifice: the unit kills itself, triggering its on-death effects.
 */
function execSelfSacrifice(
  unit: Enemy,
  enemies: Enemy[],
): { enemies: Enemy[]; animations: AnimEvent[] } {
  const animations: AnimEvent[] = [];

  const deathResult = triggerOnDeathEffects(unit, enemies);
  enemies = deathResult.enemies;
  animations.push(...deathResult.animations);

  enemies = enemies.filter((e) => e.id !== unit.id);
  animations.push({ type: "die", unitId: unit.id });

  return { enemies, animations };
}

/**
 * Fire on-death effects for a dying/merging enemy.
 * Returns updated enemies array and any animations produced.
 */
export function triggerOnDeathEffects(
  dying: Enemy,
  enemies: Enemy[],
): { enemies: Enemy[]; animations: AnimEvent[] } {
  const animations: AnimEvent[] = [];

  for (const effect of dying.onDeathEffects) {
    switch (effect) {
      case "heal_adjacent": {
        for (const pos of cardinalNeighbors(dying.position)) {
          const neighbor = enemies.find(
            (e) => e.id !== dying.id && posKey(e.position) === posKey(pos),
          );
          if (neighbor) {
            neighbor.health = Math.min(neighbor.maxHealth, neighbor.health + dying.damage);
            animations.push({ type: "heal", unitId: neighbor.id });
          }
        }
        break;
      }
      case "bonus_spawn_owner": {
        const owner = enemies.find(
          (e) => e.id !== dying.id && e.templateId === "octopus",
        );
        if (owner) {
          owner.bonusSpawns = (owner.bonusSpawns ?? 0) + 1;
        }
        break;
      }
    }
  }

  return { enemies, animations };
}

// ---------------------------------------------------------------------------
// Single-enemy turn step (runs after the board has slid)
// ---------------------------------------------------------------------------

export interface EnemyStepResult {
  enemies: Enemy[];
  player: Player;
  gameOver: boolean;
  animations: AnimEvent[];
}

export function processEnemyTurn(
  enemy: Enemy,
  enemies: Enemy[],
  player: Player,
): EnemyStepResult {
  const animations: AnimEvent[] = [];
  let gameOver = false;

  const action = nextAction(enemy);
  // Advance the script pointer so the next turn runs the following action.
  enemy.behaviorIndex += 1;

  switch (action.kind) {
    case "special": {
      const result = runSpecial(enemy, enemies, player);
      enemies = result.enemies;
      animations.push(...result.animations);
      break;
    }
    case "buff": {
      enemy.damage += action.amount ?? 0;
      animations.push({ type: "buff", unitId: enemy.id });
      break;
    }
    case "attack": {
      if (inAttackRange(enemy, player.position)) {
        player = { ...player, health: Math.max(0, player.health - enemy.damage) };
        animations.push({ type: "attack", unitId: enemy.id });
        animations.push({ type: "hurt", unitId: player.id });
        if (player.health <= 0) gameOver = true;
      }
      break;
    }
    case "idle":
    default:
      break;
  }

  return { enemies, player, gameOver, animations };
}

// ---------------------------------------------------------------------------
// Spawn helpers
// ---------------------------------------------------------------------------

/** All empty tiles on the board (excludes enemies and the player). */
export function emptyTiles(enemies: Enemy[], playerPos: Position): Position[] {
  const occupied = new Set(enemies.map((e) => posKey(e.position)));
  occupied.add(posKey(playerPos));
  const tiles: Position[] = [];
  for (let x = -GRID_HALF; x <= GRID_HALF; x++) {
    for (let y = -GRID_HALF; y <= GRID_HALF; y++) {
      if (!occupied.has(posKey({ x, y }))) tiles.push({ x, y });
    }
  }
  return tiles;
}

/**
 * Spawn one enemy for the endless mode on a random empty tile, escalating in
 * strength with `turn`. Returns null if the board is completely full.
 */
export function spawnEndlessEnemy(turn: number, enemies: Enemy[], playerPos: Position): Enemy | null {
  const tiles = emptyTiles(enemies, playerPos);
  if (tiles.length === 0) return null;
  const pos = tiles[Math.floor(Math.random() * tiles.length)];
  const pool = spawnPoolForTurn(turn);
  const templateId = pool[Math.floor(Math.random() * pool.length)];
  return createEnemy(pos, templateId);
}

export function getOuterRingPositions(): Position[] {
  const positions: Position[] = [];
  for (let x = -GRID_HALF; x <= GRID_HALF; x++) {
    for (let y = -GRID_HALF; y <= GRID_HALF; y++) {
      if (isOuterRing({ x, y })) positions.push({ x, y });
    }
  }
  return positions;
}

/**
 * Spawn wave enemies on the outer ring.
 * 1. Prefer empty tiles first.
 * 2. If no empty tiles remain, merge into the lowest-tier enemy on the ring.
 * Never spawn on the player tile.
 */
export function spawnWaveEnemies(
  waveEntries: { count: number; enemyId: string }[],
  existingEnemies: Enemy[],
  playerPos: Position,
): Enemy[] {
  if (waveEntries.length === 0) return [];

  const playerKey = posKey(playerPos);
  const occupied = new Set(existingEnemies.map((e) => posKey(e.position)));
  const ring = getOuterRingPositions().filter((p) => posKey(p) !== playerKey);

  const emptyTiles = ring.filter((p) => !occupied.has(posKey(p)));

  const spawned: Enemy[] = [];
  for (const wave of waveEntries) {
    for (let i = 0; i < wave.count; i++) {
      if (emptyTiles.length > 0) {
        const idx = Math.floor(Math.random() * emptyTiles.length);
        const pos = emptyTiles.splice(idx, 1)[0];
        spawned.push(createEnemy(pos, wave.enemyId));
      } else {
        // No empty tiles — merge into the lowest-tier enemy on the ring
        const ringEnemies = existingEnemies
          .filter((e) => ring.some((p) => posKey(p) === posKey(e.position)))
          .sort((a, b) => getTemplateTier(a.templateId) - getTemplateTier(b.templateId));

        if (ringEnemies.length > 0) {
          const target = ringEnemies[0];
          const fresh = createEnemy(target.position, wave.enemyId);
          mergeInto(fresh, target);
        }
      }
    }
  }

  return spawned;
}
