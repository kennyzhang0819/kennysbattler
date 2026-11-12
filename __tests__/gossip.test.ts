import { describe, it, expect } from "vitest";
import {
  ANIMALS,
  Case,
  candidates,
  caseOptions,
  clueHolds,
  generateCase,
  heardWords,
  normalize,
  trace,
  reverse,
  rotate,
  swapPairs,
  swapEnds,
  eatFirst,
} from "@/lib/gossip/engine";
import { WORDS } from "@/lib/gossip/words";

describe("primitive ops", () => {
  it("do what they say", () => {
    expect(reverse("CRAB")).toBe("BARC");
    expect(rotate("CRAB")).toBe("RABC");
    expect(rotate("CRAB", 2)).toBe("ABCR");
    expect(rotate("CRAB", -1)).toBe("BCRA");
    expect(swapEnds("CRAB")).toBe("BRAC");
    expect(swapPairs("CRAB")).toBe("RCBA");
    expect(swapPairs("CRABS")).toBe("RCBAS");
    expect(swapPairs(swapPairs("WHALE"))).toBe("WHALE");
    expect(eatFirst("CRAB")).toBe("RAB");
  });
});

function board(p: Partial<Case> & Pick<Case, "parrot" | "dir" | "you" | "animals" | "word">): Case {
  return { size: 3, heard: [], answer: p.word, ...p };
}

/** Temporarily give a species other output turns (for fan-out tests). */
function withTurns(id: keyof typeof ANIMALS, turns: NonNullable<(typeof ANIMALS)[keyof typeof ANIMALS]["turns"]>, fn: () => void) {
  const old = ANIMALS[id].turns;
  ANIMALS[id].turns = turns;
  try {
    fn();
  } finally {
    ANIMALS[id].turns = old;
  }
}

describe("streams", () => {
  it("travels straight, hits animals in order, ends at you", () => {
    // parrot (0,0) → crab (0,1) turns clockwise → down → octopus (1,1) straight → you (2,1)
    const c = board({
      parrot: { r: 0, c: 0 },
      dir: "right",
      you: { r: 2, c: 1 },
      animals: [
        { animal: "crab", pos: { r: 0, c: 1 } },
        { animal: "octopus", pos: { r: 1, c: 1 } },
      ],
      word: "CAT",
    });
    const b = trace(c);
    expect(b.arrivals.length).toBe(1);
    const s = b.arrivals[0];
    expect(s.steps.map((x) => x.index)).toEqual([0, 1]);
    expect(s.steps[0]).toMatchObject({ before: "CAT", after: "TAC" });
    expect(s.steps[1]).toMatchObject({ before: "TAC", after: "CTA" }); // neighbours: crab + you → ×2
    expect(s.arrival).toMatchObject({ side: "above", word: "CTA" });
    expect(heardWords(c)).toEqual(["CTA"]);
  });

  it("output direction is a species rule relative to the incoming direction", () => {
    // fish turns counter-clockwise: coming up, it outputs left → off the map
    const off = board({ parrot: { r: 2, c: 0 }, dir: "up", you: { r: 1, c: 2 }, animals: [{ animal: "fish", pos: { r: 1, c: 0 } }], word: "CAT" });
    expect(trace(off).arrivals).toEqual([]);
    // crab turns clockwise: coming up, it outputs right → you
    const ok = board({ parrot: { r: 2, c: 0 }, dir: "up", you: { r: 1, c: 2 }, animals: [{ animal: "crab", pos: { r: 1, c: 0 } }], word: "CAT" });
    expect(heardWords(ok)).toEqual(["TAC"]);
  });

  it("passes through helpful animals", () => {
    const c = board({
      parrot: { r: 0, c: 0 },
      dir: "right",
      you: { r: 0, c: 2 },
      animals: [{ animal: "bee", pos: { r: 0, c: 1 }, clue: { kind: "contains", letter: "C" } }],
      word: "CAT",
    });
    expect(heardWords(c)).toEqual(["CAT"]);
  });

  it("a species with two output turns fans out; you hear both in arrival order", () => {
    withTurns("octopus", ["straight", "cw"], () => {
      // parrot (0,0) → octopus (0,1): straight → crab (0,2) ↓ crab (1,2) ← you (1,1); and clockwise → down → you (1,1)
      const c = board({
        parrot: { r: 0, c: 0 },
        dir: "right",
        you: { r: 1, c: 1 },
        animals: [
          { animal: "octopus", pos: { r: 0, c: 1 } },
          { animal: "crab", pos: { r: 0, c: 2 } },
          { animal: "crab", pos: { r: 1, c: 2 } },
        ],
        word: "CRAB",
      });
      const b = trace(c);
      expect(b.arrivals.map((s) => s.arrival!.side)).toEqual(["above", "right"]);
      expect(b.arrivals[0].arrival!.word).toBe("BCRA"); // octopus: parrot + crab + you → ×3
      expect(b.arrivals[1].steps.map((s) => s.index)).toEqual([0, 1, 2]);
      expect(b.arrivals[1].arrival!.word).toBe("BCRA"); // reversed twice
    });
  });

  it("loops end instead of hanging", () => {
    // four crabs in a square, each turning clockwise: the word goes round until its state repeats
    const c = board({
      parrot: { r: 0, c: 1 },
      dir: "down",
      you: { r: 0, c: 0 },
      animals: [
        { animal: "crab", pos: { r: 1, c: 1 } },
        { animal: "crab", pos: { r: 1, c: 2 } },
        { animal: "crab", pos: { r: 2, c: 2 } },
        { animal: "crab", pos: { r: 2, c: 1 } },
      ],
      word: "CAT",
    });
    const b = trace(c);
    expect(b.arrivals).toEqual([]);
    expect(b.streams.length).toBe(1);
  });
});

