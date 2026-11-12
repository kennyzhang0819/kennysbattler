import {
  Creature,
  Dir,
  Pos,
  Puzzle,
  SpeciesDef,
  SpeciesId,
  Statement,
} from "@/types/deduction";
import { mulberry32, pick, shuffle } from "./rng";

// ---------------------------------------------------------------------------
// Species
// ---------------------------------------------------------------------------

export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  crab: {
    id: "crab",
    name: "Crab",
    emoji: "🦀",
    blurb: "Counts the mimics among its four side-by-side neighbours.",
  },
  octopus: {
    id: "octopus",
    name: "Octopus",
    emoji: "🐙",
    blurb: "Counts the mimics among the other creatures in its row.",
  },
  jellyfish: {
    id: "jellyfish",
    name: "Jellyfish",
    emoji: "🪼",
    blurb: "Counts the mimics among the other creatures in its column.",
  },
  fish: {
    id: "fish",
    name: "Fish",
    emoji: "🐠",
    blurb: "Points at one neighbour and vouches for it, or accuses it.",
  },
  shark: {
    id: "shark",
    name: "Shark",
    emoji: "🦈",
    blurb: "Counts the mimics touching its corners (diagonals).",
  },
};

export const SPECIES_LIST: SpeciesDef[] = Object.values(SPECIES);

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

export function posKey(p: Pos): string {
  return `${p.r},${p.c}`;
}

export function samePos(a: Pos, b: Pos): boolean {
  return a.r === b.r && a.c === b.c;
}

export function inBounds(p: Pos, size: number): boolean {
  return p.r >= 0 && p.r < size && p.c >= 0 && p.c < size;
}

const DIR_VECTORS: Record<Dir, Pos> = {
  above: { r: -1, c: 0 },
  below: { r: 1, c: 0 },
  left: { r: 0, c: -1 },
  right: { r: 0, c: 1 },
};

export function step(p: Pos, dir: Dir): Pos {
  const v = DIR_VECTORS[dir];
  return { r: p.r + v.r, c: p.c + v.c };
}

export function orthogonalNeighbors(p: Pos, size: number): Pos[] {
  return (Object.keys(DIR_VECTORS) as Dir[])
    .map((d) => step(p, d))
    .filter((q) => inBounds(q, size));
}

export function diagonalNeighbors(p: Pos, size: number): Pos[] {
  const out: Pos[] = [];
  for (const dr of [-1, 1]) {
    for (const dc of [-1, 1]) {
      const q = { r: p.r + dr, c: p.c + dc };
      if (inBounds(q, size)) out.push(q);
    }
  }
  return out;
}

export function rowOthers(p: Pos, size: number): Pos[] {
  const out: Pos[] = [];
  for (let c = 0; c < size; c++) if (c !== p.c) out.push({ r: p.r, c });
  return out;
}

export function columnOthers(p: Pos, size: number): Pos[] {
  const out: Pos[] = [];
  for (let r = 0; r < size; r++) if (r !== p.r) out.push({ r, c: p.c });
  return out;
}

/** The cells a statement talks about. */
export function statementScope(st: Statement, speaker: Pos, size: number): Pos[] {
  switch (st.kind) {
    case "neighbors":
      return orthogonalNeighbors(speaker, size);
    case "row":
      return rowOthers(speaker, size);
    case "column":
      return columnOthers(speaker, size);
    case "diagonals":
      return diagonalNeighbors(speaker, size);
    case "point":
      return [st.target];
  }
}

// ---------------------------------------------------------------------------
// Evaluation — is this statement TRUE under a given set of mimics?
// ---------------------------------------------------------------------------

export type MimicSet = Set<string>; // posKeys

function countMimics(cells: Pos[], mimics: MimicSet): number {
  let n = 0;
  for (const c of cells) if (mimics.has(posKey(c))) n++;
  return n;
}

export function isStatementTrue(
  st: Statement,
  speaker: Pos,
  size: number,
  mimics: MimicSet,
): boolean {
  if (st.kind === "point") {
    return mimics.has(posKey(st.target)) !== st.honest;
  }
  return countMimics(statementScope(st, speaker, size), mimics) === st.n;
}

