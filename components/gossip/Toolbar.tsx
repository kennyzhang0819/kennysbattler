"use client";

import { Tool } from "./Scratchpad";

export const PEN_COLORS = ["#fbbf24", "#f87171", "#4ade80", "#60a5fa", "#f9fafb"];

export function Toolbar({
  tool,
  onTool,
  color,
  onColor,
  onClear,
  alphabet,
  onAlphabet,
}: {
  tool: Tool;
  onTool: (t: Tool) => void;
  color: string;
  onColor: (c: string) => void;
  onClear: () => void;
  alphabet: boolean;
  onAlphabet: () => void;
}) {
  const btn = (on: boolean) =>
    `w-10 h-10 rounded-lg flex items-center justify-center text-lg cursor-pointer transition-colors ${
      on ? "bg-amber-500 text-zinc-900" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
    }`;

  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2">
      <div className="relative">
        <button className={btn(tool === "pen")} title="Pen (P) · right-click to stop" onClick={() => onTool(tool === "pen" ? "none" : "pen")}>
          ✏️
        </button>
        {tool === "pen" && (
          <div className="absolute left-12 top-0 h-10 flex items-center gap-1.5 px-2 bg-zinc-800 rounded-lg">
            {PEN_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => onColor(c)}
                title={c}
                className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${c === color ? "scale-110 ring-2 ring-white" : "hover:scale-110"}`}
                style={{ background: c }}
              />
            ))}
          </div>
        )}
      </div>
      <button className={btn(tool === "eraser")} title="Eraser (E) · right-click to stop" onClick={() => onTool(tool === "eraser" ? "none" : "eraser")}>
        🧽
      </button>
      <button className={btn(tool === "text")} title="Text notes (T) · click an animal to type" onClick={() => onTool(tool === "text" ? "none" : "text")}>
        📝
      </button>
      <button className={btn(false)} title="Clear drawing (C)" onClick={onClear}>🗑️</button>
      <div className="h-px bg-zinc-700 my-1" />
      <button className={btn(alphabet)} title="Alphabet (A)" onClick={onAlphabet}>🔤</button>
    </div>
  );
}

const LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

/** A → Z with their numbers, for shift arithmetic. */
export function AlphabetStrip() {
  return (
    <div className="fixed left-16 bottom-4 z-50 bg-zinc-800 rounded-lg p-2 grid grid-cols-13 gap-1">
      {LETTERS.map((l, i) => (
        <div key={l} className="w-7 flex flex-col items-center leading-none">
          <span className="text-white font-mono font-bold text-sm">{l}</span>
          <span className="text-zinc-500 text-[9px]">{i + 1}</span>
        </div>
      ))}
    </div>
  );
}
