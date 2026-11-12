"use client";

import { useEffect, useRef } from "react";

export type Tool = "none" | "pen" | "eraser" | "text";

interface Stroke {
  /** Points in MAP coordinates, so the drawing moves with the map. */
  points: { x: number; y: number }[];
  color: string;
  erase: boolean;
}

/**
 * Full-screen canvas for scratch notes, anchored to the map: strokes are kept
 * in map coordinates and redrawn at the current pan. Only grabs the mouse
 * while a drawing tool is active; otherwise it is click-through.
 */
export function Scratchpad({ tool, color, clearKey, view }: { tool: Tool; color: string; clearKey: number; view: { x: number; y: number; s: number } }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const current = useRef<Stroke | null>(null);
  const panRef = useRef(view);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const redrawRef = useRef<() => void>(() => {});

  useEffect(() => {
    panRef.current = view;
    redrawRef.current();
  }, [view]);
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);
  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  // Wipe on demand (new case, clear button).
  useEffect(() => {
    strokes.current = [];
    current.current = null;
    redrawRef.current();
  }, [clearKey]);

  // All canvas work lives here: sizing, drawing, and pointer input.
  useEffect(() => {
    const cv = canvasRef.current!;
    const ctx = cv.getContext("2d")!;

    const redraw = () => {
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      const v = panRef.current;
      ctx.setTransform(dpr * v.s, 0, 0, dpr * v.s, v.x * dpr, v.y * dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const s of strokes.current) {
        ctx.globalCompositeOperation = s.erase ? "destination-out" : "source-over";
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.erase ? 28 : 3;
        ctx.beginPath();
        s.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        if (s.points.length === 1) ctx.lineTo(s.points[0].x, s.points[0].y);
        ctx.stroke();
      }
    };
    redrawRef.current = redraw;

    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      cv.width = Math.floor(window.innerWidth * dpr);
      cv.height = Math.floor(window.innerHeight * dpr);
      cv.style.width = `${window.innerWidth}px`;
      cv.style.height = `${window.innerHeight}px`;
      redraw();
    };

    const toMap = (e: PointerEvent) => ({ x: (e.clientX - panRef.current.x) / panRef.current.s, y: (e.clientY - panRef.current.y) / panRef.current.s });
    const active = () => toolRef.current === "pen" || toolRef.current === "eraser";

    const down = (e: PointerEvent) => {
      if (!active() || e.button !== 0) return;
      cv.setPointerCapture(e.pointerId);
      const s: Stroke = { points: [toMap(e)], color: colorRef.current, erase: toolRef.current === "eraser" };
      strokes.current.push(s);
      current.current = s;
      redraw();
    };
    const move = (e: PointerEvent) => {
      if (!current.current) return;
      current.current.points.push(toMap(e));
      redraw();
    };
    const up = () => {
      current.current = null;
    };

    fit();
    window.addEventListener("resize", fit);
    cv.addEventListener("pointerdown", down);
    cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("resize", fit);
      cv.removeEventListener("pointerdown", down);
      cv.removeEventListener("pointermove", move);
      cv.removeEventListener("pointerup", up);
      cv.removeEventListener("pointercancel", up);
    };
  }, []);

  const active = tool === "pen" || tool === "eraser";

  return <canvas ref={canvasRef} className={`fixed inset-0 z-40 ${active ? (tool === "pen" ? "cursor-crosshair" : "cursor-cell") : "pointer-events-none"}`} />;
}
