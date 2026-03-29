"use client";

import { SkillSlot, SkillLevels } from "@/types/game";
import { SKILL_TREE, getSlotCost, getMaxLevel } from "@/data/skill-tree";
import { SPELL_TEMPLATES } from "@/data/game-data";
import { useMemo } from "react";

interface SkillTreeProps {
  skillPoints: number;
  skillLevels: SkillLevels;
  onUpgrade: (slotId: string, cost: number) => void;
  onBack: () => void;
}

const SHOP_GROUP_META: Record<string, { emoji: string; label: string }> = {
  shop_hp: { emoji: "❤️", label: "Max HP" },
  shop_gold: { emoji: "💰", label: "Income" },
  shop_hand: { emoji: "🃏", label: "Spell Slots" },
  shop_reroll_unlock: { emoji: "🔄", label: "Reroll" },
  shop_free_rerolls: { emoji: "🔄", label: "Free Rerolls" },
};

function SlotButton({ slot, lvl, nextCost, maxed, available, locked, onUpgrade }: {
  slot: SkillSlot;
  lvl: number;
  nextCost: number;
  maxed: boolean;
  available: boolean;
  locked: boolean;
  onUpgrade: (id: string, cost: number) => void;
}) {
  const max = getMaxLevel(slot);
  const progress = max > 1 ? lvl / max : lvl > 0 ? 1 : 0;

  return (
    <button
      onClick={() => available && onUpgrade(slot.id, nextCost)}
      disabled={!available}
      className={`
        w-full rounded-lg p-3 text-left transition-all duration-150 border-2
        ${maxed
          ? "bg-amber-500/10 border-amber-500/50"
          : available
            ? "bg-zinc-700 border-zinc-500 hover:border-amber-400 hover:bg-zinc-600 cursor-pointer"
            : "bg-zinc-800/50 border-zinc-700 opacity-50 cursor-not-allowed"
        }
      `}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`font-bold text-xs ${maxed ? "text-amber-400" : available ? "text-white" : "text-zinc-500"}`}>
          {slot.name}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-bold ${maxed ? "text-amber-400" : lvl > 0 ? "text-zinc-300" : "text-zinc-500"}`}>
            {lvl}/{max}
          </span>
          {!maxed && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              available ? "text-amber-400 bg-amber-500/20" : "text-zinc-500 bg-zinc-700"
            }`}>
              {nextCost} ⭐
            </span>
          )}
          {maxed && (
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded-full">
              MAX
            </span>
          )}
        </div>
      </div>

      {max > 1 && (
        <div className="w-full h-1.5 bg-zinc-600 rounded-full mb-1.5 overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-200"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      <p className={`text-[11px] leading-snug ${maxed ? "text-zinc-400" : locked ? "text-zinc-600" : "text-zinc-400"}`}>
        {slot.description}
        {max > 1 && lvl > 0 && (
          <span className="text-amber-400/80 ml-1">({slot.perLevelLabel} × {lvl})</span>
        )}
      </p>
    </button>
  );
}

/**
 * Walk a requires-chain starting from `root`, staying within the same `group`,
 * and return only the nodes that should be visible: everything up to and
 * including the first non-maxed node.
 */
function getVisibleChain(
  root: SkillSlot,
  allSlots: SkillSlot[],
  getLevel: (id: string) => number,
): SkillSlot[] {
  const chain: SkillSlot[] = [root];
  let current = root;
  while (true) {
    const lvl = getLevel(current.id);
    if (lvl < getMaxLevel(current)) break;
    const next = allSlots.find(
      (s) => s.requires === current.id && s.group === current.group,
    );
    if (!next) break;
    chain.push(next);
    current = next;
  }
  return chain;
}

