import {
  Position,
  EnemyAbilityId,
  EnemyAbilityDef,
  Spell,
  EnemyTemplate,
  LevelConfig,
  OnDeathEffectId,
} from "@/types/game";

// ---------------------------------------------------------------------------
// Grid constants
// ---------------------------------------------------------------------------

export const GRID_HALF = 2;
export const GRID_SIZE = GRID_HALF * 2 + 1;
export const CELL_SIZE = 96;
export const BASE_HAND_SIZE = 3;
export const BASE_GOLD_PER_TURN = 1;
export const BASE_PLAYER_HP = 10;
export const REROLL_COST = 1;

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
};

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
// Spell templates
// ---------------------------------------------------------------------------

export const SPELL_TEMPLATES: Omit<Spell, "uid">[] = [
  { id: "fireball", name: "FIREBALL", description: "Deals 2 damage.", emoji: "🔥", cost: 1, target: "enemy" },
  { id: "restore", name: "RESTORE", description: "+6 max HP.", emoji: "💚", cost: 1, target: "self" },
  { id: "lightning", name: "LIGHTNING", description: "Deals 8 damage to all enemies on the target's row and column.", emoji: "⚡", cost: 1, target: "tile" },
];

// ---------------------------------------------------------------------------
// Enemy templates
// ---------------------------------------------------------------------------

/** Ordered lowest → highest tier. Position in this array determines tier. */
const ENEMY_TEMPLATE_LIST: EnemyTemplate[] = [
  { id: "fish", word: "FISH", emoji: "🐟", health: 1, range: 1, damage: 1, speed: 1, points: 1 },
  { id: "crab", word: "CRAB", emoji: "🦀", health: 3, range: 1, damage: 5, speed: 1, points: 1 },
  { id: "jellyfish", word: "JELLYFISH", emoji: "🪼", health: 10, range: 1, damage: 15, speed: 1, points: 1, ability: "heal_lowest", abilityCooldown: 0, onDeathEffect: "heal_adjacent" },
  { id: "front_tentacle", word: "FRONT TENTACLE", emoji: "🦑", health: 15, range: 1, damage: 25, speed: 1, points: 1 },
  { id: "side_tentacle", word: "SIDE TENTACLE", emoji: "🦑", health: 10, range: 2, damage: 15, speed: 1, points: 1, keepRange: true },
  { id: "back_tentacle", word: "BACK TENTACLE", emoji: "🦑", health: 30, range: 1, damage: 0, speed: 0, points: 1, ability: "self_sacrifice", abilityCooldown: 0, onDeathEffect: "bonus_spawn_owner" },
  { id: "coral", word: "CORAL", emoji: "🪸", health: 10, range: 1, damage: 5, speed: 0, points: 1, ability: "spawn_fish", abilityCooldown: 1 },
  { id: "shark", word: "SHARK", emoji: "🦈", boss: true, health: 50, range: 1, damage: 5, speed: 1, points: 10, ability: "devour", abilityCooldown: 2 },
  { id: "octopus", word: "OCTOPUS", emoji: "🐙", boss: true, health: 400, range: 1, damage: 0, speed: 0, points: 20, ability: "spawn_tentacle", abilityCooldown: 0 },
];

export const TENTACLE_CYCLE = ["front_tentacle", "side_tentacle", "back_tentacle"] as const;

export const ENEMY_TEMPLATES: Record<string, EnemyTemplate> = Object.fromEntries(
  ENEMY_TEMPLATE_LIST.map((t) => [t.id, t]),
);

/** Returns the tier index (higher = stronger). Used to pick visuals on merge. */
export function getTemplateTier(templateId: string): number {
  return ENEMY_TEMPLATE_LIST.findIndex((t) => t.id === templateId);
}

// ---------------------------------------------------------------------------
// Level config
// ---------------------------------------------------------------------------

export function getTotalTurns(level: LevelConfig): number {
  const keys = Object.keys(level.spawnSchedule).map(Number);
  return keys.length > 0 ? Math.max(...keys) : 0;
}

