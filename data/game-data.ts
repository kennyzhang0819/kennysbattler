import {
  Position,
  Direction,
  EnemyAbilityId,
  EnemyAbilityDef,
  EnemyAction,
  EnemyTemplate,
  OnDeathEffectId,
} from "@/types/game";

// ---------------------------------------------------------------------------
// Grid constants
// ---------------------------------------------------------------------------

export const GRID_HALF = 2;
export const GRID_SIZE = GRID_HALF * 2 + 1;
export const CELL_SIZE = 96;

// Player base attack (grown by collecting items). YOU have no HP.
export const BASE_PLAYER_ATTACK = 5;

// ---------------------------------------------------------------------------
// XP curve — kills grant XP; each level costs a little more than the last.
// ---------------------------------------------------------------------------

/** XP needed to advance from `level` to `level + 1`. */
export function xpForLevel(level: number): number {
  return 5 + (level - 1) * 4;
}

// ---------------------------------------------------------------------------
// Grid helpers
// ---------------------------------------------------------------------------

export function inBounds(pos: Position): boolean {
  return (
    pos.x >= -GRID_HALF &&
    pos.x <= GRID_HALF &&
    pos.y >= -GRID_HALF &&
    pos.y <= GRID_HALF
  );
}

export function isOuterRing(pos: Position): boolean {
  return (
    Math.abs(pos.x) === GRID_HALF || Math.abs(pos.y) === GRID_HALF
  );
}

export function gridToPixel(coord: number): number {
  return (coord + GRID_HALF) * CELL_SIZE;
}

export function pixelToGrid(px: number): number {
  return Math.floor(px / CELL_SIZE) - GRID_HALF;
}

export function posKey(p: Position): string {
  return `${p.x},${p.y}`;
}

export function cardinalNeighbors(p: Position): Position[] {
  return [
    { x: p.x, y: p.y - 1 },
    { x: p.x - 1, y: p.y },
    { x: p.x + 1, y: p.y },
    { x: p.x, y: p.y + 1 },
  ];
}

/** Unit step vector for each slide direction (grid y grows downward). */
export const DIRECTION_VECTORS: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

// ---------------------------------------------------------------------------
// Enemy abilities
// ---------------------------------------------------------------------------

export const ENEMY_ABILITIES: Record<EnemyAbilityId, EnemyAbilityDef> = {
  spawn_fish: {
    id: "spawn_fish",
    name: "Spawn Fish",
    description: "Summons a fish in each adjacent cardinal tile.",
  },
  devour: {
    id: "devour",
    name: "Devour",
    description: "Pulls and absorbs all enemies on the same row and column.",
  },
  heal_lowest: {
    id: "heal_lowest",
    name: "Heal Lowest",
    description: "Heals the lowest-health ally (or itself) by this unit's attack.",
  },
  spawn_tentacle: {
    id: "spawn_tentacle",
    name: "Spawn Tentacle",
    description: "Summons a tentacle on the outer ring, cycling front → side → back.",
  },
  self_sacrifice: {
    id: "self_sacrifice",
    name: "Self Sacrifice",
    description: "Kills itself, triggering on-death effects.",
  },
  regrow: {
    id: "regrow",
    name: "Regrow",
    description: "Regrows 1 HP after every move.",
  },
};

/** HP restored per turn by the passive Regrow ability. */
export const REGROW_AMOUNT = 1;

export interface OnDeathEffectDef {
  id: OnDeathEffectId;
  name: string;
  description: string;
}

export const ON_DEATH_EFFECTS: Record<OnDeathEffectId, OnDeathEffectDef> = {
  heal_adjacent: {
    id: "heal_adjacent",
    name: "Heal Adjacent",
    description: "On death, heals all adjacent allies by this unit's attack.",
  },
  bonus_spawn_owner: {
    id: "bonus_spawn_owner",
    name: "Bonus Spawn",
    description: "On death, the octopus spawns 1 extra tentacle next turn.",
  },
};

// ---------------------------------------------------------------------------
// Enemy templates
// ---------------------------------------------------------------------------

// Scripted-action shorthands. After the board slides, each enemy runs exactly
// one action per turn, cycling through its `behavior` list (telegraphed).
const ATTACK: EnemyAction = { kind: "attack" };
const SPECIAL: EnemyAction = { kind: "special" };
const IDLE: EnemyAction = { kind: "idle" };
const BUFF = (amount: number): EnemyAction => ({ kind: "buff", amount });

