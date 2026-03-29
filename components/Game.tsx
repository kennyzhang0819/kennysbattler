"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useGame, AnimEvent } from "@/hooks/useGame";
import { Grid, AnimationState } from "./Grid";
import { SpellBar } from "./SpellBar";
import { InfoBox } from "./InfoBox";
import { GhostDrag } from "./GhostDrag";
import { Bar } from "./Bar";
import {
  Position,
  Spell,
  Player,
  Enemy,
  LevelConfig,
} from "@/types/game";
import { inBounds, pixelToGrid, getTotalTurns } from "@/data/game-data";

interface GameProps {
  levelConfig: LevelConfig;
  unlockedSpellIds?: string[];
  skillLevels?: Record<string, number>;
  onWin: (earnedPoints: number) => void;
  onLose: (earnedPoints: number) => void;
  onBackToMap: () => void;
}

export function Game({ levelConfig, unlockedSpellIds, skillLevels, onWin, onLose, onBackToMap }: GameProps) {
  const [animSpeed, setAnimSpeed] = useState(250);
  const [unitAnimations, setUnitAnimations] = useState<
    Record<string, AnimationState>
  >({});

  const handleAnimations = useCallback((events: AnimEvent[]) => {
    const eventToState: Record<string, AnimationState> = {
      attack: "attacking",
      hurt: "hurt",
      die: "dying",
      merge: "merging",
      spawn: "spawning",
      heal: "healing",
    };

    const newAnimations: Record<string, AnimationState> = {};
    const transientIds: string[] = [];
    for (const event of events) {
      const mapped = eventToState[event.type] || "idle";
      newAnimations[event.unitId] = mapped;
      if (mapped !== "dying") transientIds.push(event.unitId);
    }
    setUnitAnimations((prev) => ({ ...prev, ...newAnimations }));

    if (transientIds.length > 0) {
      setTimeout(() => {
        setUnitAnimations((prev) => {
          const next = { ...prev };
          for (const id of transientIds) {
            if (next[id] && next[id] !== "dying") {
              delete next[id];
            }
          }
          return next;
        });
      }, 300);
    }
  }, []);

  const { state, intents, hasSpells, rerollUnlocked, rerollCost, canReroll, castSpell, reroll, endTurn, restart } =
    useGame({ levelConfig, unlockedSpellIds, skillLevels, onAnimations: handleAnimations, animStepDelay: animSpeed });

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

  const [spellDrag, setSpellDrag] = useState<Spell | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [gridPreview, setGridPreview] = useState<Position | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [hoveredSpell, setHoveredSpell] = useState<Spell | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  const findUnit = useCallback((id: string | null) => {
    if (!id) return null;
    return state.enemies.find((e) => e.id === id) || (state.player.id === id ? state.player : null) || null;
  }, [state.enemies, state.player]);

  const effectivePinnedId = pinnedId && aliveIds.has(pinnedId) ? pinnedId : null;
  const displayId = hoveredId ?? effectivePinnedId;
  const hoveredUnit = findUnit(displayId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && state.playerTurnActive && !state.gameOver) {
        e.preventDefault();
        setSpellDrag(null);
        setGridPreview(null);
        endTurn();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.playerTurnActive, state.gameOver, endTurn]);

  useEffect(() => {
    if (!spellDrag) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging && dragStartPos.current) {
        const dx = Math.abs(e.clientX - dragStartPos.current.x);
        const dy = Math.abs(e.clientY - dragStartPos.current.y);
        if (dx >= 5 || dy >= 5) setIsDragging(true);
      }

      setMousePos({ x: e.clientX, y: e.clientY });

      if (!gridRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();
      const x = pixelToGrid(e.clientX - rect.left);
      const y = pixelToGrid(e.clientY - rect.top);

      if (inBounds({ x, y })) {
        setGridPreview({ x, y });
      } else {
        setGridPreview(null);
      }
    };

    const handleMouseUp = () => {
      setSpellDrag(null);
      setIsDragging(false);
      setGridPreview(null);
      dragStartPos.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [spellDrag, isDragging]);

  const handleSpellDragStart = useCallback(
    (spell: Spell, e: React.MouseEvent) => {
      if (!state.playerTurnActive) return;
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      setMousePos({ x: e.clientX, y: e.clientY });
      setIsDragging(true);
      setSpellDrag(spell);
    },
    [state.playerTurnActive]
  );

  const handleUnitHover = useCallback(
    (unit: Enemy | Player | null) => {
      setHoveredId(unit?.id ?? null);
    },
    []
  );

  const handleUnitClick = useCallback(
    (unit: Enemy | Player | null) => {
      if (!unit) {
        setPinnedId(null);
        return;
      }
      setPinnedId((prev) => (prev === unit.id ? null : unit.id));
    },
    []
  );

  const handleSpellHover = useCallback(
    (spell: Spell | null) => {
      setHoveredSpell(spell);
    },
    []
  );

  const handleTileMouseUp = useCallback(
    (pos: Position) => {
      if (!spellDrag || !isDragging || !state.playerTurnActive) return;
      castSpell(spellDrag, pos);
      setSpellDrag(null);
      setIsDragging(false);
      setGridPreview(null);
    },
    [spellDrag, isDragging, state.playerTurnActive, castSpell]
  );

  const isValidDrop = useMemo(() => {
    if (!gridPreview || !spellDrag) return false;
    const playerPos = state.player.position;
    const isPlayer =
      gridPreview.x === playerPos.x && gridPreview.y === playerPos.y;
    const isEnemy = state.enemies.some(
      (e) =>
        e.position.x === gridPreview.x &&
        e.position.y === gridPreview.y &&
        e.health > 0
    );

    if (spellDrag.target === "self") return isPlayer;
    if (spellDrag.target === "enemy") return isEnemy;
    if (spellDrag.target === "tile") return isEnemy;
    return false;
  }, [gridPreview, spellDrag, state.enemies, state.player.position]);

  const canEndTurn = state.playerTurnActive && !state.gameOver;

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center p-8 select-none">
      <div className="flex flex-col items-center gap-6">
        <div className="flex gap-6 items-start">
          <div className="flex flex-col gap-4 w-40 select-none">
            <div className="bg-zinc-800 rounded-lg px-4 py-3 space-y-2">
              <button
                onClick={onBackToMap}
                className="text-zinc-500 hover:text-zinc-300 text-[10px] font-bold tracking-wide transition-colors cursor-pointer"
              >
                ← MAP
              </button>
              <div className="text-center flex flex-col items-center justify-center">
                <span className="text-zinc-500 text-[10px] font-bold tracking-wide">
                  {levelConfig.emoji} {levelConfig.name.toUpperCase()}
                </span>
                <span className="text-zinc-300 text-lg font-bold">
                  {state.turn} / {getTotalTurns(levelConfig)}
                </span>
                <span className="text-zinc-600 text-[9px] mt-0.5">
                  defeat all by turn {levelConfig.maxTurns}
                </span>
              </div>
              <Bar
                value={state.player.health}
                max={state.player.maxHealth}
                color="bg-red-500"
                label="❤️ HP"
              />
            </div>
            <div className="bg-zinc-800 rounded-lg px-3 py-3">
              <p className="text-zinc-400 text-xs leading-snug">
                {levelConfig.instruction}
              </p>
            </div>
            <div className="bg-zinc-800 rounded-lg px-3 py-3 space-y-1.5">
              <label className="text-zinc-500 text-[10px] font-bold tracking-wide block">
                ⚡ ANIM SPEED
              </label>
              <input
                type="range"
                min={50}
                max={1000}
                step={25}
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

          <div ref={gridRef}>
            <Grid
              enemies={state.enemies}
              player={state.player}
              gridPreview={isDragging ? gridPreview : null}
              isValidDrop={isValidDrop}
              hoveredId={hoveredId}
              pinnedId={effectivePinnedId}
              intents={intents}
              unitAnimations={prunedAnimations}
              globalSpellDrag={false}
              onUnitHover={handleUnitHover}
              onUnitClick={handleUnitClick}
              onTileMouseUp={handleTileMouseUp}
            />
          </div>

          <InfoBox
            unit={hoveredUnit}
            unitIntent={hoveredUnit && hoveredUnit.type === "enemy" ? intents[hoveredUnit.id] : undefined}
            hoveredSpell={hoveredSpell}
          />
        </div>

        <div className="flex items-center gap-4">
          {hasSpells && (
            <div className="w-16 h-16 rounded-full bg-zinc-800 border-2 border-yellow-500/60 flex flex-col items-center justify-center shrink-0">
              <span className="text-lg leading-none">💰</span>
              <span className="text-yellow-400 text-sm font-bold">{state.gold}</span>
            </div>
          )}

          {hasSpells && (
            <SpellBar
              hand={state.hand}
              gold={state.gold}
              showReroll={rerollUnlocked}
              canReroll={canReroll}
              rerollCost={rerollCost}
              onDragStart={handleSpellDragStart}
              onHover={handleSpellHover}
              onReroll={reroll}
              disabled={!state.playerTurnActive || state.gameOver}
            />
          )}

          <button
            onClick={() => {
              if (canEndTurn) {
                setSpellDrag(null);
                setGridPreview(null);
                endTurn();
              }
            }}
            disabled={!canEndTurn}
            className={`
              w-16 h-16 rounded-full font-bold text-xs transition-all duration-150 shrink-0
              flex flex-col items-center justify-center gap-0.5
              ${canEndTurn
                ? "bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-500 text-white cursor-pointer border-2 border-zinc-500"
                : "bg-zinc-800 text-zinc-600 cursor-not-allowed border-2 border-zinc-700"
              }
            `}
          >
            <span className="leading-none">END</span>
            <kbd className="px-1 py-0.5 rounded bg-zinc-600 text-zinc-300 text-[9px] font-mono leading-none">
              Space
            </kbd>
          </button>
        </div>
      </div>

      {isDragging && spellDrag && (
        <GhostDrag emoji={spellDrag.emoji} mousePos={mousePos} />
      )}

      {state.gameOver && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-800 rounded-xl p-8 text-center">
            <h1 className="text-4xl font-bold text-white mb-4">
              {state.won ? "VICTORY!" : "DEFEATED"}
            </h1>
            <p className="text-zinc-400 mb-2">
              {state.won
                ? `All enemies defeated in ${levelConfig.name}!`
                : `Defeated on turn ${Math.min(state.turn, levelConfig.maxTurns)} of ${levelConfig.maxTurns}`}
            </p>
            {state.killPoints > 0 && (
              <p className="text-amber-400 font-bold mb-4">
                +{state.killPoints} skill points earned
              </p>
            )}
            <div className="flex gap-3 justify-center mt-4">
              {state.won ? (
                <button
                  onClick={() => onWin(state.killPoints)}
                  className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition-colors"
                >
                  Continue
                </button>
              ) : (
                <>
                  <button
                    onClick={restart}
                    className="px-6 py-3 bg-zinc-600 hover:bg-zinc-500 text-white font-medium rounded-lg transition-colors"
                  >
                    Retry
                  </button>
                  <button
                    onClick={() => onLose(state.killPoints)}
                    className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 font-medium rounded-lg transition-colors"
                  >
                    World Map
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
