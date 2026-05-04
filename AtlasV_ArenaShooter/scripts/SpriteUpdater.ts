// Arena Vermin — Sprite Updater (Milestones 2-4)
// Computes screen-space transforms for hero and enemy XAML sprites.

import { TextureAsset } from 'meta/worlds';
import type { ArenaVerminViewModel } from './ArenaVerminViewModel';
import { ENEMY_POOL_SIZE } from './ArenaVerminViewModel';
import {
  heroBodyTexture, heroSwordTexture,
  gruntRatIdleTexture, gruntRatBonesTexture,
  gunnerMouseIdleTexture, gunnerMouseMinigunTexture, droneRatIdleTexture,
  sewerBruiserIdleTexture, gasRatIdleTexture,
  droneRatWeaponTexture, bruiserWeaponTexture, gasRatWeaponTexture,
  ratKingBossTexture,
} from './Assets';
import {
  CANVAS_W, CANVAS_H,
  HERO_BODY_W, HERO_BODY_H, HERO_SWORD_W, HERO_SWORD_H,
  HERO_HAND_OFFSET_X, HERO_HAND_OFFSET_Y,
  IDLE_BOB_PERIOD, IDLE_BOB_AMP_Y,
  WALK_BOB_PERIOD, WALK_BOB_AMP_Y, WALK_BOB_AMP_X,
  WEAPON_SWAY_PERIOD, WEAPON_SWAY_AMP_DEG,
  GRUNT_BODY_W, GRUNT_BODY_H,
  GUNNER_BODY_W, GUNNER_BODY_H,
  GUNNER_WEAPON_W, GUNNER_WEAPON_H, GUNNER_HAND_OFFSET_X, GUNNER_HAND_OFFSET_Y,
  DRONE_WEAPON_W, DRONE_WEAPON_H, DRONE_HAND_OFFSET_X, DRONE_HAND_OFFSET_Y,
  BRUISER_WEAPON_W, BRUISER_WEAPON_H, BRUISER_HAND_OFFSET_X, BRUISER_HAND_OFFSET_Y,
  GAS_RAT_WEAPON_W, GAS_RAT_WEAPON_H, GAS_RAT_HAND_OFFSET_X, GAS_RAT_HAND_OFFSET_Y,
  DRONE_BODY_W, DRONE_BODY_H,
  BRUISER_BODY_W, BRUISER_BODY_H,
  GAS_RAT_BODY_W, GAS_RAT_BODY_H,
  BOSS_BODY_W, BOSS_BODY_H,
  DEATH_FALL_DUR, DEATH_BOUNCE_DUR, DEATH_FADE_START, DEATH_FADE_END, DEATH_WEAPON_FADE_DUR,
  WORLD_W, WORLD_H,
  ELITE_SCALE,
  ELITE_GLOW_PULSE_PERIOD, ELITE_GLOW_ALPHA_MIN, ELITE_GLOW_ALPHA_MAX,
  ELITE_GLOW_SIZE_MULT, ELITE_GLOW_COLORS,
} from './Constants';
import { EnemyType } from './Types';
import type {
  HeroState, CameraState, EnemyState,
  AttackSwingState, CameraShakeState,
} from './Types';
import { worldToScreen, wrapRelative } from './IsoRenderer';
import { getSpawnTransform, getDeathTransform, getHurtTransform } from './AnimationSystem';

/** Get body dimensions for enemy type. */
export function getEnemyDims(type: EnemyType): { w: number; h: number } {
  switch (type) {
    case EnemyType.GunnerMouse: return { w: GUNNER_BODY_W, h: GUNNER_BODY_H };
    case EnemyType.DroneRat: return { w: DRONE_BODY_W, h: DRONE_BODY_H };
    case EnemyType.SewerBruiser: return { w: BRUISER_BODY_W, h: BRUISER_BODY_H };
    case EnemyType.GasRat: return { w: GAS_RAT_BODY_W, h: GAS_RAT_BODY_H };
    case EnemyType.Boss: return { w: BOSS_BODY_W, h: BOSS_BODY_H };
    default: return { w: GRUNT_BODY_W, h: GRUNT_BODY_H };
  }
}

/** Get idle texture for enemy type. */
function getEnemyTexture(type: EnemyType): TextureAsset {
  switch (type) {
    case EnemyType.GunnerMouse: return gunnerMouseIdleTexture;
    case EnemyType.DroneRat: return droneRatIdleTexture;
    case EnemyType.SewerBruiser: return sewerBruiserIdleTexture;
    case EnemyType.GasRat: return gasRatIdleTexture;
    case EnemyType.Boss: return ratKingBossTexture;
    default: return gruntRatIdleTexture;
  }
}

