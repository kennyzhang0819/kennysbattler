import { describe, it, expect } from "vitest";
import {
  createEnemy,
  mergeInto,
  processEnemyTurn,
} from "@/hooks/enemy-ai";
import { getTemplateTier } from "@/data/game-data";
import { makePlayer, T } from "./helpers";

describe("Boss: Shark", () => {

  // -------------------------------------------------------------------------
  // Identity & hierarchy
  // -------------------------------------------------------------------------

  describe("identity & hierarchy", () => {
    it("shark is the highest tier", () => {
      expect(getTemplateTier("shark")).toBeGreaterThan(getTemplateTier("coral"));
      expect(getTemplateTier("shark")).toBeGreaterThan(getTemplateTier("crab"));
      expect(getTemplateTier("shark")).toBeGreaterThan(getTemplateTier("fish"));
    });

    it("shark is a boss unit", () => {
      const shark = createEnemy({ x: 0, y: 0 }, "shark");
      expect(shark.boss).toBe(true);
    });

    it("fish merging into shark keeps shark identity", () => {
      const fish = createEnemy({ x: 0, y: 0 }, "fish");
      const shark = createEnemy({ x: 0, y: 0 }, "shark");

      mergeInto(fish, shark);

      expect(shark.templateId).toBe("shark");
      expect(shark.word).toBe(T.shark.word);
      expect(shark.boss).toBe(true);
      expect(shark.health).toBe(T.fish.health + T.shark.health);
    });

    it("higher tier shark merging into lower tier fish upgrades the target", () => {
      const shark = createEnemy({ x: 0, y: 0 }, "shark");
      const fish = createEnemy({ x: 0, y: 0 }, "fish");

      mergeInto(shark, fish);

      expect(fish.templateId).toBe("shark");
      expect(fish.word).toBe(T.shark.word);
      expect(fish.emoji).toBe(T.shark.emoji);
      expect(fish.boss).toBe(true);
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
      expect(fish.boss).toBe(true);
      expect(fish.abilities).toHaveLength(1);
      expect(fish.abilities[0].id).toBe("devour");
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
      expect(shark.boss).toBe(true);
      expect(shark.range).toBe(T.shark.range);

      const abilityIds = shark.abilities.map((a) => a.id).sort();
      expect(abilityIds).toEqual(["devour", "spawn_fish"]);
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

    it("boss attribute IS preserved when merging into shark", () => {
      const fish = createEnemy({ x: 0, y: 0 }, "fish");
      const shark = createEnemy({ x: 0, y: 0 }, "shark");

      mergeInto(fish, shark);

      expect(shark.boss).toBe(true);
    });

    it("boss attribute IS transferred when shark merges into lower tier", () => {
      const shark = createEnemy({ x: 0, y: 0 }, "shark");
      const fish = createEnemy({ x: 0, y: 0 }, "fish");

      mergeInto(shark, fish);

      expect(fish.boss).toBe(true);
      expect(fish.templateId).toBe("shark");
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
      const abilityIds = shark.abilities.map((a) => a.id);
      expect(abilityIds).toContain("spawn_fish");
      expect(abilityIds).toContain("devour");
    });

    it("merging coral and shark results in both abilities", () => {
      const coral = createEnemy({ x: 0, y: 0 }, "coral");
      const shark = createEnemy({ x: 0, y: 0 }, "shark");

      expect(coral.abilities.map((a) => a.id)).toContain("spawn_fish");
      expect(shark.abilities.map((a) => a.id)).toContain("devour");

      mergeInto(coral, shark);

      const abilityIds = shark.abilities.map((a) => a.id);
      expect(abilityIds).toContain("devour");
      expect(abilityIds).toContain("spawn_fish");
      expect(shark.abilities).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // Devour ability
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

      const abilityIds = updatedShark!.abilities.map((a) => a.id);
      expect(abilityIds).toContain("spawn_fish");
      expect(abilityIds).toContain("devour");
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
      expect(updatedShark!.boss).toBe(true);

      expect(enemies.find((e) => e.id === fish1.id)).toBeUndefined();
      expect(enemies.find((e) => e.id === fish2.id)).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Movement merging
  // -------------------------------------------------------------------------

  describe("movement merging", () => {
    it("shark walks into fish tile, becomes shark with extra HP", () => {
      const player = makePlayer({ x: 0, y: 0 });
      const shark = createEnemy({ x: 2, y: 0 }, "shark");
      const fish = createEnemy({ x: 1, y: 0 }, "fish");

      shark.abilities[0].cooldownRemaining = 5;

      let enemies = [shark, fish];
      const result = processEnemyTurn(shark, enemies, player);
      enemies = result.enemies;

      expect(enemies.find((e) => e.id === shark.id)).toBeUndefined();

      const updatedFish = enemies.find((e) => e.id === fish.id);
      expect(updatedFish).toBeDefined();
      expect(updatedFish!.templateId).toBe("shark");
      expect(updatedFish!.health).toBe(T.shark.health + T.fish.health);
      expect(updatedFish!.boss).toBe(true);
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
      expect(shark.boss).toBe(true);
      expect(shark.range).toBe(T.shark.range);

      const abilityIds = shark.abilities.map((a) => a.id).sort();
      expect(abilityIds).toEqual(["devour", "spawn_fish"]);
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
      expect(fish.boss).toBe(true);
      expect(fish.speed).toBe(T.shark.speed);

      const abilityIds = fish.abilities.map((a) => a.id).sort();
      expect(abilityIds).toEqual(["devour", "spawn_fish"]);
    });
  });
});
