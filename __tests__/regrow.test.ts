import { describe, it, expect } from "vitest";
import { createEnemy, applyRegrow } from "@/hooks/enemy-ai";
import { REGROW_AMOUNT } from "@/data/game-data";
import { T } from "./helpers";

describe("Crab Regrow ability", () => {
  it("crabs have the regrow ability", () => {
    const crab = createEnemy({ x: 0, y: 0 }, "crab");
    expect(crab.abilities).toContain("regrow");
  });

  it("heals a damaged crab by REGROW_AMOUNT and emits a heal animation", () => {
    const crab = createEnemy({ x: 0, y: 0 }, "crab");
    crab.health = 2;

    const { animations } = applyRegrow([crab]);

    expect(crab.health).toBe(2 + REGROW_AMOUNT);
    expect(animations).toEqual([{ type: "heal", unitId: crab.id }]);
  });

  it("never heals past maxHealth and emits nothing when already full", () => {
    const crab = createEnemy({ x: 0, y: 0 }, "crab");
    expect(crab.health).toBe(T.crab.health); // full

    const { animations } = applyRegrow([crab]);

    expect(crab.health).toBe(T.crab.health);
    expect(animations).toHaveLength(0);
  });

  it("does not heal enemies without the ability", () => {
    const fish = createEnemy({ x: 0, y: 0 }, "fish");
    fish.maxHealth = 10;
    fish.health = 3;

    const { animations } = applyRegrow([fish]);

    expect(fish.health).toBe(3);
    expect(animations).toHaveLength(0);
  });
});
