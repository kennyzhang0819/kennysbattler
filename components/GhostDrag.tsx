"use client";

import { CELL_SIZE } from "@/data/game-data";

interface GhostDragProps {
  emoji: string;
  mousePos: { x: number; y: number };
}

const ghostSize = CELL_SIZE - 8;
const ghostOffset = ghostSize / 2;

export function GhostDrag({ emoji, mousePos }: GhostDragProps) {
  return (
    <div
      className="fixed pointer-events-none z-50 select-none"
      style={{
        left: mousePos.x - ghostOffset,
        top: mousePos.y - ghostOffset,
      }}
    >
      <div
        className="rounded-lg bg-zinc-600/80 flex items-center justify-center"
        style={{ width: ghostSize, height: ghostSize }}
      >
        <span className="text-3xl opacity-90">{emoji}</span>
      </div>
    </div>
  );
}
