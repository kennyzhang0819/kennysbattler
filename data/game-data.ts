import {
  Position,
  EnemyAbilityId,
  EnemyAbilityDef,
  Spell,
  EnemyTemplate,
  LevelConfig,
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
  { id: "coral", word: "CORAL", emoji: "🪸", health: 10, range: 1, damage: 5, speed: 0, points: 1, ability: "spawn_fish", abilityCooldown: 1 },
  { id: "shark", word: "SHARK", emoji: "🦈", boss: true, health: 50, range: 1, damage: 5, speed: 1, points: 10, ability: "devour", abilityCooldown: 2 },
];

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

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
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
    id: 2,
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
    id: 3,
    name: "The Ocean",
    description: "Fight your first boss",
    emoji: "🌊",
    instruction: "There is a balance between clearing enemies and letting them merge. Defeat every enemy including the boss to win.",
    maxTurns: 20,
    spawnSchedule: {
      1: [{ count: 3, enemyId: "coral" }],
      2: [{ count: 4, enemyId: "crab" }],
      3: [{ count: 4, enemyId: "crab" }],
      4: [{ count: 1, enemyId: "shark" }],
      5: [],
      6: [{ count: 3, enemyId: "coral" }],
      7: [],
      8: [{ count: 3, enemyId: "coral" }],
      9: [],
      10: [],
    },
  },
  {
    id: 4,
    name: "Under the Sea",
    description: "You are on your own now!",
    emoji: "🪼",
    instruction: "Defeat every enemy to clear the level!",
    maxTurns: 20,
    spawnSchedule: {
      1: [{ count: 3, enemyId: "coral" }],
      2: [{ count: 4, enemyId: "crab" }],
      3: [{ count: 4, enemyId: "crab" }],
      4: [{ count: 1, enemyId: "shark" }],
      5: [],
      6: [{ count: 3, enemyId: "coral" }],
      7: [],
      8: [{ count: 3, enemyId: "coral" }],
      9: [],
      10: [],
    },
  },
];
