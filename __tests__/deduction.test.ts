import { describe, it, expect } from "vitest";
import {
  generatePuzzle,
  solve,
  trueMimicSet,
  isConsistent,
  isStatementTrue,
  statementText,
  posKey,
} from "@/lib/deduction/puzzle";
import { Puzzle } from "@/types/deduction";

function setEq(a: Set<string>, b: Set<string>) {
  return a.size === b.size && [...a].every((k) => b.has(k));
}

describe("statement evaluation", () => {
  it("counts exclude the speaker", () => {
    const mimics = new Set(["0,0", "0,1"]);
    // Speaker at (0,0) is itself a mimic; only (0,1) counts for its row.
    expect(isStatementTrue({ kind: "row", n: 1 }, { r: 0, c: 0 }, 3, mimics)).toBe(true);
    expect(isStatementTrue({ kind: "row", n: 2 }, { r: 0, c: 0 }, 3, mimics)).toBe(false);
  });

  it("point statements flip on the target", () => {
    const mimics = new Set(["1,0"]);
    const st = { kind: "point" as const, dir: "below" as const, target: { r: 1, c: 0 }, honest: false };
    expect(isStatementTrue(st, { r: 0, c: 0 }, 3, mimics)).toBe(true);
    expect(isStatementTrue({ ...st, honest: true }, { r: 0, c: 0 }, 3, mimics)).toBe(false);
  });
});

describe("generator", () => {
  it("produces uniquely solvable 3x3 puzzles whose solution is the hidden truth", () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const mimicCount of [2, 3]) {
        const p = generatePuzzle({ size: 3, mimicCount, seed });
        expect(p, `seed ${seed} k ${mimicCount}`).not.toBeNull();
        const sols = solve(p!);
        expect(sols.length).toBe(1);
        expect(setEq(sols[0], trueMimicSet(p!))).toBe(true);
        expect(p!.creatures.filter((c) => c.isMimic).length).toBe(mimicCount);
      }
    }
  });

  it("produces uniquely solvable 4x4 puzzles", () => {
    for (let seed = 1; seed <= 15; seed++) {
      const p = generatePuzzle({ size: 4, mimicCount: 4, seed });
      expect(p).not.toBeNull();
      expect(solve(p!).length).toBe(1);
    }
  });

  it("is deterministic per seed", () => {
    const a = generatePuzzle({ size: 3, mimicCount: 2, seed: 42 })!;
    const b = generatePuzzle({ size: 3, mimicCount: 2, seed: 42 })!;
    expect(a).toEqual(b);
  });

  it("honest creatures tell the truth and mimics lie", () => {
    const p = generatePuzzle({ size: 3, mimicCount: 3, seed: 7 })!;
    const truth = trueMimicSet(p);
    expect(isConsistent(p, truth)).toBe(true);
    for (const c of p.creatures) {
      expect(isStatementTrue(c.statement, c.pos, p.size, truth)).toBe(!c.isMimic);
    }
  });
});

describe("statement text", () => {
  it("renders every kind without throwing", () => {
    const p: Puzzle = generatePuzzle({ size: 3, mimicCount: 2, seed: 3 })!;
    for (const c of p.creatures) {
      const t = statementText(c.statement, c.pos, p.size);
      expect(t.length).toBeGreaterThan(5);
    }
    expect(posKey({ r: 1, c: 2 })).toBe("1,2");
  });
});
