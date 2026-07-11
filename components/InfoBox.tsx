"use client";

import { Enemy, Player } from "@/types/game";
import { ON_DEATH_EFFECTS, ENEMY_ABILITIES } from "@/data/game-data";
import { Bar } from "./Bar";

interface InfoBoxProps {
  unit: Enemy | Player | null;
}

export function InfoBox({ unit }: InfoBoxProps) {
  return (
    <div className="flex flex-col gap-4 w-40 select-none">
      {unit ? (
        <div className="bg-zinc-800 rounded-lg p-4 min-h-[160px] max-h-[480px] overflow-y-auto info-scroll">
          <div className="flex flex-col items-center gap-2">
            <span className="text-4xl">{unit.emoji}</span>
            <span className="text-white font-bold text-lg">{unit.word}</span>

            {unit.type === "player" && (
              <p className="text-zinc-600 italic text-[10px] mt-2">
                despite everything, its still you
              </p>
            )}

            <div className="w-full mt-2 space-y-2">
              {unit.type === "player" && (
                <>
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>⚔️ Attack</span>
                    <span className="text-red-400 font-bold">{unit.attack}</span>
                  </div>
                  <p className="text-zinc-400 text-xs leading-snug mt-1">
                    Slide with the arrow keys or WASD. You slam the first enemy in your path
                    and take no damage.
                  </p>
                </>
              )}

              {unit.type === "enemy" && (
                <>
                  <Bar value={unit.health} max={unit.maxHealth} color="bg-zinc-400" label="HP" />

                  {unit.abilities.length > 0 && (
                    <div className="space-y-1.5 text-xs pt-1">
                      {unit.abilities.map((abilityId) => {
                        const def = ENEMY_ABILITIES[abilityId];
                        return (
                          <div key={abilityId} className="rounded-md border-2 border-sky-500/40 bg-sky-500/10 p-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sky-400">{def.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400">
                                Ability
                              </span>
                            </div>
                            <p className="text-zinc-500 leading-snug mt-1">{def.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {unit.onDeathEffects.length > 0 && (
                    <div className="space-y-1.5 text-xs pt-1">
                      {unit.onDeathEffects.map((effectId) => {
                        const def = ON_DEATH_EFFECTS[effectId];
                        return (
                          <div key={effectId} className="rounded-md border-2 border-green-500/40 bg-green-500/10 p-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-green-400">{def.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400">
                                On Death
                              </span>
                            </div>
                            <p className="text-zinc-500 leading-snug mt-1">{def.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-800 rounded-lg px-3 py-3">
          <p className="text-zinc-500 text-xs leading-snug text-center">
            Hover over a unit to see details.
          </p>
        </div>
      )}
    </div>
  );
}
