"use client";

import {
  Enemy,
  Player,
  Position,
  EnemyIntent,
} from "@/types/game";
import { GRID_HALF, GRID_SIZE, CELL_SIZE, isOuterRing } from "@/data/game-data";
import { Unit } from "./Unit";
import { MdBlock } from "react-icons/md";

export type AnimationState = "idle" | "attacking" | "hurt" | "dying" | "merging" | "spawning";

interface GridProps {
  enemies: Enemy[];
  player: Player;
  gridPreview: Position | null;
  isValidDrop: boolean;
  hoveredId: string | null;
  intents: Record<string, EnemyIntent>;
  unitAnimations: Record<string, AnimationState>;
  globalSpellDrag: boolean;
  onUnitHover: (unit: Enemy | Player | null) => void;
  onTileMouseUp: (pos: Position) => void;
}

export function Grid({
  enemies,
  player,
  gridPreview,
  isValidDrop,
  hoveredId,
  intents,
  unitAnimations,
  globalSpellDrag,
  onUnitHover,
  onTileMouseUp,
}: GridProps) {
  const tiles: React.JSX.Element[] = [];

  for (let y = -GRID_HALF; y <= GRID_HALF; y++) {
    for (let x = -GRID_HALF; x <= GRID_HALF; x++) {
      const pos = { x, y };
      const isSpawn = isOuterRing(pos);
      const isPreview = gridPreview?.x === x && gridPreview?.y === y;

      tiles.push(
        <div
          key={`${x},${y}`}
          onMouseUp={() => onTileMouseUp(pos)}
          onMouseEnter={() => onUnitHover(null)}
          className={`
            relative select-none
            ${isSpawn ? "bg-zinc-800/50" : ""}
          `}
          style={{ width: CELL_SIZE, height: CELL_SIZE }}
        >
          {globalSpellDrag && !isPreview && (
            <div className="absolute inset-1 rounded-sm bg-orange-400/10 pointer-events-none" />
          )}
          {isPreview && (
            <div
              className={`
                absolute inset-1 rounded-md flex items-center justify-center
                ${isValidDrop ? "bg-zinc-500/30" : "bg-red-500/30"}
              `}
            >
              {!isValidDrop && (
                <MdBlock className="text-zinc-400 text-2xl pointer-events-none" />
              )}
            </div>
          )}
        </div>
      );
    }
  }

  const unitSize = CELL_SIZE - 8;
  const unitOffset = 4;

  const renderUnit = (unit: Enemy | Player) => {
    return (
      <Unit
        key={unit.id}
        unit={unit}
        intent={unit.type === "enemy" ? intents[unit.id] : undefined}
        isHovered={unit.id === hoveredId}
        animationState={unitAnimations[unit.id] || "idle"}
        unitSize={unitSize}
        unitOffset={unitOffset}
        onMouseEnter={() => onUnitHover(unit)}
        onMouseUp={() => onTileMouseUp(unit.position)}
      />
    );
  };

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
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
        }}
      >
        {tiles}
      </div>

      {enemies.map(renderUnit)}
      {renderUnit(player)}
    </div>
  );
}
