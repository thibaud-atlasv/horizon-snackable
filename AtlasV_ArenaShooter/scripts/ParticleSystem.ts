// Arena Vermin — Particle System (Milestone 2)
// Now includes sprite-based impact/crit/splash effects.

import {
  DrawingCommandsBuilder,
  SolidBrush,
  Pen,
  ImageBrush,
} from 'meta/worlds';
import { Color } from 'meta/platform_api';
import type { Particle, ExpandingRing, SpriteEffect } from './Types';
import { SpriteEffectType } from './Types';
import {
  PARTICLE_HIT_COUNT_MIN, PARTICLE_HIT_COUNT_MAX,
  PARTICLE_HIT_SIZE, PARTICLE_HIT_SPEED_MIN, PARTICLE_HIT_SPEED_MAX,
  PARTICLE_HIT_LIFE_MIN, PARTICLE_HIT_LIFE_MAX, PARTICLE_HIT_COLORS,
  PARTICLE_CRIT_COUNT_MIN, PARTICLE_CRIT_COUNT_MAX,
  PARTICLE_CRIT_SIZE, PARTICLE_CRIT_SPEED_MIN, PARTICLE_CRIT_SPEED_MAX,
  PARTICLE_CRIT_RING_COLOR, PARTICLE_CRIT_RING_START, PARTICLE_CRIT_RING_END,
  PARTICLE_CRIT_RING_DUR,
  PARTICLE_DEATH_COUNT_MIN, PARTICLE_DEATH_COUNT_MAX,
  PARTICLE_DEATH_SIZE, PARTICLE_DEATH_SPEED_MIN, PARTICLE_DEATH_SPEED_MAX,
  PARTICLE_DEATH_LIFE_MIN, PARTICLE_DEATH_LIFE_MAX,
} from './Constants';
import { impactTexture, splashTexture, critiqueTexture } from './Assets';

// Pre-built image brushes for sprite effects
const impactBrush = new ImageBrush(impactTexture);
const splashBrush = new ImageBrush(splashTexture);
const critiqueBrush = new ImageBrush(critiqueTexture);

// Sprite effect constants
const SPRITE_EFFECT_IMPACT_DUR = 0.3;
const SPRITE_EFFECT_SPLASH_DUR = 0.4;
const SPRITE_EFFECT_CRIT_DUR = 0.5;
const SPRITE_EFFECT_SIZE = 40;

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(randRange(min, max + 1));
}

function randElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Spawn 4-6 hit sparks at a screen position.
 */
export function spawnHitSparks(particles: Particle[], x: number, y: number): void {
  const count = randInt(PARTICLE_HIT_COUNT_MIN, PARTICLE_HIT_COUNT_MAX);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = randRange(PARTICLE_HIT_SPEED_MIN, PARTICLE_HIT_SPEED_MAX);
    const life = randRange(PARTICLE_HIT_LIFE_MIN, PARTICLE_HIT_LIFE_MAX);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      size: PARTICLE_HIT_SIZE,
      colorHex: randElement(PARTICLE_HIT_COLORS),
    });
  }
}

/**
 * Spawn 8-12 crit sparks + 1 expanding ring.
 */
export function spawnCritSparks(
  particles: Particle[],
  rings: ExpandingRing[],
  x: number,
  y: number
): void {
  const count = randInt(PARTICLE_CRIT_COUNT_MIN, PARTICLE_CRIT_COUNT_MAX);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = randRange(PARTICLE_CRIT_SPEED_MIN, PARTICLE_CRIT_SPEED_MAX);
    const life = randRange(PARTICLE_HIT_LIFE_MIN, PARTICLE_HIT_LIFE_MAX);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      size: PARTICLE_CRIT_SIZE,
      colorHex: randElement(PARTICLE_HIT_COLORS),
    });
  }

  // Expanding ring
  rings.push({
    cx: x,
    cy: y,
    radius: PARTICLE_CRIT_RING_START,
    maxRadius: PARTICLE_CRIT_RING_END,
    age: 0,
    maxAge: PARTICLE_CRIT_RING_DUR,
    colorHex: PARTICLE_CRIT_RING_COLOR,
  });
}

/**
 * Spawn 6-8 death explosion particles.
 */
export function spawnDeathExplosion(
  particles: Particle[],
  x: number,
  y: number,
  colorHex: string
): void {
  const count = randInt(PARTICLE_DEATH_COUNT_MIN, PARTICLE_DEATH_COUNT_MAX);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = randRange(PARTICLE_DEATH_SPEED_MIN, PARTICLE_DEATH_SPEED_MAX);
    const life = randRange(PARTICLE_DEATH_LIFE_MIN, PARTICLE_DEATH_LIFE_MAX);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      size: PARTICLE_DEATH_SIZE,
      colorHex,
    });
  }
}

// === Sprite-based impact effects ===

/** Spawn an impact sprite effect at the given screen position. */
export function spawnImpactEffect(effects: SpriteEffect[], x: number, y: number): void {
  effects.push({
    x, y,
    age: 0,
    maxAge: SPRITE_EFFECT_IMPACT_DUR,
    type: SpriteEffectType.Impact,
    scale: 0.8 + Math.random() * 0.4,
    rotation: Math.random() * 360,
  });
}

/** Spawn a splash sprite effect (for AoE/death). */
export function spawnSplashEffect(effects: SpriteEffect[], x: number, y: number): void {
  effects.push({
    x, y,
    age: 0,
    maxAge: SPRITE_EFFECT_SPLASH_DUR,
    type: SpriteEffectType.Splash,
    scale: 1.0 + Math.random() * 0.3,
    rotation: Math.random() * 360,
  });
}

