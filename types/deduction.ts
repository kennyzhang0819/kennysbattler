// ---------------------------------------------------------------------------
// Reef Census — a logic deduction game.
//
// A reef is a small grid of sea creatures. Some of them are MIMICS: impostors
// hiding among the honest residents. Every creature makes one statement about
// the board. Honest creatures always tell the truth; mimics always lie.
// Tag every mimic without accusing too many innocents.
// ---------------------------------------------------------------------------

export interface Pos {
  r: number;
  c: number;
}

export type SpeciesId = "crab" | "octopus" | "jellyfish" | "fish" | "shark";

export type Dir = "above" | "below" | "left" | "right";

/** What a creature claims. Counts never include the speaker itself. */
export type Statement =
  /** Crab: number of mimics among the 4 orthogonal neighbours. */
  | { kind: "neighbors"; n: number }
  /** Octopus: number of mimics among the OTHER creatures in its row. */
  | { kind: "row"; n: number }
  /** Jellyfish: number of mimics among the OTHER creatures in its column. */
  | { kind: "column"; n: number }
  /** Fish: points at one orthogonal neighbour and vouches for / accuses it. */
  | { kind: "point"; dir: Dir; target: Pos; honest: boolean }
  /** Shark: number of mimics among its diagonal neighbours. */
  | { kind: "diagonals"; n: number };

export interface SpeciesDef {
  id: SpeciesId;
  name: string;
  emoji: string;
  /** One-liner shown in the codex: what this species talks about. */
  blurb: string;
}

export interface Creature {
  id: string;
  pos: Pos;
  species: SpeciesId;
  statement: Statement;
  /** Hidden truth. Never shown to the player until revealed. */
  isMimic: boolean;
}

export interface Puzzle {
  size: number;
  mimicCount: number;
  creatures: Creature[];
  seed: number;
}

/** Player's pencil mark on a cell (Dupery-style right-click cycle). */
export type Mark = "none" | "suspect" | "safe";

export type Reveal = "hidden" | "mimic" | "honest";