describe("deduction", () => {
  it("a shark alone leaves 26 candidates; an owl cuts it to one", () => {
    const base = board({
      parrot: { r: 0, c: 0 },
      dir: "right",
      you: { r: 0, c: 2 },
      animals: [{ animal: "shark", pos: { r: 0, c: 1 } }],
      word: "SOCK",
    });
    const heard = heardWords(base);
    expect(heard).toEqual(["OCK"]);
    expect(candidates({ ...base, heard }).length).toBe(26);
    const withOwl = { ...base, heard, animals: [...base.animals, { animal: "owl" as const, pos: { r: 2, c: 0 }, clue: { kind: "letter" as const, index: 0, letter: "S" } }] };
    expect(candidates(withOwl)).toEqual(["SOCK"]);
  });

  it("a second stream can replace a helpful animal", () => {
    withTurns("octopus", ["straight", "cw"], () => {
      // octopus (0,1) → down to you (1,1) [clean], and straight → shark (0,2) → crab (0,3) ↓ crab (1,3) ← you
      const c = board({
        parrot: { r: 0, c: 0 },
        dir: "right",
        you: { r: 1, c: 1 },
        animals: [
          { animal: "octopus", pos: { r: 0, c: 1 } },
          { animal: "shark", pos: { r: 0, c: 2 } },
          { animal: "crab", pos: { r: 0, c: 3 } },
          { animal: "crab", pos: { r: 1, c: 3 } },
        ],
        word: "SOCK",
      });
      const heard = heardWords(c);
      expect(heard.length).toBe(2);
      expect(candidates({ ...c, heard })).toEqual(["SOCK"]);
    });
  });

  it("clues hold", () => {
    expect(clueHolds({ kind: "letter", index: 1, letter: "O" }, "SOCK")).toBe(true);
    expect(clueHolds({ kind: "length", n: 4 }, "SOCK")).toBe(true);
    expect(clueHolds({ kind: "contains", letter: "Z" }, "SOCK")).toBe(false);
  });
});

describe("generator", () => {
  it("builds boards where every beam animal is hit and the word is uniquely deducible", () => {
    for (let caseNo = 1; caseNo <= 12; caseNo++) {
      for (let seed = 1; seed <= 15; seed++) {
        const opts = caseOptions(caseNo, seed * 100 + caseNo);
        const c = generateCase(opts);
        expect(c, `case ${caseNo} seed ${seed}`).not.toBeNull();
        const b = trace(c!);
        expect(b.arrivals.length).toBeGreaterThanOrEqual(1);
        const hit = new Set(b.streams.flatMap((s) => s.steps.map((st) => st.index)));
        c!.animals.forEach((a, i) => {
          if (ANIMALS[a.animal].tier === "helpful") expect(clueHolds(a.clue!, c!.word)).toBe(true);
          else {
            expect(hit.has(i)).toBe(true);
            expect(ANIMALS[a.animal].turns).toBeDefined();
          }
        });
        expect(c!.heard).toEqual(heardWords(c!));
        expect(c!.heard).not.toContain(c!.word);
        expect(candidates(c!)).toEqual([c!.word]);
      }
    }
  });

  it("words are uppercase letters only and unique", () => {
    for (const w of WORDS) expect(w).toMatch(/^[A-Z]{3,5}$/);
    expect(new Set(WORDS).size).toBe(WORDS.length);
  });

  it("normalizes", () => {
    expect(normalize("  s-ock \n")).toBe("SOCK");
  });
});

describe("species", () => {
  it("appear at most once per board", () => {
    for (let caseNo = 1; caseNo <= 12; caseNo++) {
      const c = generateCase(caseOptions(caseNo, 7 * 100 + caseNo))!;
      const ids = c.animals.map((a) => a.animal);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
