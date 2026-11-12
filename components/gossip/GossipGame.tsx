"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Case, caseOptions, generateCase, normalize, trace } from "@/lib/gossip/engine";
import { GossipBoard, Focus, View, sameFocus } from "./GossipBoard";
import { SidePanel } from "./SidePanel";
import { Scratchpad, Tool } from "./Scratchpad";
import { Toolbar, AlphabetStrip, PEN_COLORS } from "./Toolbar";

function makeCase(caseNo: number, runSeed: number): Case {
  const c = generateCase(caseOptions(caseNo, runSeed * 1000 + caseNo));
  if (!c) throw new Error("no case");
  return c;
}

export function GossipGame({ onExit }: { onExit: () => void }) {
  const [runSeed] = useState(() => Math.floor(Math.random() * 1_000_000));
  const [caseNo, setCaseNo] = useState(1);
  const [c, setCase] = useState<Case>(() => makeCase(1, runSeed));
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "wrong" | "solved">("idle");
  const [shake, setShake] = useState(false);
  const [hover, setHover] = useState<Focus>(null);
  const [pinned, setPinned] = useState<Focus>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [editing, setEditing] = useState<number | null>(null);
  const focus = hover ?? pinned;
  const inputRef = useRef<HTMLInputElement>(null);

  const [tool, setTool] = useState<Tool>("none");
  const [color, setColor] = useState(PEN_COLORS[0]);
  const [clearKey, setClearKey] = useState(0);
  const [alphabet, setAlphabet] = useState(false);
  const [view, setView] = useState<View>({ x: 0, y: 0, s: 1 });

  useEffect(() => {
    inputRef.current?.focus();
  }, [caseNo, status]);

  // Dev/testing: /?case=8 starts the run at that case.
  useEffect(() => {
    const n = Number(new URLSearchParams(window.location.search).get("case"));
    if (n > 1) reset(n, runSeed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tool shortcuts, only when not typing in the answer box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const k = e.key.toLowerCase();
      if (k === "p") setTool((t) => (t === "pen" ? "none" : "pen"));
      else if (k === "e") setTool((t) => (t === "eraser" ? "none" : "eraser"));
      else if (k === "t") setTool((t) => (t === "text" ? "none" : "text"));
      else if (k === "c") setClearKey((n) => n + 1);
      else if (k === "a") setAlphabet((a) => !a);
      else if (k === "escape") setTool("none");
    };
    // Right-click anywhere: drop the drawing tool (and never show a browser menu).
    const onContext = (e: MouseEvent) => {
      e.preventDefault();
      setTool("none");
    };
    const onDrag = (e: DragEvent) => e.preventDefault();
    window.addEventListener("keydown", onKey);
    window.addEventListener("contextmenu", onContext);
    window.addEventListener("dragstart", onDrag);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("contextmenu", onContext);
      window.removeEventListener("dragstart", onDrag);
    };
  }, []);

  const done = status === "solved";
  const beam = useMemo(() => (done ? trace(c) : null), [done, c]);

  const submit = useCallback(() => {
    if (done) return;
    const guess = normalize(input);
    if (!guess) return;
    if (guess === c.answer) {
      setStatus("solved");
      return;
    }
    // Wrong: shake and clear. Guess as often as you like.
    setShake(true);
    setTimeout(() => setShake(false), 400);
    setInput("");
    setStatus("wrong");
  }, [input, done, c.answer]);

  const reset = useCallback((n: number, seed: number) => {
    setCaseNo(n);
    setCase(makeCase(n, seed));
    setInput("");
    setStatus("idle");
    setHover(null);
    setPinned(null);
    setNotes({});
    setEditing(null);
    setClearKey((k) => k + 1);
    setTool("none");
  }, []);

  return (
    <div className="fixed inset-0 select-none">
      {/* The map IS the screen. */}
      <GossipBoard
        c={c}
        beam={beam}
        view={view}
        onView={setView}
        focus={focus}
        notes={notes}
        editing={editing}
        onEdit={setEditing}
        onNote={(i, text) => setNotes((n) => ({ ...n, [i]: text }))}
        onHover={setHover}
        onClick={(f) => {
          // With the text tool on, clicking an animal opens its note pop-up instead of pinning.
          if (tool === "text" && f?.kind === "animal") {
            setEditing((e) => (e === f.index ? null : f.index));
            return;
          }
          setPinned((p) => (sameFocus(p, f) ? null : f));
        }}
      />

      <Scratchpad tool={tool} color={color} clearKey={clearKey} view={view} />
      <Toolbar
        tool={tool}
        onTool={setTool}
        color={color}
        onColor={setColor}
        onClear={() => setClearKey((k) => k + 1)}
        alphabet={alphabet}
        onAlphabet={() => setAlphabet((a) => !a)}
      />
      {alphabet && <AlphabetStrip />}

      {/* Windows over the map */}
      <button onClick={onExit} className="fixed top-3 right-3 z-50 w-8 h-8 rounded-lg bg-zinc-800/80 text-zinc-400 hover:text-white cursor-pointer">
        ✕
      </button>

      <div className="fixed right-3 top-14 bottom-3 z-50 flex">
        <SidePanel c={c} focus={focus} pinned={!!pinned && sameFocus(pinned, focus)} beam={beam} />
      </div>

      <div className="fixed left-1/2 bottom-5 -translate-x-1/2 z-50 flex flex-col items-center gap-3 px-6 py-4 rounded-xl bg-zinc-800/90 shadow-xl">
        <div className="text-center">
          <span className="text-zinc-400">You hear</span>{" "}
          <b className="text-white text-xl tracking-widest font-mono">{c.heard.join(" ")}</b>
          <span className="text-zinc-400"> — what did the parrot say?</span>
        </div>

        {!done ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className={`flex gap-2 ${shake ? "animate-hurt" : ""}`}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              maxLength={24}
              autoComplete="off"
              spellCheck={false}
              className={`w-64 px-4 py-2.5 rounded-lg bg-zinc-900 text-white text-center text-xl font-mono tracking-widest outline-none ring-2 ${
                status === "wrong" ? "ring-rose-500" : "ring-zinc-700 focus:ring-amber-400"
              }`}
            />
            <button type="submit" className="px-5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-900 font-bold cursor-pointer">
              ↵
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-4">
            <span className="text-emerald-400 font-bold text-lg">✓ {c.answer}</span>
            <button
              onClick={() => reset(caseNo + 1, runSeed)}
              className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
