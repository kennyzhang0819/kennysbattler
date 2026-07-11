import { describe, it, expect } from "vitest";
import { resolveSlide, spawnEndlessEnemy, cloneEnemy } from "@/hooks/enemy-ai";
import { spawnsPerTurn } from "@/data/game-data";
import { Direction, Enemy, Player } from "@/types/game";
import { makePlayer } from "./helpers";

const DIRS: Direction[] = ["up", "down", "left", "right"];

/** One endless turn: slide + slam, then spawn the next wave. Null = board overflow. */
function step(dir: Direction, enemies: Enemy[], player: Player, turn: number) {
  const slide = resolveSlide(dir, enemies, player);
  if (!slide.moved) return { moved: false as const };
  let next = slide.enemies.map(cloneEnemy);
  const newTurn = turn + 1;
  let overwhelmed = false;
  for (let i = 0; i < spawnsPerTurn(newTurn); i++) {
    const e = spawnEndlessEnemy(newTurn, next, slide.player.position);
    if (e) next = [...next, e];
    else { overwhelmed = true; break; }
  }
  return { moved: true as const, enemies: next, player: slide.player, turn: newTurn, overwhelmed };
}

/** Play until the board overflows or `cap` turns pass, using a chosen bot. */
function run(attack: number, cap: number, pick: (e: Enemy[], p: Player) => Direction) {
  let player: Player = makePlayer({ x: 0, y: 0 }, attack);
  let enemies: Enemy[] = [];
  for (let i = 0; i < 3; i++) {
    const e = spawnEndlessEnemy(1, enemies, player.position);
    if (e) enemies.push(e);
  }
  let turn = 1;
  let maxEnemies = enemies.length;

  while (turn < cap) {
    let stepped = false;
    for (const dir of [pick(enemies, player), ...DIRS]) {
      const r = step(dir, enemies, player, turn);
      if (!r.moved) continue;
      enemies = r.enemies;
      player = r.player;
      turn = r.turn;
      maxEnemies = Math.max(maxEnemies, enemies.length);
      stepped = true;
      if (r.overwhelmed) return { turn, overwhelmed: true, maxEnemies };
      break;
    }
    if (!stepped) break;
  }
  return { turn, overwhelmed: false, maxEnemies };
}

describe("endless survival sanity", () => {
  it("spawns one enemy on an ordinary turn", () => {
    const player = makePlayer({ x: 0, y: 0 }, 5);
    const enemies = [spawnEndlessEnemy(1, [], player.position)!];
    const r = step("left", enemies, player, 3);
    expect(r.moved).toBe(true);
    expect(spawnsPerTurn(4)).toBe(1);
  });

  it("a weak attack lets the board overflow eventually", () => {
    // attack 1 kills almost nothing, so enemies pile up until there's no room.
    const r = run(1, 100, () => "left");
    expect(r.overwhelmed).toBe(true);
    expect(r.maxEnemies).toBeGreaterThan(10);
  });

  it("survives a good stretch before things get crowded", () => {
    const r = run(1, 100, () => "left");
    expect(r.turn).toBeGreaterThanOrEqual(10);
  });
});
