// Arena Vermin — Animation System (Milestone 2)
import type { EnemyState, AttackSwingState, CameraShakeState } from './Types';
import {
  ANTIC_DUR, ANTIC_ROT, STRIKE_DUR, STRIKE_ROT, SETTLE_DUR,
  SWING_BODY_SCALE_X, SWING_BODY_SCALE_Y,
  SPAWN_FALL_DUR, SPAWN_SQUASH_DUR, SPAWN_STRETCH_DUR, SPAWN_SETTLE_DUR,
  SPAWN_Y_OFFSET, SPAWN_TOTAL_DUR,
  DEATH_FALL_DUR, DEATH_BOUNCE_DUR, DEATH_FADE_START, DEATH_FADE_END,
  RECOIL_DIST, RECOIL_OUT_DUR, RECOIL_BACK_DUR,
  SHAKE_MAGNITUDE, SHAKE_DURATION, SHAKE_FREQUENCY,
  HURT_SQUASH_SCALE_X, HURT_SQUASH_SCALE_Y, HURT_SQUASH_DUR, HURT_SQUASH_SETTLE,
} from './Constants';

// === Easing Functions ===

export function easeInCubic(t: number): number {
  return t * t * t;
}

export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function easeOutCubic(t: number): number {
  const t1 = t - 1;
  return t1 * t1 * t1 + 1;
}

