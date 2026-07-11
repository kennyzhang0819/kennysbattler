import { describe, it, expect } from "vitest";
import {
  createEnemy,
  mergeInto,
  processEnemyTurn,
  triggerOnDeathEffects,
} from "@/hooks/enemy-ai";
import { getTemplateTier } from "@/data/game-data";
import { makePlayer, T } from "./helpers";

describe("Octopus", () => {

  // -------------------------------------------------------------------------
  // Identity & hierarchy
  // -------------------------------------------------------------------------

  describe("identity & hierarchy", () => {
    it("octopus is the highest tier", () => {
      expect(getTemplateTier("octopus")).toBeGreaterThan(getTemplateTier("shark"));
      expect(getTemplateTier("octopus")).toBeGreaterThan(getTemplateTier("coral"));
      expect(getTemplateTier("octopus")).toBeGreaterThan(getTemplateTier("jellyfish"));
      expect(getTemplateTier("octopus")).toBeGreaterThan(getTemplateTier("crab"));
      expect(getTemplateTier("octopus")).toBeGreaterThan(getTemplateTier("fish"));
    });

    it("octopus has expected base stats", () => {
      const octo = createEnemy({ x: 0, y: 0 }, "octopus");
      expect(octo.health).toBe(T.octopus.health);
      expect(octo.maxHealth).toBe(T.octopus.health);
      expect(octo.damage).toBe(T.octopus.damage);
      expect(octo.speed).toBe(T.octopus.speed);
    });

    it("octopus spawns a tentacle every other turn (special/idle script)", () => {
      const octo = createEnemy({ x: 0, y: 0 }, "octopus");
      expect(octo.abilities).toEqual(["spawn_tentacle"]);
      expect(octo.behavior.map((a) => a.kind)).toEqual(["special", "idle"]);
    });

    it("octopus initializes spawnCycleIndex and bonusSpawns", () => {
      const octo = createEnemy({ x: 0, y: 0 }, "octopus");
      expect(octo.spawnCycleIndex).toBe(0);
      expect(octo.bonusSpawns).toBe(0);
    });

    it("tentacles are ordered correctly in tier list", () => {
      expect(getTemplateTier("front_tentacle")).toBeGreaterThan(getTemplateTier("jellyfish"));
      expect(getTemplateTier("side_tentacle")).toBeGreaterThan(getTemplateTier("front_tentacle"));
      expect(getTemplateTier("back_tentacle")).toBeGreaterThan(getTemplateTier("side_tentacle"));
      expect(getTemplateTier("back_tentacle")).toBeLessThan(getTemplateTier("coral"));
    });
  });

  // -------------------------------------------------------------------------
  // Tentacle base stats
  // -------------------------------------------------------------------------

  describe("tentacle stats", () => {
    it("front tentacle has expected stats and no abilities", () => {
      const t = createEnemy({ x: 0, y: 0 }, "front_tentacle");
      expect(t.health).toBe(T.front_tentacle.health);
      expect(t.damage).toBe(T.front_tentacle.damage);
      expect(t.range).toBe(T.front_tentacle.range);
      expect(t.speed).toBe(T.front_tentacle.speed);
      expect(t.abilities).toHaveLength(0);
    });

    it("side tentacle has expected stats, range 2, and no abilities", () => {
      const t = createEnemy({ x: 0, y: 0 }, "side_tentacle");
      expect(t.health).toBe(T.side_tentacle.health);
      expect(t.damage).toBe(T.side_tentacle.damage);
      expect(t.range).toBe(2);
      expect(t.speed).toBe(T.side_tentacle.speed);
      expect(t.abilities).toHaveLength(0);
    });

    it("back tentacle has expected stats, self_sacrifice, and bonus_spawn_owner", () => {
      const t = createEnemy({ x: 0, y: 0 }, "back_tentacle");
      expect(t.health).toBe(T.back_tentacle.health);
      expect(t.damage).toBe(T.back_tentacle.damage);
      expect(t.speed).toBe(T.back_tentacle.speed);
      expect(t.abilities).toEqual(["self_sacrifice"]);
      expect(t.onDeathEffects).toContain("bonus_spawn_owner");
    });
  });

  // -------------------------------------------------------------------------
  // spawn_tentacle ability
  // -------------------------------------------------------------------------

  describe("spawn_tentacle ability", () => {
    it("spawns front_tentacle on first fire (cycle index 0)", () => {
      const player = makePlayer({ x: 0, y: 0 });
      const octo = createEnemy({ x: 0, y: 0 }, "octopus");

      const result = processEnemyTurn(octo, [octo], player);
      const spawned = result.enemies.filter((e) => e.id !== octo.id);

      expect(spawned).toHaveLength(1);
      expect(spawned[0].templateId).toBe("front_tentacle");
    });

    it("spawns side_tentacle on second fire (cycle index 1)", () => {
      const player = makePlayer({ x: 0, y: 0 });
      const octo = createEnemy({ x: 0, y: 0 }, "octopus");
      octo.spawnCycleIndex = 1;

      const result = processEnemyTurn(octo, [octo], player);
      const spawned = result.enemies.filter((e) => e.id !== octo.id);

      expect(spawned).toHaveLength(1);
      expect(spawned[0].templateId).toBe("side_tentacle");
    });

    it("spawns back_tentacle on third fire (cycle index 2)", () => {
      const player = makePlayer({ x: 0, y: 0 });
      const octo = createEnemy({ x: 0, y: 0 }, "octopus");
      octo.spawnCycleIndex = 2;

      const result = processEnemyTurn(octo, [octo], player);
      const spawned = result.enemies.filter((e) => e.id !== octo.id);

      expect(spawned).toHaveLength(1);
      expect(spawned[0].templateId).toBe("back_tentacle");
    });

    it("cycle wraps back to front_tentacle on fourth fire", () => {
      const player = makePlayer({ x: 0, y: 0 });
      const octo = createEnemy({ x: 0, y: 0 }, "octopus");
      octo.spawnCycleIndex = 3;

      const result = processEnemyTurn(octo, [octo], player);
      const spawned = result.enemies.filter((e) => e.id !== octo.id);

      expect(spawned).toHaveLength(1);
      expect(spawned[0].templateId).toBe("front_tentacle");
    });

    it("increments spawnCycleIndex after spawning", () => {
      const player = makePlayer({ x: 0, y: 0 });
      const octo = createEnemy({ x: 0, y: 0 }, "octopus");
      expect(octo.spawnCycleIndex).toBe(0);

      const result = processEnemyTurn(octo, [octo], player);
      const updatedOcto = result.enemies.find((e) => e.id === octo.id)!;

      expect(updatedOcto.spawnCycleIndex).toBe(1);
    });

    it("spawns on outer ring, not on octopus tile", () => {
      const player = makePlayer({ x: 0, y: 0 });
      const octo = createEnemy({ x: 2, y: 2 }, "octopus");

      const result = processEnemyTurn(octo, [octo], player);
      const spawned = result.enemies.filter((e) => e.id !== octo.id);

      expect(spawned).toHaveLength(1);
      const spawnPos = spawned[0].position;
      expect(spawnPos.x !== octo.position.x || spawnPos.y !== octo.position.y).toBe(true);
    });

    it("spawns on outer ring, not on player tile", () => {
      const player = makePlayer({ x: 2, y: 0 });

      for (let i = 0; i < 20; i++) {
        const octo = createEnemy({ x: -2, y: -2 }, "octopus");
        const result = processEnemyTurn(octo, [octo], player);
        const spawned = result.enemies.filter((e) => e.id !== octo.id);
        for (const s of spawned) {
          expect(s.position.x !== player.position.x || s.position.y !== player.position.y).toBe(true);
        }
      }
    });

    it("fires every other turn (special, then idle)", () => {
      const player = makePlayer({ x: 0, y: 0 });
      let octo = createEnemy({ x: 0, y: 0 }, "octopus");

      // Turn 1 (special): spawns one tentacle.
      let enemies = [octo];
      const r1 = processEnemyTurn(octo, enemies, player);
      enemies = r1.enemies;
      expect(enemies.filter((e) => e.id !== octo.id)).toHaveLength(1);

      // Turn 2 (idle): spawns nothing.
      octo = enemies.find((e) => e.id === octo.id)!;
      const r2 = processEnemyTurn(octo, enemies, player);
      const newSpawns = r2.enemies.filter(
        (e) => !enemies.some((prev) => prev.id === e.id),
      );
      expect(newSpawns).toHaveLength(0);
    });

    it("bonus spawns from back_tentacle death spawn extra tentacles", () => {
      const player = makePlayer({ x: 0, y: 0 });
      const octo = createEnemy({ x: 0, y: 0 }, "octopus");
      octo.bonusSpawns = 2;

      const result = processEnemyTurn(octo, [octo], player);
      const spawned = result.enemies.filter((e) => e.id !== octo.id);

      expect(spawned).toHaveLength(3);

      const updatedOcto = result.enemies.find((e) => e.id === octo.id)!;
      expect(updatedOcto.bonusSpawns).toBe(0);
    });

    it("merges into existing enemy if all outer ring tiles are occupied", () => {
      const player = makePlayer({ x: 0, y: 0 });
      const octo = createEnemy({ x: 0, y: 0 }, "octopus");

      const fillers = [];
      for (let x = -2; x <= 2; x++) {
        for (let y = -2; y <= 2; y++) {
          if (Math.abs(x) === 2 || Math.abs(y) === 2) {
            fillers.push(createEnemy({ x, y }, "fish"));
          }
        }
      }

      const prevCount = fillers.length;
      const result = processEnemyTurn(octo, [octo, ...fillers], player);
      const nonOcto = result.enemies.filter((e) => e.id !== octo.id);

      expect(nonOcto).toHaveLength(prevCount);

      const mergeAnims = result.animations.filter((a) => a.type === "merge");
      expect(mergeAnims.length).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  // self_sacrifice ability
  // -------------------------------------------------------------------------

  describe("self_sacrifice ability", () => {
    it("back tentacle kills itself on its turn", () => {
      const player = makePlayer({ x: 0, y: 0 });
      const back = createEnemy({ x: 2, y: 2 }, "back_tentacle");

      const result = processEnemyTurn(back, [back], player);

      expect(result.enemies.find((e) => e.id === back.id)).toBeUndefined();
      const dieAnims = result.animations.filter((a) => a.type === "die" && a.unitId === back.id);
      expect(dieAnims).toHaveLength(1);
    });

    it("triggers on-death effects when it dies", () => {
      const player = makePlayer({ x: 0, y: 0 });
      const octo = createEnemy({ x: 0, y: 0 }, "octopus");
      const back = createEnemy({ x: 2, y: 2 }, "back_tentacle");

      const result = processEnemyTurn(back, [back, octo], player);

      expect(result.enemies.find((e) => e.id === back.id)).toBeUndefined();

      const updatedOcto = result.enemies.find((e) => e.id === octo.id)!;
      expect(updatedOcto.health).toBe(T.octopus.health);
      expect(updatedOcto.bonusSpawns).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // bonus_spawn_owner on-death effect
  // -------------------------------------------------------------------------

  describe("bonus_spawn_owner on-death effect", () => {
    it("grants octopus +1 bonus spawn regardless of position", () => {
      const octo = createEnemy({ x: -2, y: -2 }, "octopus");
      const back = createEnemy({ x: 2, y: 2 }, "back_tentacle");

      triggerOnDeathEffects(back, [back, octo]);

      expect(octo.bonusSpawns).toBe(1);
    });

    it("does not heal the octopus", () => {
      const octo = createEnemy({ x: 0, y: 0 }, "octopus");
      octo.health = 100;
      const back = createEnemy({ x: 2, y: 2 }, "back_tentacle");

      triggerOnDeathEffects(back, [back, octo]);

      expect(octo.health).toBe(100);
    });

    it("stacks bonus spawns from multiple back tentacle deaths", () => {
      const octo = createEnemy({ x: 0, y: 0 }, "octopus");
      const back1 = createEnemy({ x: 2, y: 2 }, "back_tentacle");
      const back2 = createEnemy({ x: -2, y: -2 }, "back_tentacle");

      triggerOnDeathEffects(back1, [back1, back2, octo]);
      triggerOnDeathEffects(back2, [back2, octo]);

      expect(octo.bonusSpawns).toBe(2);
    });

    it("no effect if octopus is not present", () => {
      const back = createEnemy({ x: 2, y: 2 }, "back_tentacle");

      triggerOnDeathEffects(back, [back]);
    });
  });

  // -------------------------------------------------------------------------
  // Side tentacle range
  // -------------------------------------------------------------------------

  describe("side tentacle range", () => {
    it("side tentacle has range 2", () => {
      const side = createEnemy({ x: 0, y: 0 }, "side_tentacle");
      expect(side.range).toBe(2);
    });

    it("side tentacle keeps range 2 when a higher-tier unit merges into it", () => {
      const coral = createEnemy({ x: 0, y: 0 }, "coral");
      const side = createEnemy({ x: 0, y: 0 }, "side_tentacle");

      mergeInto(coral, side);

      expect(side.range).toBe(2);
      expect(side.templateId).toBe("coral");
    });

    it("side tentacle can attack from 2 tiles away", () => {
      const player = makePlayer({ x: 0, y: 0 });
      player.health = 100;
      player.maxHealth = 100;
      const side = createEnemy({ x: 2, y: 0 }, "side_tentacle");

      const result = processEnemyTurn(side, [side], player);

      const attackAnims = result.animations.filter((a) => a.type === "attack");
      expect(attackAnims).toHaveLength(1);
      expect(result.player.health).toBe(100 - T.side_tentacle.damage);
    });

    it("side tentacle stays put and deals no damage when out of range", () => {
      const player = makePlayer({ x: 0, y: 0 });
      const side = createEnemy({ x: 2, y: 2 }, "side_tentacle"); // dist 4 > range 2

      const result = processEnemyTurn(side, [side], player);

      const after = result.enemies.find((e) => e.id === side.id)!;
      expect(after.position).toEqual({ x: 2, y: 2 });
      expect(result.animations.filter((a) => a.type === "attack")).toHaveLength(0);
      expect(result.player.health).toBe(player.health);
    });
  });

  // -------------------------------------------------------------------------
  // Merging
  // -------------------------------------------------------------------------

  describe("merging", () => {
    it("tentacle merging into octopus keeps octopus identity", () => {
      const front = createEnemy({ x: 0, y: 0 }, "front_tentacle");
      const octo = createEnemy({ x: 0, y: 0 }, "octopus");

      mergeInto(front, octo);

      expect(octo.templateId).toBe("octopus");
      expect(octo.health).toBe(T.octopus.health + T.front_tentacle.health);
      expect(octo.damage).toBe(T.octopus.damage + T.front_tentacle.damage);
    });

    it("octopus merging into lower tier transfers octopus identity", () => {
      const octo = createEnemy({ x: 0, y: 0 }, "octopus");
      const fish = createEnemy({ x: 0, y: 0 }, "fish");

      mergeInto(octo, fish);

      expect(fish.templateId).toBe("octopus");
      expect(fish.behavior.map((a) => a.kind)).toEqual(["special", "idle"]);
      expect(fish.health).toBe(T.octopus.health + T.fish.health);
    });

    it("back tentacle merging into side tentacle preserves side range", () => {
      const back = createEnemy({ x: 0, y: 0 }, "back_tentacle");
      const side = createEnemy({ x: 0, y: 0 }, "side_tentacle");

      mergeInto(back, side);

      expect(side.range).toBe(2);
      expect(side.templateId).toBe("back_tentacle");
    });
  });

  // -------------------------------------------------------------------------
  // Full integration: back tentacle self-sacrifice → octopus bonus spawn
  // -------------------------------------------------------------------------

  describe("integration: back tentacle lifecycle", () => {
    it("back tentacle sacrifices, octopus gets bonus spawn next turn (no heal)", () => {
      const player = makePlayer({ x: 0, y: 0 });
      const octo = createEnemy({ x: 0, y: 0 }, "octopus");
      octo.health = 100;
      const back = createEnemy({ x: 2, y: 2 }, "back_tentacle");

      const r1 = processEnemyTurn(back, [back, octo], player);

      expect(r1.enemies.find((e) => e.id === back.id)).toBeUndefined();

      const octoAfterSacrifice = r1.enemies.find((e) => e.id === octo.id)!;
      expect(octoAfterSacrifice.health).toBe(100);
      expect(octoAfterSacrifice.bonusSpawns).toBe(1);

      const r2 = processEnemyTurn(octoAfterSacrifice, r1.enemies, player);
      const spawned = r2.enemies.filter(
        (e) => !r1.enemies.some((prev) => prev.id === e.id),
      );

      expect(spawned).toHaveLength(2);
    });

    it("2 back tentacles die → octopus spawns 3 next turn (1 base + 2 bonus)", () => {
      const player = makePlayer({ x: 0, y: 0 });
      const octo = createEnemy({ x: 0, y: 0 }, "octopus");
      const back1 = createEnemy({ x: 2, y: 2 }, "back_tentacle");
      const back2 = createEnemy({ x: -2, y: -2 }, "back_tentacle");

      let enemies = [back1, back2, octo] as ReturnType<typeof createEnemy>[];

      // back1 self-sacrifices
      const r1 = processEnemyTurn(back1, enemies, player);
      enemies = r1.enemies;

      // back2 self-sacrifices
      const current2 = enemies.find((e) => e.id === back2.id)!;
      const r2 = processEnemyTurn(current2, enemies, player);
      enemies = r2.enemies;

      const octoNow = enemies.find((e) => e.id === octo.id)!;
      expect(octoNow.bonusSpawns).toBe(2);

      // octopus acts
      const r3 = processEnemyTurn(octoNow, enemies, player);
      const spawned = r3.enemies.filter(
        (e) => !enemies.some((prev) => prev.id === e.id),
      );

      expect(spawned).toHaveLength(3);
      const octoAfter = r3.enemies.find((e) => e.id === octo.id)!;
      expect(octoAfter.bonusSpawns).toBe(0);
    });

    it("back tentacle killed BEFORE octopus acts in same turn → octopus gets +1", () => {
      const player = makePlayer({ x: 0, y: 0 });
      // Place octopus at bottom-right so it processes AFTER back tentacle (top-left)
      const octo = createEnemy({ x: 2, y: 2 }, "octopus");
      const back = createEnemy({ x: -2, y: -2 }, "back_tentacle");

      let enemies = [back, octo] as ReturnType<typeof createEnemy>[];

      // back tentacle acts first (top-left, earlier in processing order)
      const r1 = processEnemyTurn(back, enemies, player);
      enemies = r1.enemies;

      expect(enemies.find((e) => e.id === back.id)).toBeUndefined();
      const octoAfterBackDies = enemies.find((e) => e.id === octo.id)!;
      expect(octoAfterBackDies.bonusSpawns).toBe(1);

      // octopus acts next
      const r2 = processEnemyTurn(octoAfterBackDies, enemies, player);
      const spawned = r2.enemies.filter(
        (e) => !enemies.some((prev) => prev.id === e.id),
      );

      expect(spawned).toHaveLength(2);
    });
  });
});