/** Update hero body, weapon, and flash sprite properties on the ViewModel. */
export function updateHeroSprites(
  vm: ArenaVerminViewModel,
  hero: HeroState,
  camera: CameraState,
  attackSwing: AttackSwingState,
  heroHurtFlashTimer: number,
  cameraShake: CameraShakeState,
  heroDying: boolean = false,
  heroDeathTimer: number = 0,
): void {
  const { sx, sy } = worldToScreen(hero.x, hero.y);
  const screenX = sx - camera.offsetX + CANVAS_W / 2;
  const screenY = sy - camera.offsetY + CANVAS_H / 2;
  const shakeX = cameraShake.offsetX;
  const shakeY = cameraShake.offsetY;

  const t = hero.animTime;
  let bobX = 0;
  let bobY = 0;

  if (hero.isMoving) {
    const walkPhase = t * (2 * Math.PI / WALK_BOB_PERIOD);
    bobY = -WALK_BOB_AMP_Y * Math.abs(Math.sin(walkPhase));
    bobX = WALK_BOB_AMP_X * Math.sin(walkPhase);
  } else {
    const idlePhase = t * (2 * Math.PI / IDLE_BOB_PERIOD);
    bobY = -IDLE_BOB_AMP_Y * Math.sin(idlePhase);
  }

  const swayPhase = t * (2 * Math.PI / WEAPON_SWAY_PERIOD) + Math.PI / 2;
  let weaponRotDeg = WEAPON_SWAY_AMP_DEG * Math.sin(swayPhase);
  let bodyScaleX = 1;
  let bodyScaleY = 1;

  if (attackSwing.active) {
    weaponRotDeg += attackSwing.weaponRotDeg;
    bodyScaleX = attackSwing.bodyScaleX;
    bodyScaleY = attackSwing.bodyScaleY;
  }

  let heroBodyRotation = 0;
  let heroBodyOpacity = 1;
  let heroWeaponOpacity = 1;

  if (heroDying) {
    const dt = heroDeathTimer;
    if (dt < DEATH_FALL_DUR) {
      const u = dt / DEATH_FALL_DUR;
      heroBodyRotation = 90 * u * u * u;
    } else if (dt < DEATH_FADE_START) {
      heroBodyRotation = 90;
      const u = (dt - DEATH_FALL_DUR) / DEATH_BOUNCE_DUR;
      bodyScaleY = 0.6 + 0.2 * Math.min(u, 1);
      bodyScaleX = 1.4 - 0.3 * Math.min(u, 1);
    } else {
      heroBodyRotation = 90;
      bodyScaleY = 0.8; bodyScaleX = 1.1;
      const fadeU = (dt - DEATH_FADE_START) / (DEATH_FADE_END - DEATH_FADE_START);
      heroBodyOpacity = Math.max(0, 1 - fadeU);
    }
    heroWeaponOpacity = Math.max(0, 1 - dt / DEATH_WEAPON_FADE_DUR);
    bobX = 0; bobY = 0;
  }

  const heroBodyLeft = screenX + bobX + shakeX - HERO_BODY_W / 2;
  const heroBodyTop = screenY + bobY + shakeY - HERO_BODY_H;

  vm.heroBodyVisible = true;
  vm.heroBodyX = heroBodyLeft; vm.heroBodyY = heroBodyTop;
  vm.heroBodyW = HERO_BODY_W; vm.heroBodyH = HERO_BODY_H;
  vm.heroBodyScaleX = hero.facing * bodyScaleX; vm.heroBodyScaleY = bodyScaleY;
  vm.heroBodyRotation = heroBodyRotation; vm.heroBodyOpacity = heroBodyOpacity;
  vm.heroBodyTexture = heroBodyTexture;

  const weaponAnchorX = screenX + bobX + HERO_HAND_OFFSET_X * hero.facing + shakeX;
  const weaponAnchorY = screenY + bobY + HERO_HAND_OFFSET_Y + shakeY;
  vm.heroWeaponVisible = true;
  vm.heroWeaponX = weaponAnchorX - HERO_SWORD_W / 2;
  vm.heroWeaponY = weaponAnchorY - HERO_SWORD_H / 2;
  vm.heroWeaponW = HERO_SWORD_W; vm.heroWeaponH = HERO_SWORD_H;
  vm.heroWeaponScaleX = hero.facing; vm.heroWeaponScaleY = 1;
  vm.heroWeaponRotation = weaponRotDeg; vm.heroWeaponOpacity = heroWeaponOpacity;
  vm.heroWeaponTexture = heroSwordTexture;

  if (heroHurtFlashTimer > 0) {
    vm.heroFlashVisible = true;
    vm.heroFlashX = heroBodyLeft; vm.heroFlashY = heroBodyTop;
    vm.heroFlashW = HERO_BODY_W; vm.heroFlashH = HERO_BODY_H;
    vm.heroFlashScaleX = hero.facing * bodyScaleX; vm.heroFlashScaleY = bodyScaleY;
    vm.heroFlashOpacity = 1; vm.heroFlashTexture = heroBodyTexture;
  } else {
    vm.heroFlashVisible = false; vm.heroFlashOpacity = 0;
  }
}

/** Update enemy pool slot properties on the ViewModel. */
export function updateEnemySprites(
  vm: ArenaVerminViewModel,
  enemies: EnemyState[],
  camera: CameraState,
  cameraShake: CameraShakeState,
  heroX: number,
  heroY: number,
  gameTime: number = 0,
): void {
  const shakeX = cameraShake.offsetX;
  const shakeY = cameraShake.offsetY;
  const screenCenterX = CANVAS_W / 2;
  const screenCenterY = CANVAS_H / 2;

  const sorted: { enemy: EnemyState; screenY: number }[] = [];
  for (const enemy of enemies) {
    const wrappedX = wrapRelative(enemy.x, heroX, WORLD_W);
    const wrappedY = wrapRelative(enemy.y, heroY, WORLD_H);
    const { sy } = worldToScreen(wrappedX, wrappedY);
    sorted.push({ enemy, screenY: sy - camera.offsetY + screenCenterY });
  }
  sorted.sort((a, b) => a.screenY - b.screenY);

  const count = Math.min(sorted.length, ENEMY_POOL_SIZE);
  for (let i = 0; i < ENEMY_POOL_SIZE; i++) {
    if (i < count) {
      const { enemy } = sorted[i];
      setEnemySlot(vm, i, enemy, camera, shakeX, shakeY, screenCenterX, screenCenterY, heroX, heroY);
    } else {
      hideEnemySlot(vm, i);
    }
  }

  // Populate elite glow slots (up to 5)
  const GLOW_SLOTS = 5;
  let glowIdx = 0;
  for (let i = 0; i < count && glowIdx < GLOW_SLOTS; i++) {
    const enemy = sorted[i].enemy;
    if (!enemy.isElite || enemy.isDead || enemy.isSpawning) continue;

    const wrappedX = wrapRelative(enemy.x, heroX, WORLD_W);
    const wrappedY = wrapRelative(enemy.y, heroY, WORLD_H);
    const { sx, sy } = worldToScreen(wrappedX, wrappedY);
    const screenX = sx - camera.offsetX + screenCenterX + shakeX;
    const screenY = sy - camera.offsetY + screenCenterY + shakeY;

    const dims = getEnemyDims(enemy.enemyType);
    const scaledW = dims.w * ELITE_SCALE;
    const scaledH = dims.h * ELITE_SCALE;

    // Glow is ELITE_GLOW_SIZE_MULT × the elite sprite size
    const glowW = scaledW * ELITE_GLOW_SIZE_MULT;
    const glowH = scaledH * ELITE_GLOW_SIZE_MULT;

    // Center glow on the enemy body center (foot pos offset up by half body)
    const glowCx = screenX;
    const glowCy = screenY - scaledH / 2;
    const glowLeft = glowCx - glowW / 2;
    const glowTop = glowCy - glowH / 2;

    // Pulse alpha
    const pulse = 0.5 + 0.5 * Math.sin(gameTime * 2 * Math.PI / ELITE_GLOW_PULSE_PERIOD);
    const alpha = ELITE_GLOW_ALPHA_MIN + (ELITE_GLOW_ALPHA_MAX - ELITE_GLOW_ALPHA_MIN) * pulse;

    const colorHex = ELITE_GLOW_COLORS[enemy.enemyType] || ELITE_GLOW_COLORS[0];

    setGlowSlot(vm, glowIdx, true, glowLeft, glowTop, glowW, glowH, alpha, colorHex);
    glowIdx++;
  }
  // Hide unused glow slots
  for (let i = glowIdx; i < GLOW_SLOTS; i++) {
    setGlowSlot(vm, i, false, 0, 0, 64, 64, 0, '#000000');
  }
}

