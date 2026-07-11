import { describe, it, expect } from "vitest";
import { createEnemy, resolveSlide, applyItemTurnDamage } from "@/hooks/enemy-ai";
import { computeMods, rollChoices, ITEM_LIST } from "@/data/items";
import { xpForLevel } from "@/data/game-data";
import { makePlayer } from "./helpers";
import { Inventory } from "@/types/game";

describe("computeMods aggregation", () => {
  it("stacks each item's effect additively", () => {
    const inv: Inventory = { sharktooth: 2, harpoon: 3, riptide: 2, tome: 2, whirlpool: 1, tempest: 4, cleaver: 1, deeppressure: 2 };
    const m = computeMods(inv);
    expect(m.attackBonus).toBe(6); // 3 * 2
    expect(m.pierce).toBe(3);
    expect(m.splash).toBe(6); // 3 * 2
    expect(m.xpMultiplier).toBeCloseTo(1.5); // 1 + 0.25 * 2
    expect(m.whirlpoolDamage).toBe(4);
    expect(m.tempestDamage).toBe(4);
    expect(m.executeThreshold).toBe(3);
    expect(m.critChance).toBeCloseTo(0.3); // 0.15 * 2
  });

  it("caps crit chance at 0.9", () => {
    expect(computeMods({ deeppressure: 100 }).critChance).toBe(0.9);
  });

  it("returns zeroed mods for an empty inventory", () => {
    const m = computeMods({});
    expect(m).toEqual({
      attackBonus: 0, pierce: 0, splash: 0, critChance: 0,
      executeThreshold: 0, xpMultiplier: 1, whirlpoolDamage: 0, tempestDamage: 0,
    });
  });
});

describe("rollChoices", () => {
  it("returns 3 distinct valid item ids", () => {
    const ids = new Set(ITEM_LIST.map((i) => i.id));
    for (let i = 0; i < 50; i++) {
      const choices = rollChoices(3);
      expect(choices).toHaveLength(3);
      expect(new Set(choices).size).toBe(3);
      for (const c of choices) expect(ids.has(c)).toBe(true);
    }
  });
});

describe("harpoon pierce", () => {
  it("punches through to enemies stacked ahead of the target", () => {
    // Distinct templates so they don't 2048-merge on the way to the wall.
    const player = makePlayer({ x: -1, y: 0 }, 5);
    const front = createEnemy({ x: 1, y: 0 }, "lobster"); // hp 25, nearest the right wall
    const back = createEnemy({ x: 0, y: 0 }, "crab"); // hp 6, the one YOU slam first

    // Without pierce only `back` is hit.
    const plain = resolveSlide("right", [back, front], player);
    expect(plain.enemies.find((e) => e.id === back.id)!.health).toBe(1);
    expect(plain.enemies.find((e) => e.id === front.id)!.health).toBe(25);

    // With pierce 1 the hit carries through to `front` too.
    const pierced = resolveSlide("right", [back, front], player, { pierce: 1 });
    expect(pierced.enemies.find((e) => e.id === back.id)!.health).toBe(1);
    expect(pierced.enemies.find((e) => e.id === front.id)!.health).toBe(20);
  });
});

describe("cleaver execute", () => {
  it("finishes an enemy left at or below the threshold", () => {
    const player = makePlayer({ x: 0, y: 0 }, 5);
    const crab = createEnemy({ x: 1, y: 0 }, "crab"); // hp 6; 6 - 5 = 1 remaining
    const res = resolveSlide("right", [crab], player, { executeThreshold: 3 });
    expect(res.enemies.find((e) => e.id === crab.id)).toBeUndefined();
    expect(res.killedIds).toContain(crab.id);
    expect(res.earnedPoints).toBe(crab.points);
  });
});

describe("deep pressure crit", () => {
  it("doubles slam damage when the roll succeeds", () => {
    const player = makePlayer({ x: 0, y: 0 }, 5);
    const lobster = createEnemy({ x: 1, y: 0 }, "lobster"); // hp 25
    const crit = resolveSlide("right", [lobster], player, { critChance: 1, rng: () => 0 });
    expect(crit.enemies.find((e) => e.id === lobster.id)!.health).toBe(15); // 25 - 10
  });
});

describe("riptide splash", () => {
  it("damages tiles cardinally adjacent to the slam target", () => {
    const player = makePlayer({ x: 0, y: 0 }, 5);
    const target = createEnemy({ x: 1, y: 0 }, "lobster"); // slammed at x=1,y=0
    const neighbor = createEnemy({ x: 1, y: 1 }, "crab"); // hp 6, adjacent below target
    const res = resolveSlide("right", [target, neighbor], player, { splash: 4 });
    expect(res.enemies.find((e) => e.id === neighbor.id)!.health).toBe(2); // 6 - 4
  });
});

describe("applyItemTurnDamage", () => {
  it("tempest hits every enemy; kills award points and are removed", () => {
    const fishes = [createEnemy({ x: 1, y: 1 }, "fish"), createEnemy({ x: -1, y: -1 }, "fish")]; // hp 1 each
    const res = applyItemTurnDamage(fishes, { tempestDamage: 1 });
    expect(res.enemies).toHaveLength(0);
    expect(res.killedIds).toHaveLength(2);
    expect(res.earnedPoints).toBe(2);
  });

  it("whirlpool damages exactly one enemy", () => {
    const crabs = [createEnemy({ x: 1, y: 1 }, "crab"), createEnemy({ x: -1, y: -1 }, "crab")]; // hp 6
    const res = applyItemTurnDamage(crabs, { whirlpoolDamage: 4 }, () => 0); // targets index 0
    expect(res.enemies.find((e) => e.id === crabs[0].id)!.health).toBe(2);
    expect(res.enemies.find((e) => e.id === crabs[1].id)!.health).toBe(6);
  });
});

describe("xp curve", () => {
  it("increases with level", () => {
    expect(xpForLevel(1)).toBe(5);
    expect(xpForLevel(2)).toBe(9);
    expect(xpForLevel(3)).toBe(13);
  });
});
