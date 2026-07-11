import { ItemDef, ItemRarity, Inventory } from "@/types/game";

// ---------------------------------------------------------------------------
// Roguelike items — stackable pickups, Risk-of-Rain style. Every copy you own
// adds its effect again, so duplicates keep getting stronger.
// ---------------------------------------------------------------------------

export const ITEM_LIST: ItemDef[] = [
  {
    id: "sharktooth", name: "Sharktooth", emoji: "🦷", rarity: "common",
    description: "+3 slam attack per stack.",
  },
  {
    id: "tome", name: "Ancient Tome", emoji: "📖", rarity: "common",
    description: "+25% XP gained per stack.",
  },
  {
    id: "whirlpool", name: "Whirlpool", emoji: "🌀", rarity: "common",
    description: "Each turn, deal 4 damage to a random enemy per stack.",
  },
  {
    id: "harpoon", name: "Harpoon", emoji: "🔱", rarity: "uncommon",
    description: "Your slam pierces 1 more enemy behind the target per stack.",
  },
  {
    id: "riptide", name: "Riptide", emoji: "🌊", rarity: "uncommon",
    description: "Slams splash 3 damage to tiles next to the target per stack.",
  },
  {
    id: "tempest", name: "Tempest", emoji: "⚡", rarity: "uncommon",
    description: "Each turn, deal 1 damage to every enemy per stack.",
  },
  {
    id: "cleaver", name: "Cleaver", emoji: "🗡️", rarity: "rare",
    description: "Slams execute enemies left at 3 HP or below per stack.",
  },
  {
    id: "deeppressure", name: "Deep Pressure", emoji: "💥", rarity: "rare",
    description: "+15% chance per stack for a slam to deal double damage.",
  },
];

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(
  ITEM_LIST.map((it) => [it.id, it]),
);

// ---------------------------------------------------------------------------
// Aggregated effects — sum every item's contribution across your inventory.
// ---------------------------------------------------------------------------

export interface PlayerMods {
  /** Flat bonus added to your slam attack. */
  attackBonus: number;
  /** Extra enemies your slam punches through, beyond the first. */
  pierce: number;
  /** Splash damage dealt to tiles cardinally adjacent to a slam target. */
  splash: number;
  /** Chance [0..1] for a slam to deal double damage. */
  critChance: number;
  /** A slam finishes any enemy left at or below this HP. */
  executeThreshold: number;
  /** Multiplier applied to XP earned from kills. */
  xpMultiplier: number;
  /** Per-turn damage dealt to one random enemy. */
  whirlpoolDamage: number;
  /** Per-turn damage dealt to every enemy. */
  tempestDamage: number;
}

export function computeMods(inv: Inventory): PlayerMods {
  const n = (id: string) => inv[id] ?? 0;
  return {
    attackBonus: n("sharktooth") * 3,
    pierce: n("harpoon"),
    splash: n("riptide") * 3,
    critChance: Math.min(0.9, n("deeppressure") * 0.15),
    executeThreshold: n("cleaver") * 3,
    xpMultiplier: 1 + n("tome") * 0.25,
    whirlpoolDamage: n("whirlpool") * 4,
    tempestDamage: n("tempest") * 1,
  };
}

// ---------------------------------------------------------------------------
// Item rolls — the 3 options shown on level-up, weighted by rarity.
// ---------------------------------------------------------------------------

const RARITY_WEIGHT: Record<ItemRarity, number> = {
  common: 60,
  uncommon: 30,
  rare: 10,
};

/** Pick `count` distinct items, weighted by rarity. */
export function rollChoices(count = 3, rng: () => number = Math.random): string[] {
  const pool = [...ITEM_LIST];
  const chosen: string[] = [];

  while (chosen.length < count && pool.length > 0) {
    const total = pool.reduce((s, it) => s + RARITY_WEIGHT[it.rarity], 0);
    let r = rng() * total;
    let idx = 0;
    for (; idx < pool.length - 1; idx++) {
      r -= RARITY_WEIGHT[pool[idx].rarity];
      if (r <= 0) break;
    }
    chosen.push(pool.splice(idx, 1)[0].id);
  }

  return chosen;
}