function setEnemySlot(
  vm: ArenaVerminViewModel, slot: number, enemy: EnemyState,
  camera: CameraState, shakeX: number, shakeY: number,
  screenCenterX: number, screenCenterY: number, heroX: number, heroY: number,
): void {
  const wrappedX = wrapRelative(enemy.x, heroX, WORLD_W);
  const wrappedY = wrapRelative(enemy.y, heroY, WORLD_H);
  const { sx, sy } = worldToScreen(wrappedX, wrappedY);
  const screenX = sx - camera.offsetX + screenCenterX;
  const screenY = sy - camera.offsetY + screenCenterY;

  // Determine texture based on type and state
  let texture: TextureAsset;
  if (enemy.isDead && enemy.deathTimer >= DEATH_FALL_DUR) {
    texture = gruntRatBonesTexture; // generic bones for all types
  } else {
    texture = getEnemyTexture(enemy.enemyType);
  }

  const dims = getEnemyDims(enemy.enemyType);
  // Elite enemies are 1.3× larger
  const drawW = enemy.isElite ? dims.w * ELITE_SCALE : dims.w;
  const drawH = enemy.isElite ? dims.h * ELITE_SCALE : dims.h;
  let offsetY = 0; let opacity = 1; let scaleX = 1; let scaleY = 1;
  let rotation = 0; let hurtOffX = 0;

  if (enemy.isSpawning) {
    const spawnT = getSpawnTransform(enemy);
    offsetY = spawnT.offsetY; opacity = spawnT.opacity;
    scaleX = spawnT.scaleX; scaleY = spawnT.scaleY;
  }
  if (enemy.isDead) {
    const deathT = getDeathTransform(enemy);
    rotation = deathT.rotation; scaleX *= deathT.scaleX; scaleY *= deathT.scaleY;
    opacity = deathT.opacity;
    if (enemy.deathTimer >= DEATH_FALL_DUR) rotation = 0;
  }
  if (enemy.hurtTimer > 0 && !enemy.isDead) {
    const hurtT = getHurtTransform(enemy);
    hurtOffX = hurtT.offsetX; scaleX *= hurtT.scaleX; scaleY *= hurtT.scaleY;
  }

  if (opacity <= 0) { hideEnemySlot(vm, slot); return; }

  const finalScaleX = scaleX * enemy.facing;
  const drawX = screenX + hurtOffX + shakeX - drawW / 2;
  const drawY = screenY + offsetY + shakeY - drawH;

  setSlotProps(vm, slot, true, drawX, drawY, drawW, drawH, finalScaleX, scaleY, rotation, opacity, texture);

  // Weapon sprite for special enemy types
  if (!enemy.isDead) {
    let weaponTexture: TextureAsset | null = null;
    let wW = 24; let wH = 12; let handOffX = 0; let handOffY = 0;
    switch (enemy.enemyType) {
      case EnemyType.GunnerMouse:
        weaponTexture = gunnerMouseMinigunTexture;
        wW = GUNNER_WEAPON_W; wH = GUNNER_WEAPON_H;
        handOffX = GUNNER_HAND_OFFSET_X; handOffY = GUNNER_HAND_OFFSET_Y;
        break;
      case EnemyType.DroneRat:
        weaponTexture = droneRatWeaponTexture;
        wW = DRONE_WEAPON_W; wH = DRONE_WEAPON_H;
        handOffX = DRONE_HAND_OFFSET_X; handOffY = DRONE_HAND_OFFSET_Y;
        break;
      case EnemyType.SewerBruiser:
        weaponTexture = bruiserWeaponTexture;
        wW = BRUISER_WEAPON_W; wH = BRUISER_WEAPON_H;
        handOffX = BRUISER_HAND_OFFSET_X; handOffY = BRUISER_HAND_OFFSET_Y;
        break;
      case EnemyType.GasRat:
        weaponTexture = gasRatWeaponTexture;
        wW = GAS_RAT_WEAPON_W; wH = GAS_RAT_WEAPON_H;
        handOffX = GAS_RAT_HAND_OFFSET_X; handOffY = GAS_RAT_HAND_OFFSET_Y;
        break;
    }
    if (weaponTexture) {
      const weaponX = screenX + hurtOffX + shakeX + handOffX * enemy.facing - wW / 2;
      const weaponY = screenY + offsetY + shakeY + handOffY - wH / 2;
      setWeaponProps(vm, slot, true, weaponX, weaponY, wW, wH, finalScaleX, scaleY, 0, opacity, weaponTexture);
    } else {
      setWeaponProps(vm, slot, false, 0, 0, 24, 12, 1, 1, 0, 1, null);
    }
  } else {
    setWeaponProps(vm, slot, false, 0, 0, 24, 12, 1, 1, 0, 1, null);
  }

  if (enemy.flashTimer > 0) {
    const flashTex = getEnemyTexture(enemy.enemyType);
    setFlashProps(vm, slot, true, drawX, drawY, drawW, drawH, finalScaleX, scaleY, 0.7, flashTex);
  } else {
    setFlashProps(vm, slot, false, 0, 0, 32, 32, 1, 1, 0, null);
  }
}

