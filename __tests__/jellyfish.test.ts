import { describe, it, expect } from "vitest";
import {
  createEnemy,
  mergeInto,
  processEnemyTurn,
  triggerOnDeathEffects,
  resolveSlide,
} from "@/hooks/enemy-ai";
import { getTemplateTier } from "@/data/game-data";
import { makePlayer, T } from "./helpers";

describe("Jellyfish", () => {

  // -------------------------------------------------------------------------
  // Identity & hierarchy
  // -------------------------------------------------------------------------

  describe("identity & hierarchy", () => {
    it("jellyfish is between crab and coral in tier order", () => {
      expect(getTemplateTier("jellyfish")).toBeGreaterThan(getTemplateTier("crab"));
      expect(getTemplateTier("jellyfish")).toBeLessThan(getTemplateTier("coral"));
    });

    it("jellyfish has the heal_lowest ability", () => {
      const jelly = createEnemy({ x: 0, y: 0 }, "jellyfish");
      expect(jelly.abilities).toHaveLength(1);
      expect(jelly.abilities[0]).toBe("heal_lowest");
    });

    it("jellyfish runs its special first, then attacks", () => {
      const jelly = createEnemy({ x: 0, y: 0 }, "jellyfish");
      expect(jelly.behavior.map((a) => a.kind)).toEqual(["special", "attack"]);
    });

    it("jellyfish has heal_adjacent on-death effect", () => {
      const jelly = createEnemy({ x: 0, y: 0 }, "jellyfish");
      expect(jelly.onDeathEffects).toContain("heal_adjacent");
    });

    it("jellyfish has expected base stats", () => {
      const jelly = createEnemy({ x: 0, y: 0 }, "jellyfish");
      expect(jelly.health).toBe(T.jellyfish.health);
      expect(jelly.damage).toBe(T.jellyfish.damage);
      expect(jelly.speed).toBe(T.jellyfish.speed);
      expect(jelly.range).toBe(T.jellyfish.range);
    });
  });

  // -------------------------------------------------------------------------
  // Heal Lowest ability (special action)
  // -------------------------------------------------------------------------

  describe("heal lowest ability", () => {
    it("heals the lowest-health ally on its special turn", () => {
      const player = makePlayer({ x: 0, y: 0 });
      const jelly = createEnemy({ x: 2, y: 2 }, "jellyfish");
      const crab = createEnemy({ x: -2, y: -2 }, "crab");
      crab.health = 1;

      const result = processEnemyTurn(jelly, [jelly, crab], player);
      const healed = result.enemies.find((e) => e.id === crab.id);

      expect(healed).toBeDefined();
      expect(healed!.health).toBe(Math.min(crab.maxHealth, 1 + T.jellyfish.damage));
    });

    it("does not heal allies already at full health", () => {
      const player = makePlayer({ x: 0, y: 0 });
      const jelly = createEnemy({ x: 2, y: 2 }, "jellyfish");
      const crab = createEnemy({ x: -2, y: -2 }, "crab");

      const result = processEnemyTurn(jelly, [jelly, crab], player);
      const unchanged = result.enemies.find((e) => e.id === crab.id);

      expect(unchanged).toBeDefined();
      expect(unchanged!.health).toBe(T.crab.health);
    });

    it("heals itself when it is the only damaged enemy", () => {
      const player = makePlayer({ x: 0, y: 0 });
      const jelly = createEnemy({ x: 2, y: 2 }, "jellyfish");
      jelly.health = 1;

      const result = processEnemyTurn(jelly, [jelly], player);
      const self = result.enemies.find((e) => e.id === jelly.id);

      expect(self).toBeDefined();
      expect(self!.health).toBe(Math.min(jelly.maxHealth, 1 + T.jellyfish.damage));
    });

    it("heals itself when it has the lowest HP among all enemies", () => {
      const player = makePlayer({ x: 0, y: 0 });
      const jelly = createEnemy({ x: 2, y: 2 }, "jellyfish");
      jelly.health = 1;
      const crab = createEnemy({ x: -2, y: -2 }, "crab");
      crab.health = 2;

      const result = processEnemyTurn(jelly, [jelly, crab], player);
      const self = result.enemies.find((e) => e.id === jelly.id);
      const untouchedCrab = result.enemies.find((e) => e.id === crab.id);

      expect(self).toBeDefined();
      expect(self!.health).toBe(Math.min(jelly.maxHealth, 1 + T.jellyfish.damage));
      expect(untouchedCrab!.health).toBe(2);
    });

    it("heals an ally instead of itself when ally has lower HP", () => {
      const player = makePlayer({ x: 0, y: 0 });
      const jelly = createEnemy({ x: 2, y: 2 }, "jellyfish");
      jelly.health = 5;
      const crab = createEnemy({ x: -2, y: -2 }, "crab");
      crab.health = 1;

      const result = processEnemyTurn(jelly, [jelly, crab], player);
      const self = result.enemies.find((e) => e.id === jelly.id);
      const healedCrab = result.enemies.find((e) => e.id === crab.id);

      expect(self!.health).toBe(5);
      expect(healedCrab!.health).toBe(Math.min(crab.maxHealth, 1 + T.jellyfish.damage));
    });

    it("picks the lowest-health ally when multiple are damaged", () => {
      const player = makePlayer({ x: 0, y: 0 });
      const jelly = createEnemy({ x: 2, y: 2 }, "jellyfish");

      const crabA = createEnemy({ x: -2, y: -2 }, "crab");
      crabA.health = 2;
      const crabB = createEnemy({ x: -2, y: 2 }, "crab");
      crabB.health = 1;

      const result = processEnemyTurn(jelly, [jelly, crabA, crabB], player);

      const healedB = result.enemies.find((e) => e.id === crabB.id);
      const untouchedA = result.enemies.find((e) => e.id === crabA.id);

      expect(healedB!.health).toBe(Math.min(crabB.maxHealth, 1 + T.jellyfish.damage));
      expect(untouchedA!.health).toBe(2);
    });

    it("heal is capped at maxHealth", () => {
      const player = makePlayer({ x: 0, y: 0 });
      const jelly = createEnemy({ x: 2, y: 2 }, "jellyfish");
      const crab = createEnemy({ x: -2, y: -2 }, "crab");
      crab.health = crab.maxHealth - 1;

      const result = processEnemyTurn(jelly, [jelly, crab], player);
      const healed = result.enemies.find((e) => e.id === crab.id);

      expect(healed!.health).toBe(crab.maxHealth);
    });

    it("heals on special turns and attacks on attack turns (alternating)", () => {
      const player = makePlayer({ x: 0, y: 0 });
      const jelly = createEnemy({ x: 2, y: 2 }, "jellyfish");
      const fish = createEnemy({ x: -2, y: -2 }, "fish");
      fish.maxHealth = 100;
      fish.health = 1;

      let enemies = [jelly, fish];

      // Turn 1: special → heals the fish.
      const r1 = processEnemyTurn(enemies.find((e) => e.id === jelly.id)!, enemies, player);
      enemies = r1.enemies;
      expect(enemies.find((e) => e.id === fish.id)!.health).toBe(1 + T.jellyfish.damage);

      // Turn 2: attack (out of range → approaches) → no additional heal.
      const r2 = processEnemyTurn(enemies.find((e) => e.id === jelly.id)!, enemies, player);
      enemies = r2.enemies;
      expect(enemies.find((e) => e.id === fish.id)!.health).toBe(1 + T.jellyfish.damage);
    });

    it("produces a heal animation event", () => {
      const player = makePlayer({ x: 0, y: 0 });
      const jelly = createEnemy({ x: 2, y: 2 }, "jellyfish");
      const crab = createEnemy({ x: -2, y: -2 }, "crab");
      crab.health = 1;

      const result = processEnemyTurn(jelly, [jelly, crab], player);
      const healAnims = result.animations.filter(
        (a) => a.type === "heal" && a.unitId === crab.id,
      );
      expect(healAnims).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // On-death: heal adjacent
  // -------------------------------------------------------------------------

  describe("on-death heal adjacent", () => {
    it("heals cardinal neighbors on death", () => {
      const jelly = createEnemy({ x: 0, y: 0 }, "jellyfish");
      const crabN = createEnemy({ x: 0, y: -1 }, "crab");
      crabN.health = 1;
      const crabS = createEnemy({ x: 0, y: 1 }, "crab");
      crabS.health = 1;

      const enemies = [jelly, crabN, crabS];
      const result = triggerOnDeathEffects(jelly, enemies);

      expect(result.enemies.find((e) => e.id === crabN.id)!.health).toBe(
        Math.min(crabN.maxHealth, 1 + T.jellyfish.damage),
      );
      expect(result.enemies.find((e) => e.id === crabS.id)!.health).toBe(
        Math.min(crabS.maxHealth, 1 + T.jellyfish.damage),
      );
    });

    it("does NOT heal diagonal neighbors", () => {
      const jelly = createEnemy({ x: 0, y: 0 }, "jellyfish");
      const crabDiag = createEnemy({ x: 1, y: 1 }, "crab");
      crabDiag.health = 1;

      const enemies = [jelly, crabDiag];
      triggerOnDeathEffects(jelly, enemies);

      expect(crabDiag.health).toBe(1);
    });

    it("heal is capped at maxHealth for adjacent allies", () => {
      const jelly = createEnemy({ x: 0, y: 0 }, "jellyfish");
      const crab = createEnemy({ x: 1, y: 0 }, "crab");
      crab.health = crab.maxHealth - 1;

      triggerOnDeathEffects(jelly, [jelly, crab]);

      expect(crab.health).toBe(crab.maxHealth);
    });

    it("produces heal animation events for each healed neighbor", () => {
      const jelly = createEnemy({ x: 0, y: 0 }, "jellyfish");
      const crabN = createEnemy({ x: 0, y: -1 }, "crab");
      crabN.health = 1;
      const crabE = createEnemy({ x: 1, y: 0 }, "crab");
      crabE.health = 1;

      const result = triggerOnDeathEffects(jelly, [jelly, crabN, crabE]);
      const healAnims = result.animations.filter((a) => a.type === "heal");
      expect(healAnims).toHaveLength(2);
    });

    it("does NOT trigger when a jellyfish is consumed by a like-merge", () => {
      const player = makePlayer({ x: 2, y: 2 }); // far away — no slam
      const jellyA = createEnemy({ x: -2, y: 0 }, "jellyfish");
      const jellyB = createEnemy({ x: -1, y: 0 }, "jellyfish");
      const fish = createEnemy({ x: -2, y: 1 }, "fish"); // adjacent to the merge tile
      fish.health = 1;
      fish.maxHealth = 100;

      // Sliding left stacks the two jellyfish into a bigger jellyfish; the consumed
      // jelly is not "killed", so its on-death heal must NOT fire.
      const result = resolveSlide("left", [jellyA, jellyB, fish], player);

      expect(result.enemies.find((e) => e.id === jellyB.id)).toBeUndefined();

      const merged = result.enemies.find((e) => e.id === jellyA.id)!;
      expect(merged).toBeDefined();
      expect(merged.templateId).toBe("jellyfish");

      const unhealedFish = result.enemies.find((e) => e.id === fish.id)!;
      expect(unhealedFish.health).toBe(1);
    });

    it("does NOT trigger on-death heal when devoured by shark", () => {
      const player = makePlayer({ x: -2, y: -2 });
      const shark = createEnemy({ x: 0, y: 0 }, "shark");
      const jelly = createEnemy({ x: 0, y: 1 }, "jellyfish");
      const crab = createEnemy({ x: 1, y: 1 }, "crab");
      crab.health = 1;
      crab.maxHealth = 100;

      const result = processEnemyTurn(shark, [shark, jelly, crab], player);

      expect(result.enemies.find((e) => e.id === jelly.id)).toBeUndefined();

      const healedCrab = result.enemies.find((e) => e.id === crab.id);
      expect(healedCrab).toBeDefined();
      // Shark gains heal_lowest from the jellyfish merge and heals the crab
      // with its combined damage during the same special action.
      const sharkCombinedDmg = T.shark.damage + T.jellyfish.damage;
      expect(healedCrab!.health).toBe(1 + sharkCombinedDmg);
    });

    it("no effect when no adjacent allies exist", () => {
      const jelly = createEnemy({ x: 0, y: 0 }, "jellyfish");

      const result = triggerOnDeathEffects(jelly, [jelly]);
      expect(result.animations).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Merging
  // -------------------------------------------------------------------------

  describe("merging", () => {
    it("merging two jellyfish combines HP and damage", () => {
      const j1 = createEnemy({ x: 0, y: 0 }, "jellyfish");
      const j2 = createEnemy({ x: 0, y: 0 }, "jellyfish");

      mergeInto(j1, j2);

      expect(j2.health).toBe(T.jellyfish.health * 2);
      expect(j2.maxHealth).toBe(T.jellyfish.health * 2);
      expect(j2.damage).toBe(T.jellyfish.damage * 2);
    });

    it("heal_lowest ability is not duplicated after merge", () => {
      const j1 = createEnemy({ x: 0, y: 0 }, "jellyfish");
      const j2 = createEnemy({ x: 0, y: 0 }, "jellyfish");

      mergeInto(j1, j2);

      const healAbilities = j2.abilities.filter((a) => a === "heal_lowest");
      expect(healAbilities).toHaveLength(1);
    });

    it("on-death effect is not duplicated after merge", () => {
      const j1 = createEnemy({ x: 0, y: 0 }, "jellyfish");
      const j2 = createEnemy({ x: 0, y: 0 }, "jellyfish");

      mergeInto(j1, j2);

      const healEffects = j2.onDeathEffects.filter((e) => e === "heal_adjacent");
      expect(healEffects).toHaveLength(1);
    });

    it("jellyfish merging into crab transfers ability and on-death effect", () => {
      const jelly = createEnemy({ x: 0, y: 0 }, "jellyfish");
      const crab = createEnemy({ x: 0, y: 0 }, "crab");

      mergeInto(jelly, crab);

      expect(crab.templateId).toBe("jellyfish");
      expect(crab.abilities).toContain("heal_lowest");
      expect(crab.onDeathEffects).toContain("heal_adjacent");
      expect(crab.health).toBe(T.jellyfish.health + T.crab.health);
      expect(crab.damage).toBe(T.jellyfish.damage + T.crab.damage);
    });

    it("jellyfish merging into coral keeps coral identity (higher tier)", () => {
      const jelly = createEnemy({ x: 0, y: 0 }, "jellyfish");
      const coral = createEnemy({ x: 0, y: 0 }, "coral");

      mergeInto(jelly, coral);

      expect(coral.templateId).toBe("coral");
      expect(coral.speed).toBe(T.coral.speed);
      expect(coral.abilities).toContain("heal_lowest");
      expect(coral.abilities).toContain("spawn_fish");
      expect(coral.onDeathEffects).toContain("heal_adjacent");
    });

    it("merged jellyfish heals with combined damage", () => {
      const player = makePlayer({ x: 0, y: 0 });
      const j1 = createEnemy({ x: 2, y: 2 }, "jellyfish");
      const j2 = createEnemy({ x: 2, y: 2 }, "jellyfish");
      mergeInto(j1, j2);

      const fish = createEnemy({ x: -2, y: -2 }, "fish");
      fish.maxHealth = 200;
      fish.health = 1;

      const result = processEnemyTurn(j2, [j2, fish], player);
      const healed = result.enemies.find((e) => e.id === fish.id);

      expect(healed!.health).toBe(1 + T.jellyfish.damage * 2);
    });
  });
});
