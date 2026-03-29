import { SkillSlot, SkillLevels } from "@/types/game";
import { BASE_GOLD_PER_TURN, BASE_HAND_SIZE, BASE_PLAYER_HP } from "@/data/game-data";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a flat cost array: `n` levels each costing `cost`. */
function flat(n: number, cost: number): number[] {
  return Array.from({ length: n }, () => cost);
}

/** Sum all levels across slots that share the given `group`. */
export function getGroupLevel(skillLevels: SkillLevels, group: string): number {
  let total = 0;
  for (const slot of SKILL_TREE) {
    if (slot.group === group) total += skillLevels[slot.id] ?? 0;
  }
  return total;
}


// ---------------------------------------------------------------------------
// Skill tree definition
// ---------------------------------------------------------------------------

export const SKILL_TREE: SkillSlot[] = [
  // ==== Spell upgrades ====

  // ---- Fireball (always unlocked) ----
  // +2 base damage per level
  { id: "fireball_dmg_1", spellId: "fireball", category: "spell", group: "fireball_dmg",
    name: "Blaze I",       description: "+2 base damage per level.", cost: flat(3, 1),   perLevelLabel: "+2 dmg" },
  { id: "fireball_dmg_2", spellId: "fireball", category: "spell", group: "fireball_dmg",
    name: "Blaze II",      description: "+2 base damage per level.", cost: flat(3, 5),   requires: "fireball_dmg_1", perLevelLabel: "+2 dmg" },
  { id: "fireball_dmg_3", spellId: "fireball", category: "spell", group: "fireball_dmg",
    name: "Blaze III",     description: "+2 base damage per level.", cost: flat(4, 20),  requires: "fireball_dmg_2", perLevelLabel: "+2 dmg" },
  { id: "fireball_dmg_4", spellId: "fireball", category: "spell", group: "fireball_dmg",
    name: "Blaze IV",      description: "+2 base damage per level.", cost: flat(5, 80),  requires: "fireball_dmg_3", perLevelLabel: "+2 dmg" },
  { id: "fireball_dmg_5", spellId: "fireball", category: "spell", group: "fireball_dmg",
    name: "Blaze V",       description: "+2 base damage per level.", cost: flat(5, 300), requires: "fireball_dmg_4", perLevelLabel: "+2 dmg" },
  { id: "fireball_dmg_6", spellId: "fireball", category: "spell", group: "fireball_dmg",
    name: "Blaze VI",      description: "+2 base damage per level.", cost: flat(5, 1000),requires: "fireball_dmg_5", perLevelLabel: "+2 dmg" },

  // ---- Restore ----
  { id: "restore_unlock", spellId: "restore", category: "spell",
    name: "Restore",        description: "Unlock Restore.",          cost: [3],           perLevelLabel: "Unlock" },

  // +2 max HP bonus per level
  { id: "restore_heal_1", spellId: "restore", category: "spell", group: "restore_heal",
    name: "Vitality I",    description: "+2 base max HP bonus per level.", cost: flat(3, 1),   requires: "restore_unlock", perLevelLabel: "+2 HP" },
  { id: "restore_heal_2", spellId: "restore", category: "spell", group: "restore_heal",
    name: "Vitality II",   description: "+2 base max HP bonus per level.", cost: flat(3, 8),   requires: "restore_heal_1", perLevelLabel: "+2 HP" },
  { id: "restore_heal_3", spellId: "restore", category: "spell", group: "restore_heal",
    name: "Vitality III",  description: "+2 base max HP bonus per level.", cost: flat(4, 30),  requires: "restore_heal_2", perLevelLabel: "+2 HP" },
  { id: "restore_heal_4", spellId: "restore", category: "spell", group: "restore_heal",
    name: "Vitality IV",   description: "+2 base max HP bonus per level.", cost: flat(5, 120), requires: "restore_heal_3", perLevelLabel: "+2 HP" },

  // +1% of max HP healed per level
  { id: "restore_pct_1", spellId: "restore", category: "spell", group: "restore_pct",
    name: "Rejuvenation I",  description: "+1% of max HP healed per level.", cost: flat(3, 2),   requires: "restore_unlock", perLevelLabel: "+1%" },
  { id: "restore_pct_2", spellId: "restore", category: "spell", group: "restore_pct",
    name: "Rejuvenation II", description: "+1% of max HP healed per level.", cost: flat(3, 10),  requires: "restore_pct_1", perLevelLabel: "+1%" },
  { id: "restore_pct_3", spellId: "restore", category: "spell", group: "restore_pct",
    name: "Rejuvenation III",description: "+1% of max HP healed per level.", cost: flat(4, 40),  requires: "restore_pct_2", perLevelLabel: "+1%" },
  { id: "restore_pct_4", spellId: "restore", category: "spell", group: "restore_pct",
    name: "Rejuvenation IV", description: "+1% of max HP healed per level.", cost: flat(5, 150), requires: "restore_pct_3", perLevelLabel: "+1%" },

  // ---- Lightning ----
  { id: "lightning_unlock", spellId: "lightning", category: "spell",
    name: "Lightning",      description: "Unlock Lightning.",        cost: [5],           perLevelLabel: "Unlock" },

  // +1 base damage per level
  { id: "lightning_dmg_1", spellId: "lightning", category: "spell", group: "lightning_dmg",
    name: "Voltage I",     description: "+1 base damage per level.", cost: flat(3, 1),   requires: "lightning_unlock", perLevelLabel: "+1 dmg" },
  { id: "lightning_dmg_2", spellId: "lightning", category: "spell", group: "lightning_dmg",
    name: "Voltage II",    description: "+1 base damage per level.", cost: flat(3, 8),   requires: "lightning_dmg_1", perLevelLabel: "+1 dmg" },
  { id: "lightning_dmg_3", spellId: "lightning", category: "spell", group: "lightning_dmg",
    name: "Voltage III",   description: "+1 base damage per level.", cost: flat(4, 30),  requires: "lightning_dmg_2", perLevelLabel: "+1 dmg" },
  { id: "lightning_dmg_4", spellId: "lightning", category: "spell", group: "lightning_dmg",
    name: "Voltage IV",    description: "+1 base damage per level.", cost: flat(5, 120), requires: "lightning_dmg_3", perLevelLabel: "+1 dmg" },

  // +1% of each target's max HP per level
  { id: "lightning_pct_1", spellId: "lightning", category: "spell", group: "lightning_pct",
    name: "Storm Surge I",  description: "+1% of each target's max HP per level.", cost: flat(3, 2),   requires: "lightning_unlock", perLevelLabel: "+1%" },
  { id: "lightning_pct_2", spellId: "lightning", category: "spell", group: "lightning_pct",
    name: "Storm Surge II", description: "+1% of each target's max HP per level.", cost: flat(3, 10),  requires: "lightning_pct_1", perLevelLabel: "+1%" },
  { id: "lightning_pct_3", spellId: "lightning", category: "spell", group: "lightning_pct",
    name: "Storm Surge III",description: "+1% of each target's max HP per level.", cost: flat(4, 40),  requires: "lightning_pct_2", perLevelLabel: "+1%" },
  { id: "lightning_pct_4", spellId: "lightning", category: "spell", group: "lightning_pct",
    name: "Storm Surge IV", description: "+1% of each target's max HP per level.", cost: flat(5, 150), requires: "lightning_pct_3", perLevelLabel: "+1%" },

  // ==== Shop upgrades ====

  // ---- Max HP: +5 per level ----
  { id: "shop_hp_1", spellId: "_shop", category: "shop", group: "shop_hp",
    name: "Max HP I",      description: "+5 max HP per level.", cost: flat(3, 1),    perLevelLabel: "+5 HP" },
  { id: "shop_hp_2", spellId: "_shop", category: "shop", group: "shop_hp",
    name: "Max HP II",     description: "+5 max HP per level.", cost: flat(3, 5),    requires: "shop_hp_1", perLevelLabel: "+5 HP" },
  { id: "shop_hp_3", spellId: "_shop", category: "shop", group: "shop_hp",
    name: "Max HP III",    description: "+5 max HP per level.", cost: flat(4, 20),   requires: "shop_hp_2", perLevelLabel: "+5 HP" },
  { id: "shop_hp_4", spellId: "_shop", category: "shop", group: "shop_hp",
    name: "Max HP IV",     description: "+5 max HP per level.", cost: flat(5, 80),   requires: "shop_hp_3", perLevelLabel: "+5 HP" },
  { id: "shop_hp_5", spellId: "_shop", category: "shop", group: "shop_hp",
    name: "Max HP V",      description: "+5 max HP per level.", cost: flat(5, 300),  requires: "shop_hp_4", perLevelLabel: "+5 HP" },
  { id: "shop_hp_6", spellId: "_shop", category: "shop", group: "shop_hp",
    name: "Max HP VI",     description: "+5 max HP per level.", cost: flat(5, 1000), requires: "shop_hp_5", perLevelLabel: "+5 HP" },

  // ---- Income: +1 gold per turn (huge impact — one node per tier) ----
  { id: "shop_gold_1", spellId: "_shop", category: "shop", group: "shop_gold",
    name: "Income I",      description: "+1 gold per turn.", cost: [10],   perLevelLabel: "+1 gold" },
  { id: "shop_gold_2", spellId: "_shop", category: "shop", group: "shop_gold",
    name: "Income II",     description: "+1 gold per turn.", cost: [50],   requires: "shop_gold_1", perLevelLabel: "+1 gold" },
  { id: "shop_gold_3", spellId: "_shop", category: "shop", group: "shop_gold",
    name: "Income III",    description: "+1 gold per turn.", cost: [200],  requires: "shop_gold_2", perLevelLabel: "+1 gold" },
  { id: "shop_gold_4", spellId: "_shop", category: "shop", group: "shop_gold",
    name: "Income IV",     description: "+1 gold per turn.", cost: [600],  requires: "shop_gold_3", perLevelLabel: "+1 gold" },
  { id: "shop_gold_5", spellId: "_shop", category: "shop", group: "shop_gold",
    name: "Income V",      description: "+1 gold per turn.", cost: [1500], requires: "shop_gold_4", perLevelLabel: "+1 gold" },
  { id: "shop_gold_6", spellId: "_shop", category: "shop", group: "shop_gold",
    name: "Income VI",     description: "+1 gold per turn.", cost: [3500], requires: "shop_gold_5", perLevelLabel: "+1 gold" },
  { id: "shop_gold_7", spellId: "_shop", category: "shop", group: "shop_gold",
    name: "Income VII",    description: "+1 gold per turn.", cost: [8000], requires: "shop_gold_6", perLevelLabel: "+1 gold" },

  // ---- Spell Slots: +1 slot per tier ----
  { id: "shop_hand_1", spellId: "_shop", category: "shop", group: "shop_hand",
    name: "Spell Slots I",  description: "+1 spell slot.", cost: [25],   perLevelLabel: "+1 slot" },
  { id: "shop_hand_2", spellId: "_shop", category: "shop", group: "shop_hand",
    name: "Spell Slots II", description: "+1 spell slot.", cost: [200],  requires: "shop_hand_1", perLevelLabel: "+1 slot" },
  { id: "shop_hand_3", spellId: "_shop", category: "shop", group: "shop_hand",
    name: "Spell Slots III",description: "+1 spell slot.", cost: [2000], requires: "shop_hand_2", perLevelLabel: "+1 slot" },

  // ---- Reroll ----
  { id: "shop_reroll_unlock", spellId: "_shop", category: "shop",
    name: "Reroll",         description: "Unlock the reroll button.", cost: [15], perLevelLabel: "Unlock" },

  // ---- Free Rerolls: +1 free reroll per tier ----
  { id: "shop_free_rerolls_1", spellId: "_shop", category: "shop", group: "shop_free_rerolls",
    name: "Free Rerolls I",  description: "+1 free reroll per turn.", cost: [50],   requires: "shop_reroll_unlock", perLevelLabel: "+1 free" },
  { id: "shop_free_rerolls_2", spellId: "_shop", category: "shop", group: "shop_free_rerolls",
    name: "Free Rerolls II", description: "+1 free reroll per turn.", cost: [200],  requires: "shop_free_rerolls_1", perLevelLabel: "+1 free" },
  { id: "shop_free_rerolls_3", spellId: "_shop", category: "shop", group: "shop_free_rerolls",
    name: "Free Rerolls III",description: "+1 free reroll per turn.", cost: [600],  requires: "shop_free_rerolls_2", perLevelLabel: "+1 free" },
  { id: "shop_free_rerolls_4", spellId: "_shop", category: "shop", group: "shop_free_rerolls",
    name: "Free Rerolls IV", description: "+1 free reroll per turn.", cost: [2000], requires: "shop_free_rerolls_3", perLevelLabel: "+1 free" },
  { id: "shop_free_rerolls_5", spellId: "_shop", category: "shop", group: "shop_free_rerolls",
    name: "Free Rerolls V",  description: "+1 free reroll per turn.", cost: [6000], requires: "shop_free_rerolls_4", perLevelLabel: "+1 free" },
];

