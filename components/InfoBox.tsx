"use client";

import { Enemy, Player, Spell, EnemyIntent } from "@/types/game";
import { ENEMY_ABILITIES, ON_DEATH_EFFECTS } from "@/data/game-data";
import { Bar } from "./Bar";
import { FaShoePrints } from "react-icons/fa6";
import { GiBroadsword } from "react-icons/gi";


interface InfoBoxProps {
  unit: Enemy | Player | null;
  unitIntent?: EnemyIntent;
  hoveredSpell: Spell | null;
}

export function InfoBox({ unit, unitIntent, hoveredSpell }: InfoBoxProps) {
  const hasHover = hoveredSpell || unit;

  return (
    <div className="flex flex-col gap-4 w-40 select-none">
      {hasHover ? (
        <div className="bg-zinc-800 rounded-lg p-4 min-h-[160px] max-h-[480px] overflow-y-auto info-scroll">
          {hoveredSpell ? (
            <div className="flex flex-col items-center gap-2">
              <span className="text-4xl">{hoveredSpell.emoji}</span>
              <span className="text-white font-bold text-lg">{hoveredSpell.name}</span>

              <p className="text-zinc-400 text-sm text-center mt-1">{hoveredSpell.description}</p>

              {hoveredSpell.cost > 0 && (
                <div className="flex justify-between w-full text-sm text-zinc-400 mt-1">
                  <span>Cost</span>
                  <span className="text-yellow-400">{hoveredSpell.cost}g</span>
                </div>
              )}
            </div>
          ) : unit ? (
            <div className="flex flex-col items-center gap-2">
              <span className="text-4xl">{unit.emoji}</span>
              <span className="text-white font-bold text-lg">{unit.word}</span>


              {unit.type === "player" && (
                <p className="text-zinc-600 italic text-[10px] mt-2">
                  despite everything, its still you
                </p>
              )}

              <div className="w-full mt-2 space-y-2">
                <Bar
                  value={unit.health}
                  max={unit.maxHealth}
                  color={unit.type === "player" ? "bg-red-500" : "bg-zinc-400"}
                  label="HP"
                />

                {unit.type === "enemy" && (
                  <div className="space-y-1 text-xs text-zinc-400">
                    <div className="flex justify-between">
                      <span>Attack</span>
                      <span className="text-red-400">{unit.damage}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Range</span>
                      <span className="text-white">{unit.range}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Move</span>
                      <span className={unit.speed === 0 ? "text-zinc-500" : "text-white"}>
                        {unit.speed === 0 ? "None" : unit.speed}
                      </span>
                    </div>
                  </div>
                )}

                {unit.type === "player" && (
                  <div className="mt-1 text-xs space-y-1">
                    <p className="text-zinc-400 leading-snug">
                      Cast spells to survive. End your turn when ready.
                    </p>
                  </div>
                )}

                {unit.type === "enemy" && unitIntent && unitIntent.move.action !== "idle" && (
                  <div className="mt-1 rounded-md py-1.5 text-xs space-y-1">
                    <div className="flex items-center gap-1 font-bold">
                      {unitIntent.move.action === "attack" ? (
                        <>
                          <GiBroadsword className="w-3.5 h-3.5 text-red-400" />
                          <span className="text-red-400">Attack</span>
                        </>
                      ) : (
                        <>
                          <FaShoePrints className="w-3.5 h-3.5 text-sky-400" />
                          <span className="text-sky-400">Move</span>
                        </>
                      )}
                    </div>
                    <p className="text-zinc-400 leading-snug">
                      {unitIntent.move.action === "attack"
                        ? `Will deal ${unitIntent.move.damage} damage to you this turn.`
                        : "Will move on the board this turn."}
                    </p>
                  </div>
                )}

                {unit.type === "enemy" && (unit.abilities.length > 0 || unit.onDeathEffects.length > 0) && (
                  <div className="space-y-1.5 text-xs">
                    <div className="font-semibold text-zinc-300 uppercase tracking-wide text-sm mb-2">Abilities</div>
                    {unit.abilities.map((ab) => {
                      const def = ENEMY_ABILITIES[ab.id];
                      const ready = ab.cooldownRemaining <= 0;
                      return (
                        <div
                          key={ab.id}
                          className={`rounded-md border-2 p-2 ${ready
                              ? "border-purple-500/40 bg-purple-500/10"
                              : "border-zinc-700 bg-zinc-700/30"
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`font-bold ${ready ? "text-purple-400" : "text-zinc-500"}`}>
                              {def.name}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ready ? "bg-purple-500/20 text-purple-400" : "bg-zinc-700 text-zinc-500"}`}>
                              {ready ? "Ready" : `${ab.cooldownRemaining}t`}
                            </span>
                          </div>
                          <p className="text-zinc-500 leading-snug mt-1">{def.description}</p>
                        </div>
                      );
                    })}
                    {unit.onDeathEffects.map((effectId) => {
                      const def = ON_DEATH_EFFECTS[effectId];
                      return (
                        <div
                          key={effectId}
                          className="rounded-md border-2 border-green-500/40 bg-green-500/10 p-2"
                        >
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

              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="bg-zinc-800 rounded-lg px-3 py-3">
          <p className="text-zinc-500 text-xs leading-snug text-center">
            Hover over a unit or card to see details.
          </p>
        </div>
      )}
    </div>
  );
}
