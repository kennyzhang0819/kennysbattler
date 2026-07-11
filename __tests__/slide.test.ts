import { describe, it, expect } from "vitest";
import { createEnemy, resolveSlide } from "@/hooks/enemy-ai";
import { makePlayer, T } from "./helpers";

describe("2048 slide + slam", () => {
  it("YOU slides to the wall when nothing is in the way", () => {
    const player = makePlayer({ x: 0, y: 0 });
    const result = resolveSlide("left", [], player);

    expect(result.player.position).toEqual({ x: -2, y: 0 });
    expect(result.moved).toBe(true);
  });

  it("YOU slams the first enemy ahead, dealing attack and taking no damage", () => {
    const player = makePlayer({ x: 0, y: 0 }, 5); // attack 5
    const crab = createEnemy({ x: 2, y: 0 }, "crab"); // hp 6

    const result = resolveSlide("right", [crab], player);

    const hitCrab = result.enemies.find((e) => e.id === crab.id)!;
    expect(hitCrab.health).toBe(T.crab.health - 5); // 6 - 5 = 1
    // YOU stops directly behind the enemy (which sits at the wall x=2).
    expect(result.player.position).toEqual({ x: 1, y: 0 });
    expect(result.moved).toBe(true);
  });

  it("a slam that reduces the enemy to 0 kills it and awards points", () => {
    const player = makePlayer({ x: 0, y: 0 }, 10); // attack 10 > crab hp
    const crab = createEnemy({ x: 1, y: 0 }, "crab");

    const result = resolveSlide("right", [crab], player);

    expect(result.enemies.find((e) => e.id === crab.id)).toBeUndefined();
    expect(result.killedIds).toContain(crab.id);
    expect(result.killed).toHaveLength(1);
    expect(result.earnedPoints).toBe(T.crab.points);
  });

  it("slamming an adjacent wall-enemy in place still counts as a move", () => {
    const player = makePlayer({ x: 1, y: 0 }, 5);
    const crab = createEnemy({ x: 2, y: 0 }, "crab"); // already adjacent, against the wall

    const result = resolveSlide("right", [crab], player);

    expect(result.player.position).toEqual({ x: 1, y: 0 }); // didn't move
    expect(result.enemies.find((e) => e.id === crab.id)!.health).toBe(T.crab.health - 5);
    expect(result.moved).toBe(true);
  });

  it("enemies behind YOU are not slammed (YOU only strikes forward)", () => {
    const player = makePlayer({ x: 0, y: 0 }, 5);
    const crab = createEnemy({ x: -1, y: 0 }, "crab"); // behind YOU for a rightward press

    const result = resolveSlide("right", [crab], player);

    expect(result.enemies.find((e) => e.id === crab.id)!.health).toBe(T.crab.health);
    expect(result.player.position).toEqual({ x: 2, y: 0 });
  });

  it("a wall press with nothing to do does not count as a move", () => {
    const player = makePlayer({ x: -2, y: 0 }, 5);
    const result = resolveSlide("left", [], player);
    expect(result.moved).toBe(false);
  });

  it("LIKE enemies stack into a bigger version of the SAME species (no evolve)", () => {
    const player = makePlayer({ x: 0, y: 2 }); // different lane
    const fishes = [
      createEnemy({ x: -2, y: 0 }, "fish"),
      createEnemy({ x: -1, y: 0 }, "fish"),
    ];

    const result = resolveSlide("left", fishes, player);
    const lane = result.enemies.filter((e) => e.position.y === 0);

    expect(lane).toHaveLength(1);
    expect(lane[0].templateId).toBe("fish"); // stays a fish — does not evolve
    expect(lane[0].stackCount).toBe(2);
    expect(lane[0].health).toBe(T.fish.health * 2); // stats pooled
    expect(lane[0].maxHealth).toBe(T.fish.health * 2);
  });

  it("unlike enemies do NOT merge — they just stack", () => {
    const player = makePlayer({ x: 0, y: 2 });
    const fish = createEnemy({ x: -2, y: 0 }, "fish");
    const crab = createEnemy({ x: -1, y: 0 }, "crab");

    const result = resolveSlide("left", [fish, crab], player);
    const lane = result.enemies.filter((e) => e.position.y === 0);

    expect(lane).toHaveLength(2);
    expect(lane.map((e) => e.templateId).sort()).toEqual(["crab", "fish"]);
  });

  it("only merges one pair per tile per slide (three fish → 2×fish + fish)", () => {
    const player = makePlayer({ x: 0, y: 2 });
    const fishes = [
      createEnemy({ x: -2, y: 0 }, "fish"),
      createEnemy({ x: -1, y: 0 }, "fish"),
      createEnemy({ x: 0, y: 0 }, "fish"),
    ];

    const result = resolveSlide("left", fishes, player);
    const lane = result.enemies.filter((e) => e.position.y === 0);

    expect(lane).toHaveLength(2);
    expect(lane.every((e) => e.templateId === "fish")).toBe(true);
    expect(lane.map((e) => e.stackCount).sort()).toEqual([1, 2]);
  });
});