/** Main-line levels (no parentId). Order here defines the main progression path. */
export const MAIN_LEVELS: LevelConfig[] = [
  {
    id: "1",
    name: "Tide Pools",
    description: "Welcome to the game",
    emoji: "💧",
    instruction: "Welcome to Kenny's Battler! Kill all enemies to win. Earn skill points from kills and spend them on the world map. Drag spells onto targets to cast.",
    maxTurns: 15,
    spawnSchedule: {
      1: [{ count: 1, enemyId: "fish" }],
      2: [{ count: 1, enemyId: "fish" }],
      3: [{ count: 2, enemyId: "fish" }],
      4: [{ count: 3, enemyId: "fish" }],
      5: [{ count: 4, enemyId: "fish" }],
    },
  },
  {
    id: "2",
    name: "Coral Reef",
    description: "Explore more enemies and stronger waves",
    emoji: "🪸",
    instruction: "Some enemies can spawn others. Discover better spells to defeat them! Defeat every enemy to clear the level!",
    maxTurns: 20,
    spawnSchedule: {
      1: [{ count: 2, enemyId: "fish" }],
      2: [{ count: 2, enemyId: "crab" }],
      3: [{ count: 2, enemyId: "fish" }, { count: 1, enemyId: "crab" }],
      4: [{ count: 2, enemyId: "crab" }],
      5: [{ count: 2, enemyId: "fish" }],
      6: [{ count: 1, enemyId: "coral" }],
      7: [],
      8: [{ count: 2, enemyId: "crab" }],
      9: [{ count: 2, enemyId: "fish" }, { count: 2, enemyId: "crab" }],
      10: [{ count: 2, enemyId: "coral" }],
    },
  },
  {
    id: "3",
    name: "The Ocean",
    description: "Fight your first boss",
    emoji: "🌊",
    instruction: "Boss enemies are strong with unique abilities. Feel free to come back after you are stronger to defeat them. Defeat every enemy including the boss to win.",
    maxTurns: 20,
    spawnSchedule: {
      1: [{ count: 3, enemyId: "coral" }],
      2: [{ count: 4, enemyId: "crab" }],
      3: [{ count: 4, enemyId: "crab" }],
      4: [{ count: 1, enemyId: "shark" }],
      5: [],
      6: [{ count: 2, enemyId: "coral" }],
      7: [],
      8: [{ count: 2, enemyId: "coral" }],
      9: [],
      10: [{ count: 2, enemyId: "coral" }],
    },
  },
  {
    id: "4",
    name: "Deep Sea",
    description: "You are on your own now!",
    emoji: "🪼",
    instruction: "Defeat every enemy to clear the level!",
    maxTurns: 30,
    spawnSchedule: {
      1: [{ count: 2, enemyId: "jellyfish" }, { count: 10, enemyId: "fish" }],
      2: [{ count: 2, enemyId: "jellyfish" }, { count: 10, enemyId: "fish" }],
      3: [{ count: 2, enemyId: "jellyfish" }, { count: 10, enemyId: "crab" }],
      4: [],
      5: [{ count: 1, enemyId: "octopus" }],
      6: [],
      7: [{ count: 2, enemyId: "jellyfish" }],
      8: [],
      9: [{ count: 2, enemyId: "jellyfish" }],
      10: [],
      11: [{ count: 2, enemyId: "jellyfish" }],
      12: [],
      13: [{ count: 2, enemyId: "jellyfish" }],
      14: [],
      15: [{ count: 2, enemyId: "jellyfish" }],
      16: [],
    },
  },
];

/** Optional side-branch levels. Each has a parentId pointing to the main level it branches off. */
export const BRANCH_LEVELS: LevelConfig[] = [
  {
    id: "1.1",
    parentId: "1",
    name: "Fish Pond",
    description: "Optional — fight more fish",
    emoji: "🐟",
    instruction: "An optional challenge! Defeat them all!",
    maxTurns: 10,
    spawnSchedule: {
      1: [{ count: 2, enemyId: "fish" }],
      2: [{ count: 3, enemyId: "fish" }],
      3: [{ count: 4, enemyId: "fish" }],
      4: [{ count: 4, enemyId: "fish" }],
      5: [{ count: 4, enemyId: "fish" }],
    },
  },
];

/** All levels combined. */
export const LEVELS: LevelConfig[] = [...MAIN_LEVELS, ...BRANCH_LEVELS];

/** Look up a level by its string id. */
export function getLevelById(id: string): LevelConfig | undefined {
  return LEVELS.find((l) => l.id === id);
}

/** Get branch levels that stem from a given parent level id. */
export function getBranchLevels(parentId: string): LevelConfig[] {
  return BRANCH_LEVELS.filter((l) => l.parentId === parentId);
}
