"use client";

import { useState, useCallback, useMemo, useSyncExternalStore } from "react";
import { LevelConfig, SkillLevels } from "@/types/game";
import { getUnlockedSpellIdsFromSkills } from "@/data/skill-tree";
import { WorldMap } from "./WorldMap";
import { Game } from "./Game";
import { SkillTree } from "./SkillTree";

const STORAGE_KEY = "wordbattle-progress";

interface SavedProgress {
  completedLevels: string[];
  skillPoints: number;
  skillLevels: SkillLevels;
}

const EMPTY_PROGRESS: SavedProgress = { completedLevels: [], skillPoints: 0, skillLevels: {} };

/** Migrate old numeric level IDs to strings on load. */
function migrateCompletedLevels(raw: unknown[]): string[] {
  return raw.map((v) => String(v));
}

function loadProgress(): SavedProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_PROGRESS;
    const parsed = JSON.parse(raw);
    return {
      completedLevels: migrateCompletedLevels(parsed.completedLevels ?? []),
      skillPoints: parsed.skillPoints ?? 0,
      skillLevels: parsed.skillLevels ?? {},
    };
  } catch {
    return EMPTY_PROGRESS;
  }
}

function saveProgress(data: SavedProgress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage full or unavailable
  }
}

type Screen =
  | { type: "worldMap" }
  | { type: "skillTree" }
  | { type: "game"; level: LevelConfig };

interface AppState {
  completedLevels: Set<string>;
  skillPoints: number;
  skillLevels: SkillLevels;
}

let listeners: Array<() => void> = [];
let currentSnapshot: AppState | null = null;

function getSnapshot(): AppState | null {
  if (currentSnapshot === null) {
    const p = loadProgress();
    currentSnapshot = {
      completedLevels: new Set(p.completedLevels),
      skillPoints: p.skillPoints,
      skillLevels: p.skillLevels,
    };
  }
  return currentSnapshot;
}

function getServerSnapshotValue(): AppState | null {
  return null;
}

function subscribeToStore(cb: () => void) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

function updateStore(next: AppState) {
  currentSnapshot = next;
  saveProgress({
    completedLevels: [...next.completedLevels],
    skillPoints: next.skillPoints,
    skillLevels: next.skillLevels,
  });
  for (const l of listeners) l();
}

const EMPTY_STATE: AppState = { completedLevels: new Set<string>(), skillPoints: 0, skillLevels: {} };

export function App() {
  const appState = useSyncExternalStore(subscribeToStore, getSnapshot, getServerSnapshotValue);

  const [screen, setScreen] = useState<Screen>({ type: "worldMap" });
  const [gameKey, setGameKey] = useState(0);

  const { completedLevels, skillPoints, skillLevels } = appState ?? EMPTY_STATE;

  const unlockedSpellIds = useMemo(
    () => getUnlockedSpellIdsFromSkills(skillLevels),
    [skillLevels],
  );

  const handleSelectLevel = useCallback((level: LevelConfig) => {
    setGameKey((k) => k + 1);
    setScreen({ type: "game", level });
  }, []);

  const handleWin = useCallback((earnedPoints: number) => {
    if (screen.type !== "game") return;
    const newCompleted = new Set([...completedLevels, screen.level.id]);
    const newSp = skillPoints + earnedPoints;
    updateStore({ completedLevels: newCompleted, skillPoints: newSp, skillLevels });
    setScreen({ type: "worldMap" });
  }, [screen, completedLevels, skillPoints, skillLevels]);

  const handleLose = useCallback((earnedPoints: number) => {
    const newSp = skillPoints + earnedPoints;
    updateStore({ completedLevels, skillPoints: newSp, skillLevels });
    setScreen({ type: "worldMap" });
  }, [skillPoints, completedLevels, skillLevels]);

  const handleBackToMap = useCallback(() => {
    setScreen({ type: "worldMap" });
  }, []);

  const handleUpgradeSkill = useCallback((slotId: string, cost: number) => {
    if (skillPoints < cost) return;
    const newLevels = { ...skillLevels, [slotId]: (skillLevels[slotId] ?? 0) + 1 };
    const newSp = skillPoints - cost;
    updateStore({ completedLevels, skillPoints: newSp, skillLevels: newLevels });
  }, [skillPoints, skillLevels, completedLevels]);

  const handleClearProgress = useCallback(() => {
    updateStore({ completedLevels: new Set(), skillPoints: 0, skillLevels: {} });
  }, []);

  if (!appState) return null;

  if (screen.type === "skillTree") {
    return (
      <SkillTree
        skillPoints={skillPoints}
        skillLevels={skillLevels}
        onUpgrade={handleUpgradeSkill}
        onBack={handleBackToMap}
      />
    );
  }

  if (screen.type === "worldMap") {
    return (
      <WorldMap
        completedLevels={completedLevels}
        skillPoints={skillPoints}
        onSelectLevel={handleSelectLevel}
        onOpenSkillTree={() => setScreen({ type: "skillTree" })}
        onClearProgress={handleClearProgress}
      />
    );
  }

  return (
    <Game
      key={gameKey}
      levelConfig={screen.level}
      unlockedSpellIds={unlockedSpellIds}
      skillLevels={skillLevels}
      onWin={handleWin}
      onLose={handleLose}
      onBackToMap={handleBackToMap}
    />
  );
}
