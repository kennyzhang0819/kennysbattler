export interface Position {
  x: number;
  y: number;
}

export interface Unit {
  id: string;
  position: Position;
  stackCount: number;
  health: number;
  maxHealth: number;
  word: string;
  emoji: string;
  range: number;
}

export interface EnemyAbilityInstance {
  id: EnemyAbilityId;
  cooldown: number;
  cooldownRemaining: number;
}

export interface Enemy extends Unit {
  type: "enemy";
  damage: number;
  speed: number;
  points: number;
  templateId: string;
  abilities: EnemyAbilityInstance[];
  onDeathEffects: OnDeathEffectId[];
  boss?: boolean;
}

export interface Player extends Unit {
  type: "player";
}

export type SpellTarget = "self" | "enemy" | "tile";

export interface Spell {
  uid: string;
  id: string;
  name: string;
  description: string;
  emoji: string;
  cost: number;
  target: SpellTarget;
}

// ---------------------------------------------------------------------------
// Enemy abilities
// ---------------------------------------------------------------------------

export type EnemyAbilityId = "spawn_fish" | "devour" | "heal_lowest";

export type OnDeathEffectId = "heal_adjacent";

export interface EnemyAbilityDef {
  id: EnemyAbilityId;
  name: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Intents — what an enemy plans to do this turn
// ---------------------------------------------------------------------------

export type EnemyMoveIntent =
  | { action: "move" }
  | { action: "attack"; damage: number }
  | { action: "idle" };

export interface EnemyIntent {
  move: EnemyMoveIntent;
  abilityReady: boolean;
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

export interface GameState {
  turn: number;
  gold: number;
  killPoints: number;
  rerollsUsed: number;
  playerTurnActive: boolean;
  enemies: Enemy[];
  player: Player;
  gameOver: boolean;
  won: boolean;
  hand: Spell[];
}

// ---------------------------------------------------------------------------
// Skill tree
// ---------------------------------------------------------------------------

export type SkillLevels = Record<string, number>;

export type SkillCategory = "spell" | "shop";

export interface SkillSlot {
  id: string;
  spellId: string;
  category: SkillCategory;
  name: string;
  description: string;
  /** cost[i] = price to upgrade from level i to i+1. Length determines maxLevel. */
  cost: number[];
  requires?: string;
  perLevelLabel: string;
  /** Logical group for summing levels across tiers (e.g. "fireball_dmg" shared by tiers I/II/III). */
  group?: string;
}

// ---------------------------------------------------------------------------
// Enemy templates
// ---------------------------------------------------------------------------

export interface EnemyTemplate {
  id: string;
  word: string;
  emoji: string;
  health: number;
  range: number;
  damage: number;
  speed: number;
  points: number;
  ability?: EnemyAbilityId;
  abilityCooldown?: number;
  onDeathEffect?: OnDeathEffectId;
  boss?: boolean;
}

// ---------------------------------------------------------------------------
// Level config
// ---------------------------------------------------------------------------

export interface SpawnWave {
  count: number;
  enemyId: string;
}

export interface LevelConfig {
  id: number;
  name: string;
  description: string;
  emoji: string;
  instruction: string;
  maxTurns: number;
  spawnSchedule: Record<number, SpawnWave[]>;
}
