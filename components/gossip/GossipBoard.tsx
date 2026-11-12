"use client";

import { useEffect, useRef } from "react";
import { ANIMALS, Beam, Case, DIR_ARROW, Dir, PARROT, Pos, Tier, bounds, clueText } from "@/lib/gossip/engine";

const CELL = 120;
const GAP = 8;
const PITCH = CELL + GAP;

export interface View {
  x: number;
  y: number;
  s: number;
}
export const MIN_ZOOM = 0.3;
export const MAX_ZOOM = 3;

export type Focus = { kind: "animal"; index: number } | { kind: "parrot" } | { kind: "you" } | null;

export function sameFocus(a: Focus, b: Focus): boolean {
  if (!a || !b) return a === b;
  if (a.kind !== b.kind) return false;
  return a.kind !== "animal" || b.kind !== "animal" || a.index === b.index;
}

/** Tier colours: helpful green, transform blue, lossy orange, evil purple. */
export const TIER_BG: Record<Tier, string> = {
  helpful: "bg-emerald-900/60 hover:bg-emerald-900/80",
  transform: "bg-sky-900/60 hover:bg-sky-900/80",
  lossy: "bg-orange-900/60 hover:bg-orange-900/80",
  evil: "bg-purple-900/60 hover:bg-purple-900/80",
};
export const TIER_TEXT: Record<Tier, string> = {
  helpful: "text-emerald-400",
  transform: "text-sky-400",
  lossy: "text-orange-400",
  evil: "text-purple-400",
};

/** World coordinates of a cell's top-left corner. */
function corner(p: Pos) {
  return { left: p.c * PITCH, top: p.r * PITCH };
}
/** One colour per stream on the reveal. */
export const STREAM_COLORS = ["#fbbf24", "#f87171", "#4ade80", "#60a5fa", "#c084fc", "#f472b6"];

/**
 * An open map: only occupied cells are drawn, on a dotted grid, and you can
 * drag anywhere to pan. The map recentres when a new case starts.
 */
