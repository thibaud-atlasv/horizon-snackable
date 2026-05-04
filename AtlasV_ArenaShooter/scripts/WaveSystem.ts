// Arena Vermin — Wave System (Milestones 3 & 4)
// Manages wave progression, burst spawning commands, and breather periods.
// M4: Returns typed spawn requests instead of just count+hp.

import type { WaveState } from './Types';
import { EnemyType } from './Types';
import {
  WAVE_DATA, BREATHER_DURATION,
  GRUNT_HP, GUNNER_HP, DRONE_HP, BRUISER_HP, GAS_RAT_HP,
  BOSS_BASE_HP, BOSS_HP_SCALE_PER_WAVE,
  ELITE_HP_MULT, ELITE_FIRST_WAVE, ELITE_GUARANTEED_WAVE,
  ELITE_GUARANTEED_INTERVAL, ELITE_BASE_CHANCE, ELITE_CHANCE_PER_WAVE,
  ELITE_WARNING_DURATION,
} from './Constants';
import type { WaveDataEntry } from './Constants';

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(randRange(min, max + 1));
}

/** A single spawn request with type and HP. */
export interface SpawnRequest {
  type: EnemyType;
  hp: number;
  isElite: boolean;
}

/** Events produced by updateWaveSystem */
export interface WaveEvents {
  /** Array of typed spawn requests for this frame */
  spawnRequests: SpawnRequest[];
  /** Whether a new wave just started */
  waveStarted: boolean;
  /** Whether a wave just ended (timer hit zero) */
  waveEnded: boolean;
  /** Whether the breather just ended (next wave about to begin) */
  breatherEnded: boolean;
  /** Whether an elite warning should be shown */
  hasEliteWarning: boolean;
  /** Whether a boss warning should be shown */
  hasBossWarning: boolean;
}

/** Initialize the wave system state. */
export function initWaveSystem(): WaveState {
  return {
    waveNumber: 0,
    waveTimer: 0,
    waveDuration: 0,
    breatherTimer: 0,
    burstTimer: 0,
    burstCooldown: 0,
    spawnedThisWave: 0,
    isBreather: false,
    isActive: false,
    lastEliteTime: 0,
    eliteWarningTimer: 0,
  };
}

/** Start the wave system (called on game start). */
export function startWaveSystem(wave: WaveState): WaveEvents {
  wave.isActive = true;
  wave.lastEliteTime = 0;
  wave.eliteWarningTimer = 0;
  return beginNextWave(wave);
}

/** Get base HP for an enemy type. */
function getBaseHp(type: EnemyType): number {
  switch (type) {
    case EnemyType.GunnerMouse: return GUNNER_HP;
    case EnemyType.DroneRat: return DRONE_HP;
    case EnemyType.SewerBruiser: return BRUISER_HP;
    case EnemyType.GasRat: return GAS_RAT_HP;
    default: return GRUNT_HP;
  }
}

/**
 * Pick enemy type based on wave number using weighted distribution.
 * Waves 1-3: 100% Grunt Rat
 * Wave 4+: 20% Gunner Mouse
 * Wave 5+: 15% Drone Rat
 * Wave 6+: 10% Sewer Bruiser
 * Wave 7+: 10% Gas Rat
 * Remaining: Grunt Rats
 */
function pickEnemyType(waveNumber: number): EnemyType {
  const roll = Math.random();
  let threshold = 0;

  if (waveNumber >= 7) {
    threshold += 0.10; // Gas Rat
    if (roll < threshold) return EnemyType.GasRat;
  }
  if (waveNumber >= 6) {
    threshold += 0.10; // Sewer Bruiser
    if (roll < threshold) return EnemyType.SewerBruiser;
  }
  if (waveNumber >= 5) {
    threshold += 0.15; // Drone Rat
    if (roll < threshold) return EnemyType.DroneRat;
  }
  if (waveNumber >= 4) {
    threshold += 0.20; // Gunner Mouse
    if (roll < threshold) return EnemyType.GunnerMouse;
  }

  return EnemyType.GruntRat;
}

/** Begin the next wave. */
function beginNextWave(wave: WaveState): WaveEvents {
  wave.waveNumber++;
  const dataIndex = Math.min(wave.waveNumber - 1, WAVE_DATA.length - 1);
  const data = WAVE_DATA[dataIndex];

  wave.waveDuration = data.duration;
  wave.waveTimer = data.duration;
  wave.isBreather = false;
  wave.spawnedThisWave = 0;

  wave.burstCooldown = randRange(0.5, 1.5);
  wave.burstTimer = wave.burstCooldown;

  // DEBUG: Wave 1 spawns 1 of each enemy type immediately + 1 elite grunt rat
  let spawnRequests: SpawnRequest[] = [];
  let hasBoss = false;
  if (wave.waveNumber === 1) {
    const allTypes = [
      EnemyType.GruntRat,
      EnemyType.GunnerMouse,
      EnemyType.DroneRat,
      EnemyType.SewerBruiser,
      EnemyType.GasRat,
    ];
    for (const type of allTypes) {
      const baseHp = getBaseHp(type);
      const scaledHp = Math.floor(baseHp * data.hpScale);
      spawnRequests.push({ type, hp: scaledHp, isElite: false });
    }
    // DEBUG: 1 elite grunt rat for testing
    const eliteGruntHp = Math.floor(GRUNT_HP * data.hpScale * ELITE_HP_MULT);
    spawnRequests.push({ type: EnemyType.GruntRat, hp: eliteGruntHp, isElite: true });
  }

  // Boss spawns every 5 waves
  if (wave.waveNumber % 5 === 0) {
    const bossWaveIndex = Math.floor(wave.waveNumber / 5) - 1;
    const bossHp = Math.floor((BOSS_BASE_HP + bossWaveIndex * BOSS_HP_SCALE_PER_WAVE) * data.hpScale);
    spawnRequests.push({ type: EnemyType.Boss, hp: bossHp, isElite: false });
    hasBoss = true;
  }

  const hasElite = spawnRequests.some(r => r.isElite);
  return {
    spawnRequests,
    waveStarted: true,
    waveEnded: false,
    breatherEnded: false,
    hasEliteWarning: hasElite,
    hasBossWarning: hasBoss,
  };
}

