"use client";

import { useCallback, useMemo, useState } from "react";
import { Creature, Mark, Puzzle, Reveal } from "@/types/deduction";
import {
  SPECIES,
  generatePuzzle,
  posKey,
  statementScope,
  statementText,
} from "@/lib/deduction/puzzle";
import { ReefBoard } from "./ReefBoard";

interface ReefGameProps {
  onRetry: () => void;
  onExit: () => void;
}

export const MAX_TRUST = 3;

/** Case curve: start at 3x3, expand the reef once you have proven yourself. */
export function caseParams(caseNo: number): { size: number; mimicCount: number } {
  if (caseNo <= 2) return { size: 3, mimicCount: 2 };
  if (caseNo <= 4) return { size: 3, mimicCount: 3 };
  if (caseNo <= 6) return { size: 4, mimicCount: 4 };
  return { size: 4, mimicCount: 5 };
}

function newPuzzle(caseNo: number, runSeed: number): Puzzle {
  const { size, mimicCount } = caseParams(caseNo);
  const p = generatePuzzle({ size, mimicCount, seed: runSeed * 1000 + caseNo });
  if (!p) throw new Error("could not generate puzzle");
  return p;
}

const MARK_CYCLE: Mark[] = ["none", "suspect", "safe"];

export function ReefGame({ onRetry, onExit }: ReefGameProps) {
  const [runSeed] = useState(() => Math.floor(Math.random() * 1_000_000));
  const [caseNo, setCaseNo] = useState(1);
  const [puzzle, setPuzzle] = useState<Puzzle>(() => newPuzzle(1, runSeed));
  const [reveals, setReveals] = useState<Record<string, Reveal>>({});
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [trust, setTrust] = useState(MAX_TRUST);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [solvedCases, setSolvedCases] = useState(0);
  const [lastEvent, setLastEvent] = useState<string>("Tap a creature to read its statement.");

  const byId = useMemo(() => {
    const m: Record<string, Creature> = {};
    for (const c of puzzle.creatures) m[c.id] = c;
    return m;
  }, [puzzle]);

  const mimicsFound = useMemo(
    () => puzzle.creatures.filter((c) => c.isMimic && reveals[c.id] === "mimic").length,
    [puzzle, reveals],
  );
  const solved = mimicsFound === puzzle.mimicCount;
  const gameOver = trust <= 0 && !solved;

  const focus = hoveredId ?? selectedId;
  const focusCreature = focus ? byId[focus] : null;
  const highlighted = useMemo(() => {
    if (!focusCreature) return new Set<string>();
    return new Set(
      statementScope(focusCreature.statement, focusCreature.pos, puzzle.size).map(posKey),
    );
  }, [focusCreature, puzzle.size]);

  const tag = useCallback(
    (c: Creature) => {
      if (solved || gameOver || reveals[c.id]) return;
      if (c.isMimic) {
        setReveals((r) => ({ ...r, [c.id]: "mimic" }));
        setLastEvent(`${SPECIES[c.species].emoji} The ${SPECIES[c.species].name.toLowerCase()} was a mimic! Its statement was a lie.`);
      } else {
        setReveals((r) => ({ ...r, [c.id]: "honest" }));
        setTrust((t) => t - 1);
        setLastEvent(`${SPECIES[c.species].emoji} That ${SPECIES[c.species].name.toLowerCase()} was honest. The reef trusts you a little less.`);
      }
    },
    [solved, gameOver, reveals],
  );

  const cycleMark = useCallback((c: Creature) => {
    setMarks((m) => {
      const cur = m[c.id] ?? "none";
      const next = MARK_CYCLE[(MARK_CYCLE.indexOf(cur) + 1) % MARK_CYCLE.length];
      return { ...m, [c.id]: next };
    });
  }, []);

  const nextCase = useCallback(() => {
    const n = caseNo + 1;
    setCaseNo(n);
    setPuzzle(newPuzzle(n, runSeed));
    setReveals({});
    setMarks({});
    setSelectedId(null);
    setHoveredId(null);
    setSolvedCases((s) => s + 1);
    setTrust((t) => Math.min(MAX_TRUST, t + 1));
    setLastEvent("A new stretch of reef. Read everyone before you accuse.");
  }, [caseNo, runSeed]);

  const selected = selectedId ? byId[selectedId] : null;
  const { size } = puzzle;

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center p-6 select-none">
      <div className="flex gap-6 items-start">
        {/* Left: run status */}
        <div className="flex flex-col gap-4 w-48">
          <div className="bg-zinc-800 rounded-lg px-4 py-3 space-y-3">
            <div className="text-center">
              <span className="text-zinc-500 text-[10px] font-bold tracking-wide">🪸 REEF CENSUS</span>
              <div className="text-zinc-300 text-2xl font-bold leading-none mt-1">Case {caseNo}</div>
              <div className="text-zinc-600 text-[9px] mt-1">{size}×{size} reef</div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                <span>🤝 Trust</span>
                <span className="font-bold text-amber-400">{trust}/{MAX_TRUST}</span>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: MAX_TRUST }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded-full transition-colors ${i < trust ? "bg-amber-500" : "bg-zinc-700"}`}
                  />
                ))}
              </div>
              <p className="text-zinc-600 text-[9px] mt-1 leading-snug">Accusing an honest creature costs 1. Reach 0 and the reef stops talking to you.</p>
            </div>

            <div className="flex justify-between text-[11px] text-zinc-400">
              <span>🎭 Mimics</span>
              <span className="font-bold text-rose-400">{mimicsFound}/{puzzle.mimicCount}</span>
            </div>
            <div className="flex justify-between text-[11px] text-zinc-400">
              <span>✅ Solved</span>
              <span className="font-bold text-emerald-400">{solvedCases}</span>
            </div>
          </div>

          <div className="bg-zinc-800 rounded-lg px-3 py-3">
            <label className="text-zinc-500 text-[10px] font-bold tracking-wide block mb-2">📖 RULES</label>
            <ul className="text-zinc-400 text-[11px] leading-snug space-y-1.5">
              <li>Exactly <b className="text-rose-400">{puzzle.mimicCount}</b> creatures are mimics.</li>
              <li>Honest creatures <b className="text-emerald-400">always tell the truth</b>.</li>
              <li>Mimics <b className="text-rose-400">always lie</b>.</li>
              <li>Counts never include the speaker.</li>
              <li>Every case has exactly one answer. No guessing needed.</li>
            </ul>
          </div>

          <div className="bg-zinc-800 rounded-lg px-3 py-3">
            <label className="text-zinc-500 text-[10px] font-bold tracking-wide block mb-2">🔍 CONTROLS</label>
            <ul className="text-zinc-500 text-[11px] leading-snug space-y-1">
              <li>Click: select &amp; read</li>
              <li>Right-click: pencil mark (❓ / ✔)</li>
              <li>Hover: shows who it talks about</li>
            </ul>
          </div>
        </div>

        {/* Center: the reef */}
        <div className="flex flex-col items-center gap-3">
          <ReefBoard
            puzzle={puzzle}
            reveals={reveals}
            marks={marks}
            selectedId={selectedId}
            hoveredId={hoveredId}
            highlighted={highlighted}
            onSelect={(c) => setSelectedId((s) => (s === c.id ? null : c.id))}
            onHover={(c) => setHoveredId(c?.id ?? null)}
            onMark={cycleMark}
          />
          <p className="text-zinc-500 text-[11px] h-4 text-center max-w-md">{lastEvent}</p>
        </div>

        {/* Right: inspector */}
        <div className="flex flex-col gap-4 w-56">
          <div className="bg-zinc-800 rounded-lg p-4 min-h-[220px]">
            {selected ? (
              <SelectedPanel
                creature={selected}
                size={size}
                reveal={reveals[selected.id] ?? "hidden"}
                mark={marks[selected.id] ?? "none"}
                disabled={solved || gameOver}
                onTag={() => tag(selected)}
                onMark={() => cycleMark(selected)}
              />
            ) : (
              <div className="flex flex-col items-center text-center gap-2 pt-6">
                <span className="text-4xl">🔍</span>
                <p className="text-zinc-500 text-xs leading-snug">
                  Select a creature to see its full statement and decide whether to accuse it.
                </p>
              </div>
            )}
          </div>

          <div className="bg-zinc-800 rounded-lg px-3 py-3">
            <label className="text-zinc-500 text-[10px] font-bold tracking-wide block mb-2">🐚 CODEX</label>
            <ul className="space-y-1.5">
              {Object.values(SPECIES).map((s) => (
                <li key={s.id} className="flex gap-2 text-[11px] leading-snug">
                  <span className="text-base leading-none">{s.emoji}</span>
                  <span className="text-zinc-400">
                    <b className="text-zinc-200">{s.name}</b> — {s.blurb}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {solved && (
        <Overlay>
          <h1 className="text-3xl font-bold text-white mb-2">CASE CLOSED</h1>
          <p className="text-zinc-400 mb-1">
            All <span className="text-rose-400 font-bold">{puzzle.mimicCount}</span> mimics tagged.
          </p>
          <p className="text-zinc-500 text-sm mb-5">
            {trust < MAX_TRUST ? "Trust +1 for a clean solve." : "The reef trusts you completely."}
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={nextCase} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors cursor-pointer">
              Next case →
            </button>
            <button onClick={onExit} className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 font-medium rounded-lg transition-colors cursor-pointer">
              Menu
            </button>
          </div>
        </Overlay>
      )}

      {gameOver && (
        <Overlay>
          <h1 className="text-3xl font-bold text-white mb-2">THE REEF WENT QUIET</h1>
          <p className="text-zinc-400 mb-1">
            Too many honest creatures accused. You solved <span className="text-white font-bold">{solvedCases}</span>{" "}
            {solvedCases === 1 ? "case" : "cases"}.
          </p>
          <p className="text-zinc-500 text-sm mb-5">
            The mimics were: {puzzle.creatures.filter((c) => c.isMimic).map((c) => `${SPECIES[c.species].emoji} ${cellLabel(c, size)}`).join(", ")}
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={onRetry} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors cursor-pointer">
              New run
            </button>
            <button onClick={onExit} className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 font-medium rounded-lg transition-colors cursor-pointer">
              Menu
            </button>
          </div>
        </Overlay>
      )}
    </div>
  );
}

/** "A1".."C3" style address so overlays can name a cell. */
export function cellLabel(c: Creature, size: number): string {
  void size;
  return `${String.fromCharCode(65 + c.pos.r)}${c.pos.c + 1}`;
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-zinc-800 rounded-xl p-8 text-center max-w-md">{children}</div>
    </div>
  );
}

function SelectedPanel({
  creature,
  size,
  reveal,
  mark,
  disabled,
  onTag,
  onMark,
}: {
  creature: Creature;
  size: number;
  reveal: Reveal;
  mark: Mark;
  disabled: boolean;
  onTag: () => void;
  onMark: () => void;
}) {
  const sp = SPECIES[creature.species];
  const text = statementText(creature.statement, creature.pos, size);
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="text-4xl">{sp.emoji}</span>
      <span className="text-white font-bold">{sp.name} <span className="text-zinc-500 font-normal text-xs">{cellLabel(creature, size)}</span></span>
      <p className="text-zinc-300 text-sm italic leading-snug">&ldquo;{text}&rdquo;</p>
      <p className="text-zinc-500 text-[10px] leading-snug">{sp.blurb}</p>

      {reveal === "mimic" && <div className="mt-2 text-rose-400 font-bold text-sm">🎭 Revealed: MIMIC</div>}
      {reveal === "honest" && <div className="mt-2 text-emerald-400 font-bold text-sm">✔ Revealed: honest</div>}

      {reveal === "hidden" && (
        <div className="flex flex-col gap-2 w-full mt-2">
          <button
            onClick={onTag}
            disabled={disabled}
            className="w-full py-2 rounded-lg bg-rose-700 hover:bg-rose-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-bold transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            🎭 Accuse as mimic
          </button>
          <button
            onClick={onMark}
            className="w-full py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs transition-colors cursor-pointer"
          >
            Mark: {mark === "none" ? "— none —" : mark === "suspect" ? "❓ suspect" : "✔ looks safe"}
          </button>
        </div>
      )}
    </div>
  );
}
