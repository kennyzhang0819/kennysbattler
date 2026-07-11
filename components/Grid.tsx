"use client";

import {
  Enemy,
  Player,
} from "@/types/game";
import { GRID_HALF, GRID_SIZE, CELL_SIZE, isOuterRing } from "@/data/game-data";
import { Unit } from "./Unit";

export type AnimationState =
  | "idle"
  | "attacking"
  | "hurt"
  | "dying"
  | "merging"
  | "spawning"
  | "healing"
  | "buffing"
  // In-place slam (no travel): a quick directional jab via transform.
  | "lunge-up"
  | "lunge-down"
  | "lunge-left"
  | "lunge-right"
  // Traveling slam: momentum baked into the position transition's easing.
  | "slam-up"
  | "slam-down"
  | "slam-left"
  | "slam-right";

interface GridProps {
  enemies: Enemy[];
  player: Player;
  hoveredId: string | null;
  pinnedId: string | null;
  unitAnimations: Record<string, AnimationState>;
  onUnitHover: (unit: Enemy | Player | null) => void;
  onUnitClick: (unit: Enemy | Player | null) => void;
}

export function Grid({
  enemies,
  player,
  hoveredId,
  pinnedId,
  unitAnimations,
  onUnitHover,
  onUnitClick,
}: GridProps) {
  const tiles: React.JSX.Element[] = [];

  for (let y = -GRID_HALF; y <= GRID_HALF; y++) {
    for (let x = -GRID_HALF; x <= GRID_HALF; x++) {
      const isSpawn = isOuterRing({ x, y });

      tiles.push(
        <div
          key={`${x},${y}`}
          onMouseEnter={() => onUnitHover(null)}
          onClick={() => onUnitClick(null)}
          className={`relative select-none ${isSpawn ? "bg-zinc-800/50" : ""}`}
          style={{ width: CELL_SIZE, height: CELL_SIZE }}
        />
      );
    }
  }

  const unitSize = CELL_SIZE - 8;
  const unitOffset = 4;

  const renderUnit = (unit: Enemy | Player) => (
    <Unit
      key={unit.id}
      unit={unit}
      isHovered={unit.id === hoveredId || unit.id === pinnedId}
      isPinned={unit.id === pinnedId}
      animationState={unitAnimations[unit.id] || "idle"}
      unitSize={unitSize}
      unitOffset={unitOffset}
      onMouseEnter={() => onUnitHover(unit)}
      onClick={() => onUnitClick(unit)}
    />
  );

  return (
    <div
      className="relative bg-zinc-800 rounded-lg overflow-hidden select-none"
      style={{
        width: GRID_SIZE * CELL_SIZE,
        height: GRID_SIZE * CELL_SIZE,
      }}
    >
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)` }}
      >
        {tiles}
      </div>

      {enemies.map(renderUnit)}
      {renderUnit(player)}
    </div>
  );
}
