import { mulberry32, pick, shuffle } from "@/lib/deduction/rng";
import { WORDS } from "./words";

// ---------------------------------------------------------------------------
// Animal Gossip — beam edition.
//
// The PARROT outputs a word in one direction. The word travels in a straight
// line. When it hits an animal, the animal changes it and outputs the result
// in each of ITS output directions (one or several). Streams can fan out,
// cross, and even loop; every stream that reaches YOU is a word you hear.
//
// Tiers:
//   helpful   – not on a beam; says a true fact about the original word
//   transform – changes the word with no loss
//   lossy     – loses information; other streams / helpful animals make up for it
//   evil      – reserved
//
// The generator guarantees the original is the ONLY letter string consistent
// with every word you hear plus every helpful fact.
// ---------------------------------------------------------------------------

export interface Pos {
  r: number;
  c: number;
}

export type Dir = "up" | "right" | "down" | "left";
export const DIRS: Dir[] = ["up", "right", "down", "left"];
export const DIR_VEC: Record<Dir, Pos> = {
  up: { r: -1, c: 0 },
  right: { r: 0, c: 1 },
  down: { r: 1, c: 0 },
  left: { r: 0, c: -1 },
};
export const DIR_ARROW: Record<Dir, string> = { up: "↑", right: "→", down: "↓", left: "←" };
export const DIR_NAME: Record<Dir, string> = { up: "up", right: "right", down: "down", left: "left" };

/** How a species changes the direction of what it outputs, relative to what came in. */
export type Turn = "straight" | "cw" | "ccw" | "back";
export const TURN_TEXT: Record<Turn, string> = {
  straight: "Gossips straight on.",
  cw: "Gossips to its right, facing the way the word came in.",
  ccw: "Gossips to its left, facing the way the word came in.",
  back: "Gossips back the way the word came in.",
};
export function turn(d: Dir, t: Turn): Dir {
  const i = DIRS.indexOf(d);
  if (t === "cw") return DIRS[(i + 1) % 4];
  if (t === "ccw") return DIRS[(i + 3) % 4];
  if (t === "back") return DIRS[(i + 2) % 4];
  return d;
}

/** Which side of YOU a stream arrives from, given its travel direction. */
export type Side = "above" | "left" | "right" | "below";
export const SIDE_ORDER: Side[] = ["above", "left", "right", "below"];
export const SIDE_ARROW: Record<Side, string> = { above: "↓", left: "→", right: "←", below: "↑" };
const ARRIVES_FROM: Record<Dir, Side> = { down: "above", right: "left", left: "right", up: "below" };

export type Tier = "helpful" | "transform" | "lossy" | "evil";

export type AnimalId = "crab" | "octopus" | "fish" | "shrimp" | "shark" | "owl" | "turtle" | "bee";

export interface AnimalDef {
  id: AnimalId;
  name: string;
  emoji: string;
  tier: Tier;
  /** Short rule for the board cell. */
  rule: string;
  /** Full rule for the side panel. */
  detail: string;
  /** Beam animals: output direction(s) relative to the incoming direction. Several = fan out. */
  turns?: Turn[];
}

export const ANIMALS: Record<AnimalId, AnimalDef> = {
  crab: { id: "crab", name: "Crab", emoji: "🦀", tier: "transform", rule: "reverses the word", detail: "Reverses the word.", turns: ["cw"] },
  octopus: {
    id: "octopus",
    name: "Octopus",
    emoji: "🐙",
    tier: "transform",
    rule: "first letter → end, ×neighbours",
    detail: "Moves the first letter to the end, once per neighbour.",
    turns: ["straight"],
  },
  fish: { id: "fish", name: "Fish", emoji: "🐠", tier: "transform", rule: "swaps first & last", detail: "Swaps the first and last letters.", turns: ["ccw"] },
  shrimp: {
    id: "shrimp",
    name: "Shrimp",
    emoji: "🦐",
    tier: "transform",
    rule: "swaps letter pairs",
    detail: "Swaps letters in pairs: 1st↔2nd, 3rd↔4th. An odd last letter stays.",
    turns: ["straight"],
  },
  shark: { id: "shark", name: "Shark", emoji: "🦈", tier: "lossy", rule: "eats first letter", detail: "Eats the first letter.", turns: ["straight"] },
  owl: { id: "owl", name: "Owl", emoji: "🦉", tier: "helpful", rule: "", detail: "Tells you one letter of the original word: the position equals its column (1–3)." },
  turtle: { id: "turtle", name: "Turtle", emoji: "🐢", tier: "helpful", rule: "", detail: "Tells you how many letters the original word has." },
  bee: { id: "bee", name: "Bee", emoji: "🐝", tier: "helpful", rule: "", detail: "Tells you one letter the original word contains." },
};

