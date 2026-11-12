"use client";

import { useCallback, useState } from "react";
import { ReefGame } from "./ReefGame";
import { ReefStart } from "./ReefStart";

type Screen = "start" | "game";

export function ReefApp() {
  const [screen, setScreen] = useState<Screen>("start");
  const [runKey, setRunKey] = useState(0);

  const start = useCallback(() => {
    setScreen("game");
    setRunKey((k) => k + 1);
  }, []);

  if (screen === "start") return <ReefStart onStart={start} />;
  return <ReefGame key={runKey} onRetry={start} onExit={() => setScreen("start")} />;
}
