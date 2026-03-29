"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {
  Enemy,
  GameState,
  Position,
  Spell,
  SkillLevels,
  LevelConfig,
} from "@/types/game";
import {
  REROLL_COST,
  SPELL_TEMPLATES,
  posKey,
} from "@/data/game-data";
import {
  getSpellUpgrades,
  getSpellDescription,
  getPlayerMaxHP,
  getGoldPerTurn,
  getHandSize,
  hasReroll as hasRerollSkill,
  getFreeRerolls,
} from "@/data/skill-tree";
import {
  processEnemyTurn,
  computeAllIntents,
  spawnWaveEnemies,
  triggerOnDeathEffects,
  AnimEvent,
} from "./enemy-ai";

// ---------------------------------------------------------------------------
// Card helpers
// ---------------------------------------------------------------------------

let nextCardUid = 1;
const generateCardUid = () => `card-${Date.now()}-${nextCardUid++}`;

function randomSpell(allowedIds: string[], skillLevels: SkillLevels): Spell {
  const templates = SPELL_TEMPLATES.filter((t) => allowedIds.includes(t.id));
  const t = templates[Math.floor(Math.random() * templates.length)];
  return { ...t, description: getSpellDescription(t.id, skillLevels), uid: generateCardUid() };
}

function drawHand(allowedIds: string[], count: number, skillLevels: SkillLevels): Spell[] {
  return Array.from({ length: count }, () => randomSpell(allowedIds, skillLevels));
}

// ---------------------------------------------------------------------------
// Player factory
// ---------------------------------------------------------------------------

