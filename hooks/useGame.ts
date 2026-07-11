"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  GameState,
  Player,
  Enemy,
  Direction,
  Inventory,
} from "@/types/game";
import {
  resolveSlide,
  spawnEndlessEnemy,
  cloneEnemy,
  applyRegrow,
  applyItemTurnDamage,
  AnimEvent,
} from "./enemy-ai";
import { spawnsPerTurn, BASE_PLAYER_ATTACK, xpForLevel } from "@/data/game-data";
import { computeMods, rollChoices } from "@/data/items";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

/** YOUR slam attack = base + everything the current items add. */
function playerAttackFor(inventory: Inventory): number {
  return BASE_PLAYER_ATTACK + computeMods(inventory).attackBonus;
}

function createPlayer(inventory: Inventory): Player {
  return {
    id: "player",
    type: "player",
    position: { x: 0, y: 0 },
    stackCount: 1,
    health: 1, // unused — YOU have no HP
    maxHealth: 1,
    word: "YOU",
    emoji: "🙂",
    range: 0,
    attack: playerAttackFor(inventory),
  };
}

/** A small starting board so the first press has something to slam. */
function createInitialEnemies(playerPos: Player["position"]): Enemy[] {
  const enemies: Enemy[] = [];
  for (let i = 0; i < 3; i++) {
    const e = spawnEndlessEnemy(1, enemies, playerPos);
    if (e) enemies.push(e);
  }
  return enemies;
}

function freshState(): GameState {
  const inventory: Inventory = {};
  const player = createPlayer(inventory);
  return {
    turn: 1,
    killPoints: 0,
    playerTurnActive: true,
    enemies: createInitialEnemies(player.position),
    player,
    gameOver: false,
    level: 1,
    xp: 0,
    xpToNext: xpForLevel(1),
    inventory,
    pendingChoices: 0,
    currentChoices: [],
  };
}