function getWaveData(wave: WaveState): WaveDataEntry {
  const dataIndex = Math.min(wave.waveNumber - 1, WAVE_DATA.length - 1);
  return WAVE_DATA[dataIndex];
}

/** Update the wave system. Returns events and spawn commands. */
export function updateWaveSystem(wave: WaveState, dt: number): WaveEvents {
  const noEvents: WaveEvents = {
    spawnRequests: [],
    waveStarted: false, waveEnded: false, breatherEnded: false,
    hasEliteWarning: false, hasBossWarning: false,
  };

  if (!wave.isActive) return noEvents;

  // Update elite warning timer
  if (wave.eliteWarningTimer > 0) {
    wave.eliteWarningTimer -= dt;
    if (wave.eliteWarningTimer < 0) wave.eliteWarningTimer = 0;
  }

  // Handle breather period
  if (wave.isBreather) {
    wave.breatherTimer -= dt;
    if (wave.breatherTimer <= 0) {
      wave.breatherTimer = 0;
      const events = beginNextWave(wave);
      events.breatherEnded = true;
      return events;
    }
    return noEvents;
  }

  // Wave timer countdown
  wave.waveTimer -= dt;

  if (wave.waveTimer <= 0) {
    wave.waveTimer = 0;
    wave.isBreather = true;
    wave.breatherTimer = BREATHER_DURATION;
    return {
      spawnRequests: [],
      waveStarted: false, waveEnded: true, breatherEnded: false,
      hasEliteWarning: false, hasBossWarning: false,
    };
  }

  // Burst spawning logic
  wave.burstTimer -= dt;
  if (wave.burstTimer <= 0) {
    const data = getWaveData(wave);
    const count = randInt(data.burstMin, data.burstMax);

    const requests: SpawnRequest[] = [];
    let hasElite = false;

    // Check guaranteed elite (wave 15+, every 60s)
    let forceElite = false;
    if (wave.waveNumber >= ELITE_GUARANTEED_WAVE) {
      const waveElapsed = wave.waveDuration - wave.waveTimer;
      if (waveElapsed - wave.lastEliteTime >= ELITE_GUARANTEED_INTERVAL) {
        forceElite = true;
      }
    }

    for (let i = 0; i < count; i++) {
      const type = pickEnemyType(wave.waveNumber);
      const baseHp = getBaseHp(type);
      let scaledHp = Math.floor(baseHp * data.hpScale);
      let isElite = false;

      // Elite chance from wave 5+
      if (wave.waveNumber >= ELITE_FIRST_WAVE) {
        const eliteChance = ELITE_BASE_CHANCE + (wave.waveNumber - ELITE_FIRST_WAVE) * ELITE_CHANCE_PER_WAVE;
        if (forceElite && i === 0) {
          // Force first enemy in burst to be elite
          isElite = true;
          forceElite = false;
        } else if (Math.random() < eliteChance) {
          isElite = true;
        }
      }

      if (isElite) {
        scaledHp = Math.floor(scaledHp * ELITE_HP_MULT);
        hasElite = true;
      }

      requests.push({ type, hp: scaledHp, isElite });
    }

    if (hasElite) {
      const waveElapsed = wave.waveDuration - wave.waveTimer;
      wave.lastEliteTime = waveElapsed;
    }

    wave.burstCooldown = randRange(data.pauseMin, data.pauseMax);
    wave.burstTimer = wave.burstCooldown;
    wave.spawnedThisWave += count;

    // Show elite warning if this batch contains elites
    let showWarning = false;
    if (hasElite && wave.eliteWarningTimer <= 0) {
      wave.eliteWarningTimer = ELITE_WARNING_DURATION;
      showWarning = true;
    }

    return {
      spawnRequests: requests,
      waveStarted: false,
      waveEnded: false,
      breatherEnded: false,
      hasEliteWarning: showWarning,
      hasBossWarning: false,
    };
  }

  return noEvents;
}

/** Check if all 20 waves are complete. */
export function isAllWavesComplete(wave: WaveState): boolean {
  return wave.waveNumber >= 20 && wave.isBreather && wave.breatherTimer <= 0;
}
