"use client";

import { useEffect } from "react";
import { ITEMS } from "@/data/items";
import { Inventory, ItemRarity } from "@/types/game";

interface ItemChoiceProps {
  level: number;
  choices: string[];
  /** How many more picks remain after this one (for the "more coming" hint). */
  remaining: number;
  inventory: Inventory;
  onChoose: (itemId: string) => void;
}

const RARITY_STYLE: Record<ItemRarity, { text: string; border: string; glow: string; label: string }> = {
  common: { text: "text-zinc-300", border: "border-zinc-600", glow: "hover:border-zinc-400", label: "Common" },
  uncommon: { text: "text-sky-400", border: "border-sky-500/50", glow: "hover:border-sky-400", label: "Uncommon" },
  rare: { text: "text-amber-400", border: "border-amber-500/60", glow: "hover:border-amber-400", label: "Rare" },
};

export function ItemChoice({ level, choices, remaining, inventory, onChoose }: ItemChoiceProps) {
  // Number keys 1-3 pick the matching card.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const idx = Number(e.key) - 1;
      if (idx >= 0 && idx < choices.length) {
        e.preventDefault();
        onChoose(choices[idx]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choices, onChoose]);

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-6">
      <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
        <div className="text-center">
          <p className="text-amber-400 text-sm font-bold tracking-widest">LEVEL {level}</p>
          <h1 className="text-3xl font-bold text-white mt-1">Choose an item</h1>
          <p className="text-zinc-500 text-xs mt-1">
            Items stack — grab duplicates to compound them.
            {remaining > 0 && <span className="text-zinc-400"> · {remaining} more pick{remaining > 1 ? "s" : ""} after this</span>}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          {choices.map((id, i) => {
            const item = ITEMS[id];
            if (!item) return null;
            const style = RARITY_STYLE[item.rarity];
            const owned = inventory[id] ?? 0;

            return (
              <button
                key={id}
                onClick={() => onChoose(id)}
                className={`group relative flex flex-col items-center gap-3 rounded-xl border-2 bg-zinc-800 p-5 text-center transition-all duration-150 cursor-pointer ${style.border} ${style.glow} hover:bg-zinc-700 hover:-translate-y-1`}
              >
                <span className="absolute top-2 left-2 text-[10px] text-zinc-600 font-bold">{i + 1}</span>
                {owned > 0 && (
                  <span className="absolute top-2 right-2 text-[10px] font-bold text-zinc-400 bg-zinc-900/80 rounded-full px-1.5 py-0.5">
                    ×{owned}
                  </span>
                )}
                <span className="text-5xl">{item.emoji}</span>
                <span className={`font-bold text-base ${style.text}`}>{item.name}</span>
                <span className={`text-[10px] uppercase tracking-wide font-bold ${style.text} opacity-70`}>
                  {style.label}
                </span>
                <p className="text-zinc-400 text-xs leading-snug">{item.description}</p>
              </button>
            );
          })}
        </div>

        <p className="text-zinc-600 text-[11px]">Click a card or press 1–3</p>
      </div>
    </div>
  );
}
