"use client";

import { useState } from "react";
import { ANIMAL_LIST } from "@/lib/gossip/engine";
import { GossipGame } from "./GossipGame";

export function GossipApp() {
  const [playing, setPlaying] = useState(false);
  const [runKey, setRunKey] = useState(0);

  if (playing) return <GossipGame key={runKey} onExit={() => setPlaying(false)} />;

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center gap-8 p-8 select-none text-center">
      <div className="flex flex-col items-center gap-2">
        <span className="text-6xl">🐾</span>
        <h1 className="text-5xl font-bold text-white tracking-tight">Animal Gossip</h1>
        <p className="text-zinc-500 text-sm">Parrots say words. Every animal garbles what it hears. You hear the result.</p>
      </div>
      <button
        onClick={() => {
          setRunKey((k) => k + 1);
          setPlaying(true);
        }}
        className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-zinc-900 text-lg font-bold rounded-lg cursor-pointer w-48"
      >
        Play
      </button>
      <div className="flex gap-3 text-2xl opacity-70">
        <span title="says the word">🦜</span>
        {ANIMAL_LIST.map((a) => (
          <span key={a.id} title={a.name}>{a.emoji}</span>
        ))}
      </div>
    </div>
  );
}
