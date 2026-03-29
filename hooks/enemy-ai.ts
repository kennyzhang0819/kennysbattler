import {
  Enemy,
  EnemyAbilityInstance,
  Player,
  Position,
  EnemyIntent,
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
  const abilities: EnemyAbilityInstance[] = [];
  if (t.ability) {
    abilities.push({ id: t.ability, cooldown: t.abilityCooldown ?? 0, cooldownRemaining: 0 });
  }
  const onDeathEffects: OnDeathEffectId[] = [];
  if (t.onDeathEffect) {
    onDeathEffects.push(t.onDeathEffect);
  }
  return {
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
    boss: t.boss,
  };
}

// ---------------------------------------------------------------------------
// Merge helper
// ---------------------------------------------------------------------------

/**
 * Merge `source` into `target` in-place.
 *
 * The higher-tier unit's stats (speed, range, templateId, word, emoji, boss)
 * are preserved. Only hp, damage, and abilities are combined from both units.
 */
export function mergeInto(source: Enemy, target: Enemy): void {
  const sourceTier = getTemplateTier(source.templateId);
  const targetTier = getTemplateTier(target.templateId);

  if (sourceTier > targetTier) {
    target.templateId = source.templateId;
    target.word = source.word;
    target.emoji = source.emoji;
    target.speed = source.speed;
    target.range = source.range;
    target.boss = source.boss;
  }

  target.health += source.health;
  target.maxHealth += source.maxHealth;
  target.damage += source.damage;
  target.points += source.points;

  for (const srcAb of source.abilities) {
    if (!target.abilities.some((a) => a.id === srcAb.id)) {
      target.abilities.push({ ...srcAb });
    }
  }

  for (const effect of source.onDeathEffects) {
    if (!target.onDeathEffects.includes(effect)) {
      target.onDeathEffects.push(effect);
    }
  }
}

// ---------------------------------------------------------------------------
// Pathfinding
// ---------------------------------------------------------------------------

export function bfsNextStep(from: Position, goal: Position): Position | null {
  const selfKey = posKey(from);
  const goalKey = posKey(goal);

  const queue: Position[] = [from];
  const cameFrom = new Map<string, Position | null>();
  cameFrom.set(selfKey, null);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const ck = posKey(current);

    if (ck === goalKey) {
      let step = current;
      let prev = cameFrom.get(ck)!;
      while (prev && posKey(prev) !== selfKey) {
        step = prev;
        prev = cameFrom.get(posKey(prev))!;
      }
      return step;
    }

    for (const n of cardinalNeighbors(current)) {
      if (!inBounds(n)) continue;
      const nk = posKey(n);
      if (cameFrom.has(nk)) continue;
      cameFrom.set(nk, current);
      queue.push(n);
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Intent computation
// ---------------------------------------------------------------------------

export function computeIntent(enemy: Enemy, playerPos: Position): EnemyIntent {
  const dx = Math.abs(enemy.position.x - playerPos.x);
  const dy = Math.abs(enemy.position.y - playerPos.y);

  let move: EnemyIntent["move"];
  if (enemy.damage > 0 && dx + dy <= enemy.range) {
    move = { action: "attack", damage: enemy.damage };
  } else if (enemy.speed > 0) {
    move = { action: "move" };
  } else {
    move = { action: "idle" };
  }

  const abilityReady = enemy.abilities.some((a) => a.cooldownRemaining <= 0);

  return { move, abilityReady };
}

export function computeAllIntents(
  enemies: Enemy[],
  playerPos: Position,
): Record<string, EnemyIntent> {
  const result: Record<string, EnemyIntent> = {};
  for (const enemy of enemies) {
    result[enemy.id] = computeIntent(enemy, playerPos);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Ability execution
// ---------------------------------------------------------------------------

export type AnimEvent = {
  type: "attack" | "hurt" | "die" | "merge" | "spawn" | "heal";
  unitId: string;
};

function executeAbilities(
  enemy: Enemy,
  enemies: Enemy[],
  player: Player,
): { enemies: Enemy[]; animations: AnimEvent[] } {
  let allAnimations: AnimEvent[] = [];

  for (const ab of enemy.abilities) {
    if (ab.cooldownRemaining > 0) {
      ab.cooldownRemaining--;
      continue;
    }

    const result = runAbility(ab.id, enemy, enemies, player);
    enemies = result.enemies;
    allAnimations = [...allAnimations, ...result.animations];

    ab.cooldownRemaining = ab.cooldown;
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
 * Heal Lowest: heals the enemy with the lowest current HP (other than self)
 * by this unit's attack value, capped at maxHealth.
 */
function execHealLowest(
  healer: Enemy,
  enemies: Enemy[],
): { enemies: Enemy[]; animations: AnimEvent[] } {
  const animations: AnimEvent[] = [];

  const others = enemies.filter((e) => e.id !== healer.id && e.health < e.maxHealth);
  if (others.length === 0) return { enemies, animations };

  others.sort((a, b) => a.health - b.health);
  const target = others[0];

  target.health = Math.min(target.maxHealth, target.health + healer.damage);
  animations.push({ type: "heal", unitId: target.id });

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
    }
  }

  return { enemies, animations };
}

// ---------------------------------------------------------------------------
// Single-enemy turn step
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

  // --- 1. Ability phase (always fires, independent of move/attack) ---
  if (enemy.abilities.length > 0) {
    const result = executeAbilities(enemy, enemies, player);
    enemies = result.enemies;
    animations.push(...result.animations);
  }

  // --- 2. Move OR attack (never both) ---
  const playerPos = player.position;
  const dx = Math.abs(enemy.position.x - playerPos.x);
  const dy = Math.abs(enemy.position.y - playerPos.y);

  if (enemy.damage > 0 && dx + dy <= enemy.range) {
    player = {
      ...player,
      health: Math.max(0, player.health - enemy.damage),
    };
    if (player.health <= 0) gameOver = true;
    animations.push(
      { type: "attack", unitId: enemy.id },
      { type: "hurt", unitId: "player" },
    );
  } else if (enemy.speed > 0) {
    const nextStep = bfsNextStep(enemy.position, player.position);
    if (nextStep) {
      const enemyAtNext = enemies.find(
        (e) => e.id !== enemy.id && posKey(e.position) === posKey(nextStep),
      );
      if (posKey(nextStep) === posKey(player.position)) {
        // Can't walk onto player — stay put
      } else if (enemyAtNext) {
        mergeInto(enemy, enemyAtNext);
        enemies = enemies.filter((e) => e.id !== enemy.id);
        animations.push({ type: "merge", unitId: enemyAtNext.id });
      } else {
        enemy.position = { ...nextStep };
      }
    }
  }

  return { enemies, player, gameOver, animations };
}

// ---------------------------------------------------------------------------
// Spawn helpers
// ---------------------------------------------------------------------------

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