export function GossipBoard({
  c,
  beam,
  view,
  onView,
  focus,
  notes,
  editing,
  onEdit,
  onNote,
  onHover,
  onClick,
}: {
  c: Case;
  beam: Beam | null;
  /** Map view: world origin's position on screen and the zoom scale. Owned by the game so the scratchpad can follow. */
  view: View;
  onView: (v: View) => void;
  focus: Focus;
  notes: Record<number, string>;
  editing: number | null;
  onEdit: (index: number | null) => void;
  onNote: (index: number, text: string) => void;
  onHover: (f: Focus) => void;
  onClick: (f: Focus) => void;
}) {
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  // Active pointers, for two-finger pinch.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; s: number; cx: number; cy: number; x: number; y: number } | null>(null);
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  /** Zoom by `factor` keeping the screen point (cx, cy) fixed. */
  const zoomAt = (factor: number, cx: number, cy: number) => {
    const v = viewRef.current;
    const s = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.s * factor));
    const k = s / v.s;
    onView({ x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k, s });
  };

  // The map fills the window. Centre the occupied area whenever the layout changes.
  const key = JSON.stringify([c.parrot, c.you, c.animals.map((a) => a.pos)]);
  useEffect(() => {
    const b = bounds(c);
    const w = (b.maxC - b.minC + 1) * PITCH - GAP;
    const h = (b.maxR - b.minR + 1) * PITCH - GAP;
    onView({ x: (window.innerWidth - w) / 2 - b.minC * PITCH, y: (window.innerHeight - h) / 2 - b.minR * PITCH, s: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const occupants: { pos: Pos; node: React.ReactNode }[] = [];

  // Reveal: every cell a stream left shows an arrow in that stream's colour.
  // (No lines — the player traced the flow; this just confirms it.)
  const arrowsAt = new Map<string, { dir: Dir; color: string }[]>();
  if (beam) {
    beam.streams.forEach((st, i) => {
      const color = STREAM_COLORS[i % STREAM_COLORS.length];
      const cells = [st.origin, ...st.path];
      for (let k = 0; k + 1 < cells.length; k++) {
        const a = cells[k];
        const b = cells[k + 1];
        const dir: Dir = b.r < a.r ? "up" : b.r > a.r ? "down" : b.c > a.c ? "right" : "left";
        const key = `${a.r},${a.c}`;
        const list = arrowsAt.get(key) ?? [];
        if (!list.some((x) => x.dir === dir && x.color === color)) list.push({ dir, color });
        arrowsAt.set(key, list);
      }
    });
  }
  const arrows = (p: Pos) => {
    const list = arrowsAt.get(`${p.r},${p.c}`);
    if (!list) return null;
    return (
      <span className="absolute top-0.5 right-2 flex gap-0.5 text-2xl font-bold leading-none">
        {list.map((a, i) => (
          <span key={i} style={{ color: a.color }}>
            {DIR_ARROW[a.dir]}
          </span>
        ))}
      </span>
    );
  };

  const cellClass = (bg: string, focused: boolean) =>
    `absolute rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer ${bg} ${focused ? "ring-2 ring-amber-400" : ""}`;

  const handle = (target: Focus) => ({
    onMouseEnter: () => onHover(target),
    onClick: () => {
      if (suppressClick.current) return;
      onClick(target);
    },
  });

  // YOU
  occupants.push({
    pos: c.you,
    node: (
      <div key="you" {...handle({ kind: "you" })} className={cellClass("bg-zinc-200", sameFocus(focus, { kind: "you" }))} style={{ ...corner(c.you), width: CELL, height: CELL }}>
        <span className="text-4xl leading-none">🙂</span>
        <span className="text-xs text-zinc-900 font-bold">YOU</span>
        <span className="absolute bottom-1 text-[11px] font-mono text-zinc-700">{c.heard.join(" ")}</span>
      </div>
    ),
  });

  // Parrot
  occupants.push({
    pos: c.parrot,
    node: (
      <div key="parrot" {...handle({ kind: "parrot" })} className={cellClass("bg-amber-900/60", sameFocus(focus, { kind: "parrot" }))} style={{ ...corner(c.parrot), width: CELL, height: CELL }}>
        {arrows(c.parrot)}
        <span className="text-4xl leading-none">{PARROT.emoji}</span>
        <span className="text-xs text-white font-bold">{PARROT.name}</span>
        {beam && <span className="absolute bottom-1 text-[11px] font-mono text-amber-300">{c.word}</span>}
      </div>
    ),
  });

  // Animals
  c.animals.forEach((placed, idx) => {
    const animal = ANIMALS[placed.animal];
    const hits = beam
      ? Array.from(new Map(beam.streams.flatMap((s) => s.steps).filter((s) => s.index === idx).map((s) => [`${s.before}→${s.after}`, s])).values())
      : [];
    occupants.push({
      pos: placed.pos,
      node: (
        <div
          key={`a${idx}`}
          {...handle({ kind: "animal", index: idx })}
          className={cellClass(TIER_BG[animal.tier], sameFocus(focus, { kind: "animal", index: idx }))}
          style={{ ...corner(placed.pos), width: CELL, height: CELL }}
        >
          {arrows(placed.pos)}
          <span className="text-4xl leading-none">{animal.emoji}</span>
          <span className={`text-[11px] ${TIER_TEXT[animal.tier]}`}>{animal.name}</span>
          {placed.clue ? (
            <span className="text-[11px] text-emerald-200 font-mono">{clueText(placed.clue)}</span>
          ) : (
            notes[idx] && <span className="text-[11px] font-mono text-amber-200">{notes[idx]}</span>
          )}
          {editing === idx && (
            <div
              className="absolute left-1/2 top-full -translate-x-1/2 mt-1 z-50 bg-zinc-800 rounded-lg p-2 shadow-xl ring-1 ring-amber-400 flex gap-1"
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={(e) => e.stopPropagation()}
            >
              <input
                autoFocus
                value={notes[idx] ?? ""}
                onChange={(e) => onNote(idx, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape") onEdit(null);
                }}
                onBlur={() => onEdit(null)}
                placeholder="note…"
                maxLength={24}
                autoComplete="off"
                spellCheck={false}
                className="w-32 px-2 py-1 rounded bg-zinc-900 text-amber-200 text-sm font-mono outline-none placeholder:text-zinc-600"
              />
            </div>
          )}
          {hits.length > 0 && (
            <span className="absolute bottom-1 flex flex-col items-center text-[10px] font-mono text-amber-300 leading-tight">
              {hits.map((h, i) => (
                <span key={i}>
                  {h.before} → {h.after}
                </span>
              ))}
            </span>
          )}
        </div>
      ),
    });
  });

  return (
    <div
      className="fixed inset-0 overflow-hidden bg-zinc-900 select-none"
      style={{
        cursor: drag.current ? "grabbing" : "grab",
        backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
        backgroundSize: `${PITCH * view.s}px ${PITCH * view.s}px`,
        backgroundPosition: `${view.x + (CELL / 2) * view.s}px ${view.y + (CELL / 2) * view.s}px`,
      }}
      onMouseLeave={() => onHover(null)}
      onWheel={(e) => {
        // Mouse wheel, and trackpad pinch (which arrives as ctrl+wheel), zoom around the cursor.
        zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX, e.clientY);
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        // No pointer capture here: capturing on press would redirect the click
        // away from the cell. Capture only once a drag actually moves.
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.current.size === 2) {
          const [a, b] = [...pointers.current.values()];
          const v = viewRef.current;
          pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), s: v.s, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, x: v.x, y: v.y };
          drag.current = null;
          return;
        }
        drag.current = { x: e.clientX, y: e.clientY, px: view.x, py: view.y, moved: false };
      }}
      onPointerMove={(e) => {
        if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const p = pinch.current;
        if (p && pointers.current.size === 2) {
          const [a, b] = [...pointers.current.values()];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          const s = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, (p.s * dist) / p.dist));
          const k = s / p.s;
          const cx = (a.x + b.x) / 2;
          const cy = (a.y + b.y) / 2;
          onView({ x: p.cx - (p.cx - p.x) * k + (cx - p.cx), y: p.cy - (p.cy - p.y) * k + (cy - p.cy), s });
          suppressClick.current = true;
          return;
        }
        const d = drag.current;
        if (!d) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (!d.moved && Math.hypot(dx, dy) < 4) return;
        if (!d.moved) (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        d.moved = true;
        onView({ ...viewRef.current, x: d.px + dx, y: d.py + dy });
      }}
      onPointerUp={(e) => {
        pointers.current.delete(e.pointerId);
        if (pointers.current.size < 2) pinch.current = null;
        if (drag.current?.moved || suppressClick.current) {
          suppressClick.current = true;
          setTimeout(() => (suppressClick.current = false), 0);
        }
        drag.current = null;
      }}
      onPointerCancel={(e) => {
        pointers.current.delete(e.pointerId);
        pinch.current = null;
        drag.current = null;
      }}
    >
      <div className="absolute" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})`, transformOrigin: "0 0" }}>
        {occupants.map((o) => o.node)}
      </div>
    </div>
  );
}
