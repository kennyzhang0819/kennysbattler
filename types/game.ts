export interface Position {
  x: number;
  y: number;
}

/** The four slide directions. Pressing one slides YOU (and every enemy). */
export type Direction = "up" | "down" | "left" | "right";

export interface Unit {
  id: string;
  position: Position;
  stackCount: number;
  /** Enemies are slammed until this reaches 0. The player's value is unused. */
  health: number;
  maxHealth: number;
  word: string;
  emoji: string;
  range: number;
}

export interface Enemy extends Unit {
  type: "enemy";
  damage: number;
  speed: number;
  points: number;
  templateId: string;
  abilities: EnemyAbilityId[];
  onDeathEffects: OnDeathEffectId[];
  /** Ordered per-turn action script; the enemy cycles through it each turn. */
  behavior: EnemyAction[];
  /** Index of the next action to run in `behavior` (wraps around). */
  behaviorIndex: number;
  spawnCycleIndex?: number;
  bonusSpawns?: number;
}

export interface Player extends Unit {
  type: "player";
  /** Damage dealt to an enemy when YOU slam into it. YOU take no damage — ever. */
  attack: number;
}

// ---------------------------------------------------------------------------
// Enemy abilities
// ---------------------------------------------------------------------------

export type EnemyAbilityId = "spawn_fish" | "devour" | "heal_lowest" | "spawn_tentacle" | "self_sacrifice" | "regrow";

export type OnDeathEffectId = "heal_adjacent" | "bonus_spawn_owner";

export interface EnemyAbilityDef {
  id: EnemyAbilityId;
  name: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Scripted behavior — after the board slides, each enemy runs one action per
// turn, cycling through its `behavior` list (Slay-the-Spire style telegraphs).
// Movement is player-driven now, so there is no "move" action.
// ---------------------------------------------------------------------------

export type EnemyActionKind = "attack" | "buff" | "special" | "idle";

export interface EnemyAction {
  kind: EnemyActionKind;
  /** For "buff": amount added to this enemy's attack. */
  amount?: number;
}

// ---------------------------------------------------------------------------
// Game state — endless survival
// ---------------------------------------------------------------------------

export interface GameState {
  /** Turns survived so far (also the score). */
  turn: number;
  killPoints: number;
  /** True while it is the player's turn (accepting input). */
  playerTurnActive: boolean;
  enemies: Enemy[];
  player: Player;
  gameOver: boolean;

  // ---- Roguelike progression (per run) ----
  /** Current character level (starts at 1). */
  level: number;
  /** XP banked toward the next level. */
  xp: number;
  /** XP required to advance from the current level to the next. */
  xpToNext: number;
  /** Stackable items collected this run: itemId -> stack count. */
  inventory: Inventory;
  /** Level-ups earned but not yet spent on an item choice. */
  pendingChoices: number;
  /** The 3 item ids currently offered (empty when not choosing). */
  currentChoices: string[];
}

// ---------------------------------------------------------------------------
// Roguelike items — stackable, Risk-of-Rain style
// ---------------------------------------------------------------------------

export type ItemRarity = "common" | "uncommon" | "rare";

export interface ItemDef {
  id: string;
  name: string;
  emoji: string;
  rarity: ItemRarity;
  /** One-liner describing what a single stack does. */
  description: string;
}

/** itemId -> how many copies you hold. */
export type Inventory = Record<string, number>;

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
  onDeathEffect?: OnDeathEffectId;
  keepRange?: boolean;
  /** Ordered per-turn action script this enemy cycles through. */
  behavior: EnemyAction[];
}