/** Spawn a critique (crit) sprite effect. */
export function spawnCritiqueEffect(effects: SpriteEffect[], x: number, y: number): void {
  effects.push({
    x, y,
    age: 0,
    maxAge: SPRITE_EFFECT_CRIT_DUR,
    type: SpriteEffectType.Critique,
    scale: 1.2 + Math.random() * 0.3,
    rotation: -15 + Math.random() * 30,
  });
}

/** Update sprite effects, removing expired ones. */
export function updateSpriteEffects(effects: SpriteEffect[], dt: number): void {
  for (let i = effects.length - 1; i >= 0; i--) {
    effects[i].age += dt;
    if (effects[i].age >= effects[i].maxAge) {
      effects.splice(i, 1);
    }
  }
}

/** Draw sprite effects with scale-up and fade-out animation. */
export function drawSpriteEffects(
  builder: DrawingCommandsBuilder,
  effects: SpriteEffect[]
): void {
  for (const e of effects) {
    const t = e.age / e.maxAge; // 0→1 progress
    const alpha = 1 - t; // fade out
    // Scale up slightly over time
    const animScale = e.scale * (0.6 + 0.4 * t);
    const size = SPRITE_EFFECT_SIZE * animScale;

    let brush: ImageBrush;
    switch (e.type) {
      case SpriteEffectType.Critique: brush = critiqueBrush; break;
      case SpriteEffectType.Splash: brush = splashBrush; break;
      default: brush = impactBrush; break;
    }

    builder.pushTranslate({x: e.x, y: e.y});
    builder.pushRotate(e.rotation, {x: 0, y: 0});
    builder.pushScale({x: 1, y: 1}, {x: 0, y: 0});
    // Apply alpha via opacity (use a fading rect approach)
    // DrawingSurface doesn't have per-draw opacity, so we render at full and rely on texture alpha
    builder.drawRect(brush, null, {x: -size / 2, y: -size / 2, width: size, height: size});
    builder.pop(); // scale
    builder.pop(); // rotate
    builder.pop(); // translate
  }
}

/** Draw only non-crit sprite effects (Impact, Splash). */
export function drawSpriteEffectsBase(
  builder: DrawingCommandsBuilder,
  effects: SpriteEffect[]
): void {
  for (const e of effects) {
    if (e.type === SpriteEffectType.Critique) continue;
    const t = e.age / e.maxAge;
    const animScale = e.scale * (0.6 + 0.4 * t);
    const size = SPRITE_EFFECT_SIZE * animScale;
    let brush: ImageBrush;
    switch (e.type) {
      case SpriteEffectType.Splash: brush = splashBrush; break;
      default: brush = impactBrush; break;
    }
    builder.pushTranslate({x: e.x, y: e.y});
    builder.pushRotate(e.rotation, {x: 0, y: 0});
    builder.pushScale({x: 1, y: 1}, {x: 0, y: 0});
    builder.drawRect(brush, null, {x: -size / 2, y: -size / 2, width: size, height: size});
    builder.pop();
    builder.pop();
    builder.pop();
  }
}

/** Draw only Critique sprite effects (rendered on overlay layer). */
export function drawSpriteEffectsCrit(
  builder: DrawingCommandsBuilder,
  effects: SpriteEffect[]
): void {
  for (const e of effects) {
    if (e.type !== SpriteEffectType.Critique) continue;
    const t = e.age / e.maxAge;
    const animScale = e.scale * (0.6 + 0.4 * t);
    const size = SPRITE_EFFECT_SIZE * animScale;
    builder.pushTranslate({x: e.x, y: e.y});
    builder.pushRotate(e.rotation, {x: 0, y: 0});
    builder.pushScale({x: 1, y: 1}, {x: 0, y: 0});
    builder.drawRect(critiqueBrush, null, {x: -size / 2, y: -size / 2, width: size, height: size});
    builder.pop();
    builder.pop();
    builder.pop();
  }
}

/**
 * Update all particles and rings. Frame-rate independent.
 */
export function updateParticles(
  particles: Particle[],
  rings: ExpandingRing[],
  dt: number
): void {
  // Update particles (iterate backwards for safe removal)
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }

  // Update expanding rings
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    r.age += dt;
    const t = r.age / r.maxAge;
    r.radius = r.maxRadius * t + PARTICLE_CRIT_RING_START * (1 - t);
    if (r.age >= r.maxAge) {
      rings.splice(i, 1);
    }
  }
}

/**
 * Draw all particles and rings.
 */
export function drawParticles(
  builder: DrawingCommandsBuilder,
  particles: Particle[],
  rings: ExpandingRing[]
): void {
  // Draw rings
  for (const r of rings) {
    const alpha = 1 - (r.age / r.maxAge);
    const color = Color.fromHex(r.colorHex);
    const brush = new SolidBrush(new Color(color.r, color.g, color.b, alpha));
    const pen = new Pen(brush, 2);
    builder.drawEllipse(null, pen, {x: r.cx, y: r.cy}, {x: r.radius, y: r.radius});
  }

  // Draw particles
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    const color = Color.fromHex(p.colorHex);
    const brush = new SolidBrush(new Color(color.r, color.g, color.b, alpha));
    builder.drawRect(brush, null, {
      x: p.x - p.size / 2,
      y: p.y - p.size / 2,
      width: p.size,
      height: p.size,
    });
  }
}
