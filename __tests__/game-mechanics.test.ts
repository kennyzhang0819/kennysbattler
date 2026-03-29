import { describe, it, expect } from "vitest";
import {
  createEnemy,
  mergeInto,
  spawnWaveEnemies,
  processEnemyTurn,
} from "@/hooks/enemy-ai";
import { Enemy } from "@/types/game";
import { isOuterRing, posKey, getTemplateTier } from "@/data/game-data";
import { makePlayer, allOuterRingPositions, sortProcessingOrder, T } from "./helpers";

// ---------------------------------------------------------------------------
// 1. Summoning on outer circle — 5x5 board
// ---------------------------------------------------------------------------

describe("Summoning on outer circle (5×5 board)", () => {

  it("spawns one of each unit type on the outer ring", () => {
    const player = makePlayer();
    const waves = [
      { count: 1, enemyId: "fish" },
      { count: 1, enemyId: "crab" },
      { count: 1, enemyId: "coral" },
      { count: 1, enemyId: "shark" },
    ];

    const spawned = spawnWaveEnemies(waves, [], player.position);

    expect(spawned).toHaveLength(4);
    for (const enemy of spawned) {
      expect(isOuterRing(enemy.position)).toBe(true);
    }

    const templateIds = spawned.map((e) => e.templateId).sort();
    expect(templateIds).toEqual(["coral", "crab", "fish", "shark"]);
  });

  it("spawns 20 of each unit type — all on the outer ring (with overflow merges)", () => {
    const player = makePlayer();
    const waves = [
      { count: 20, enemyId: "fish" },
      { count: 20, enemyId: "crab" },
      { count: 20, enemyId: "coral" },
      { count: 20, enemyId: "shark" },
    ];

    const outerRingCount = allOuterRingPositions().filter(
      (p) => posKey(p) !== posKey(player.position),
    ).length;

    const spawned = spawnWaveEnemies(waves, [], player.position);

    expect(outerRingCount).toBe(16);
    expect(spawned.length).toBeLessThanOrEqual(16);

    for (const enemy of spawned) {
      expect(isOuterRing(enemy.position)).toBe(true);
    }
  });

  it("never spawns on the player's tile", () => {
    const player = makePlayer({ x: -2, y: -2 });
    const waves = [{ count: 16, enemyId: "fish" }];

    const spawned = spawnWaveEnemies(waves, [], player.position);

    for (const enemy of spawned) {
      expect(posKey(enemy.position)).not.toBe(posKey(player.position));
    }
  });

  it("all 16 outer ring tiles get filled when spawning 16 units (player at center)", () => {
    const player = makePlayer({ x: 0, y: 0 });
    const waves = [{ count: 16, enemyId: "fish" }];

    const spawned = spawnWaveEnemies(waves, [], player.position);

    expect(spawned).toHaveLength(16);

    const positions = new Set(spawned.map((e) => posKey(e.position)));
    expect(positions.size).toBe(16);

    for (const enemy of spawned) {
      expect(isOuterRing(enemy.position)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Mobile vs immobile unit interactions
// ---------------------------------------------------------------------------

describe("Mobile vs immobile unit interactions", () => {

  it("corals (speed=0) do not move when processing their turn", () => {
    const player = makePlayer({ x: 0, y: 0 });
    const positions = [
      { x: -2, y: -2 },
      { x: -2, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 2 },
      { x: 2, y: 2 },
    ];
    const corals = positions.map((pos) => createEnemy(pos, "coral"));
    const originalPositions = corals.map((c) => ({ ...c.position }));

    let enemies = [...corals];
    for (const coral of corals) {
      const current = enemies.find((e) => e.id === coral.id);
      if (!current) continue;
      const result = processEnemyTurn(current, enemies, player);
      enemies = result.enemies;
    }

    for (let i = 0; i < corals.length; i++) {
      const updated = enemies.find((e) => e.id === corals[i].id);
      if (updated) {
        expect(updated.position.x).toBe(originalPositions[i].x);
        expect(updated.position.y).toBe(originalPositions[i].y);
      }
    }
  });

  it("spawn 5 fish then 5 corals — after advancing, all corals remain immobile", () => {
    const player = makePlayer({ x: 0, y: 0 });

    const fishes = [
      { x: -2, y: -2 },
      { x: -1, y: -2 },
      { x: 0, y: -2 },
      { x: 1, y: -2 },
      { x: 2, y: -2 },
    ].map((pos) => createEnemy(pos, "fish"));

    const corals = [
      { x: -2, y: 2 },
      { x: -1, y: 2 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ].map((pos) => createEnemy(pos, "coral"));

    const coralOriginalPositions = corals.map((c) => ({ ...c.position }));
    let enemies = [...fishes, ...corals];

    for (const ref of sortProcessingOrder(enemies)) {
      const current = enemies.find((e) => e.id === ref.id);
      if (!current) continue;
      const result = processEnemyTurn(current, enemies, player);
      enemies = result.enemies;
    }

    for (let i = 0; i < corals.length; i++) {
      const updated = enemies.find((e) => e.id === corals[i].id);
      if (updated) {
        expect(updated.position.x).toBe(coralOriginalPositions[i].x);
        expect(updated.position.y).toBe(coralOriginalPositions[i].y);
      }
    }
  });

  it("spawn 5 corals then 5 fish — after advancing, all corals have not changed position", () => {
    const player = makePlayer({ x: 0, y: 0 });

    const corals = [
      { x: -2, y: -2 },
      { x: -1, y: -2 },
      { x: 0, y: -2 },
      { x: 1, y: -2 },
      { x: 2, y: -2 },
    ].map((pos) => createEnemy(pos, "coral"));

    const fishes = [
      { x: -2, y: 2 },
      { x: -1, y: 2 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ].map((pos) => createEnemy(pos, "fish"));

    const coralOriginalPositions = corals.map((c) => ({ ...c.position }));
    let enemies = [...corals, ...fishes];

    for (const ref of sortProcessingOrder(enemies)) {
      const current = enemies.find((e) => e.id === ref.id);
      if (!current) continue;
      const result = processEnemyTurn(current, enemies, player);
      enemies = result.enemies;
    }

    for (let i = 0; i < corals.length; i++) {
      const updated = enemies.find((e) => e.id === corals[i].id);
      if (updated) {
        expect(updated.position.x).toBe(coralOriginalPositions[i].x);
        expect(updated.position.y).toBe(coralOriginalPositions[i].y);
      }
    }
  });

  it("fish (speed=1) moves toward player each turn", () => {
    const player = makePlayer({ x: 0, y: 0 });
    const fish = createEnemy({ x: 2, y: 0 }, "fish");

    const result = processEnemyTurn(fish, [fish], player);

    const moved = result.enemies.find((e) => e.id === fish.id);
    expect(moved).toBeDefined();
    expect(moved!.position.x).toBe(1);
    expect(moved!.position.y).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Merging — HP, attack, and abilities transfer
// ---------------------------------------------------------------------------

describe("Merging: HP, attack, and abilities transfer", () => {

  it("merging two fish combines HP and damage", () => {
    const fish1 = createEnemy({ x: 0, y: 0 }, "fish");
    const fish2 = createEnemy({ x: 0, y: 0 }, "fish");

    mergeInto(fish1, fish2);

    expect(fish2.health).toBe(T.fish.health * 2);
    expect(fish2.maxHealth).toBe(T.fish.health * 2);
    expect(fish2.damage).toBe(T.fish.damage * 2);
  });

  it("merging crab into fish combines HP and damage, keeps crab identity (higher tier)", () => {
    const fish = createEnemy({ x: 0, y: 0 }, "fish");
    const crab = createEnemy({ x: 0, y: 0 }, "crab");

    mergeInto(crab, fish);

    expect(fish.templateId).toBe("crab");
    expect(fish.word).toBe(T.crab.word);
    expect(fish.emoji).toBe(T.crab.emoji);
    expect(fish.health).toBe(T.fish.health + T.crab.health);
    expect(fish.maxHealth).toBe(T.fish.health + T.crab.health);
    expect(fish.damage).toBe(T.fish.damage + T.crab.damage);
  });

  it("abilities are transferred during merge (union by id)", () => {
    const coral = createEnemy({ x: 0, y: 0 }, "coral");
    const fish = createEnemy({ x: 0, y: 0 }, "fish");

    expect(coral.abilities).toHaveLength(1);
    expect(fish.abilities).toHaveLength(0);

    mergeInto(coral, fish);

    expect(fish.abilities).toHaveLength(1);
    expect(fish.abilities[0].id).toBe("spawn_fish");
  });

  it("duplicate abilities are NOT added twice", () => {
    const coral1 = createEnemy({ x: 0, y: 0 }, "coral");
    const coral2 = createEnemy({ x: 0, y: 0 }, "coral");

    mergeInto(coral1, coral2);

    const spawnFishAbilities = coral2.abilities.filter(
      (a) => a.id === "spawn_fish",
    );
    expect(spawnFishAbilities).toHaveLength(1);
  });

  it("merging three units accumulates HP and damage from all", () => {
    const fish = createEnemy({ x: 0, y: 0 }, "fish");
    const crab = createEnemy({ x: 0, y: 0 }, "crab");
    const coral = createEnemy({ x: 0, y: 0 }, "coral");

    mergeInto(fish, crab);
    mergeInto(crab, coral);

    expect(coral.health).toBe(T.fish.health + T.crab.health + T.coral.health);
    expect(coral.damage).toBe(T.fish.damage + T.crab.damage + T.coral.damage);
  });
});

// ---------------------------------------------------------------------------
// 4. Merging hierarchy (non-shark)
// ---------------------------------------------------------------------------

describe("Merging hierarchy", () => {

  it("tier order is fish < crab < jellyfish < tentacles < coral < shark < octopus", () => {
    expect(getTemplateTier("fish")).toBeLessThan(getTemplateTier("crab"));
    expect(getTemplateTier("crab")).toBeLessThan(getTemplateTier("jellyfish"));
    expect(getTemplateTier("jellyfish")).toBeLessThan(getTemplateTier("front_tentacle"));
    expect(getTemplateTier("front_tentacle")).toBeLessThan(getTemplateTier("side_tentacle"));
    expect(getTemplateTier("side_tentacle")).toBeLessThan(getTemplateTier("back_tentacle"));
    expect(getTemplateTier("back_tentacle")).toBeLessThan(getTemplateTier("coral"));
    expect(getTemplateTier("coral")).toBeLessThan(getTemplateTier("shark"));
    expect(getTemplateTier("shark")).toBeLessThan(getTemplateTier("octopus"));
  });

  it("lower tier merging into higher tier preserves higher tier identity", () => {
    const fish = createEnemy({ x: 0, y: 0 }, "fish");
    const crab = createEnemy({ x: 0, y: 0 }, "crab");

    mergeInto(fish, crab);

    expect(crab.templateId).toBe("crab");
    expect(crab.word).toBe(T.crab.word);
  });
});

// ---------------------------------------------------------------------------
// 5. Speed, boss, range, cooldown do NOT transfer (non-shark)
// ---------------------------------------------------------------------------

describe("Merging: speed, boss, range, cooldown do NOT transfer from lower tier", () => {

  it("speed is NOT combined — higher tier speed is preserved", () => {
    const fish = createEnemy({ x: 0, y: 0 }, "fish");
    const coral = createEnemy({ x: 0, y: 0 }, "coral");

    mergeInto(fish, coral);

    expect(coral.speed).toBe(T.coral.speed);
    expect(coral.templateId).toBe("coral");
  });

  it("boss attribute is NOT transferred from lower tier", () => {
    const fish = createEnemy({ x: 0, y: 0 }, "fish");
    const crab = createEnemy({ x: 0, y: 0 }, "crab");

    mergeInto(fish, crab);

    expect(crab.boss).toBeUndefined();
  });

  it("range is NOT combined — higher tier range is preserved", () => {
    const fish = createEnemy({ x: 0, y: 0 }, "fish");
    const crab = createEnemy({ x: 0, y: 0 }, "crab");

    mergeInto(fish, crab);

    expect(crab.range).toBe(T.crab.range);
  });

  it("ability cooldown state is preserved as-is (not combined)", () => {
    const coral1 = createEnemy({ x: 0, y: 0 }, "coral");
    const coral2 = createEnemy({ x: 0, y: 0 }, "coral");

    coral1.abilities[0].cooldownRemaining = 3;
    coral2.abilities[0].cooldownRemaining = 1;

    mergeInto(coral1, coral2);

    const spawnAbilities = coral2.abilities.filter(
      (a) => a.id === "spawn_fish",
    );
    expect(spawnAbilities).toHaveLength(1);
    expect(spawnAbilities[0].cooldownRemaining).toBe(1);
  });

  it("speed=0 (immobile) is preserved when coral is higher tier target", () => {
    const crab = createEnemy({ x: 0, y: 0 }, "crab");
    const coral = createEnemy({ x: 0, y: 0 }, "coral");

    mergeInto(crab, coral);

    expect(coral.speed).toBe(T.coral.speed);
  });
});

// ---------------------------------------------------------------------------
// 6. Random combo testing (non-shark)
// ---------------------------------------------------------------------------

describe("Random combo merging: expected outcomes", () => {

  it("fish + fish = super fish (doubled stats, no abilities)", () => {
    const f1 = createEnemy({ x: 0, y: 0 }, "fish");
    const f2 = createEnemy({ x: 0, y: 0 }, "fish");

    mergeInto(f1, f2);

    expect(f2.templateId).toBe("fish");
    expect(f2.health).toBe(T.fish.health * 2);
    expect(f2.maxHealth).toBe(T.fish.health * 2);
    expect(f2.damage).toBe(T.fish.damage * 2);
    expect(f2.speed).toBe(T.fish.speed);
    expect(f2.abilities).toHaveLength(0);
    expect(f2.boss).toBeUndefined();
  });

  it("fish + crab = crab with combined stats", () => {
    const fish = createEnemy({ x: 0, y: 0 }, "fish");
    const crab = createEnemy({ x: 0, y: 0 }, "crab");

    mergeInto(fish, crab);

    expect(crab.templateId).toBe("crab");
    expect(crab.health).toBe(T.fish.health + T.crab.health);
    expect(crab.damage).toBe(T.fish.damage + T.crab.damage);
    expect(crab.speed).toBe(T.crab.speed);
    expect(crab.range).toBe(T.crab.range);
    expect(crab.abilities).toHaveLength(0);
  });

  it("crab + coral = coral with combined stats, gains no new abilities", () => {
    const crab = createEnemy({ x: 0, y: 0 }, "crab");
    const coral = createEnemy({ x: 0, y: 0 }, "coral");

    mergeInto(crab, coral);

    expect(coral.templateId).toBe("coral");
    expect(coral.health).toBe(T.crab.health + T.coral.health);
    expect(coral.damage).toBe(T.crab.damage + T.coral.damage);
    expect(coral.speed).toBe(T.coral.speed);
    expect(coral.abilities).toHaveLength(1);
    expect(coral.abilities[0].id).toBe("spawn_fish");
  });

  it("fish + coral = coral with combined stats and spawn_fish ability", () => {
    const fish = createEnemy({ x: 0, y: 0 }, "fish");
    const coral = createEnemy({ x: 0, y: 0 }, "coral");

    mergeInto(fish, coral);

    expect(coral.templateId).toBe("coral");
    expect(coral.health).toBe(T.fish.health + T.coral.health);
    expect(coral.damage).toBe(T.fish.damage + T.coral.damage);
    expect(coral.speed).toBe(T.coral.speed);
    expect(coral.abilities).toHaveLength(1);
    expect(coral.abilities[0].id).toBe("spawn_fish");
  });

  it("crab + fish = crab with combined stats (crab is higher tier source)", () => {
    const crab = createEnemy({ x: 0, y: 0 }, "crab");
    const fish = createEnemy({ x: 0, y: 0 }, "fish");

    mergeInto(crab, fish);

    expect(fish.templateId).toBe("crab");
    expect(fish.health).toBe(T.crab.health + T.fish.health);
    expect(fish.damage).toBe(T.crab.damage + T.fish.damage);
    expect(fish.speed).toBe(T.crab.speed);
    expect(fish.abilities).toHaveLength(0);
  });

  it("5 fish merged together = 5x fish stats", () => {
    const fishes = Array.from({ length: 5 }, () =>
      createEnemy({ x: 0, y: 0 }, "fish"),
    );

    const target = fishes[0];
    for (let i = 1; i < fishes.length; i++) {
      mergeInto(fishes[i], target);
    }

    expect(target.health).toBe(T.fish.health * 5);
    expect(target.maxHealth).toBe(T.fish.health * 5);
    expect(target.damage).toBe(T.fish.damage * 5);
    expect(target.templateId).toBe("fish");
    expect(target.speed).toBe(T.fish.speed);
  });

  it("3 corals merged = 3x coral stats, still only one spawn_fish ability", () => {
    const corals = Array.from({ length: 3 }, () =>
      createEnemy({ x: 0, y: 0 }, "coral"),
    );

    const target = corals[0];
    for (let i = 1; i < corals.length; i++) {
      mergeInto(corals[i], target);
    }

    expect(target.health).toBe(T.coral.health * 3);
    expect(target.maxHealth).toBe(T.coral.health * 3);
    expect(target.damage).toBe(T.coral.damage * 3);
    expect(target.speed).toBe(T.coral.speed);
    expect(target.templateId).toBe("coral");
    expect(target.abilities).toHaveLength(1);
    expect(target.abilities[0].id).toBe("spawn_fish");
  });

  it("movement merge: fish walks into crab tile and merges", () => {
    const player = makePlayer({ x: 0, y: 0 });
    const fish = createEnemy({ x: 2, y: 0 }, "fish");
    const crab = createEnemy({ x: 1, y: 0 }, "crab");

    const result = processEnemyTurn(fish, [fish, crab], player);

    expect(result.enemies.find((e) => e.id === fish.id)).toBeUndefined();

    const updatedCrab = result.enemies.find((e) => e.id === crab.id);
    expect(updatedCrab).toBeDefined();
    expect(updatedCrab!.health).toBe(T.fish.health + T.crab.health);
    expect(updatedCrab!.damage).toBe(T.fish.damage + T.crab.damage);
    expect(updatedCrab!.templateId).toBe("crab");
  });

  it("overflow spawn merges into lowest-tier ring enemy", () => {
    const player = makePlayer({ x: 0, y: 0 });

    const outerRing = allOuterRingPositions().filter(
      (p) => posKey(p) !== posKey(player.position),
    );
    const existingEnemies: Enemy[] = outerRing.map((pos) =>
      createEnemy(pos, "crab"),
    );

    const spawned = spawnWaveEnemies(
      [{ count: 1, enemyId: "fish" }],
      existingEnemies,
      player.position,
    );

    expect(spawned).toHaveLength(0);

    const boostedCrab = existingEnemies.find(
      (e) => e.health > T.crab.health,
    );
    expect(boostedCrab).toBeDefined();
    expect(boostedCrab!.health).toBe(T.crab.health + T.fish.health);
  });
});