/** Fold `gained` XP into level/xp, returning new totals + how many level-ups happened. */
function applyXp(level: number, xp: number, gained: number) {
  let lvl = level;
  let cur = xp + gained;
  let ups = 0;
  let need = xpForLevel(lvl);
  while (cur >= need) {
    cur -= need;
    lvl += 1;
    ups += 1;
    need = xpForLevel(lvl);
  }
  return { level: lvl, xp: cur, xpToNext: need, levelsGained: ups };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export type { AnimEvent };

interface UseGameOptions {
  onAnimations?: (events: AnimEvent[]) => void;
  animStepDelay?: number;
}

export function useGame(options: UseGameOptions) {
  const { onAnimations, animStepDelay = 180 } = options;

  const godMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("godmode");

  const [state, setState] = useState<GameState>(freshState);

  const knownIds = useRef<Set<string>>(new Set(state.enemies.map((e) => e.id)));
  const dyingIds = useRef<Set<string>>(new Set());
  const busyRef = useRef(false);

  const mountFired = useRef(false);
  useEffect(() => {
    if (!mountFired.current && onAnimations && state.enemies.length > 0) {
      mountFired.current = true;
      onAnimations(state.enemies.map((e) => ({ type: "spawn" as const, unitId: e.id })));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stepDelay = animStepDelay;

  // -----------------------------------------------------------------------
  // Move — slide + slam, item ticks, then spawn one wave. YOU take no damage;
  // the run ends only when the board is too full to fit a new spawn.
  // -----------------------------------------------------------------------

  const move = useCallback(
    async (dir: Direction) => {
      if (busyRef.current) return;
      if (!state.playerTurnActive || state.gameOver) return;
      if (state.currentChoices.length > 0) return; // waiting on an item pick

      const mods = computeMods(state.inventory);
      const slide = resolveSlide(dir, state.enemies, state.player, {
        pierce: mods.pierce,
        splash: mods.splash,
        critChance: mods.critChance,
        executeThreshold: mods.executeThreshold,
      });
      if (!slide.moved) return; // nothing to do (e.g. pressing into a wall)

      busyRef.current = true;
      try {
        // Show the slide result; slam-killed enemies linger (dying) for the fade.
        for (const id of slide.killedIds) dyingIds.current.add(id);
        setState((prev) => ({
          ...prev,
          playerTurnActive: false,
          enemies: [...slide.enemies.map(cloneEnemy), ...slide.killed.map(cloneEnemy)],
          player: { ...slide.player },
          killPoints: prev.killPoints + slide.earnedPoints,
        }));
        if (onAnimations && slide.animations.length > 0) onAnimations(slide.animations);

        let enemies = slide.enemies.map(cloneEnemy);
        const player: Player = { ...slide.player, position: { ...slide.player.position } };
        const present = new Set(enemies.map((e) => e.id));
        for (const id of [...knownIds.current]) if (!present.has(id)) knownIds.current.delete(id);
        for (const id of slide.killedIds) dyingIds.current.delete(id);

        await sleep(stepDelay);

        // Passive regrow: crabs (and anything with the ability) heal after you move.
        const regrow = applyRegrow(enemies);
        if (onAnimations && regrow.animations.length > 0) onAnimations(regrow.animations);

        // Item turn-start ticks: Whirlpool (random) + Tempest (all).
        let tickEarned = 0;
        const tick = applyItemTurnDamage(enemies, {
          whirlpoolDamage: mods.whirlpoolDamage,
          tempestDamage: mods.tempestDamage,
        });
        if (tick.animations.length > 0) {
          tickEarned = tick.earnedPoints;
          for (const id of tick.killedIds) {
            dyingIds.current.add(id);
            knownIds.current.delete(id);
          }
          setState((prev) => ({
            ...prev,
            enemies: [...tick.enemies.map(cloneEnemy), ...tick.killed.map(cloneEnemy)],
            killPoints: prev.killPoints + tick.earnedPoints,
          }));
          if (onAnimations) onAnimations(tick.animations);
          await sleep(stepDelay);
          for (const id of tick.killedIds) dyingIds.current.delete(id);
          enemies = tick.enemies;
        }

        // Spawn the next wave — if there's no room, the board is overwhelmed.
        const newTurn = state.turn + 1;
        const spawnAnims: AnimEvent[] = [];
        let overwhelmed = false;
        for (let i = 0; i < spawnsPerTurn(newTurn); i++) {
          const spawned = spawnEndlessEnemy(newTurn, enemies, player.position);
          if (spawned) {
            enemies.push(spawned);
            knownIds.current.add(spawned.id);
            spawnAnims.push({ type: "spawn", unitId: spawned.id });
          } else {
            overwhelmed = true;
            break;
          }
        }

        const gameOver = overwhelmed && !godMode;

        // XP from every kill this turn (slam + splash + ticks), scaled by items.
        const gainedXp = Math.floor((slide.earnedPoints + tickEarned) * mods.xpMultiplier);
        const xpRes = applyXp(state.level, state.xp, gainedXp);
        const pendingChoices = state.pendingChoices + xpRes.levelsGained;
        const showChoice = pendingChoices > 0 && !gameOver;
        const nextChoices = showChoice ? rollChoices(3) : [];

        setState((prev) => ({
          ...prev,
          turn: newTurn,
          enemies: enemies.map(cloneEnemy),
          player,
          gameOver,
          playerTurnActive: !gameOver && !showChoice,
          level: xpRes.level,
          xp: xpRes.xp,
          xpToNext: xpRes.xpToNext,
          pendingChoices,
          currentChoices: nextChoices,
        }));
        if (onAnimations && spawnAnims.length > 0) onAnimations(spawnAnims);
      } finally {
        busyRef.current = false;
      }
    },
    [state, onAnimations, stepDelay, godMode],
  );

  // -----------------------------------------------------------------------
  // Choose an item on level-up. Adds it to the inventory (stacking), then
  // either offers the next pending choice or resumes play.
  // -----------------------------------------------------------------------

  const chooseItem = useCallback((itemId: string) => {
    const nextChoices = rollChoices(3);
    setState((prev) => {
      if (prev.currentChoices.length === 0) return prev;
      const inventory: Inventory = {
        ...prev.inventory,
        [itemId]: (prev.inventory[itemId] ?? 0) + 1,
      };
      const remaining = prev.pendingChoices - 1;
      return {
        ...prev,
        inventory,
        pendingChoices: remaining,
        currentChoices: remaining > 0 ? nextChoices : [],
        player: { ...prev.player, attack: playerAttackFor(inventory) },
        playerTurnActive: remaining > 0 ? false : !prev.gameOver,
      };
    });
  }, []);

  // -----------------------------------------------------------------------
  // Restart
  // -----------------------------------------------------------------------

  const restart = useCallback(() => {
    const next = freshState();

    knownIds.current = new Set(next.enemies.map((e) => e.id));
    dyingIds.current = new Set();
    busyRef.current = false;
    if (onAnimations && next.enemies.length > 0) {
      onAnimations(next.enemies.map((e) => ({ type: "spawn" as const, unitId: e.id })));
    }

    setState(next);
  }, [onAnimations]);

  return { state, move, chooseItem, restart };
}