function hideEnemySlot(vm: ArenaVerminViewModel, slot: number): void {
  setSlotProps(vm, slot, false, 0, 0, 32, 32, 1, 1, 0, 1, null);
  setWeaponProps(vm, slot, false, 0, 0, 24, 12, 1, 1, 0, 1, null);
  setFlashProps(vm, slot, false, 0, 0, 32, 32, 1, 1, 0, null);
}

// Helper to set enemy body slot props by index (all 25 slots)
function setSlotProps(
  vm: ArenaVerminViewModel, slot: number,
  visible: boolean, x: number, y: number, w: number, h: number,
  scaleX: number, scaleY: number, rotation: number, opacity: number,
  texture: TextureAsset | null,
): void {
  switch (slot) {
    case 0: vm.enemy0Visible = visible; vm.enemy0X = x; vm.enemy0Y = y; vm.enemy0W = w; vm.enemy0H = h; vm.enemy0ScaleX = scaleX; vm.enemy0ScaleY = scaleY; vm.enemy0Rotation = rotation; vm.enemy0Opacity = opacity; vm.enemy0Texture = texture; break;
    case 1: vm.enemy1Visible = visible; vm.enemy1X = x; vm.enemy1Y = y; vm.enemy1W = w; vm.enemy1H = h; vm.enemy1ScaleX = scaleX; vm.enemy1ScaleY = scaleY; vm.enemy1Rotation = rotation; vm.enemy1Opacity = opacity; vm.enemy1Texture = texture; break;
    case 2: vm.enemy2Visible = visible; vm.enemy2X = x; vm.enemy2Y = y; vm.enemy2W = w; vm.enemy2H = h; vm.enemy2ScaleX = scaleX; vm.enemy2ScaleY = scaleY; vm.enemy2Rotation = rotation; vm.enemy2Opacity = opacity; vm.enemy2Texture = texture; break;
    case 3: vm.enemy3Visible = visible; vm.enemy3X = x; vm.enemy3Y = y; vm.enemy3W = w; vm.enemy3H = h; vm.enemy3ScaleX = scaleX; vm.enemy3ScaleY = scaleY; vm.enemy3Rotation = rotation; vm.enemy3Opacity = opacity; vm.enemy3Texture = texture; break;
    case 4: vm.enemy4Visible = visible; vm.enemy4X = x; vm.enemy4Y = y; vm.enemy4W = w; vm.enemy4H = h; vm.enemy4ScaleX = scaleX; vm.enemy4ScaleY = scaleY; vm.enemy4Rotation = rotation; vm.enemy4Opacity = opacity; vm.enemy4Texture = texture; break;
    case 5: vm.enemy5Visible = visible; vm.enemy5X = x; vm.enemy5Y = y; vm.enemy5W = w; vm.enemy5H = h; vm.enemy5ScaleX = scaleX; vm.enemy5ScaleY = scaleY; vm.enemy5Rotation = rotation; vm.enemy5Opacity = opacity; vm.enemy5Texture = texture; break;
    case 6: vm.enemy6Visible = visible; vm.enemy6X = x; vm.enemy6Y = y; vm.enemy6W = w; vm.enemy6H = h; vm.enemy6ScaleX = scaleX; vm.enemy6ScaleY = scaleY; vm.enemy6Rotation = rotation; vm.enemy6Opacity = opacity; vm.enemy6Texture = texture; break;
    case 7: vm.enemy7Visible = visible; vm.enemy7X = x; vm.enemy7Y = y; vm.enemy7W = w; vm.enemy7H = h; vm.enemy7ScaleX = scaleX; vm.enemy7ScaleY = scaleY; vm.enemy7Rotation = rotation; vm.enemy7Opacity = opacity; vm.enemy7Texture = texture; break;
    case 8: vm.enemy8Visible = visible; vm.enemy8X = x; vm.enemy8Y = y; vm.enemy8W = w; vm.enemy8H = h; vm.enemy8ScaleX = scaleX; vm.enemy8ScaleY = scaleY; vm.enemy8Rotation = rotation; vm.enemy8Opacity = opacity; vm.enemy8Texture = texture; break;
    case 9: vm.enemy9Visible = visible; vm.enemy9X = x; vm.enemy9Y = y; vm.enemy9W = w; vm.enemy9H = h; vm.enemy9ScaleX = scaleX; vm.enemy9ScaleY = scaleY; vm.enemy9Rotation = rotation; vm.enemy9Opacity = opacity; vm.enemy9Texture = texture; break;
    case 10: vm.enemy10Visible = visible; vm.enemy10X = x; vm.enemy10Y = y; vm.enemy10W = w; vm.enemy10H = h; vm.enemy10ScaleX = scaleX; vm.enemy10ScaleY = scaleY; vm.enemy10Rotation = rotation; vm.enemy10Opacity = opacity; vm.enemy10Texture = texture; break;
    case 11: vm.enemy11Visible = visible; vm.enemy11X = x; vm.enemy11Y = y; vm.enemy11W = w; vm.enemy11H = h; vm.enemy11ScaleX = scaleX; vm.enemy11ScaleY = scaleY; vm.enemy11Rotation = rotation; vm.enemy11Opacity = opacity; vm.enemy11Texture = texture; break;
    case 12: vm.enemy12Visible = visible; vm.enemy12X = x; vm.enemy12Y = y; vm.enemy12W = w; vm.enemy12H = h; vm.enemy12ScaleX = scaleX; vm.enemy12ScaleY = scaleY; vm.enemy12Rotation = rotation; vm.enemy12Opacity = opacity; vm.enemy12Texture = texture; break;
    case 13: vm.enemy13Visible = visible; vm.enemy13X = x; vm.enemy13Y = y; vm.enemy13W = w; vm.enemy13H = h; vm.enemy13ScaleX = scaleX; vm.enemy13ScaleY = scaleY; vm.enemy13Rotation = rotation; vm.enemy13Opacity = opacity; vm.enemy13Texture = texture; break;
    case 14: vm.enemy14Visible = visible; vm.enemy14X = x; vm.enemy14Y = y; vm.enemy14W = w; vm.enemy14H = h; vm.enemy14ScaleX = scaleX; vm.enemy14ScaleY = scaleY; vm.enemy14Rotation = rotation; vm.enemy14Opacity = opacity; vm.enemy14Texture = texture; break;
    case 15: vm.enemy15Visible = visible; vm.enemy15X = x; vm.enemy15Y = y; vm.enemy15W = w; vm.enemy15H = h; vm.enemy15ScaleX = scaleX; vm.enemy15ScaleY = scaleY; vm.enemy15Rotation = rotation; vm.enemy15Opacity = opacity; vm.enemy15Texture = texture; break;
    case 16: vm.enemy16Visible = visible; vm.enemy16X = x; vm.enemy16Y = y; vm.enemy16W = w; vm.enemy16H = h; vm.enemy16ScaleX = scaleX; vm.enemy16ScaleY = scaleY; vm.enemy16Rotation = rotation; vm.enemy16Opacity = opacity; vm.enemy16Texture = texture; break;
    case 17: vm.enemy17Visible = visible; vm.enemy17X = x; vm.enemy17Y = y; vm.enemy17W = w; vm.enemy17H = h; vm.enemy17ScaleX = scaleX; vm.enemy17ScaleY = scaleY; vm.enemy17Rotation = rotation; vm.enemy17Opacity = opacity; vm.enemy17Texture = texture; break;
    case 18: vm.enemy18Visible = visible; vm.enemy18X = x; vm.enemy18Y = y; vm.enemy18W = w; vm.enemy18H = h; vm.enemy18ScaleX = scaleX; vm.enemy18ScaleY = scaleY; vm.enemy18Rotation = rotation; vm.enemy18Opacity = opacity; vm.enemy18Texture = texture; break;
    case 19: vm.enemy19Visible = visible; vm.enemy19X = x; vm.enemy19Y = y; vm.enemy19W = w; vm.enemy19H = h; vm.enemy19ScaleX = scaleX; vm.enemy19ScaleY = scaleY; vm.enemy19Rotation = rotation; vm.enemy19Opacity = opacity; vm.enemy19Texture = texture; break;
    case 20: vm.enemy20Visible = visible; vm.enemy20X = x; vm.enemy20Y = y; vm.enemy20W = w; vm.enemy20H = h; vm.enemy20ScaleX = scaleX; vm.enemy20ScaleY = scaleY; vm.enemy20Rotation = rotation; vm.enemy20Opacity = opacity; vm.enemy20Texture = texture; break;
    case 21: vm.enemy21Visible = visible; vm.enemy21X = x; vm.enemy21Y = y; vm.enemy21W = w; vm.enemy21H = h; vm.enemy21ScaleX = scaleX; vm.enemy21ScaleY = scaleY; vm.enemy21Rotation = rotation; vm.enemy21Opacity = opacity; vm.enemy21Texture = texture; break;
    case 22: vm.enemy22Visible = visible; vm.enemy22X = x; vm.enemy22Y = y; vm.enemy22W = w; vm.enemy22H = h; vm.enemy22ScaleX = scaleX; vm.enemy22ScaleY = scaleY; vm.enemy22Rotation = rotation; vm.enemy22Opacity = opacity; vm.enemy22Texture = texture; break;
    case 23: vm.enemy23Visible = visible; vm.enemy23X = x; vm.enemy23Y = y; vm.enemy23W = w; vm.enemy23H = h; vm.enemy23ScaleX = scaleX; vm.enemy23ScaleY = scaleY; vm.enemy23Rotation = rotation; vm.enemy23Opacity = opacity; vm.enemy23Texture = texture; break;
    case 24: vm.enemy24Visible = visible; vm.enemy24X = x; vm.enemy24Y = y; vm.enemy24W = w; vm.enemy24H = h; vm.enemy24ScaleX = scaleX; vm.enemy24ScaleY = scaleY; vm.enemy24Rotation = rotation; vm.enemy24Opacity = opacity; vm.enemy24Texture = texture; break;
  }
}