export const ANIMAL_LIST: AnimalDef[] = Object.values(ANIMALS);
export const TIER_LABEL: Record<Tier, string> = { helpful: "helpful", transform: "transforms", lossy: "lossy", evil: "evil" };

export const PARROT = { emoji: "🦜", name: "Parrot" };
export const PARROT_DIR: Dir = "right";
export const PARROT_RULE = ["Gossips to the right.", "The word travels straight until it hits an animal. It passes through helpful animals."];
export const YOU_RULE = ["You hear every stream that reaches you, in the order they arrive."];

// ---------------------------------------------------------------------------
// Geometry & primitive ops
// ---------------------------------------------------------------------------

export function dist(a: Pos, b: Pos): number {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
}
export function same(a: Pos, b: Pos): boolean {
  return a.r === b.r && a.c === b.c;
}
export function reverse(w: string): string {
  return [...w].reverse().join("");
}
export function rotate(w: string, times = 1): string {
  if (w.length === 0) return w;
  let out = w;
  const k = ((times % w.length) + w.length) % w.length;
  for (let i = 0; i < k; i++) out = out.slice(1) + out[0];
  return out;
}
export function swapEnds(w: string): string {
  return w.length < 2 ? w : w[w.length - 1] + w.slice(1, -1) + w[0];
}
/** Swap letters in pairs: ABCDE → BADCE. Self-inverse. */
export function swapPairs(w: string): string {
  const a = [...w];
  for (let i = 0; i + 1 < a.length; i += 2) [a[i], a[i + 1]] = [a[i + 1], a[i]];
  return a.join("");
}
export function eatFirst(w: string): string {
  return w.slice(1);
}

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

export interface Placed {
  animal: AnimalId;
  pos: Pos;
  /** Helpful animals: what they say, e.g. "letter 2 is O". */
  clue?: Clue;
}

export type Clue = { kind: "letter"; index: number; letter: string } | { kind: "length"; n: number } | { kind: "contains"; letter: string };

export function clueText(c: Clue): string {
  switch (c.kind) {
    case "letter":
      return `letter ${c.index + 1} is ${c.letter}`;
    case "length":
      return `${c.n} letters`;
    case "contains":
      return `has a ${c.letter}`;
  }
}

export function clueHolds(c: Clue, w: string): boolean {
  switch (c.kind) {
    case "letter":
      return w[c.index] === c.letter;
    case "length":
      return w.length === c.n;
    case "contains":
      return w.includes(c.letter);
  }
}

export interface Case {
  /** Generation region only; the map itself is unbounded. */
  size: number;
  parrot: Pos;
  dir: Dir;
  you: Pos;
  animals: Placed[];
  word: string;
  /** Every word that reached you, in the order they arrived. */
  heard: string[];
  answer: string;
}

/** One hit on an animal. */
export interface Step {
  index: number;
  before: string;
  after: string;
  why: string;
}

/** One stream of the word, from the parrot (or a fork) to wherever it ended. */
export interface Stream {
  /** Where this stream started: the parrot, or the animal it forked from. */
  origin: Pos;
  /** Cells crossed, in order, starting after the origin. */
  path: Pos[];
  /** Every hit along this stream, from the parrot onward (includes inherited hits before a fork). */
  steps: Step[];
  /** Set when the stream reached YOU. */
  arrival?: { side: Side; word: string; hops: number };
}

export interface Beam {
  streams: Stream[];
  /** Streams that reached you, in listening order. */
  arrivals: Stream[];
}

/** Safety caps for loops and fan-out. */
export const MAX_HOPS = 40;
export const MAX_STREAMS = 64;

function neighbourCount(c: Case, p: Pos): number {
  let n = 0;
  for (const d of DIRS) {
    const q = { r: p.r + DIR_VEC[d].r, c: p.c + DIR_VEC[d].c };
    if (same(q, c.you) || same(q, c.parrot) || c.animals.some((a) => same(a.pos, q))) n++;
  }
  return n;
}