/** Ordered lowest → highest tier. Position in this array determines tier. */
const ENEMY_TEMPLATE_LIST: EnemyTemplate[] = [
  { id: "fish", word: "FISH", emoji: "🐟", health: 1, range: 1, damage: 1, speed: 1, points: 1, behavior: [ATTACK] },
  { id: "crab", word: "CRAB", emoji: "🦀", health: 6, range: 1, damage: 3, speed: 1, points: 1, ability: "regrow", behavior: [BUFF(2), ATTACK] },
  { id: "jellyfish", word: "JELLYFISH", emoji: "🪼", health: 15, range: 1, damage: 6, speed: 1, points: 2, ability: "heal_lowest", onDeathEffect: "heal_adjacent", behavior: [SPECIAL, ATTACK] },
  { id: "lobster", word: "LOBSTER", emoji: "🦞", health: 25, range: 2, damage: 8, speed: 1, points: 3, behavior: [IDLE, ATTACK] },
  { id: "front_tentacle", word: "FRONT TENTACLE", emoji: "🦑", health: 15, range: 1, damage: 6, speed: 1, points: 2, behavior: [ATTACK] },
  { id: "side_tentacle", word: "SIDE TENTACLE", emoji: "🦑", health: 12, range: 2, damage: 4, speed: 1, points: 2, keepRange: true, behavior: [ATTACK] },
  { id: "back_tentacle", word: "BACK TENTACLE", emoji: "🦑", health: 20, range: 1, damage: 0, speed: 0, points: 2, ability: "self_sacrifice", onDeathEffect: "bonus_spawn_owner", behavior: [SPECIAL] },
  { id: "coral", word: "CORAL", emoji: "🪸", health: 20, range: 1, damage: 3, speed: 0, points: 3, ability: "spawn_fish", behavior: [SPECIAL, IDLE] },
  { id: "shark", word: "SHARK", emoji: "🦈", health: 45, range: 1, damage: 5, speed: 1, points: 10, ability: "devour", behavior: [SPECIAL, ATTACK] },
  { id: "octopus", word: "OCTOPUS", emoji: "🐙", health: 70, range: 1, damage: 0, speed: 0, points: 20, ability: "spawn_tentacle", behavior: [SPECIAL, IDLE] },
];

export const TENTACLE_CYCLE = ["front_tentacle", "side_tentacle", "back_tentacle"] as const;

export const ENEMY_TEMPLATES: Record<string, EnemyTemplate> = Object.fromEntries(
  ENEMY_TEMPLATE_LIST.map((t) => [t.id, t]),
);

/** Returns the tier index (higher = stronger). Used to pick visuals on merge. */
export function getTemplateTier(templateId: string): number {
  return ENEMY_TEMPLATE_LIST.findIndex((t) => t.id === templateId);
}

/**
 * 2048-style merge chain: two of the same type fuse into one of the next type.
 * fish + fish → crab, crab + crab → jellyfish, and so on up to the octopus.
 */
export const MERGE_CHAIN = ["fish", "crab", "jellyfish", "lobster", "shark", "octopus"] as const;

/** The template two `id`s merge into, or null if `id` is already at the top. */
export function nextMergeTemplate(id: string): string | null {
  const i = MERGE_CHAIN.indexOf(id as (typeof MERGE_CHAIN)[number]);
  if (i === -1 || i === MERGE_CHAIN.length - 1) return null;
  return MERGE_CHAIN[i + 1];
}

// ---------------------------------------------------------------------------
// Endless spawning — one enemy joins the board every turn, escalating over time
// ---------------------------------------------------------------------------

/** The spawn pool in effect once the given turn is reached (later entries win). */
export const SPAWN_SCHEDULE: { minTurn: number; pool: string[] }[] = [
  { minTurn: 0, pool: ["fish"] },
  { minTurn: 5, pool: ["fish", "crab"] },
  { minTurn: 12, pool: ["crab", "crab", "jellyfish"] },
  { minTurn: 22, pool: ["crab", "jellyfish", "lobster"] },
  { minTurn: 34, pool: ["jellyfish", "lobster", "lobster", "shark"] },
];

export function spawnPoolForTurn(turn: number): string[] {
  let pool = SPAWN_SCHEDULE[0].pool;
  for (const s of SPAWN_SCHEDULE) if (turn >= s.minTurn) pool = s.pool;
  return pool;
}

/** How many enemies spawn per turn (ramps up so late game stays tense). */
export function spawnsPerTurn(turn: number): number {
  return turn >= 45 ? 2 : 1;
}