// Helper to set enemy flash slot props by index (all 25 slots)
function setFlashProps(
  vm: ArenaVerminViewModel, slot: number,
  visible: boolean, x: number, y: number, w: number, h: number,
  scaleX: number, scaleY: number, opacity: number,
  texture: TextureAsset | null,
): void {
  switch (slot) {
    case 0: vm.ef0Visible = visible; vm.ef0X = x; vm.ef0Y = y; vm.ef0W = w; vm.ef0H = h; vm.ef0ScaleX = scaleX; vm.ef0ScaleY = scaleY; vm.ef0Opacity = opacity; vm.ef0Texture = texture; break;
    case 1: vm.ef1Visible = visible; vm.ef1X = x; vm.ef1Y = y; vm.ef1W = w; vm.ef1H = h; vm.ef1ScaleX = scaleX; vm.ef1ScaleY = scaleY; vm.ef1Opacity = opacity; vm.ef1Texture = texture; break;
    case 2: vm.ef2Visible = visible; vm.ef2X = x; vm.ef2Y = y; vm.ef2W = w; vm.ef2H = h; vm.ef2ScaleX = scaleX; vm.ef2ScaleY = scaleY; vm.ef2Opacity = opacity; vm.ef2Texture = texture; break;
    case 3: vm.ef3Visible = visible; vm.ef3X = x; vm.ef3Y = y; vm.ef3W = w; vm.ef3H = h; vm.ef3ScaleX = scaleX; vm.ef3ScaleY = scaleY; vm.ef3Opacity = opacity; vm.ef3Texture = texture; break;
    case 4: vm.ef4Visible = visible; vm.ef4X = x; vm.ef4Y = y; vm.ef4W = w; vm.ef4H = h; vm.ef4ScaleX = scaleX; vm.ef4ScaleY = scaleY; vm.ef4Opacity = opacity; vm.ef4Texture = texture; break;
    case 5: vm.ef5Visible = visible; vm.ef5X = x; vm.ef5Y = y; vm.ef5W = w; vm.ef5H = h; vm.ef5ScaleX = scaleX; vm.ef5ScaleY = scaleY; vm.ef5Opacity = opacity; vm.ef5Texture = texture; break;
    case 6: vm.ef6Visible = visible; vm.ef6X = x; vm.ef6Y = y; vm.ef6W = w; vm.ef6H = h; vm.ef6ScaleX = scaleX; vm.ef6ScaleY = scaleY; vm.ef6Opacity = opacity; vm.ef6Texture = texture; break;
    case 7: vm.ef7Visible = visible; vm.ef7X = x; vm.ef7Y = y; vm.ef7W = w; vm.ef7H = h; vm.ef7ScaleX = scaleX; vm.ef7ScaleY = scaleY; vm.ef7Opacity = opacity; vm.ef7Texture = texture; break;
    case 8: vm.ef8Visible = visible; vm.ef8X = x; vm.ef8Y = y; vm.ef8W = w; vm.ef8H = h; vm.ef8ScaleX = scaleX; vm.ef8ScaleY = scaleY; vm.ef8Opacity = opacity; vm.ef8Texture = texture; break;
    case 9: vm.ef9Visible = visible; vm.ef9X = x; vm.ef9Y = y; vm.ef9W = w; vm.ef9H = h; vm.ef9ScaleX = scaleX; vm.ef9ScaleY = scaleY; vm.ef9Opacity = opacity; vm.ef9Texture = texture; break;
    case 10: vm.ef10Visible = visible; vm.ef10X = x; vm.ef10Y = y; vm.ef10W = w; vm.ef10H = h; vm.ef10ScaleX = scaleX; vm.ef10ScaleY = scaleY; vm.ef10Opacity = opacity; vm.ef10Texture = texture; break;
    case 11: vm.ef11Visible = visible; vm.ef11X = x; vm.ef11Y = y; vm.ef11W = w; vm.ef11H = h; vm.ef11ScaleX = scaleX; vm.ef11ScaleY = scaleY; vm.ef11Opacity = opacity; vm.ef11Texture = texture; break;
    case 12: vm.ef12Visible = visible; vm.ef12X = x; vm.ef12Y = y; vm.ef12W = w; vm.ef12H = h; vm.ef12ScaleX = scaleX; vm.ef12ScaleY = scaleY; vm.ef12Opacity = opacity; vm.ef12Texture = texture; break;
    case 13: vm.ef13Visible = visible; vm.ef13X = x; vm.ef13Y = y; vm.ef13W = w; vm.ef13H = h; vm.ef13ScaleX = scaleX; vm.ef13ScaleY = scaleY; vm.ef13Opacity = opacity; vm.ef13Texture = texture; break;
    case 14: vm.ef14Visible = visible; vm.ef14X = x; vm.ef14Y = y; vm.ef14W = w; vm.ef14H = h; vm.ef14ScaleX = scaleX; vm.ef14ScaleY = scaleY; vm.ef14Opacity = opacity; vm.ef14Texture = texture; break;
    case 15: vm.ef15Visible = visible; vm.ef15X = x; vm.ef15Y = y; vm.ef15W = w; vm.ef15H = h; vm.ef15ScaleX = scaleX; vm.ef15ScaleY = scaleY; vm.ef15Opacity = opacity; vm.ef15Texture = texture; break;
    case 16: vm.ef16Visible = visible; vm.ef16X = x; vm.ef16Y = y; vm.ef16W = w; vm.ef16H = h; vm.ef16ScaleX = scaleX; vm.ef16ScaleY = scaleY; vm.ef16Opacity = opacity; vm.ef16Texture = texture; break;
    case 17: vm.ef17Visible = visible; vm.ef17X = x; vm.ef17Y = y; vm.ef17W = w; vm.ef17H = h; vm.ef17ScaleX = scaleX; vm.ef17ScaleY = scaleY; vm.ef17Opacity = opacity; vm.ef17Texture = texture; break;
    case 18: vm.ef18Visible = visible; vm.ef18X = x; vm.ef18Y = y; vm.ef18W = w; vm.ef18H = h; vm.ef18ScaleX = scaleX; vm.ef18ScaleY = scaleY; vm.ef18Opacity = opacity; vm.ef18Texture = texture; break;
    case 19: vm.ef19Visible = visible; vm.ef19X = x; vm.ef19Y = y; vm.ef19W = w; vm.ef19H = h; vm.ef19ScaleX = scaleX; vm.ef19ScaleY = scaleY; vm.ef19Opacity = opacity; vm.ef19Texture = texture; break;
    case 20: vm.ef20Visible = visible; vm.ef20X = x; vm.ef20Y = y; vm.ef20W = w; vm.ef20H = h; vm.ef20ScaleX = scaleX; vm.ef20ScaleY = scaleY; vm.ef20Opacity = opacity; vm.ef20Texture = texture; break;
    case 21: vm.ef21Visible = visible; vm.ef21X = x; vm.ef21Y = y; vm.ef21W = w; vm.ef21H = h; vm.ef21ScaleX = scaleX; vm.ef21ScaleY = scaleY; vm.ef21Opacity = opacity; vm.ef21Texture = texture; break;
    case 22: vm.ef22Visible = visible; vm.ef22X = x; vm.ef22Y = y; vm.ef22W = w; vm.ef22H = h; vm.ef22ScaleX = scaleX; vm.ef22ScaleY = scaleY; vm.ef22Opacity = opacity; vm.ef22Texture = texture; break;
    case 23: vm.ef23Visible = visible; vm.ef23X = x; vm.ef23Y = y; vm.ef23W = w; vm.ef23H = h; vm.ef23ScaleX = scaleX; vm.ef23ScaleY = scaleY; vm.ef23Opacity = opacity; vm.ef23Texture = texture; break;
    case 24: vm.ef24Visible = visible; vm.ef24X = x; vm.ef24Y = y; vm.ef24W = w; vm.ef24H = h; vm.ef24ScaleX = scaleX; vm.ef24ScaleY = scaleY; vm.ef24Opacity = opacity; vm.ef24Texture = texture; break;
  }
}

