"use client";

import { Spell } from "@/types/game";

interface SpellBarProps {
  hand: Spell[];
  gold: number;
  showReroll: boolean;
  canReroll: boolean;
  rerollCost: number;
  onDragStart: (spell: Spell, e: React.MouseEvent) => void;
  onHover: (spell: Spell | null) => void;
  onReroll: () => void;
  disabled: boolean;
}

export function SpellBar({
  hand,
  gold,
  showReroll,
  canReroll,
  rerollCost,
  onDragStart,
  onHover,
  onReroll,
  disabled,
}: SpellBarProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1.5">
        {hand.map((spell) => {
          const canAfford = gold >= spell.cost;
          const isUsable = !disabled && canAfford;

          return (
            <button
              key={spell.uid}
              onMouseDown={(e) => {
                if (isUsable) {
                  e.preventDefault();
                  onDragStart(spell, e);
                }
              }}
              onMouseEnter={() => onHover(spell)}
              onMouseLeave={() => onHover(null)}
              disabled={!isUsable}
              className={`
                w-16 h-18 rounded-lg flex flex-col items-center justify-center gap-0.5
                transition-all duration-100 border-2 relative
                ${isUsable
                  ? "bg-zinc-700 border-zinc-500 hover:border-zinc-400 hover:bg-zinc-600 cursor-grab active:cursor-grabbing"
                  : "bg-zinc-800 border-zinc-700 opacity-50 cursor-not-allowed"
                }
              `}
            >
              <span className="text-xl leading-none">{spell.emoji}</span>
              <span className="text-[9px] font-bold text-zinc-300 leading-none">
                {spell.name}
              </span>
              {spell.cost > 0 && (
                <span className={`absolute -top-1.5 -right-1.5 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center ${
                  canAfford ? "bg-yellow-500 text-yellow-900" : "bg-zinc-600 text-zinc-400"
                }`}>
                  {spell.cost}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {showReroll && (
        <button
          onClick={onReroll}
          disabled={!canReroll}
          className={`
            w-14 h-16 rounded-lg flex flex-col items-center justify-center gap-0.5
            transition-all duration-100 border-2
            ${canReroll
              ? "bg-zinc-700 border-amber-500/60 hover:border-amber-400 hover:bg-zinc-600 cursor-pointer"
              : "bg-zinc-800 border-zinc-700 opacity-50 cursor-not-allowed"
            }
          `}
        >
          <span className="text-lg leading-none">🔄</span>
          <span className="text-[9px] font-bold text-amber-400 leading-none">
            {rerollCost === 0 ? "FREE" : `${rerollCost}g`}
          </span>
        </button>
      )}
    </div>
  );
}