// ---------------------------------------------------------------------------
// Skill helpers
// ---------------------------------------------------------------------------

export function getSkillLevel(skillLevels: SkillLevels, slotId: string): number {
  return skillLevels[slotId] ?? 0;
}

/** Returns the cost to upgrade from `currentLevel` to `currentLevel + 1`. */
export function getSlotCost(slot: SkillSlot, currentLevel: number): number {
  if (currentLevel >= slot.cost.length) return Infinity;
  return slot.cost[currentLevel];
}

/** Max level is simply the length of the cost schedule. */
export function getMaxLevel(slot: SkillSlot): number {
  return slot.cost.length;
}

/** Derives the set of unlocked spell IDs from skill levels. Fireball is always unlocked. */
export function getUnlockedSpellIdsFromSkills(skillLevels: SkillLevels): string[] {
  const set = new Set<string>(["fireball"]);
  for (const slot of SKILL_TREE) {
    if (!slot.requires && (skillLevels[slot.id] ?? 0) > 0) {
      set.add(slot.spellId);
    }
  }
  return [...set];
}

/** Returns summed upgrade levels per group, keyed by spell. */
export function getSpellUpgrades(skillLevels: SkillLevels): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};
  for (const slot of SKILL_TREE) {
    const lvl = skillLevels[slot.id] ?? 0;
    if (lvl > 0 && slot.group) {
      if (!result[slot.spellId]) result[slot.spellId] = {};
      result[slot.spellId][slot.group] = (result[slot.spellId][slot.group] ?? 0) + lvl;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Shop helpers — derived from skill levels
// ---------------------------------------------------------------------------

export function getPlayerMaxHP(skillLevels: SkillLevels): number {
  return BASE_PLAYER_HP + getGroupLevel(skillLevels, "shop_hp") * 5;
}

export function getGoldPerTurn(skillLevels: SkillLevels): number {
  return BASE_GOLD_PER_TURN + getGroupLevel(skillLevels, "shop_gold");
}

export function getHandSize(skillLevels: SkillLevels): number {
  return BASE_HAND_SIZE + getGroupLevel(skillLevels, "shop_hand");
}

export function hasReroll(skillLevels: SkillLevels): boolean {
  return (skillLevels["shop_reroll_unlock"] ?? 0) > 0;
}

export function getFreeRerolls(skillLevels: SkillLevels): number {
  return getGroupLevel(skillLevels, "shop_free_rerolls");
}

/** Build a dynamic spell description reflecting current upgrade levels. */
export function getSpellDescription(spellId: string, skillLevels: SkillLevels): string {
  const up = getSpellUpgrades(skillLevels)[spellId] ?? {};

  switch (spellId) {
    case "fireball": {
      const baseDmg = 2 + (up["fireball_dmg"] ?? 0) * 2;
      const pct = up["fireball_pct"] ?? 0;
      const dmgStr = pct > 0 ? `${baseDmg} + ${pct}% max HP` : `${baseDmg}`;
      return `Deals ${dmgStr} damage.`;
    }
    case "restore": {
      const baseHp = 6 + (up["restore_heal"] ?? 0) * 2;
      const pct = up["restore_pct"] ?? 0;
      const parts = [`+${baseHp} max HP`];
      if (pct > 0) parts.push(`heals ${pct}% of new max HP`);
      return parts.join(", ") + ".";
    }
    case "lightning": {
      const baseDmg = 1 + (up["lightning_dmg"] ?? 0);
      const pct = up["lightning_pct"] ?? 0;
      const dmgStr = pct > 0 ? `${baseDmg} + ${pct}% max HP` : `${baseDmg}`;
      return `Deals ${dmgStr} to all enemies on the target's row and column.`;
    }
    default:
      return "";
  }
}
