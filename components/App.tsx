"use client";

import { useState, useCallback } from "react";
import { Game } from "./Game";
import { StartScreen } from "./StartScreen";

type Screen = "start" | "game";

export function App() {
  const [screen, setScreen] = useState<Screen>("start");
  const [runKey, setRunKey] = useState(0);

  const handleStart = useCallback(() => {
    setScreen("game");
    setRunKey((k) => k + 1);
  }, []);

  const handleRetry = useCallback(() => {
    setScreen("game");
    setRunKey((k) => k + 1);
  }, []);

  const handleExit = useCallback(() => {
    setScreen("start");
  }, []);

  if (screen === "start") {
    return <StartScreen onStart={handleStart} />;
  }

  return <Game key={runKey} onRetry={handleRetry} onExit={handleExit} />;
}
