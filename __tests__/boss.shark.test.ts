import { describe, it, expect } from "vitest";
import {
  createEnemy,
  mergeInto,
  processEnemyTurn,
  resolveSlide,
} from "@/hooks/enemy-ai";
import { getTemplateTier } from "@/data/game-data";
import { makePlayer, T } from "./helpers";

describe("Shark", () => {

  // -------------------------------------------------------------------------
  // Identity & hierarchy
  // -------------------------------------------------------------------------

  describe("identity & hierarchy", () => {
    it("shark outranks every non-octopus tier", () => {
      expect(getTemplateTier("shark")).toBeGreaterThan(getTemplateTier("coral"));
      expect(getTemplateTier("shark")).toBeGreaterThan(getTemplateTier("jellyfish"));
      expect(getTemplateTier("shark")).toBeGreaterThan(getTemplateTier("crab"));
      expect(getTemplateTier("shark")).toBeGreaterThan(getTemplateTier("fish"));
    });

    it("shark devours first, then attacks", () => {
      const shark = createEnemy({ x: 0, y: 0 }, "shark");
      expect(shark.abilities).toEqual(["devour"]);
      expect(shark.behavior.map((a) => a.kind)).toEqual(["special", "attack"]);
    });

    it("fish merging into shark keeps shark identity", () => {
      const fish = createEnemy({ x: 0, y: 0 }, "fish");
      const shark = createEnemy({ x: 0, y: 0 }, "shark");

      mergeInto(fish, shark);

      expect(shark.templateId).toBe("shark");
      expect(shark.word).toBe(T.shark.word);
      expect(shark.health).toBe(T.fish.health + T.shark.health);
    });

    it("higher tier shark merging into lower tier fish upgrades the target", () => {
      const shark = createEnemy({ x: 0, y: 0 }, "shark");
      const fish = createEnemy({ x: 0, y: 0 }, "fish");

      mergeInto(shark, fish);

      expect(fish.templateId).toBe("shark");
      expect(fish.word).toBe(T.shark.word);
      expect(fish.emoji).toBe(T.shark.emoji);
    });
  });

  // -------------------------------------------------------------------------
  // Stat merging
  // -------------------------------------------------------------------------

  describe("stat merging", () => {
    it("shark eating coral gets combined HP and damage", () => {
      const coral = createEnemy({ x: 0, y: 0 }, "coral");
      const shark = createEnemy({ x: 0, y: 0 }, "shark");

      mergeInto(coral, shark);

      expect(shark.health).toBe(T.coral.health + T.shark.health);
      expect(shark.maxHealth).toBe(T.coral.health + T.shark.health);
      expect(shark.damage).toBe(T.coral.damage + T.shark.damage);
    });

    it("shark + fish = shark with combined stats (source is higher tier)", () => {
      const shark = createEnemy({ x: 0, y: 0 }, "shark");
      const fish = createEnemy({ x: 0, y: 0 }, "fish");

      mergeInto(shark, fish);

      expect(fish.templateId).toBe("shark");
      expect(fish.health).toBe(T.shark.health + T.fish.health);
      expect(fish.damage).toBe(T.shark.damage + T.fish.damage);
      expect(fish.speed).toBe(T.shark.speed);
      expect(fish.abilities).toEqual(["devour"]);
    });

    it("coral + shark = shark with combined stats and both abilities", () => {
      const coral = createEnemy({ x: 0, y: 0 }, "coral");
      const shark = createEnemy({ x: 0, y: 0 }, "shark");

      mergeInto(coral, shark);

      expect(shark.templateId).toBe("shark");
      expect(shark.health).toBe(T.coral.health + T.shark.health);
      expect(shark.maxHealth).toBe(T.coral.health + T.shark.health);
      expect(shark.damage).toBe(T.coral.damage + T.shark.damage);
      expect(shark.speed).toBe(T.shark.speed);
      expect(shark.range).toBe(T.shark.range);

      expect([...shark.abilities].sort()).toEqual(["devour", "spawn_fish"]);
    });

    it("speed from lower-tier source does NOT override shark speed", () => {
      const crab = createEnemy({ x: 0, y: 0 }, "crab");
      const shark = createEnemy({ x: 0, y: 0 }, "shark");

      mergeInto(crab, shark);

      expect(shark.speed).toBe(T.shark.speed);
    });

    it("range from lower tier does NOT override shark range", () => {
      const fish = createEnemy({ x: 0, y: 0 }, "fish");
      const shark = createEnemy({ x: 0, y: 0 }, "shark");

      mergeInto(fish, shark);

      expect(shark.range).toBe(T.shark.range);
    });

    it("shark's behavior script is preserved when a lower tier merges into it", () => {
      const fish = createEnemy({ x: 0, y: 0 }, "fish");
      const shark = createEnemy({ x: 0, y: 0 }, "shark");

      mergeInto(fish, shark);

      expect(shark.behavior.map((a) => a.kind)).toEqual(["special", "attack"]);
    });

    it("shark's identity IS transferred when it merges into a lower tier", () => {
      const shark = createEnemy({ x: 0, y: 0 }, "shark");
      const fish = createEnemy({ x: 0, y: 0 }, "fish");

      mergeInto(shark, fish);

      expect(fish.templateId).toBe("shark");
      expect(fish.behavior.map((a) => a.kind)).toEqual(["special", "attack"]);
    });
  });

  // -------------------------------------------------------------------------
  // Ability merging
  // -------------------------------------------------------------------------

  describe("ability merging", () => {
    it("shark eating coral gets coral's spawn_fish ability", () => {
      const coral = createEnemy({ x: 0, y: 0 }, "coral");
      const shark = createEnemy({ x: 0, y: 0 }, "shark");

      mergeInto(coral, shark);

      expect(shark.templateId).toBe("shark");
      expect(shark.abilities).toContain("spawn_fish");
      expect(shark.abilities).toContain("devour");
    });

    it("merging coral and shark results in both abilities", () => {
      const coral = createEnemy({ x: 0, y: 0 }, "coral");
      const shark = createEnemy({ x: 0, y: 0 }, "shark");

      expect(coral.abilities).toContain("spawn_fish");
      expect(shark.abilities).toContain("devour");

      mergeInto(coral, shark);

      expect(shark.abilities).toContain("devour");
      expect(shark.abilities).toContain("spawn_fish");
      expect(shark.abilities).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // Devour ability (fires on the shark's special action)
  // -------------------------------------------------------------------------

  describe("devour ability", () => {
    it("devour absorbs all units on same row/column (with coral side effects)", () => {
      const player = makePlayer({ x: 0, y: 0 });
      const shark = createEnemy({ x: 1, y: 1 }, "shark");
      const coral1 = createEnemy({ x: 1, y: -1 }, "coral");
      const coral2 = createEnemy({ x: -1, y: 1 }, "coral");

      const devourHp = T.shark.health + T.coral.health * 2;
      const devourDmg = T.shark.damage + T.coral.damage * 2;

      let enemies = [shark, coral1, coral2];
      const result = processEnemyTurn(shark, enemies, player);
      enemies = result.enemies;

      const updatedShark = enemies.find((e) => e.templateId === "shark");
      expect(updatedShark).toBeDefined();
      expect(updatedShark!.health).toBeGreaterThanOrEqual(devourHp);
      expect(updatedShark!.damage).toBeGreaterThanOrEqual(devourDmg);

      expect(enemies.find((e) => e.id === coral1.id)).toBeUndefined();
      expect(enemies.find((e) => e.id === coral2.id)).toBeUndefined();

      expect(updatedShark!.abilities).toContain("spawn_fish");
      expect(updatedShark!.abilities).toContain("devour");
    });

    it("devour merges stats precisely when eating fish (no ability side effects)", () => {
      const player = makePlayer({ x: 0, y: 0 });
      const shark = createEnemy({ x: 2, y: 2 }, "shark");
      const fish1 = createEnemy({ x: 2, y: 0 }, "fish");
      const fish2 = createEnemy({ x: 0, y: 2 }, "fish");

      const totalHp = T.shark.health + T.fish.health * 2;
      const totalDmg = T.shark.damage + T.fish.damage * 2;

      let enemies = [shark, fish1, fish2];
      const result = processEnemyTurn(shark, enemies, player);
      enemies = result.enemies;

      const updatedShark = enemies.find((e) => e.templateId === "shark");
      expect(updatedShark).toBeDefined();
      expect(updatedShark!.health).toBe(totalHp);
      expect(updatedShark!.damage).toBe(totalDmg);
      expect(updatedShark!.templateId).toBe("shark");

      expect(enemies.find((e) => e.id === fish1.id)).toBeUndefined();
      expect(enemies.find((e) => e.id === fish2.id)).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Slide merging — a fish that slides into the shark is absorbed
  // -------------------------------------------------------------------------

  describe("slide merging (like-only)", () => {
    it("two sharks stack into a bigger shark (no evolve)", () => {
      const player = makePlayer({ x: 0, y: 2 }); // different lane — no slam
      const sharkA = createEnemy({ x: -2, y: 0 }, "shark");
      const sharkB = createEnemy({ x: -1, y: 0 }, "shark");

      const result = resolveSlide("left", [sharkA, sharkB], player);

      expect(result.enemies.find((e) => e.id === sharkB.id)).toBeUndefined();

      const merged = result.enemies.find((e) => e.id === sharkA.id)!;
      expect(merged).toBeDefined();
      expect(merged.templateId).toBe("shark"); // stays a shark
      expect(merged.stackCount).toBe(2);
      expect(merged.health).toBe(T.shark.health * 2);
      expect(result.moved).toBe(true);
    });

    it("a fish does NOT merge into a shark (unlike types)", () => {
      const player = makePlayer({ x: 0, y: 2 });
      const shark = createEnemy({ x: -2, y: 0 }, "shark");
      const fish = createEnemy({ x: -1, y: 0 }, "fish");

      const result = resolveSlide("left", [shark, fish], player);

      expect(result.enemies).toHaveLength(2);
      expect(result.enemies.find((e) => e.id === shark.id)!.templateId).toBe("shark");
    });
  });

  // -------------------------------------------------------------------------
  // Chain merges involving shark
  // -------------------------------------------------------------------------

  describe("chain merges", () => {
    it("chain merge: fish → crab → coral → shark accumulates everything", () => {
      const fish = createEnemy({ x: 0, y: 0 }, "fish");
      const crab = createEnemy({ x: 0, y: 0 }, "crab");
      const coral = createEnemy({ x: 0, y: 0 }, "coral");
      const shark = createEnemy({ x: 0, y: 0 }, "shark");

      const totalHp = T.fish.health + T.crab.health + T.coral.health + T.shark.health;
      const totalDmg = T.fish.damage + T.crab.damage + T.coral.damage + T.shark.damage;

      mergeInto(fish, crab);
      mergeInto(crab, coral);
      mergeInto(coral, shark);

      expect(shark.templateId).toBe("shark");
      expect(shark.health).toBe(totalHp);
      expect(shark.maxHealth).toBe(totalHp);
      expect(shark.damage).toBe(totalDmg);
      expect(shark.speed).toBe(T.shark.speed);
      expect(shark.range).toBe(T.shark.range);

      expect([...shark.abilities].sort()).toEqual(["devour", "regrow", "spawn_fish"]);
    });

    it("reverse chain merge: shark → coral → crab → fish results in shark identity on fish", () => {
      const shark = createEnemy({ x: 0, y: 0 }, "shark");
      const coral = createEnemy({ x: 0, y: 0 }, "coral");
      const crab = createEnemy({ x: 0, y: 0 }, "crab");
      const fish = createEnemy({ x: 0, y: 0 }, "fish");

      const totalHp = T.shark.health + T.coral.health + T.crab.health + T.fish.health;
      const totalDmg = T.shark.damage + T.coral.damage + T.crab.damage + T.fish.damage;

      mergeInto(shark, coral);
      mergeInto(coral, crab);
      mergeInto(crab, fish);

      expect(fish.templateId).toBe("shark");
      expect(fish.health).toBe(totalHp);
      expect(fish.damage).toBe(totalDmg);
      expect(fish.speed).toBe(T.shark.speed);

      expect([...fish.abilities].sort()).toEqual(["devour", "regrow", "spawn_fish"]);
    });
  });
});