export function SkillTree({ skillPoints, skillLevels, onUpgrade, onBack }: SkillTreeProps) {
  const getLevel = (id: string) => skillLevels[id] ?? 0;

  const canUpgrade = (slot: SkillSlot) => {
    const lvl = getLevel(slot.id);
    if (lvl >= getMaxLevel(slot)) return false;
    if (skillPoints < getSlotCost(slot, lvl)) return false;
    if (slot.requires) {
      const req = SKILL_TREE.find((s) => s.id === slot.requires);
      if (req && getLevel(req.id) < getMaxLevel(req)) return false;
    }
    return true;
  };

  const spellGroups = useMemo(() => {
    const groups: Record<string, SkillSlot[]> = {};
    for (const slot of SKILL_TREE) {
      if (slot.category !== "spell") continue;
      if (!groups[slot.spellId]) groups[slot.spellId] = [];
      groups[slot.spellId].push(slot);
    }
    return groups;
  }, []);

  const spellUpgradeLines = useMemo(() => {
    const result: Record<string, { roots: SkillSlot[] }> = {};
    for (const [spellId, slots] of Object.entries(spellGroups)) {
      const roots = slots.filter((s) => {
        if (!s.requires) return true;
        const req = slots.find((r) => r.id === s.requires);
        return req && req.group !== s.group;
      });
      result[spellId] = { roots };
    }
    return result;
  }, [spellGroups]);

  const shopSlots = useMemo(() => SKILL_TREE.filter((s) => s.category === "shop"), []);

  const shopUpgradeLines = useMemo(() => {
    const groups: Record<string, SkillSlot[]> = {};
    for (const slot of shopSlots) {
      const key = slot.group ?? slot.id;
      if (!groups[key]) groups[key] = [];
      groups[key].push(slot);
    }
    const lines: { key: string; root: SkillSlot }[] = [];
    for (const [key, slots] of Object.entries(groups)) {
      const root = slots.find((s) => !s.requires || !slots.some((o) => o.id === s.requires));
      if (root) lines.push({ key, root });
    }
    return lines;
  }, [shopSlots]);

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center p-8 select-none relative">
      <button
        onClick={onBack}
        className="absolute top-6 left-6 text-zinc-500 hover:text-zinc-300 text-sm font-bold tracking-wide transition-colors cursor-pointer"
      >
        ← BACK
      </button>

      <div className="flex flex-col items-center gap-8 w-full max-w-3xl">
        <div className="flex items-center justify-between w-full">
          <h1 className="text-2xl font-bold text-white">Skill Tree</h1>
          <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2">
            <span className="text-amber-400 text-sm">⭐</span>
            <span className="text-amber-400 font-bold text-lg">{skillPoints}</span>
            <span className="text-zinc-400 text-sm">points</span>
          </div>
        </div>

        {/* Spells section */}
        <div className="w-full">
          <h2 className="text-zinc-400 text-xs font-bold tracking-widest uppercase mb-3">Spells</h2>
          <div className="grid grid-cols-3 gap-5 w-full">
            {Object.entries(spellUpgradeLines).map(([spellId, { roots }]) => {
              const template = SPELL_TEMPLATES.find((t) => t.id === spellId);
              if (!template) return null;
              const spellSlots = spellGroups[spellId];

              return (
                <div key={spellId} className="flex flex-col items-center gap-3 bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-3xl">{template.emoji}</span>
                    <span className="text-white font-bold">{template.name}</span>
                  </div>

                  {roots.map((root) => {
                    if (root.requires && getLevel(root.requires) < getMaxLevel(SKILL_TREE.find((s) => s.id === root.requires)!)) return null;

                    const chain = getVisibleChain(root, spellSlots, getLevel);

                    return chain.map((slot, i) => {
                      const lvl = getLevel(slot.id);
                      const maxed = lvl >= getMaxLevel(slot);
                      const available = canUpgrade(slot);
                      const locked = !maxed && !available;
                      const nextCost = getSlotCost(slot, lvl);

                      return (
                        <div key={slot.id} className="w-full">
                          {i > 0 && (
                            <div className="flex justify-center -my-1 mb-1">
                              <div className={`w-0.5 h-4 ${lvl > 0 || available ? "bg-zinc-500" : "bg-zinc-700"}`} />
                            </div>
                          )}
                          <SlotButton slot={slot} lvl={lvl} nextCost={nextCost} maxed={maxed} available={available} locked={locked} onUpgrade={onUpgrade} />
                        </div>
                      );
                    });
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Shop section */}
        <div className="w-full">
          <h2 className="text-zinc-400 text-xs font-bold tracking-widest uppercase mb-3">Shop</h2>
          <div className="grid grid-cols-3 gap-5 w-full">
            {shopUpgradeLines.map(({ key, root }) => {
              const meta = SHOP_GROUP_META[key];
              const chain = getVisibleChain(root, shopSlots, getLevel);

              return (
                <div key={key} className="flex flex-col items-center gap-3 bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{meta?.emoji ?? "🔧"}</span>
                    <span className="text-white font-bold text-sm">{meta?.label ?? root.name}</span>
                  </div>
                  {chain.map((slot, i) => {
                    const lvl = getLevel(slot.id);
                    const maxed = lvl >= getMaxLevel(slot);
                    const available = canUpgrade(slot);
                    const locked = !maxed && !available;
                    const nextCost = getSlotCost(slot, lvl);

                    return (
                      <div key={slot.id} className="w-full">
                        {i > 0 && (
                          <div className="flex justify-center -my-1 mb-1">
                            <div className={`w-0.5 h-4 ${lvl > 0 || available ? "bg-zinc-500" : "bg-zinc-700"}`} />
                          </div>
                        )}
                        <SlotButton slot={slot} lvl={lvl} nextCost={nextCost} maxed={maxed} available={available} locked={locked} onUpgrade={onUpgrade} />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
