"use client";

import { Enemy, Player, EnemyIntent } from "@/types/game";
import { gridToPixel } from "@/data/game-data";
import { FaShoePrints } from "react-icons/fa6";
import { GiBroadsword } from "react-icons/gi";
import { MdHotelClass } from "react-icons/md";

interface UnitProps {
  unit: Enemy | Player;
  intent?: EnemyIntent;
  isHovered?: boolean;
  animationState?: "idle" | "attacking" | "hurt" | "dying" | "merging" | "spawning";
  unitSize: number;
  unitOffset: number;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseUp?: () => void;
}

export function Unit({
  unit,
  intent,
  isHovered,
  animationState = "idle",
  unitSize,
  unitOffset,
  onMouseDown,
  onMouseEnter,
  onMouseUp,
}: UnitProps) {
  const isPlayer = unit.type === "player";
  const healthPercent = (unit.health / unit.maxHealth) * 100;

  const getAnimationClass = () => {
    switch (animationState) {
      case "attacking":
        return "animate-attack";
      case "hurt":
        return "animate-hurt";
      case "dying":
        return "animate-die";
      case "merging":
        return "animate-merge";
      case "spawning":
        return "animate-spawn";
      default:
        return "";
    }
  };

  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseUp={onMouseUp}
      className={`
        absolute select-none
        transition-all duration-300 ease-out
        
        ${getAnimationClass()}
      `}
      style={{
        width: unitSize,
        height: unitSize,
        left: gridToPixel(unit.position.x) + unitOffset,
        top: gridToPixel(unit.position.y) + unitOffset,
      }}
    >
      <div className={`
        absolute inset-0 rounded-lg overflow-hidden
        ${isHovered ? "ring-2 ring-yellow-400 ring-offset-1 ring-offset-transparent z-10" : ""}
        ${isPlayer ? "ring-1 ring-white/20" : ""}
      `}>
        <div className={`absolute inset-0 ${isPlayer ? "bg-zinc-600" : "bg-zinc-700"}`} />

        <div
          className={`absolute bottom-0 left-0 right-0 ${animationState !== "dying" ? "transition-all duration-300" : ""} ${isPlayer ? "bg-red-700/50" : "bg-zinc-500/40"}`}
          style={{ height: `${healthPercent}%` }}
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl leading-none">{unit.emoji}</span>
          <span className="text-xs text-white font-medium mt-1">
            {unit.word}
          </span>
        </div>
      </div>

      {intent && (intent.move.action !== "idle" || intent.abilityReady) && (
        <div className="absolute top-1 right-1 z-20 flex items-center gap-1 text-[11px] font-bold leading-none">
          {intent.abilityReady && (
            <MdHotelClass className="w-3 h-3 text-purple-400" />
          )}
          {intent.move.action === "attack" ? (
            <>
              <GiBroadsword className="w-3 h-3 text-red-400" />
              <span className="text-red-400">{intent.move.damage}</span>
            </>
          ) : intent.move.action === "move" ? (
            <FaShoePrints className="w-3 h-3 text-sky-400" />
          ) : null}
        </div>
      )}
    </div>
  );
}
