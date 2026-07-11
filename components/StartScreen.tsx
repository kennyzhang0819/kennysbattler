"use client";

import { ITEM_LIST } from "@/data/items";

interface StartScreenProps {
  onStart: () => void;
}

export function StartScreen({ onStart }: StartScreenProps) {
  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center p-8 select-none">
      <div className="flex flex-col items-center gap-10 text-center">
        <div className="flex flex-col items-center gap-3">
          <span className="text-6xl">🌊</span>
          <h1 className="text-5xl font-bold text-white tracking-tight">WordBattle</h1>
          <p className="text-zinc-500 text-sm max-w-xs leading-snug">
            Slide to slam. Survive the endless tide. Level up and stack items to grow stronger.
          </p>
        </div>

        <button
          onClick={onStart}
          className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white text-lg font-bold rounded-lg transition-colors cursor-pointer w-56"
        >
          ▶ Start
        </button>

        <div className="flex items-center gap-2 opacity-60">
          {ITEM_LIST.map((it) => (
            <span key={it.id} title={`${it.name} — ${it.description}`} className="text-xl">
              {it.emoji}
            </span>
          ))}
        </div>

        <p className="text-zinc-600 text-[11px]">Arrow keys / WASD to play · pick 1 of 3 items each level</p>
      </div>
    </div>
  );
}
