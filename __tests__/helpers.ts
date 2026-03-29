import { Player, Position, EnemyTemplate } from "@/types/game";
import { isOuterRing, GRID_HALF, ENEMY_TEMPLATES } from "@/data/game-data";

/** Shorthand lookup: `T.fish`, `T.shark`, etc. */
export const T: Record<string, EnemyTemplate> = ENEMY_TEMPLATES;

export function makePlayer(pos: Position = { x: 0, y: 0 }): Player {
  return {
    id: "player",
    type: "player",
    position: pos,
    stackCount: 1,
    health: 10,
    maxHealth: 10,
    word: "YOU",
    emoji: "❤️",
    range: 0,
  };
}

export function allOuterRingPositions(): Position[] {
  const positions: Position[] = [];
  for (let x = -GRID_HALF; x <= GRID_HALF; x++) {
    for (let y = -GRID_HALF; y <= GRID_HALF; y++) {
      if (isOuterRing({ x, y })) positions.push({ x, y });
    }
  }
  return positions;
}

export function sortProcessingOrder<T extends { position: Position }>(
  units: T[],
): T[] {
  return [...units].sort((a, b) => {
    if (a.position.y !== b.position.y) return a.position.y - b.position.y;
    return a.position.x - b.position.x;
  });
}