function createPlayer(maxHP: number) {
  return {
    id: "player" as const,
    type: "player" as const,
    position: { x: 0, y: 0 },
    stackCount: 1,
    health: maxHP,
    maxHealth: maxHP,
    word: "YOU",
    emoji: "❤️",
    range: 0,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export type { AnimEvent };

interface UseGameOptions {
  levelConfig: LevelConfig;
  unlockedSpellIds?: string[];
  skillLevels?: SkillLevels;
  onAnimations?: (events: AnimEvent[]) => void;
  animStepDelay?: number;
}

export function useGame(options: UseGameOptions) {
  const { levelConfig, unlockedSpellIds = [], skillLevels = {}, onAnimations, animStepDelay = 250 } = options;

  const godMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("godmode");

  const hasSpells = unlockedSpellIds.length > 0;
  const playerMaxHP = getPlayerMaxHP(skillLevels);
  const handSize = getHandSize(skillLevels);
  const goldPerTurn = getGoldPerTurn(skillLevels);
  const rerollUnlocked = hasRerollSkill(skillLevels);
  const freeRerollsPerTurn = getFreeRerolls(skillLevels);

  const upgrades = useMemo(() => getSpellUpgrades(skillLevels), [skillLevels]);

  const [state, setState] = useState<GameState>(() => {
    const player = createPlayer(playerMaxHP);
    const hand = hasSpells ? drawHand(unlockedSpellIds, handSize, skillLevels) : [];
    const waves = levelConfig.spawnSchedule[1] || [];
    return {
      turn: 1,
      gold: goldPerTurn,
      killPoints: 0,
      rerollsUsed: 0,
      playerTurnActive: true,
      enemies: spawnWaveEnemies(waves, [], player.position),
      player,
      gameOver: false,
      won: false,
      hand,
    };
  });

  // -------------------------------------------------------------------
  // Unified spawn helper: call this whenever enemies are added to state.
  // Fires onAnimations synchronously so the animation state is set
  // in the same React batch as the setState — no flicker.
  // -------------------------------------------------------------------
  const knownIds = useRef<Set<string>>(new Set(state.enemies.map((e) => e.id)));

  const mountFired = useRef(false);
  useEffect(() => {
    if (!mountFired.current && onAnimations && state.enemies.length > 0) {
      mountFired.current = true;
      onAnimations(state.enemies.map((e) => ({ type: "spawn" as const, unitId: e.id })));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addEnemies = useCallback(
    (incoming: Enemy[]) => {
      const newIds = incoming.filter((e) => !knownIds.current.has(e.id));
      for (const e of incoming) knownIds.current.add(e.id);

      if (newIds.length > 0 && onAnimations) {
        onAnimations(newIds.map((e) => ({ type: "spawn" as const, unitId: e.id })));
      }

      setState((prev) => ({
        ...prev,
        enemies: [...prev.enemies, ...incoming],
      }));
    },
    [onAnimations],
  );

  const removeEnemy = useCallback((id: string) => {
    knownIds.current.delete(id);
    setState((prev) => ({
      ...prev,
      enemies: prev.enemies.filter((e) => e.id !== id),
    }));
  }, []);

  const dyingIds = useRef<Set<string>>(new Set());

  const castSpell = useCallback(
    (spell: Spell, target: Position): boolean => {
      if (!state.playerTurnActive) return false;
      if (state.gold < spell.cost) return false;

      const replacement = randomSpell(unlockedSpellIds, skillLevels);
      const replaceCard = (hand: Spell[]) => hand.map((c) => (c.uid === spell.uid ? replacement : c));
      const spellUp = upgrades[spell.id] ?? {};

      // --- Self-target spells ---
      if (spell.target === "self") {
        const playerKey = posKey(state.player.position);
        if (posKey(target) !== playerKey) return false;

        switch (spell.id) {
          case "restore": {
            const bonusHp = (spellUp["restore_heal"] ?? 0) * 2;
            const newMax = state.player.maxHealth + 6 + bonusHp;
            const pctHeal = Math.ceil(newMax * (spellUp["restore_pct"] ?? 0) * 0.01);
            const newHealth = state.player.health + 6 + bonusHp + pctHeal;
            setState((prev) => ({
              ...prev,
              gold: prev.gold - spell.cost,
              hand: replaceCard(prev.hand),
              player: { ...prev.player, maxHealth: newMax, health: Math.min(newMax, newHealth) },
            }));
            return true;
          }
          default:
            return false;
        }
      }

      // --- Enemy / tile target spells ---
      const enemyAtTarget = state.enemies.find(
        (e) => posKey(e.position) === posKey(target) && !dyingIds.current.has(e.id),
      );

      if (spell.target === "enemy" && !enemyAtTarget) return false;
      if (spell.target === "tile" && !enemyAtTarget) return false;

      let hits: { enemy: Enemy; damage: number }[];

      switch (spell.id) {
        case "fireball": {
          const e = enemyAtTarget!;
          const baseDmg = 2 + (spellUp["fireball_dmg"] ?? 0) * 2;
          const pctLvl = spellUp["fireball_pct"] ?? 0;
          const dmg = baseDmg + (pctLvl > 0 ? Math.ceil(e.maxHealth * pctLvl * 0.01) : 0);
          hits = [{ enemy: e, damage: dmg }];
          break;
        }
        case "lightning": {
          const bonusDmg = (spellUp["lightning_dmg"] ?? 0) * 1;
          const pctLvl = spellUp["lightning_pct"] ?? 0;
          hits = state.enemies
            .filter(
              (e) =>
                !dyingIds.current.has(e.id) &&
                (e.position.x === target.x || e.position.y === target.y),
            )
            .map((e) => ({
              enemy: e,
              damage: 1 + bonusDmg + (pctLvl > 0 ? Math.ceil(e.maxHealth * pctLvl * 0.01) : 0),
            }));
          break;
        }
        default:
          return false;
      }

      const animations: AnimEvent[] = [];
      const killedIds = new Set<string>();
      let earnedPoints = 0;

      for (const { enemy: e, damage } of hits) {
        if (e.health - damage <= 0) {
          killedIds.add(e.id);
          animations.push({ type: "die", unitId: e.id });
          dyingIds.current.add(e.id);
          earnedPoints += e.points;
        } else {
          animations.push({ type: "hurt", unitId: e.id });
        }
      }

      const hitMap = new Map(hits.map((h) => [h.enemy.id, h.damage]));

      // Compute on-death heals: build a map of enemyId → total healing received
      const healMap = new Map<string, number>();
      for (const { enemy: e, damage } of hits) {
        if (e.health - damage <= 0 && e.onDeathEffects.length > 0) {
          const cloned = state.enemies.map((en) => ({ ...en, position: { ...en.position } }));
          const result = triggerOnDeathEffects(
            cloned.find((c) => c.id === e.id)!,
            cloned,
          );
          for (const anim of result.animations) {
            if (anim.type === "heal") {
              animations.push(anim);
              const healed = cloned.find((c) => c.id === anim.unitId);
              if (healed) {
                const prev = healMap.get(anim.unitId) ?? 0;
                healMap.set(anim.unitId, prev + e.damage);
              }
            }
          }
        }
      }

      setState((prev) => ({
        ...prev,
        gold: prev.gold - spell.cost,
        killPoints: prev.killPoints + earnedPoints,
        hand: replaceCard(prev.hand),
        enemies: prev.enemies.map((e) => {
          const dmg = hitMap.get(e.id);
          const heal = healMap.get(e.id) ?? 0;
          if (dmg !== undefined && killedIds.has(e.id)) return e;
          const newHp = (dmg !== undefined ? Math.max(0, e.health - dmg) : e.health) + heal;
          if (heal > 0 || dmg !== undefined) {
            return { ...e, health: Math.min(e.maxHealth, newHp) };
          }
          return e;
        }),
      }));

      if (onAnimations && animations.length > 0) onAnimations(animations);

      for (const id of killedIds) {
        setTimeout(() => {
          dyingIds.current.delete(id);
          removeEnemy(id);
        }, 350);
      }

      return true;
    },
    [state.playerTurnActive, state.gold, state.enemies, state.player.position, state.player.health, state.player.maxHealth, onAnimations, unlockedSpellIds, skillLevels, upgrades, removeEnemy],
  );

  const rerollCost = state.rerollsUsed < freeRerollsPerTurn ? 0 : REROLL_COST;
  const canReroll = rerollUnlocked && hasSpells && state.playerTurnActive && !state.gameOver && state.gold >= rerollCost;

  const reroll = useCallback(() => {
    if (!canReroll) return false;
    setState((prev) => {
      const isFree = prev.rerollsUsed < freeRerollsPerTurn;
      return {
        ...prev,
        gold: isFree ? prev.gold : prev.gold - REROLL_COST,
        rerollsUsed: prev.rerollsUsed + 1,
        hand: drawHand(unlockedSpellIds, handSize, skillLevels),
      };
    });
    return true;
  }, [canReroll, freeRerollsPerTurn, unlockedSpellIds, handSize, skillLevels]);

  // -----------------------------------------------------------------------
  // End turn — enemy phase
  // -----------------------------------------------------------------------

  const stepDelay = animStepDelay;

  const endTurn = useCallback(async () => {
    if (!state.playerTurnActive || state.gameOver) return;

    setState((prev) => ({ ...prev, playerTurnActive: false }));

    let enemies = state.enemies.map((e) => ({
      ...e,
      position: { ...e.position },
      abilities: e.abilities.map((a) => ({ ...a })),
      onDeathEffects: [...e.onDeathEffects],
    }));
    let player = { ...state.player, position: { ...state.player.position } };
    let gameOver = false;

    const processingOrder = [...enemies].sort((a, b) => {
      if (a.position.y !== b.position.y) return a.position.y - b.position.y;
      return a.position.x - b.position.x;
    });

    for (const ref of processingOrder) {
      const current = enemies.find((e) => e.id === ref.id);
      if (!current) continue;

      const prevIds = new Set(enemies.map((e) => e.id));
      const result = processEnemyTurn(current, enemies, player);
      enemies = result.enemies;
      player = result.player;
      if (result.gameOver && !godMode) gameOver = true;
      if (godMode && player.health <= 0) player = { ...player, health: 1 };

      const spawnEvents: AnimEvent[] = [];
      for (const e of enemies) {
        if (!prevIds.has(e.id) && !knownIds.current.has(e.id)) {
          knownIds.current.add(e.id);
          spawnEvents.push({ type: "spawn", unitId: e.id });
        }
      }
      for (const id of prevIds) {
        if (!enemies.some((e) => e.id === id)) {
          knownIds.current.delete(id);
        }
      }

      const allAnims = [...spawnEvents, ...result.animations];

      setState((prev) => ({
        ...prev,
        enemies: enemies.map((e) => ({ ...e, position: { ...e.position }, abilities: e.abilities.map((a) => ({ ...a })), onDeathEffects: [...e.onDeathEffects] })),
        player: { ...player },
      }));
      if (allAnims.length > 0 && onAnimations) {
        onAnimations(allAnims);
      }
      await new Promise((r) => setTimeout(r, stepDelay));
    }

    await new Promise((r) => setTimeout(r, Math.max(50, stepDelay * 0.6)));

    const newTurn = state.turn + 1;
    const upcomingWaves = levelConfig.spawnSchedule[newTurn] || [];

    const hasAnyFutureSpawns = Object.entries(levelConfig.spawnSchedule).some(
      ([turnStr, waves]) => Number(turnStr) >= newTurn && waves.some((w) => w.count > 0),
    );
    const allEnemiesDead = enemies.length === 0 && !hasAnyFutureSpawns;
    const won = allEnemiesDead && !gameOver;
    const timedOut = state.turn >= levelConfig.maxTurns && !won;
    if (timedOut && !godMode) gameOver = true;
    const newHand = hasSpells ? drawHand(unlockedSpellIds, handSize, skillLevels) : [];

    setState((prev) => ({
      ...prev,
      turn: newTurn,
      gold: goldPerTurn,
      rerollsUsed: 0,
      enemies,
      player,
      gameOver: gameOver || won,
      won,
      hand: newHand,
      playerTurnActive: !gameOver && !won,
    }));

    if (!gameOver && !won) {
      const spawned = spawnWaveEnemies(upcomingWaves, enemies, player.position);
      if (spawned.length > 0) {
        await new Promise((r) => setTimeout(r, stepDelay));
        addEnemies(spawned);
      }
    }
  }, [state, onAnimations, levelConfig, hasSpells, unlockedSpellIds, stepDelay, addEnemies, godMode, goldPerTurn, handSize, skillLevels]);

  // -----------------------------------------------------------------------
  // Restart
  // -----------------------------------------------------------------------

  const restart = useCallback(() => {
    nextCardUid = 1;
    const player = createPlayer(playerMaxHP);
    const waves = levelConfig.spawnSchedule[1] || [];
    const initialEnemies = spawnWaveEnemies(waves, [], player.position);
    const hand = hasSpells ? drawHand(unlockedSpellIds, handSize, skillLevels) : [];

    knownIds.current = new Set(initialEnemies.map((e) => e.id));
    if (onAnimations && initialEnemies.length > 0) {
      onAnimations(initialEnemies.map((e) => ({ type: "spawn" as const, unitId: e.id })));
    }

    setState({
      turn: 1,
      gold: goldPerTurn,
      killPoints: 0,
      rerollsUsed: 0,
      playerTurnActive: true,
      enemies: initialEnemies,
      player,
      gameOver: false,
      won: false,
      hand,
    });
  }, [levelConfig, hasSpells, unlockedSpellIds, playerMaxHP, handSize, goldPerTurn, skillLevels, onAnimations]);

  // -----------------------------------------------------------------------
  // Intents (for UI display)
  // -----------------------------------------------------------------------

  const intents = useMemo(
    () => computeAllIntents(state.enemies, state.player.position),
    [state.enemies, state.player.position],
  );

  return {
    state,
    intents,
    levelConfig,
    hasSpells,
    rerollUnlocked,
    rerollCost,
    canReroll,
    castSpell,
    reroll,
    endTurn,
    restart,
  };
}
