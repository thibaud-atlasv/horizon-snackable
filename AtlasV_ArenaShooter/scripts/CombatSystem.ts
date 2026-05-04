// Arena Vermin — Combat System (Milestone 2)
// This module handles combat logic and returns results that the main
// component uses to spawn effects (no direct ParticleSystem/FloatingText imports).
import type {
  HeroState, EnemyState, AttackSwingState,
} from './Types';
import { BodyVariant, EnemyType } from './Types';
import {
  ATTACK_RANGE, ATTACK_SPEED, ATTACK_DAMAGE,
  CRIT_CHANCE, CRIT_MULT,
  GRUNT_CONTACT_TICK,
  HIT_PAUSE_DUR, HURT_FLASH_DUR, RECOIL_DIST, RECOIL_OUT_DUR, RECOIL_BACK_DUR,
  HURT_SQUASH_DUR, HURT_SQUASH_SETTLE,
  BRUISER_FRONTAL_ARMOR,
  HERO_CONTACT_RANGE,
} from './Constants';

/**
 * Find the nearest alive enemy within attack range.
 */
export function findTarget(
  hero: HeroState,
  enemies: EnemyState[],
  attackRange: number
): EnemyState | null {
  let best: EnemyState | null = null;
  let bestDist = Infinity;

  for (const enemy of enemies) {
    if (enemy.isDead || enemy.isSpawning) continue;
    const dx = enemy.x - hero.x;
    const dy = enemy.y - hero.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > attackRange) continue;

    if (dist < bestDist || (dist === bestDist && best && enemy.hp < best.hp)) {
      best = enemy;
      bestDist = dist;
    }
  }
  return best;
}

export interface AutoAttackState {
  cooldown: number;
  currentTarget: EnemyState | null;
  targetEvalTimer: number;
}

export interface AttackResult {
  hit: boolean;
  target: EnemyState | null;
  damage: number;
  isCrit: boolean;
  killed: boolean;
  hitPause: number;
}

/**
 * Update auto-attack logic. Returns result describing what happened.
 */
export function autoAttackUpdate(
  state: AutoAttackState,
  hero: HeroState,
  enemies: EnemyState[],
  swingState: AttackSwingState,
  dt: number
): AttackResult {
  const noHit: AttackResult = { hit: false, target: null, damage: 0, isCrit: false, killed: false, hitPause: 0 };

  // Decrement cooldown
  state.cooldown -= dt;

  // Re-evaluate target periodically
  state.targetEvalTimer -= dt;
  if (state.targetEvalTimer <= 0) {
    state.targetEvalTimer = 0.25;
    state.currentTarget = findTarget(hero, enemies, ATTACK_RANGE);
  }

  // If target died or is spawning, re-acquire
  if (state.currentTarget && (state.currentTarget.isDead || state.currentTarget.isSpawning)) {
    state.currentTarget = findTarget(hero, enemies, ATTACK_RANGE);
  }

  // Attempt attack
  if (state.cooldown <= 0 && state.currentTarget) {
    state.cooldown = 1 / ATTACK_SPEED;

    const isCrit = Math.random() < CRIT_CHANCE;
    let damage = isCrit ? Math.floor(ATTACK_DAMAGE * CRIT_MULT) : ATTACK_DAMAGE;

    const target = state.currentTarget;

    // Sewer Bruiser frontal armor: if hero attacks from the front (~90° of facing),
    // reduce damage by 50%. The bruiser faces toward the hero, so "front" means
    // the hero is roughly in the direction the bruiser is facing.
    if (target.enemyType === EnemyType.SewerBruiser) {
      // Hero-to-enemy direction
      const hdx = target.x - hero.x;
      const hdy = target.y - hero.y;
      const hDist = Math.sqrt(hdx * hdx + hdy * hdy);
      if (hDist > 0.01) {
        // Enemy facing direction (toward hero)
        const facingX = hdx / hDist; // bruiser faces the hero
        // Dot product of hero-to-enemy direction and enemy facing
        // If dot > 0 (within ~90°), hero is attacking from front
        const attackDirX = hdx / hDist;
        // Since bruiser faces toward hero, dot(attack_dir, facing) is always ~1
        // Actually: the "front" is where the bruiser faces. The bruiser faces the hero.
        // So if the hero is in front of the bruiser, that means hero→enemy aligns with enemy's facing.
        // The enemy's facing is toward the hero, so the hero is ALWAYS in front. That can't be right.
        // Correct interpretation: the bruiser has an armor FACING (the direction it moves/looks).
        // Use the bruiser's actual velocity direction or last movement direction as its facing.
        // Simplification: use enemy.facing (left/right) as the armor direction.
        const armorDirX = target.facing; // 1=right, -1=left
        // Hero is "in front" if the hero is on the side the bruiser faces
        const heroSide = hdx > 0 ? 1 : -1; // Which side is the hero relative to bruiser?
        // Actually hdx is target.x - hero.x, so if hdx > 0, target is to the right of hero,
        // meaning hero is to the LEFT of target. Hero side relative to enemy = -hdx direction.
        const heroRelativeX = -hdx; // direction from enemy to hero in X
        const frontal = (heroRelativeX > 0 && armorDirX > 0) || (heroRelativeX < 0 && armorDirX < 0);
        if (frontal) {
          damage = Math.floor(damage * BRUISER_FRONTAL_ARMOR);
        }
      }
    }

    target.hp -= damage;

    // Update facing toward target
    const dx = target.x - hero.x;
    if (Math.abs(dx) > 0.1) {
      hero.facing = dx > 0 ? 1 : -1;
    }

    // Trigger swing
    triggerAttackSwing(swingState);

    // Set hurt feedback
    target.hurtTimer = RECOIL_OUT_DUR + RECOIL_BACK_DUR;
    target.flashTimer = HURT_FLASH_DUR;
    target.hurtOffsetX = dx > 0 ? RECOIL_DIST : -RECOIL_DIST;
    target.hurtSquashTimer = HURT_SQUASH_DUR + HURT_SQUASH_SETTLE;
    target.bodyVariant = BodyVariant.HURT;

    let killed = false;
    if (target.hp <= 0) {
      target.hp = 0;
      target.isDead = true;
      target.deathTimer = 0;
      target.deathOpacity = 1;
      target.bodyVariant = BodyVariant.DEAD;
      killed = true;
    }

    return { hit: true, target, damage, isCrit, killed, hitPause: HIT_PAUSE_DUR };
  }

  return noHit;
}

/**
 * Trigger the 3-phase attack swing animation.
 */
export function triggerAttackSwing(swingState: AttackSwingState): void {
  swingState.active = true;
  swingState.phase = 0;
  swingState.timer = 0;
  swingState.weaponRotDeg = 0;
  swingState.bodyScaleX = 1;
  swingState.bodyScaleY = 1;
}

/**
 * Apply contact damage from enemies touching the hero.
 * Returns total damage dealt.
 */
export function applyContactDamage(
  hero: HeroState,
  enemies: EnemyState[],
  dt: number,
  currentTime: number
): number {
  let totalDamage = 0;
  const contactRange = HERO_CONTACT_RANGE;

  for (const enemy of enemies) {
    if (enemy.isDead || enemy.isSpawning) continue;

    const dx = enemy.x - hero.x;
    const dy = enemy.y - hero.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < contactRange) {
      if (currentTime - enemy.lastContactTime >= enemy.contactTickInterval) {
        enemy.lastContactTime = currentTime;
        totalDamage += enemy.contactDmg;
      }
    }
  }

  return totalDamage;
}