// Helper to set enemy weapon slot props by index (all 25 slots)
function setWeaponProps(
  vm: ArenaVerminViewModel, slot: number,
  visible: boolean, x: number, y: number, w: number, h: number,
  scaleX: number, scaleY: number, rotation: number, opacity: number,
  texture: TextureAsset | null,
): void {
  switch (slot) {
    case 0: vm.ew0Visible = visible; vm.ew0X = x; vm.ew0Y = y; vm.ew0W = w; vm.ew0H = h; vm.ew0ScaleX = scaleX; vm.ew0ScaleY = scaleY; vm.ew0Rotation = rotation; vm.ew0Opacity = opacity; vm.ew0Texture = texture; break;
    case 1: vm.ew1Visible = visible; vm.ew1X = x; vm.ew1Y = y; vm.ew1W = w; vm.ew1H = h; vm.ew1ScaleX = scaleX; vm.ew1ScaleY = scaleY; vm.ew1Rotation = rotation; vm.ew1Opacity = opacity; vm.ew1Texture = texture; break;
    case 2: vm.ew2Visible = visible; vm.ew2X = x; vm.ew2Y = y; vm.ew2W = w; vm.ew2H = h; vm.ew2ScaleX = scaleX; vm.ew2ScaleY = scaleY; vm.ew2Rotation = rotation; vm.ew2Opacity = opacity; vm.ew2Texture = texture; break;
    case 3: vm.ew3Visible = visible; vm.ew3X = x; vm.ew3Y = y; vm.ew3W = w; vm.ew3H = h; vm.ew3ScaleX = scaleX; vm.ew3ScaleY = scaleY; vm.ew3Rotation = rotation; vm.ew3Opacity = opacity; vm.ew3Texture = texture; break;
    case 4: vm.ew4Visible = visible; vm.ew4X = x; vm.ew4Y = y; vm.ew4W = w; vm.ew4H = h; vm.ew4ScaleX = scaleX; vm.ew4ScaleY = scaleY; vm.ew4Rotation = rotation; vm.ew4Opacity = opacity; vm.ew4Texture = texture; break;
    case 5: vm.ew5Visible = visible; vm.ew5X = x; vm.ew5Y = y; vm.ew5W = w; vm.ew5H = h; vm.ew5ScaleX = scaleX; vm.ew5ScaleY = scaleY; vm.ew5Rotation = rotation; vm.ew5Opacity = opacity; vm.ew5Texture = texture; break;
    case 6: vm.ew6Visible = visible; vm.ew6X = x; vm.ew6Y = y; vm.ew6W = w; vm.ew6H = h; vm.ew6ScaleX = scaleX; vm.ew6ScaleY = scaleY; vm.ew6Rotation = rotation; vm.ew6Opacity = opacity; vm.ew6Texture = texture; break;
    case 7: vm.ew7Visible = visible; vm.ew7X = x; vm.ew7Y = y; vm.ew7W = w; vm.ew7H = h; vm.ew7ScaleX = scaleX; vm.ew7ScaleY = scaleY; vm.ew7Rotation = rotation; vm.ew7Opacity = opacity; vm.ew7Texture = texture; break;
    case 8: vm.ew8Visible = visible; vm.ew8X = x; vm.ew8Y = y; vm.ew8W = w; vm.ew8H = h; vm.ew8ScaleX = scaleX; vm.ew8ScaleY = scaleY; vm.ew8Rotation = rotation; vm.ew8Opacity = opacity; vm.ew8Texture = texture; break;
    case 9: vm.ew9Visible = visible; vm.ew9X = x; vm.ew9Y = y; vm.ew9W = w; vm.ew9H = h; vm.ew9ScaleX = scaleX; vm.ew9ScaleY = scaleY; vm.ew9Rotation = rotation; vm.ew9Opacity = opacity; vm.ew9Texture = texture; break;
    case 10: vm.ew10Visible = visible; vm.ew10X = x; vm.ew10Y = y; vm.ew10W = w; vm.ew10H = h; vm.ew10ScaleX = scaleX; vm.ew10ScaleY = scaleY; vm.ew10Rotation = rotation; vm.ew10Opacity = opacity; vm.ew10Texture = texture; break;
    case 11: vm.ew11Visible = visible; vm.ew11X = x; vm.ew11Y = y; vm.ew11W = w; vm.ew11H = h; vm.ew11ScaleX = scaleX; vm.ew11ScaleY = scaleY; vm.ew11Rotation = rotation; vm.ew11Opacity = opacity; vm.ew11Texture = texture; break;
    case 12: vm.ew12Visible = visible; vm.ew12X = x; vm.ew12Y = y; vm.ew12W = w; vm.ew12H = h; vm.ew12ScaleX = scaleX; vm.ew12ScaleY = scaleY; vm.ew12Rotation = rotation; vm.ew12Opacity = opacity; vm.ew12Texture = texture; break;
    case 13: vm.ew13Visible = visible; vm.ew13X = x; vm.ew13Y = y; vm.ew13W = w; vm.ew13H = h; vm.ew13ScaleX = scaleX; vm.ew13ScaleY = scaleY; vm.ew13Rotation = rotation; vm.ew13Opacity = opacity; vm.ew13Texture = texture; break;
    case 14: vm.ew14Visible = visible; vm.ew14X = x; vm.ew14Y = y; vm.ew14W = w; vm.ew14H = h; vm.ew14ScaleX = scaleX; vm.ew14ScaleY = scaleY; vm.ew14Rotation = rotation; vm.ew14Opacity = opacity; vm.ew14Texture = texture; break;
    case 15: vm.ew15Visible = visible; vm.ew15X = x; vm.ew15Y = y; vm.ew15W = w; vm.ew15H = h; vm.ew15ScaleX = scaleX; vm.ew15ScaleY = scaleY; vm.ew15Rotation = rotation; vm.ew15Opacity = opacity; vm.ew15Texture = texture; break;
    case 16: vm.ew16Visible = visible; vm.ew16X = x; vm.ew16Y = y; vm.ew16W = w; vm.ew16H = h; vm.ew16ScaleX = scaleX; vm.ew16ScaleY = scaleY; vm.ew16Rotation = rotation; vm.ew16Opacity = opacity; vm.ew16Texture = texture; break;
    case 17: vm.ew17Visible = visible; vm.ew17X = x; vm.ew17Y = y; vm.ew17W = w; vm.ew17H = h; vm.ew17ScaleX = scaleX; vm.ew17ScaleY = scaleY; vm.ew17Rotation = rotation; vm.ew17Opacity = opacity; vm.ew17Texture = texture; break;
    case 18: vm.ew18Visible = visible; vm.ew18X = x; vm.ew18Y = y; vm.ew18W = w; vm.ew18H = h; vm.ew18ScaleX = scaleX; vm.ew18ScaleY = scaleY; vm.ew18Rotation = rotation; vm.ew18Opacity = opacity; vm.ew18Texture = texture; break;
    case 19: vm.ew19Visible = visible; vm.ew19X = x; vm.ew19Y = y; vm.ew19W = w; vm.ew19H = h; vm.ew19ScaleX = scaleX; vm.ew19ScaleY = scaleY; vm.ew19Rotation = rotation; vm.ew19Opacity = opacity; vm.ew19Texture = texture; break;
    case 20: vm.ew20Visible = visible; vm.ew20X = x; vm.ew20Y = y; vm.ew20W = w; vm.ew20H = h; vm.ew20ScaleX = scaleX; vm.ew20ScaleY = scaleY; vm.ew20Rotation = rotation; vm.ew20Opacity = opacity; vm.ew20Texture = texture; break;
    case 21: vm.ew21Visible = visible; vm.ew21X = x; vm.ew21Y = y; vm.ew21W = w; vm.ew21H = h; vm.ew21ScaleX = scaleX; vm.ew21ScaleY = scaleY; vm.ew21Rotation = rotation; vm.ew21Opacity = opacity; vm.ew21Texture = texture; break;
    case 22: vm.ew22Visible = visible; vm.ew22X = x; vm.ew22Y = y; vm.ew22W = w; vm.ew22H = h; vm.ew22ScaleX = scaleX; vm.ew22ScaleY = scaleY; vm.ew22Rotation = rotation; vm.ew22Opacity = opacity; vm.ew22Texture = texture; break;
    case 23: vm.ew23Visible = visible; vm.ew23X = x; vm.ew23Y = y; vm.ew23W = w; vm.ew23H = h; vm.ew23ScaleX = scaleX; vm.ew23ScaleY = scaleY; vm.ew23Rotation = rotation; vm.ew23Opacity = opacity; vm.ew23Texture = texture; break;
    case 24: vm.ew24Visible = visible; vm.ew24X = x; vm.ew24Y = y; vm.ew24W = w; vm.ew24H = h; vm.ew24ScaleX = scaleX; vm.ew24ScaleY = scaleY; vm.ew24Rotation = rotation; vm.ew24Opacity = opacity; vm.ew24Texture = texture; break;
  }
}

