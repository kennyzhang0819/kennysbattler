"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useGame, AnimEvent } from "@/hooks/useGame";
import { Grid, AnimationState } from "./Grid";
import { InfoBox } from "./InfoBox";
import { ItemChoice } from "./ItemChoice";
import { Direction, Player, Enemy } from "@/types/game";
import { ITEMS } from "@/data/items";
import { FaArrowUp, FaArrowDown, FaArrowLeft, FaArrowRight } from "react-icons/fa6";

interface GameProps {
  onRetry: () => void;
  onExit: () => void;
}

const KEY_TO_DIR: Record<string, Direction> = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  w: "up", s: "down", a: "left", d: "right",
  W: "up", S: "down", A: "left", D: "right",
};

export function Game({ onRetry, onExit }: GameProps) {
  const [animSpeed, setAnimSpeed] = useState(160);
  const [unitAnimations, setUnitAnimations] = useState<Record<string, AnimationState>>({});

  const handleAnimations = useCallback((events: AnimEvent[]) => {
    const eventToState: Record<string, AnimationState> = {
      attack: "attacking",
      hurt: "hurt",
      die: "dying",
      merge: "merging",
      spawn: "spawning",
      heal: "healing",
      buff: "buffing",
    };

    const newAnimations: Record<string, AnimationState> = {};
    const transientIds: string[] = [];
    for (const event of events) {
      // YOUR slam carries a direction. A traveling slam gets momentum easing on
      // its move ("slam-*"); an in-place slam gets a quick jab ("lunge-*").
      const mapped: AnimationState =
        event.type === "attack" && event.dir
          ? ((event.traveled ? `slam-${event.dir}` : `lunge-${event.dir}`) as AnimationState)
          : eventToState[event.type] || "idle";
      newAnimations[event.unitId] = mapped;
      if (mapped !== "dying") transientIds.push(event.unitId);
    }
    setUnitAnimations((prev) => ({ ...prev, ...newAnimations }));

    if (transientIds.length > 0) {
      setTimeout(() => {
        setUnitAnimations((prev) => {
          const next = { ...prev };
          for (const id of transientIds) {
            if (next[id] && next[id] !== "dying") delete next[id];
          }
          return next;
        });
      }, 300);
    }
  }, []);

  const { state, move, chooseItem } = useGame({ onAnimations: handleAnimations, animStepDelay: animSpeed });

  const aliveIds = useMemo(() => {
    const ids = new Set(state.enemies.map((e) => e.id));
    ids.add(state.player.id);
    return ids;
  }, [state.enemies, state.player.id]);

  const prunedAnimations = useMemo(() => {
    const next: Record<string, AnimationState> = {};
    for (const id in unitAnimations) {
      if (aliveIds.has(id)) next[id] = unitAnimations[id];
    }
    return next;
  }, [unitAnimations, aliveIds]);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const findUnit = useCallback((id: string | null) => {
    if (!id) return null;
    return state.enemies.find((e) => e.id === id) || (state.player.id === id ? state.player : null) || null;
  }, [state.enemies, state.player]);

  const effectivePinnedId = pinnedId && aliveIds.has(pinnedId) ? pinnedId : null;
  const hoveredUnit = findUnit(hoveredId ?? effectivePinnedId);

  const moveRef = useRef(move);
  useEffect(() => {
    moveRef.current = move;
  }, [move]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const dir = KEY_TO_DIR[e.key];
      if (!dir) return;
      e.preventDefault();
      moveRef.current(dir);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleUnitHover = useCallback((unit: Enemy | Player | null) => {
    setHoveredId(unit?.id ?? null);
  }, []);

  const handleUnitClick = useCallback((unit: Enemy | Player | null) => {
    if (!unit) {
      setPinnedId(null);
      return;
    }
    setPinnedId((prev) => (prev === unit.id ? null : unit.id));
  }, []);

  const choosing = state.currentChoices.length > 0;
  const controlsDisabled = !state.playerTurnActive || state.gameOver || choosing;

  const xpPct = Math.min(100, Math.round((state.xp / state.xpToNext) * 100));
  const inventoryEntries = useMemo(
    () => Object.entries(state.inventory).sort((a, b) => b[1] - a[1]),
    [state.inventory],
  );

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center p-8 select-none">
      <div className="flex flex-col items-center gap-6">
        <div className="flex gap-6 items-start">
          <div className="flex flex-col gap-4 w-44 select-none">
            <div className="bg-zinc-800 rounded-lg px-4 py-3 space-y-2">
              <div className="text-center flex flex-col items-center justify-center">
                <span className="text-zinc-500 text-[10px] font-bold tracking-wide">🌊 ENDLESS</span>
                <span className="text-zinc-300 text-2xl font-bold leading-none mt-0.5">{state.turn}</span>
                <span className="text-zinc-600 text-[9px] mt-0.5">turns survived</span>
              </div>

              {/* Level + XP */}
              <div className="pt-1">
                <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                  <span>✨ Level</span>
                  <span className="text-amber-400 font-bold">{state.level}</span>
                </div>
                <div className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${xpPct}%` }}
                  />
                </div>
                <div className="text-right text-[9px] text-zinc-600 mt-0.5">{state.xp}/{state.xpToNext} XP</div>
              </div>

              <div className="flex justify-between text-[11px] text-zinc-400 pt-1">
                <span>⚔️ Attack</span>
                <span className="text-red-400 font-bold">{state.player.attack}</span>
              </div>
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>💰 Score</span>
                <span className="text-amber-400 font-bold">{state.killPoints}</span>
              </div>
            </div>

            {/* Inventory */}
            <div className="bg-zinc-800 rounded-lg px-3 py-3">
              <label className="text-zinc-500 text-[10px] font-bold tracking-wide block mb-2">🎒 ITEMS</label>
              {inventoryEntries.length === 0 ? (
                <p className="text-zinc-600 text-[11px] leading-snug">Level up to collect items.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {inventoryEntries.map(([id, count]) => {
                    const item = ITEMS[id];
                    if (!item) return null;
                    return (
                      <div
                        key={id}
                        title={`${item.name} ×${count} — ${item.description}`}
                        className="relative flex items-center justify-center w-8 h-8 rounded-md bg-zinc-700 border border-zinc-600 text-lg"
                      >
                        {item.emoji}
                        {count > 1 && (
                          <span className="absolute -bottom-1 -right-1 text-[9px] font-bold text-white bg-zinc-900 rounded-full px-1 leading-tight border border-zinc-600">
                            {count}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-zinc-800 rounded-lg px-3 py-3 space-y-1.5">
              <label className="text-zinc-500 text-[10px] font-bold tracking-wide block">⚡ ANIM SPEED</label>
              <input
                type="range"
                min={40}
                max={500}
                step={10}
                value={animSpeed}
                onChange={(e) => setAnimSpeed(Number(e.target.value))}
                className="w-full h-1.5 accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-zinc-500">
                <span>Fast</span>
                <span>{animSpeed}ms</span>
                <span>Slow</span>
              </div>
            </div>
          </div>

          <Grid
            enemies={state.enemies}
            player={state.player}
            hoveredId={hoveredId}
            pinnedId={effectivePinnedId}
            unitAnimations={prunedAnimations}
            onUnitHover={handleUnitHover}
            onUnitClick={handleUnitClick}
          />

          <InfoBox unit={hoveredUnit} />
        </div>

        <DirectionPad onMove={(d) => moveRef.current(d)} disabled={controlsDisabled} />
      </div>

      {choosing && !state.gameOver && (
        <ItemChoice
          level={state.level}
          choices={state.currentChoices}
          remaining={state.pendingChoices - 1}
          inventory={state.inventory}
          onChoose={chooseItem}
        />
      )}

      {state.gameOver && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-800 rounded-xl p-8 text-center">
            <h1 className="text-4xl font-bold text-white mb-4">BOARD OVERWHELMED</h1>
            <p className="text-zinc-400 mb-1">
              You survived <span className="text-white font-bold">{state.turn}</span> turns
              at <span className="text-amber-400 font-bold">level {state.level}</span>.
            </p>
            <p className="text-zinc-500 text-sm mb-4">Score: {state.killPoints}</p>
            <div className="flex gap-3 justify-center mt-4">
              <button
                onClick={onRetry}
                className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition-colors cursor-pointer"
              >
                Retry
              </button>
              <button
                onClick={onExit}
                className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 font-medium rounded-lg transition-colors cursor-pointer"
              >
                Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DirectionPad({ onMove, disabled }: { onMove: (d: Direction) => void; disabled: boolean }) {
  const btn = "w-14 h-14 rounded-lg flex items-center justify-center text-xl transition-all duration-150 border-2";
  const enabled = "bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-500 text-white cursor-pointer border-zinc-500";
  const off = "bg-zinc-800 text-zinc-600 cursor-not-allowed border-zinc-700";
  const cls = disabled ? `${btn} ${off}` : `${btn} ${enabled}`;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button className={cls} disabled={disabled} onClick={() => onMove("up")} aria-label="Move up">
        <FaArrowUp />
      </button>
      <div className="flex gap-1.5">
        <button className={cls} disabled={disabled} onClick={() => onMove("left")} aria-label="Move left">
          <FaArrowLeft />
        </button>
        <button className={cls} disabled={disabled} onClick={() => onMove("down")} aria-label="Move down">
          <FaArrowDown />
        </button>
        <button className={cls} disabled={disabled} onClick={() => onMove("right")} aria-label="Move right">
          <FaArrowRight />
        </button>
      </div>
      <span className="text-zinc-600 text-[10px] mt-1">Arrow keys / WASD to slam</span>
    </div>
  );
}