/** A mimic set is consistent iff honest creatures speak truth and mimics lie. */
export function isConsistent(puzzle: Puzzle, mimics: MimicSet): boolean {
  for (const cr of puzzle.creatures) {
    const truthful = isStatementTrue(cr.statement, cr.pos, puzzle.size, mimics);
    const isMimic = mimics.has(posKey(cr.pos));
    if (truthful === isMimic) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Solver — enumerate every K-subset of cells; collect the consistent ones.
// 3x3 with K=3 is C(9,3)=84 subsets; 4x4 with K=4 is 1820. Trivial.
// ---------------------------------------------------------------------------

export function solve(puzzle: Puzzle): MimicSet[] {
  const cells = puzzle.creatures.map((c) => posKey(c.pos));
  const results: MimicSet[] = [];
  const chosen: string[] = [];

  const rec = (start: number) => {
    if (chosen.length === puzzle.mimicCount) {
      const set = new Set(chosen);
      if (isConsistent(puzzle, set)) results.push(set);
      return;
    }
    for (let i = start; i < cells.length; i++) {
      chosen.push(cells[i]);
      rec(i + 1);
      chosen.pop();
    }
  };
  rec(0);
  return results;
}

export function hasUniqueSolution(puzzle: Puzzle): boolean {
  return solve(puzzle).length === 1;
}

export function trueMimicSet(puzzle: Puzzle): MimicSet {
  return new Set(puzzle.creatures.filter((c) => c.isMimic).map((c) => posKey(c.pos)));
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

export interface GenOptions {
  size: number;
  mimicCount: number;
  seed: number;
  /** Restrict which species may appear (defaults to all). */
  species?: SpeciesId[];
  /** Give up after this many attempts (returns null). */
  maxAttempts?: number;
}

/** Pick a wrong count in [0, max] that differs from `truth`. */
function lieCount(rng: () => number, truth: number, max: number): number {
  const options: number[] = [];
  for (let i = 0; i <= max; i++) if (i !== truth) options.push(i);
  return pick(rng, options);
}

function makeStatement(
  rng: () => number,
  species: SpeciesId,
  pos: Pos,
  size: number,
  mimics: MimicSet,
  lie: boolean,
): Statement {
  const counted = (kind: "neighbors" | "row" | "column" | "diagonals"): Statement => {
    const scope = statementScope({ kind, n: 0 }, pos, size);
    const truth = countMimics(scope, mimics);
    const n = lie ? lieCount(rng, truth, scope.length) : truth;
    return { kind, n };
  };

  switch (species) {
    case "crab":
      return counted("neighbors");
    case "octopus":
      return counted("row");
    case "jellyfish":
      return counted("column");
    case "shark":
      return counted("diagonals");
    case "fish": {
      const dirs = (["above", "below", "left", "right"] as Dir[]).filter((d) =>
        inBounds(step(pos, d), size),
      );
      const dir = pick(rng, dirs);
      const target = step(pos, dir);
      const targetIsMimic = mimics.has(posKey(target));
      const honestClaim = lie ? targetIsMimic : !targetIsMimic;
      return { kind: "point", dir, target, honest: honestClaim };
    }
  }
}

function attempt(rng: () => number, opts: GenOptions, seed: number): Puzzle {
  const { size, mimicCount } = opts;
  const speciesPool = opts.species ?? (Object.keys(SPECIES) as SpeciesId[]);

  const cells: Pos[] = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) cells.push({ r, c });

  const mimicCells = shuffle(rng, cells).slice(0, mimicCount);
  const mimics: MimicSet = new Set(mimicCells.map(posKey));

  const creatures: Creature[] = cells.map((pos) => {
    const species = pick(rng, speciesPool);
    const isMimic = mimics.has(posKey(pos));
    return {
      id: `c${pos.r}${pos.c}`,
      pos,
      species,
      isMimic,
      statement: makeStatement(rng, species, pos, size, mimics, isMimic),
    };
  });

  return { size, mimicCount, creatures, seed };
}

/**
 * Generate a puzzle with exactly one solution. Deterministic per seed.
 * Retries with a derived RNG stream until uniqueness holds.
 */
export function generatePuzzle(opts: GenOptions): Puzzle | null {
  const rng = mulberry32(opts.seed);
  const max = opts.maxAttempts ?? 500;
  for (let i = 0; i < max; i++) {
    const p = attempt(rng, opts, opts.seed);
    if (hasUniqueSolution(p)) return p;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------------

const DIR_WORD: Record<Dir, string> = {
  above: "above me",
  below: "below me",
  left: "to my left",
  right: "to my right",
};

export function statementText(st: Statement, speakerPos: Pos, size: number): string {
  const plural = (n: number) => (n === 1 ? "mimic" : "mimics");
  switch (st.kind) {
    case "neighbors":
      return st.n === 0
        ? "None of my neighbours are mimics."
        : `Exactly ${st.n} of my neighbours ${st.n === 1 ? "is a" : "are"} ${plural(st.n)}.`;
    case "row":
      return st.n === 0
        ? "Nobody else in my row is a mimic."
        : `${st.n} other${st.n === 1 ? "" : "s"} in my row ${st.n === 1 ? "is a" : "are"} ${plural(st.n)}.`;
    case "column":
      return st.n === 0
        ? "Nobody else in my column is a mimic."
        : `${st.n} other${st.n === 1 ? "" : "s"} in my column ${st.n === 1 ? "is a" : "are"} ${plural(st.n)}.`;
    case "diagonals": {
      const corners = diagonalNeighbors(speakerPos, size).length;
      if (st.n === 0) return "No mimics touch my corners.";
      if (st.n === corners) {
        return corners === 1 ? "The one at my corner is a mimic." : "Every corner of mine touches a mimic.";
      }
      return `${st.n} ${plural(st.n)} ${st.n === 1 ? "touches" : "touch"} my corners.`;
    }
    case "point":
      return `The one ${DIR_WORD[st.dir]} is ${st.honest ? "honest" : "a mimic"}.`;
  }
}
