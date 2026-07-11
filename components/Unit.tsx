"use client";

import { Enemy, Player } from "@/types/game";
import { gridToPixel } from "@/data/game-data";
import { AnimationState } from "./Grid";

interface UnitProps {
  unit: Enemy | Player;
  isHovered?: boolean;
  isPinned?: boolean;
  animationState?: AnimationState;
  unitSize: number;
  unitOffset: number;
  onMouseEnter?: () => void;
  onClick?: () => void;
}

export function Unit({
  unit,
  isHovered,
  isPinned,
  animationState = "idle",
  unitSize,
  unitOffset,
  onMouseEnter,
  onClick,
}: UnitProps) {
  const isPlayer = unit.type === "player";
  const healthPercent = (unit.health / unit.maxHealth) * 100;

  // A traveling slam bakes its momentum into the position move itself: an
  // overshoot easing carries YOU past the resting tile and springs back — one
  // fluid motion instead of a transform fighting the slide (which read as jank).
  const isSlam = animationState.startsWith("slam-");
  const moveEasing = isSlam ? "cubic-bezier(0.34, 1.7, 0.5, 1)" : undefined;

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
      case "healing":
        return "animate-heal";
      case "buffing":
        return "animate-buff";
      case "lunge-up":
        return "animate-lunge-up";
      case "lunge-down":
        return "animate-lunge-down";
      case "lunge-left":
        return "animate-lunge-left";
      case "lunge-right":
        return "animate-lunge-right";
      default:
        return "";
    }
  };

  return (
    <div
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={`
        absolute select-none cursor-pointer
        transition-all duration-300 ease-out
        
        ${getAnimationClass()}
      `}
      style={{
        width: unitSize,
        height: unitSize,
        left: gridToPixel(unit.position.x) + unitOffset,
        top: gridToPixel(unit.position.y) + unitOffset,
        transitionTimingFunction: moveEasing,
      }}
    >
      <div className={`
        absolute inset-0 rounded-lg overflow-hidden
        ${isPinned ? "ring-2 ring-yellow-400 ring-offset-1 ring-offset-transparent z-10" : isHovered ? "ring-2 ring-yellow-400/40 ring-offset-1 ring-offset-transparent z-10" : ""}
        ${isPlayer ? "ring-1 ring-white/20" : ""}
      `}>
        <div className={`absolute inset-0 ${isPlayer ? "bg-sky-700/60" : "bg-zinc-700"}`} />

        {!isPlayer && (
          <div
            className={`absolute bottom-0 left-0 right-0 ${animationState !== "dying" ? "transition-all duration-300" : ""} bg-zinc-500/40`}
            style={{ height: `${healthPercent}%` }}
          />
        )}

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl leading-none">{unit.emoji}</span>
          <span className="text-xs text-white font-medium mt-1">
            {unit.word}
          </span>
        </div>
      </div>
    </div>
  );
}
