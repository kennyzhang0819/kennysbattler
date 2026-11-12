"use client";

import { ANIMALS, Beam, Case, PARROT, PARROT_RULE, TIER_LABEL, TURN_TEXT, YOU_RULE, clueText, example } from "@/lib/gossip/engine";
import { Focus, TIER_TEXT } from "./GossipBoard";

export function SidePanel({ c, focus, pinned, beam }: { c: Case; focus: Focus; pinned: boolean; beam: Beam | null }) {
  return (
    <div className="w-60 self-stretch bg-zinc-800 rounded-xl p-4 flex flex-col gap-3 overflow-y-auto info-scroll">
      {!focus && (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
          <span className="text-3xl opacity-50">👀</span>
          <p className="text-zinc-500 text-xs">Hover anything. Click to pin.</p>
        </div>
      )}

      {focus?.kind === "parrot" && (
        <>
          <Header emoji={PARROT.emoji} name={PARROT.name} sub="says the word" />
          {PARROT_RULE.map((line, i) => (
            <p key={i} className={i === 0 ? "text-zinc-200 text-sm" : "text-zinc-400 text-xs leading-snug"}>{line}</p>
          ))}
          {beam && <Word w={c.word} />}
        </>
      )}

      {focus?.kind === "you" && (
        <>
          <Header emoji="🙂" name="You" sub="hear the result" />
          {YOU_RULE.map((line, i) => (
            <p key={i} className="text-zinc-200 text-sm">{line}</p>
          ))}
          {c.heard.map((h, i) => (
            <Word key={i} w={h} />
          ))}
        </>
      )}

      {focus?.kind === "animal" && (() => {
        const placed = c.animals[focus.index];
        const a = ANIMALS[placed.animal];
        const hit = beam?.streams.flatMap((s) => s.steps).find((s) => s.index === focus.index);
        return (
          <>
            <Header emoji={a.emoji} name={a.name} sub={TIER_LABEL[a.tier]} subClass={TIER_TEXT[a.tier]} />
            <p className="text-zinc-200 text-sm">{a.detail}</p>
            {placed.clue && <Word w={clueText(placed.clue)} />}
            {a.turns && (
              <p className="text-zinc-300 text-sm">{a.turns.map((t) => TURN_TEXT[t]).join(" ")}</p>
            )}
            {example(a.id) && <div className="font-mono text-amber-300 text-sm text-center py-2 bg-zinc-900/60 rounded-lg">{example(a.id)}</div>}
            {hit && (
              <p className="text-xs text-emerald-400">
                ✓ {hit.before} → {hit.after} ({hit.why})
              </p>
            )}
          </>
        );
      })()}

      {focus && <p className="mt-auto text-zinc-600 text-[10px] text-center">{pinned ? "pinned · click again to unpin" : "click to pin"}</p>}
    </div>
  );
}

function Word({ w }: { w: string }) {
  return <div className="font-mono text-amber-300 text-base tracking-widest text-center py-2 bg-zinc-900/60 rounded-lg">{w}</div>;
}

function Header({ emoji, name, sub, subClass = "text-zinc-500" }: { emoji: string; name: string; sub: string; subClass?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-4xl leading-none">{emoji}</span>
      <div>
        <div className="text-white font-bold">{name}</div>
        <div className={`text-xs ${subClass}`}>{sub}</div>
      </div>
    </div>
  );
}
