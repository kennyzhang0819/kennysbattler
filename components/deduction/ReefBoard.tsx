"use client";

import { Creature, Mark, Puzzle, Reveal } from "@/types/deduction";
import { SPECIES, posKey, statementText } from "@/lib/deduction/puzzle";

interface ReefBoardProps {
  puzzle: Puzzle;
  reveals: Record<string, Reveal>;
  marks: Record<string, Mark>;
  selectedId: string | null;
  hoveredId: string | null;
  /** posKeys of the cells the focused creature's statement is about. */
  highlighted: Set<string>;
  onSelect: (c: Creature) => void;
  onHover: (c: Creature | null) => void;
  onMark: (c: Creature) => void;
}

export function ReefBoard({
  puzzle,
  reveals,
  marks,
  selectedId,
  hoveredId,
  highlighted,
  onSelect,
  onHover,
  onMark,
}: ReefBoardProps) {
  const { size } = puzzle;
  const cell = size <= 3 ? 150 : 128;

  return (
    <div
      className="grid gap-2 p-2 bg-zinc-800 rounded-xl"
      style={{ gridTemplateColumns: `repeat(${size}, ${cell}px)` }}
      onMouseLeave={() => onHover(null)}
    >
      {puzzle.creatures.map((c) => (
        <CreatureCard
          key={c.id}
          creature={c}
          size={size}
          cell={cell}
          reveal={reveals[c.id] ?? "hidden"}
          mark={marks[c.id] ?? "none"}
          selected={selectedId === c.id}
          hovered={hoveredId === c.id}
          inScope={highlighted.has(posKey(c.pos))}
          onClick={() => onSelect(c)}
          onHover={() => onHover(c)}
          onContextMenu={(e) => {
            e.preventDefault();
            onMark(c);
          }}
        />
      ))}
    </div>
  );
}

function CreatureCard({
  creature,
  size,
  cell,
  reveal,
  mark,
  selected,
  hovered,
  inScope,
  onClick,
  onHover,
  onContextMenu,
}: {
  creature: Creature;
  size: number;
  cell: number;
  reveal: Reveal;
  mark: Mark;
  selected: boolean;
  hovered: boolean;
  inScope: boolean;
  onClick: () => void;
  onHover: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const sp = SPECIES[creature.species];
  const text = statementText(creature.statement, creature.pos, size);

  const bg =
    reveal === "mimic"
      ? "bg-rose-900/60"
      : reveal === "honest"
        ? "bg-emerald-900/50"
        : "bg-zinc-700";

  const ring = selected
    ? "ring-2 ring-amber-400"
    : hovered
      ? "ring-2 ring-amber-400/40"
      : inScope
        ? "ring-2 ring-sky-400/70"
        : "ring-1 ring-white/5";

  return (
    <div
      onClick={onClick}
      onMouseEnter={onHover}
      onContextMenu={onContextMenu}
      className={`relative rounded-lg cursor-pointer transition-all duration-150 ${bg} ${ring} ${inScope && !selected && !hovered ? "scale-[1.02]" : ""}`}
      style={{ width: cell, height: cell }}
    >
      {/* corner badges */}
      {mark !== "none" && reveal === "hidden" && (
        <span className="absolute top-1 left-1.5 text-sm">{mark === "suspect" ? "❓" : "✔"}</span>
      )}
      {reveal === "mimic" && <span className="absolute top-1 left-1.5 text-sm">🎭</span>}
      {reveal === "honest" && <span className="absolute top-1 left-1.5 text-sm text-emerald-400">✔</span>}
      <span className="absolute top-1 right-1.5 text-[9px] text-zinc-500 font-mono">
        {String.fromCharCode(65 + creature.pos.r)}{creature.pos.c + 1}
      </span>

      <div className="absolute inset-0 flex flex-col items-center justify-center px-2 pt-2 gap-1">
        <span className={`leading-none ${size <= 3 ? "text-4xl" : "text-3xl"} ${reveal === "mimic" ? "grayscale" : ""}`}>{sp.emoji}</span>
        <span className="text-[10px] text-zinc-400 font-medium">{sp.name}</span>
        <p
          className={`text-center leading-tight ${size <= 3 ? "text-[11px]" : "text-[10px]"} ${
            reveal === "mimic" ? "text-rose-300 line-through decoration-rose-400/70" : "text-zinc-100"
          }`}
        >
          {text}
        </p>
      </div>
    </div>
  );
}