// Helper to set elite glow slot props (5 slots)
function setGlowSlot(
  vm: ArenaVerminViewModel, slot: number,
  visible: boolean, x: number, y: number, w: number, h: number,
  opacity: number, colorHex: string,
): void {
  switch (slot) {
    case 0: vm.eg0Visible = visible; vm.eg0X = x; vm.eg0Y = y; vm.eg0W = w; vm.eg0H = h; vm.eg0Opacity = opacity; vm.eg0ColorHex = colorHex; break;
    case 1: vm.eg1Visible = visible; vm.eg1X = x; vm.eg1Y = y; vm.eg1W = w; vm.eg1H = h; vm.eg1Opacity = opacity; vm.eg1ColorHex = colorHex; break;
    case 2: vm.eg2Visible = visible; vm.eg2X = x; vm.eg2Y = y; vm.eg2W = w; vm.eg2H = h; vm.eg2Opacity = opacity; vm.eg2ColorHex = colorHex; break;
    case 3: vm.eg3Visible = visible; vm.eg3X = x; vm.eg3Y = y; vm.eg3W = w; vm.eg3H = h; vm.eg3Opacity = opacity; vm.eg3ColorHex = colorHex; break;
    case 4: vm.eg4Visible = visible; vm.eg4X = x; vm.eg4Y = y; vm.eg4W = w; vm.eg4H = h; vm.eg4Opacity = opacity; vm.eg4ColorHex = colorHex; break;
  }
}
