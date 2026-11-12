"use client";

import { SPECIES_LIST } from "@/lib/deduction/puzzle";

interface ReefStartProps {
  onStart: () => void;
}

export function ReefStart({ onStart }: ReefStartProps) {
  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center p-8 select-none">
      <div className="flex flex-col items-center gap-10 text-center">
        <div className="flex flex-col items-center gap-3">
          <span className="text-6xl">🪸</span>
          <h1 className="text-5xl font-bold text-white tracking-tight">Reef Census</h1>
          <p className="text-zinc-500 text-sm max-w-sm leading-snug">
            Something is hiding in the reef. Every creature makes one claim about its neighbours.
            Honest ones tell the truth. Mimics always lie. Find every mimic without accusing the innocent.
          </p>
        </div>

        <button
          onClick={onStart}
          className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white text-lg font-bold rounded-lg transition-colors cursor-pointer w-56"
        >
          ▶ Start census
        </button>

        <div className="flex items-center gap-3 opacity-70">
          {SPECIES_LIST.map((s) => (
            <span key={s.id} title={`${s.name} — ${s.blurb}`} className="text-2xl">
              {s.emoji}
            </span>
          ))}
        </div>

        <p className="text-zinc-600 text-[11px]">3×3 to start · every case has exactly one answer · 3 wrong accusations ends the run</p>
      </div>
    </div>
  );
}
