// Arena Vermin — Upgrade System (pure logic module)
// Tracks weapon levels and provides upgrade options for level-up selection.

import { DRONE_MAX_LEVEL } from './Constants';
import { WeaponId } from './Types';
import type { UpgradeOption, WeaponLevels } from './Types';

const MAX_LEVELS: Record<number, number> = {
  [WeaponId.Drone]: DRONE_MAX_LEVEL,
  [WeaponId.Minigun]: 5,
  [WeaponId.DamageCircle]: 5,
};

const WEAPON_NAMES: Record<number, string> = {
  [WeaponId.Drone]: 'Orbiting Drone',
  [WeaponId.Minigun]: 'Minigun Arm',
  [WeaponId.DamageCircle]: 'Damage Circle',
};

const DRONE_DESCRIPTIONS: string[] = [
  '1 drone orbits you',
  'Faster rotation, +damage',
  '2 drones!',
  'Even faster, +damage',
  '3 drones! Max power',
];

const MINIGUN_DESCRIPTIONS: string[] = [
  'Auto-fire bullets forward',
  'Faster fire rate',
  'Double bullets',
  'Piercing shots',
  'Triple bullets!',
];

const CIRCLE_DESCRIPTIONS: string[] = [
  'Damage pulse around you',
  'Larger radius',
  'Faster pulse rate',
  'Stronger damage',
  'Maximum radius & damage',
];

const DESCRIPTIONS: Record<number, string[]> = {
  [WeaponId.Drone]: DRONE_DESCRIPTIONS,
  [WeaponId.Minigun]: MINIGUN_DESCRIPTIONS,
  [WeaponId.DamageCircle]: CIRCLE_DESCRIPTIONS,
};

export class UpgradeSystem {
  private weaponLevels: WeaponLevels = new Map();

  constructor() {
    this.reset();
  }

  reset(): void {
    this.weaponLevels = new Map();
    // All weapons start at level 0 (not unlocked)
    this.weaponLevels.set(WeaponId.Drone, 0);
    this.weaponLevels.set(WeaponId.Minigun, 0);
    this.weaponLevels.set(WeaponId.DamageCircle, 0);
  }

  getWeaponLevel(weaponId: WeaponId): number {
    return this.weaponLevels.get(weaponId) ?? 0;
  }

  /** Get available upgrades: all weapons below max level, shuffled, pick up to 3 */
  getAvailableUpgrades(): UpgradeOption[] {
    const available: UpgradeOption[] = [];

    for (const [id, level] of this.weaponLevels) {
      const maxLvl = MAX_LEVELS[id] ?? 5;
      if (level < maxLvl) {
        const descs = DESCRIPTIONS[id] ?? [];
        available.push({
          weaponId: id as WeaponId,
          currentLevel: level,
          nextLevel: level + 1,
          name: WEAPON_NAMES[id] ?? 'Unknown',
          description: descs[level] ?? 'Upgrade',
        });
      }
    }

    // Shuffle (Fisher-Yates)
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = available[i];
      available[i] = available[j];
      available[j] = tmp;
    }

    // Return at most 3 options
    return available.slice(0, 3);
  }

  applyUpgrade(weaponId: WeaponId): number {
    const current = this.weaponLevels.get(weaponId) ?? 0;
    const maxLvl = MAX_LEVELS[weaponId] ?? 5;
    const newLevel = Math.min(current + 1, maxLvl);
    this.weaponLevels.set(weaponId, newLevel);
    return newLevel;
  }
}