/** The map is unbounded; a stream that leaves the box around everything can never hit anything again. */
export function bounds(c: Case): { minR: number; maxR: number; minC: number; maxC: number } {
  const all = [c.parrot, c.you, ...c.animals.map((a) => a.pos)];
  return {
    minR: Math.min(...all.map((p) => p.r)),
    maxR: Math.max(...all.map((p) => p.r)),
    minC: Math.min(...all.map((p) => p.c)),
    maxC: Math.max(...all.map((p) => p.c)),
  };
}

function apply(c: Case, index: number, w: string): { after: string; why: string } {
  const { animal, pos } = c.animals[index];
  switch (animal) {
    case "crab":
      return { after: reverse(w), why: "reversed" };
    case "octopus": {
      const n = neighbourCount(c, pos);
      return { after: rotate(w, n), why: `${n} neighbour${n === 1 ? "" : "s"}` };
    }
    case "fish":
      return { after: swapEnds(w), why: "swapped ends" };
    case "shrimp":
      return { after: swapPairs(w), why: "swapped pairs" };
    case "shark":
      return { after: eatFirst(w), why: "ate 1 letter" };
    default:
      return { after: w, why: "" };
  }
}

/** Inverse of `apply`: every word that could have produced `w`. */
function unapply(c: Case, index: number, w: string): string[] {
  const { animal, pos } = c.animals[index];
  switch (animal) {
    case "crab":
      return [reverse(w)];
    case "octopus":
      return [rotate(w, -neighbourCount(c, pos))];
    case "fish":
      return [swapEnds(w)];
    case "shrimp":
      return [swapPairs(w)];
    case "shark":
      return LETTERS.map((L) => L + w);
    default:
      return [w];
  }
}

const LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

/**
 * Trace every stream of the word. A stream travels straight; hitting a beam
 * animal applies its op and forks one stream per output direction. Streams
 * that leave the board, exceed MAX_HOPS, or repeat an exact (cell, dir, word)
 * state are dropped. Streams reaching YOU are collected as arrivals.
 */
export function trace(c: Case, word: string = c.word): Beam {
  const streams: Stream[] = [];
  const arrivals: Stream[] = [];
  type Work = { pos: Pos; dir: Dir; w: string; steps: Step[]; hops: number; seen: Set<string> };
  const queue: Work[] = [{ pos: { ...c.parrot }, dir: c.dir, w: word, steps: [], hops: 0, seen: new Set() }];
  const box = bounds(c);

  while (queue.length && streams.length < MAX_STREAMS) {
    const s = queue.shift()!;
    let { pos, dir, w } = s;
    const origin = { ...pos };
    const path: Pos[] = [];
    const steps = [...s.steps];
    const seen = new Set(s.seen);
    let hops = s.hops;
    let ended = false;

    while (!ended) {
      pos = { r: pos.r + DIR_VEC[dir].r, c: pos.c + DIR_VEC[dir].c };
      hops++;
      if (pos.r < box.minR || pos.r > box.maxR || pos.c < box.minC || pos.c > box.maxC || hops > MAX_HOPS) {
        streams.push({ origin, path, steps });
        ended = true;
        break;
      }
      const key = `${pos.r},${pos.c},${dir},${w}`;
      if (seen.has(key)) {
        streams.push({ origin, path, steps }); // exact repeat: would loop forever
        ended = true;
        break;
      }
      seen.add(key);
      path.push(pos);
      if (same(pos, c.you)) {
        const st: Stream = { origin, path, steps, arrival: { side: ARRIVES_FROM[dir], word: w, hops } };
        streams.push(st);
        arrivals.push(st);
        ended = true;
        break;
      }
      if (same(pos, c.parrot)) continue; // passes through its own parrot
      const i = c.animals.findIndex((a) => same(a.pos, pos));
      if (i < 0) continue;
      const placed = c.animals[i];
      if (ANIMALS[placed.animal].tier === "helpful") continue;
      const { after, why } = apply(c, i, w);
      steps.push({ index: i, before: w, after, why });
      w = after;
      if (w.length === 0) {
        streams.push({ origin, path, steps });
        ended = true;
        break;
      }
      const outs = (ANIMALS[placed.animal].turns ?? ["straight"]).map((t) => turn(dir, t));
      if (outs.length === 1) {
        dir = outs[0];
        continue;
      }
      // Fork: one new stream per output; this one ends here.
      for (const d of outs) queue.push({ pos, dir: d, w, steps: [...steps], hops, seen: new Set(seen) });
      streams.push({ origin, path, steps });
      ended = true;
    }
  }

  // Listening order = arrival order (fewest hops first). Side only breaks ties.
  arrivals.sort((a, b) => a.arrival!.hops - b.arrival!.hops || SIDE_ORDER.indexOf(a.arrival!.side) - SIDE_ORDER.indexOf(b.arrival!.side));
  return { streams, arrivals };
}

