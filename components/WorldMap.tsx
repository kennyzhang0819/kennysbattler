"use client";

import { useState } from "react";
import { LevelConfig } from "@/types/game";
import { LEVELS, getTotalTurns } from "@/data/game-data";
import { FaLock, FaCheck, FaTrashCan } from "react-icons/fa6";

interface WorldMapProps {
  completedLevels: Set<number>;
  skillPoints: number;
  onSelectLevel: (level: LevelConfig) => void;
  onOpenSkillTree: () => void;
  onClearProgress: () => void;
}

export function WorldMap({
  completedLevels,
  skillPoints,
  onSelectLevel,
  onOpenSkillTree,
  onClearProgress,
}: WorldMapProps) {
  const [confirmingClear, setConfirmingClear] = useState(false);

  const isUnlocked = (levelId: number) => {
    if (levelId === 1) return true;
    return completedLevels.has(levelId - 1);
  };

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center p-8 select-none relative">
      <div className="absolute top-6 right-6 flex items-center gap-3">
        {completedLevels.size > 0 && (
          confirmingClear ? (
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 text-sm">Reset?</span>
              <button
                onClick={() => { onClearProgress(); setConfirmingClear(false); }}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors cursor-pointer"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmingClear(false)}
                className="px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingClear(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-red-500/50 hover:text-red-400 text-sm font-medium transition-all cursor-pointer"
            >
              <FaTrashCan className="text-xs" />
            </button>
          )
        )}
        <button
          onClick={onOpenSkillTree}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-amber-500/50 hover:text-amber-400 text-sm font-medium transition-all cursor-pointer"
        >
          <span>⭐</span>
          <span>Skills</span>
          <span className="text-amber-400 font-bold">{skillPoints}</span>
        </button>
      </div>

      <div className="flex flex-col items-center gap-10">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Kenny&apos;s Battler</h1>
        </div>

        <div className="relative flex flex-col items-center gap-4">
          {LEVELS.map((level, i) => {
            const unlocked = isUnlocked(level.id);
            const completed = completedLevels.has(level.id);
            const isNext = unlocked && !completed;

            return (
              <div key={level.id} className="flex flex-col items-center">
                {i > 0 && (
                  <div className={`w-1 h-10 -mt-4 -mb-4 rounded-full ${completedLevels.has(LEVELS[i - 1].id)
                      ? "bg-green-500/60"
                      : "bg-zinc-700"
                    }`} />
                )}

                <button
                  onClick={() => unlocked && onSelectLevel(level)}
                  disabled={!unlocked}
                  className={`
                    relative w-72 rounded-xl p-5 transition-all duration-200
                    ${isNext
                      ? "bg-zinc-800 border-2 border-amber-500/70 hover:border-amber-400 hover:bg-zinc-750 cursor-pointer world-map-pulse"
                      : completed
                        ? "bg-zinc-800 border-2 border-green-500/50 cursor-pointer hover:bg-zinc-750"
                        : "bg-zinc-800/50 border-2 border-zinc-700 cursor-not-allowed opacity-60"
                    }
                  `}
                >
                  {completed && (
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-green-500 flex items-center justify-center">
                      <FaCheck className="text-white text-xs" />
                    </div>
                  )}

                  {!unlocked && (
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-zinc-600 flex items-center justify-center">
                      <FaLock className="text-zinc-400 text-xs" />
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <div className={`
                      w-14 h-14 rounded-lg flex items-center justify-center text-3xl shrink-0
                      ${isNext ? "bg-amber-500/20" : completed ? "bg-green-500/20" : "bg-zinc-700/50"}
                    `}>
                      {level.emoji}
                    </div>

                    <div className="text-left flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500 text-xs font-bold">
                          LEVEL {level.id}
                        </span>
                      </div>
                      <h3 className="text-white font-bold text-lg leading-tight">
                        {level.name}
                      </h3>
                      <p className="text-zinc-400 text-xs mt-0.5">
                        {level.description}
                      </p>
                      <p className="text-zinc-500 text-[10px] mt-1">
                        {getTotalTurns(level)} waves
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