export function easeInQuad(t: number): number {
  return t * t;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

// === Attack Swing ===

export interface SwingOutput {
  weaponRotDeg: number;
  bodyScaleX: number;
  bodyScaleY: number;
}

/**
 * Update 3-phase attack swing: antic → strike → settle.
 */
export function updateAttackSwing(swing: AttackSwingState, dt: number): SwingOutput {
  if (!swing.active) {
    return { weaponRotDeg: 0, bodyScaleX: 1, bodyScaleY: 1 };
  }

  swing.timer += dt;

  if (swing.phase === 0) {
    // Anticipation phase
    const t = clamp01(swing.timer / ANTIC_DUR);
    swing.weaponRotDeg = lerp(0, ANTIC_ROT, easeInCubic(t));
    swing.bodyScaleX = lerp(1, SWING_BODY_SCALE_X, t);
    swing.bodyScaleY = lerp(1, SWING_BODY_SCALE_Y, t);
    if (swing.timer >= ANTIC_DUR) {
      swing.phase = 1;
      swing.timer = 0;
    }
  } else if (swing.phase === 1) {
    // Strike phase
    const t = clamp01(swing.timer / STRIKE_DUR);
    swing.weaponRotDeg = lerp(ANTIC_ROT, STRIKE_ROT, easeOutExpo(t));
    swing.bodyScaleX = SWING_BODY_SCALE_X;
    swing.bodyScaleY = SWING_BODY_SCALE_Y;
    if (swing.timer >= STRIKE_DUR) {
      swing.phase = 2;
      swing.timer = 0;
    }
  } else {
    // Settle phase
    const t = clamp01(swing.timer / SETTLE_DUR);
    swing.weaponRotDeg = lerp(STRIKE_ROT, 0, easeOutCubic(t));
    swing.bodyScaleX = lerp(SWING_BODY_SCALE_X, 1, easeOutCubic(t));
    swing.bodyScaleY = lerp(SWING_BODY_SCALE_Y, 1, easeOutCubic(t));
    if (swing.timer >= SETTLE_DUR) {
      swing.active = false;
      swing.weaponRotDeg = 0;
      swing.bodyScaleX = 1;
      swing.bodyScaleY = 1;
    }
  }

  return {
    weaponRotDeg: swing.weaponRotDeg,
    bodyScaleX: swing.bodyScaleX,
    bodyScaleY: swing.bodyScaleY,
  };
}

// === Spawn Transform ===

export interface SpawnTransform {
  offsetY: number;
  opacity: number;
  scaleX: number;
  scaleY: number;
}

/**
 * Get spawn drop-in transform based on enemy's spawnTimer.
 */
export function getSpawnTransform(enemy: EnemyState): SpawnTransform {
  const timer = enemy.spawnTimer;

  if (timer < SPAWN_FALL_DUR) {
    // Falling from above
    const t = timer / SPAWN_FALL_DUR;
    const eased = easeInQuad(t);
    return {
      offsetY: SPAWN_Y_OFFSET * (1 - eased),
      opacity: t,
      scaleX: 1,
      scaleY: 1,
    };
  }

  const afterFall = timer - SPAWN_FALL_DUR;
  if (afterFall < SPAWN_SQUASH_DUR) {
    // Squash on landing
    const t = afterFall / SPAWN_SQUASH_DUR;
    return {
      offsetY: 0,
      opacity: 1,
      scaleX: lerp(1, 1.3, t),
      scaleY: lerp(1, 0.7, t),
    };
  }

  const afterSquash = afterFall - SPAWN_SQUASH_DUR;
  if (afterSquash < SPAWN_STRETCH_DUR) {
    // Stretch recovery
    const t = afterSquash / SPAWN_STRETCH_DUR;
    return {
      offsetY: 0,
      opacity: 1,
      scaleX: lerp(1.3, 0.9, t),
      scaleY: lerp(0.7, 1.1, t),
    };
  }

  const afterStretch = afterSquash - SPAWN_STRETCH_DUR;
  if (afterStretch < SPAWN_SETTLE_DUR) {
    // Settle to normal
    const t = afterStretch / SPAWN_SETTLE_DUR;
    return {
      offsetY: 0,
      opacity: 1,
      scaleX: lerp(0.9, 1, easeOutCubic(t)),
      scaleY: lerp(1.1, 1, easeOutCubic(t)),
    };
  }

  // Done
  return { offsetY: 0, opacity: 1, scaleX: 1, scaleY: 1 };
}

// === Death Transform ===

export interface DeathTransform {
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
}

/**
 * Get death animation transform.
 */
export function getDeathTransform(enemy: EnemyState): DeathTransform {
  const timer = enemy.deathTimer;

  // Rotation: fall to the side over DEATH_FALL_DUR
  let rotation = 0;
  if (timer < DEATH_FALL_DUR) {
    const t = timer / DEATH_FALL_DUR;
    rotation = easeInCubic(t) * 90 * enemy.facing;
  } else if (timer < DEATH_FALL_DUR + DEATH_BOUNCE_DUR) {
    // Small bounce back
    const t = (timer - DEATH_FALL_DUR) / DEATH_BOUNCE_DUR;
    rotation = (90 - 5 * (1 - t)) * enemy.facing;
  } else {
    rotation = 90 * enemy.facing;
  }

  // Scale: slight squash on impact
  let scaleX = 1;
  let scaleY = 1;
  if (timer >= DEATH_FALL_DUR && timer < DEATH_FALL_DUR + DEATH_BOUNCE_DUR) {
    const t = (timer - DEATH_FALL_DUR) / DEATH_BOUNCE_DUR;
    scaleX = lerp(1.1, 1, t);
    scaleY = lerp(0.9, 1, t);
  }

  // Opacity: fade out
  let opacity = 1;
  if (timer >= DEATH_FADE_START) {
    const fadeT = clamp01((timer - DEATH_FADE_START) / (DEATH_FADE_END - DEATH_FADE_START));
    opacity = 1 - fadeT;
  }

  return { rotation, scaleX, scaleY, opacity };
}

// === Hurt Transform ===

export interface HurtTransform {
  offsetX: number;
  scaleX: number;
  scaleY: number;
  flashActive: boolean;
}

/**
 * Get hurt recoil + squash transform.
 */
export function getHurtTransform(enemy: EnemyState): HurtTransform {
  if (enemy.hurtTimer <= 0) {
    return { offsetX: 0, scaleX: 1, scaleY: 1, flashActive: false };
  }

  const totalRecoilDur = RECOIL_OUT_DUR + RECOIL_BACK_DUR;
  const elapsed = totalRecoilDur - enemy.hurtTimer;

  let offsetX = 0;
  if (elapsed < RECOIL_OUT_DUR) {
    // Moving out
    const t = elapsed / RECOIL_OUT_DUR;
    offsetX = enemy.hurtOffsetX * easeOutExpo(t);
  } else {
    // Coming back
    const t = (elapsed - RECOIL_OUT_DUR) / RECOIL_BACK_DUR;
    offsetX = enemy.hurtOffsetX * (1 - easeOutCubic(t));
  }

  // Squash transform based on hurtSquashTimer
  let scaleX = 1;
  let scaleY = 1;
  const squashElapsed = enemy.hurtSquashTimer;
  if (squashElapsed > 0) {
    const totalSquashDur = HURT_SQUASH_DUR + HURT_SQUASH_SETTLE;
    const squashT = totalSquashDur - squashElapsed;
    if (squashT < HURT_SQUASH_DUR) {
      // Squash phase: expand X, compress Y
      const t = squashT / HURT_SQUASH_DUR;
      scaleX = lerp(1, HURT_SQUASH_SCALE_X, t);
      scaleY = lerp(1, HURT_SQUASH_SCALE_Y, t);
    } else {
      // Settle phase: ease back to 1.0
      const t = (squashT - HURT_SQUASH_DUR) / HURT_SQUASH_SETTLE;
      scaleX = lerp(HURT_SQUASH_SCALE_X, 1, easeOutCubic(t));
      scaleY = lerp(HURT_SQUASH_SCALE_Y, 1, easeOutCubic(t));
    }
  }

  return { offsetX, scaleX, scaleY, flashActive: enemy.flashTimer > 0 };
}

// === Camera Shake ===

/**
 * Trigger camera shake.
 */
export function triggerCameraShake(shake: CameraShakeState): void {
  shake.active = true;
  shake.timer = 0;
  shake.magnitude = SHAKE_MAGNITUDE;
  shake.frequency = SHAKE_FREQUENCY;
}

/**
 * Update camera shake. Returns offset to apply.
 */
export function updateCameraShake(
  shake: CameraShakeState,
  dt: number
): { offsetX: number; offsetY: number } {
  if (!shake.active) {
    shake.offsetX = 0;
    shake.offsetY = 0;
    return { offsetX: 0, offsetY: 0 };
  }

  shake.timer += dt;
  if (shake.timer >= SHAKE_DURATION) {
    shake.active = false;
    shake.offsetX = 0;
    shake.offsetY = 0;
    return { offsetX: 0, offsetY: 0 };
  }

  // Decay intensity
  const decay = 1 - (shake.timer / SHAKE_DURATION);
  const phase = shake.timer * shake.frequency * Math.PI * 2;
  const mag = shake.magnitude * decay;

  shake.offsetX = Math.sin(phase) * mag;
  shake.offsetY = Math.cos(phase * 1.3) * mag;

  return { offsetX: shake.offsetX, offsetY: shake.offsetY };
}