export function heardWords(c: Case, word: string = c.word): string[] {
  return trace(c, word).arrivals.map((s) => s.arrival!.word);
}

// ---------------------------------------------------------------------------
// Deduction check — every letter string consistent with the board.
// Each arriving stream is walked backwards (a shark fans out ×26); the sets
// from all streams are intersected, then filtered by helpful clues.
// ---------------------------------------------------------------------------

export function candidates(c: Case, heard: string[] = c.heard): string[] {
  const probe = trace(c, "X".repeat(Math.max(...heard.map((h) => h.length), 1) + 5)); // ops don't depend on letters
  if (probe.arrivals.length !== heard.length) return [];
  let result: Set<string> | null = null;
  probe.arrivals.forEach((stream, k) => {
    let set = [heard[k]];
    for (let s = stream.steps.length - 1; s >= 0; s--) {
      const next: string[] = [];
      for (const w of set) next.push(...unapply(c, stream.steps[s].index, w));
      set = next;
    }
    const here = new Set(set);
    result = result === null ? here : new Set([...result].filter((w) => here.has(w)));
  });
  const clues = c.animals.filter((a) => a.clue).map((a) => a.clue!);
  return [...(result ?? new Set<string>())].filter((w) => clues.every((cl) => clueHolds(cl, w)));
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

export interface CaseOptions {
  size: number;
  transform: number;
  lossy: number;
  helpful: number;
  seed: number;
  /** Generation attempts before giving up (default 20000). */
  attempts?: number;
}

const TRANSFORMERS: AnimalId[] = ["crab", "octopus", "fish", "shrimp"];
const HELPERS: AnimalId[] = ["owl", "bee"];

function makeClue(rng: () => number, id: AnimalId, pos: Pos, word: string): Clue | null {
  switch (id) {
    case "owl":
      return pos.c < word.length ? { kind: "letter", index: pos.c, letter: word[pos.c] } : null;
    case "turtle":
      return { kind: "length", n: word.length };
    case "bee":
      return { kind: "contains", letter: pick(rng, [...word]) };
    default:
      return null;
  }
}

export function generateCase(opts: CaseOptions): Case | null {
  const rng = mulberry32(opts.seed);
  const cells: Pos[] = [];
  for (let r = 0; r < opts.size; r++) for (let c = 0; c < opts.size; c++) cells.push({ r, c });
  const inBounds = (p: Pos) => p.r >= 0 && p.r < opts.size && p.c >= 0 && p.c < opts.size;

  for (let attempt = 0; attempt < (opts.attempts ?? 20000); attempt++) {
    const parrot = pick(rng, cells);
    const startDir = PARROT_DIR;
    let dir = startDir;

    const beamIds: AnimalId[] = [];
    // Each species at most once per board.
    beamIds.push(...shuffle(rng, TRANSFORMERS).slice(0, opts.transform));
    for (let i = 0; i < opts.lossy; i++) beamIds.push("shark");
    const order = shuffle(rng, beamIds);

    // Walk one stream from the parrot, dropping animals along it; YOU goes
    // where the walk stops. (Multi-output animals can be added on top later.)
    const used = new Set<string>([`${parrot.r},${parrot.c}`]);
    const animals: Placed[] = [];
    let pos = { ...parrot };
    let placed = 0;
    let you: Pos | null = null;
    let failed = false;
    for (let guard = 0; guard < 40 && !failed; guard++) {
      pos = { r: pos.r + DIR_VEC[dir].r, c: pos.c + DIR_VEC[dir].c };
      if (!inBounds(pos) || used.has(`${pos.r},${pos.c}`)) {
        failed = true;
        break;
      }
      const ahead = { r: pos.r + DIR_VEC[dir].r, c: pos.c + DIR_VEC[dir].c };
      const canContinue = inBounds(ahead) && !used.has(`${ahead.r},${ahead.c}`);
      if (placed === order.length) {
        if (!canContinue || rng() < 0.5) {
          you = pos;
          break;
        }
        continue;
      }
      if (!canContinue || rng() < 0.6) {
        // Drop whichever remaining animal's species rule sends the word somewhere usable.
        const fits = (id: AnimalId) => {
          const d = turn(dir, (ANIMALS[id].turns ?? ["straight"])[0]);
          const q = { r: pos.r + DIR_VEC[d].r, c: pos.c + DIR_VEC[d].c };
          return inBounds(q) && !used.has(`${q.r},${q.c}`);
        };
        const k = order.findIndex((id, i) => i >= placed && fits(id));
        if (k < 0) {
          failed = true;
          break;
        }
        [order[placed], order[k]] = [order[k], order[placed]];
        const id = order[placed++];
        used.add(`${pos.r},${pos.c}`);
        dir = turn(dir, (ANIMALS[id].turns ?? ["straight"])[0]);
        animals.push({ animal: id, pos });
      }
    }
    if (failed || !you) continue;
    used.add(`${you.r},${you.c}`);

    const free = shuffle(rng, cells.filter((p) => !used.has(`${p.r},${p.c}`)));
    if (free.length < opts.helpful) continue;
    shuffle(rng, HELPERS).slice(0, opts.helpful).forEach((animal, i) => animals.push({ animal, pos: free[i] }));

    const word = pick(rng, WORDS);
    if (opts.lossy > 0 && word.length < 4) continue;

    const base: Case = { size: opts.size, parrot, dir: startDir, you, animals, word, heard: [], answer: word };
    let ok = true;
    for (const a of base.animals) {
      if (ANIMALS[a.animal].tier !== "helpful") continue;
      const clue = makeClue(rng, a.animal, a.pos, word);
      if (!clue) ok = false;
      a.clue = clue ?? undefined;
    }
    if (!ok) continue;

    const beam = trace(base);
    if (beam.arrivals.length === 0) continue;
    const hitSet = new Set(beam.streams.flatMap((s) => s.steps.map((st) => st.index)));
    const beamAnimals = base.animals.map((a, i) => ({ a, i })).filter(({ a }) => ANIMALS[a.animal].tier !== "helpful");
    if (!beamAnimals.every(({ i }) => hitSet.has(i))) continue;
    if (base.animals.some((a) => a.animal === "octopus" && neighbourCount(base, a.pos) % word.length === 0)) continue;
    const heard = beam.arrivals.map((s) => s.arrival!.word);
    if (heard.includes(word)) continue;

    const withHeard: Case = { ...base, heard };
    const cands = candidates(withHeard);
    if (cands.length !== 1 || cands[0] !== word) continue;

    return withHeard;
  }
  return null;
}

/** Difficulty curve. */
export function caseOptions(caseNo: number, seed: number): CaseOptions {
  // The map is unbounded; `size` is just how much room the generator uses.
  if (caseNo <= 2) return { size: 3, transform: 2, lossy: 0, helpful: 0, seed };
  if (caseNo <= 4) return { size: 3, transform: 3, lossy: 0, helpful: 0, seed };
  if (caseNo <= 6) return { size: 3, transform: 2, lossy: 1, helpful: 1, seed };
  if (caseNo <= 9) return { size: 4, transform: 3, lossy: 1, helpful: 1, seed };
  return { size: 4, transform: 3, lossy: 1, helpful: 2, seed };
}

export function normalize(s: string): string {
  return s.trim().toUpperCase().replace(/[^A-Z ]/g, "").replace(/\s+/g, " ");
}

/** Worked example for the side panel. */
export function example(id: AnimalId): string {
  switch (id) {
    case "crab":
      return `CRAB → ${reverse("CRAB")}`;
    case "octopus":
      return `CRAB → ${rotate("CRAB")} (×1)`;
    case "fish":
      return `CRAB → ${swapEnds("CRAB")}`;
    case "shrimp":
      return `CRAB → ${swapPairs("CRAB")}`;
    case "shark":
      return `CRAB → ${eatFirst("CRAB")}`;
    default:
      return "";
  }
}
