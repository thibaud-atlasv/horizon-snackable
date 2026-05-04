/**
 * ArenaVerminComponent
 *
 * Component Attachment: Scene Entity (with CustomUiComponent)
 * Component Networking: Local (client-side UI only)
 * Component Ownership: Not Networked
 *
 * Main game component for Arena Vermin (Milestones 1-3).
 * Handles game state, input, hero movement, camera, enemies, combat,
 * wave system, pickups, HUD, and rendering.
 */
import { CustomUiComponent } from 'meta/custom_ui';
import {
  DrawingCommandsBuilder,
  SolidBrush,
  Pen,
} from 'meta/worlds';
import {
  Color,
  OnEntityCreateEvent,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  Component,
  component,
  subscribe,
} from 'meta/platform_api';
import type { OnWorldUpdateEventPayload } from 'meta/platform_api';
import {
  FocusedInteractionService,
  OnFocusedInteractionInputStartedEvent,
  OnFocusedInteractionInputMovedEvent,
  OnFocusedInteractionInputEndedEvent,
  NetworkingService,
  Vec2,
} from 'meta/worlds';
import type { OnFocusedInteractionInputEventPayload } from 'meta/worlds';
import { CameraModeProvisionalService } from 'meta/worlds_provisional';

import {
  ArenaVerminViewModel,
  onStartClicked, onPauseClicked, onResumeClicked, onRestartClicked,
  onRetryClicked, onReturnToMenuClicked,
  onUpgrade0Clicked, onUpgrade1Clicked, onUpgrade2Clicked,
} from './ArenaVerminViewModel';
import {
  CANVAS_W, CANVAS_H,
  HERO_SPEED, HERO_HP,
  HERO_HURT_FLASH_DUR,
  JOY_DEAD_ZONE, JOY_MAX_ZONE, JOY_RADIUS, JOY_FADE_TIME, JOY_FADE_ALPHA,
  WORLD_W, WORLD_H, PIXELS_PER_UNIT,
  SLASH_DURATION, SLASH_ARC_HALF_ANGLE, SLASH_RADIUS, SLASH_WIDTH,
  SLASH_SCALE_START, SLASH_SCALE_END,
  PICKUP_COLLECTION_RADIUS,
  PICKUP_MAGNET_RADIUS,
  PICKUP_MAGNET_MAX_SPEED,
  GRUNT_GEM_DROP, GRUNT_COIN_CHANCE,
  GUNNER_GEM_DROP, GUNNER_COIN_CHANCE,
  DRONE_GEM_DROP, DRONE_COIN_CHANCE,
  BRUISER_GEM_DROP, BRUISER_COIN_DROP, BRUISER_COIN_CHANCE,
  GAS_RAT_GEM_DROP, GAS_RAT_COIN_CHANCE,
  HEALTH_DROP_CHANCE, HEALTH_RESTORE_AMOUNT,
  GUNNER_PROJECTILE_DMG,
  GAS_RAT_CLOUD_DAMAGE, GAS_RAT_CLOUD_RADIUS, GAS_RAT_CLOUD_DURATION,
  calcXpToNext, HUD_WAVE_ANNOUNCE_DUR,
  DEATH_FADE_END,
  ELITE_LOOT_MULT, ELITE_WARNING_DURATION,
  BOSS_GEM_DROP, BOSS_COIN_DROP, BOSS_COIN_CHANCE, BOSS_WARNING_DURATION,
  GRUNT_HP,
} from './Constants';
import { PickupType, EnemyType, WeaponId } from './Types';
import type {
  HeroState, CameraState, JoystickState,
  EnemyState, Particle, ExpandingRing, FloatingTextEntry,
  AttackSwingState, CameraShakeState, SlashEffect,
  WaveState, PickupState, GameStats,
  ProjectileState, GasCloudState, SpriteEffect,
  DroneState, UpgradeOption, DroneProjectileState,
  MinigunState, MinigunBulletState,
  DamageCircleState, DamageCirclePulseVFX,
} from './Types';
import { worldToScreen, drawTileGrid, clampCoord } from './IsoRenderer';
import { updateParticles, drawParticles, spawnHitSparks, spawnCritSparks, spawnDeathExplosion, spawnImpactEffect, spawnCritiqueEffect, spawnSplashEffect, updateSpriteEffects, drawSpriteEffects, drawSpriteEffectsBase, drawSpriteEffectsCrit } from './ParticleSystem';
import { updateFloatingTexts, drawFloatingTexts, spawnDamageNumber, spawnCritLabel } from './FloatingText';
import { autoAttackUpdate, applyContactDamage } from './CombatSystem';
import type { AutoAttackState } from './CombatSystem';
import {
  updateAttackSwing,
  triggerCameraShake, updateCameraShake,
} from './AnimationSystem';
import { spawnEnemyWithHp, spawnEnemyOfType, updateEnemyAI, updateEnemyTimers, removeFinishedEnemies, despawnRemainingEnemies } from './EnemySystem';
import { updateHeroSprites, updateEnemySprites } from './SpriteUpdater';
import { initWaveSystem, startWaveSystem, updateWaveSystem } from './WaveSystem';
import { spawnProjectile, updateProjectiles, drawProjectiles } from './ProjectileSystem';
import { spawnGasCloud, updateGasClouds, drawGasClouds } from './GasCloudSystem';
import { spawnPickup, updatePickups, drawPickups } from './PickupSystem';
import { coinCountTexture, ennemiCountTexture, levelBarTexture, timerBoardTexture, waveBarContourTexture, waveBarInTexture, pauseButtonTexture, cartoucheTexture } from './Assets';
import { UpgradeSystem } from './UpgradeSystem';
import { initDrones, updateDrones, drawDrones, updateDroneProjectiles, drawDroneProjectiles } from './DroneWeapon';
import { initMinigun, updateMinigun, updateMinigunBullets, drawMinigunBullets } from './MinigunWeapon';
import { initDamageCircle, updateDamageCircle, updateDamageCirclePulses, drawDamageCirclePulses } from './DamageCircleWeapon';
import { drawEliteMarkers } from './EliteMarkers';

// Game states
enum GameState {
  Title = 0,
  Playing = 1,
  Paused = 2,
  GameOver = 3,
}

// Pre-created resources
const titleBgBrush = new SolidBrush(Color.fromHex('#0A0A14'));

@component()
export class ArenaVerminComponent extends Component {
  private viewModel: ArenaVerminViewModel = new ArenaVerminViewModel();
  private builder: DrawingCommandsBuilder = new DrawingCommandsBuilder();
  private critBuilder: DrawingCommandsBuilder = new DrawingCommandsBuilder();

  private gameState: GameState = GameState.Title;
  private lastTime: number = 0;
  private gameTime: number = 0;

  // Hero state
  private hero: HeroState = {
    x: WORLD_W / 2, y: WORLD_H / 2,
    vx: 0, vy: 0, facing: 1, isMoving: false, animTime: 0,
  };
  private heroHp: number = HERO_HP;
  private heroHurtFlashTimer: number = 0;
  private heroDying: boolean = false;
  private heroDeathTimer: number = 0;

  // Camera state
  private camera: CameraState = { offsetX: 0, offsetY: 0 };
  private cameraShake: CameraShakeState = {
    active: false, timer: 0, magnitude: 0, frequency: 0, offsetX: 0, offsetY: 0,
  };

  // Joystick state
  private joystick: JoystickState = {
    active: false, centerX: 0, centerY: 0, currentX: 0, currentY: 0,
    dirX: 0, dirY: 0, magnitude: 0, idleTime: 10,
  };

  // Enemies
  private enemies: EnemyState[] = [];

  // Combat
  private attackState: AutoAttackState = { cooldown: 0, currentTarget: null, targetEvalTimer: 0 };
  private attackSwing: AttackSwingState = {
    active: false, phase: 0, timer: 0, weaponRotDeg: 0, bodyScaleX: 1, bodyScaleY: 1,
  };
  private hitPauseTimer: number = 0;

  // Particles & effects
  private particles: Particle[] = [];
  private rings: ExpandingRing[] = [];
  private spriteEffects: SpriteEffect[] = [];
  private floatingTexts: FloatingTextEntry[] = [];
  private slashEffects: SlashEffect[] = [];

  // === Milestone 3 state ===
  private waveState: WaveState = initWaveSystem();
  private pickups: PickupState[] = [];
  private stats: GameStats = { xp: 0, coins: 0, level: 1, xpToNext: calcXpToNext(1) };
  private waveAnnounceTimer: number = 0;
  private eliteWarningTimer: number = 0;
  private bossWarningTimer: number = 0;

  // === Milestone 4 state ===
  private projectiles: ProjectileState[] = [];
  private gasClouds: GasCloudState[] = [];

  // === Upgrade/Weapon System ===
  private upgradeSystem: UpgradeSystem = new UpgradeSystem();
  private drones: DroneState[] = [];
  private droneProjectiles: DroneProjectileState[] = [];
  private droneLevel: number = 0;
  private minigunState: MinigunState = { lastFireTime: -999 };
  private minigunBullets: MinigunBulletState[] = [];
  private minigunLevel: number = 0;
  private damageCircleState: DamageCircleState = { lastPulseTime: -999 };
  private damageCirclePulses: DamageCirclePulseVFX[] = [];
  private damageCircleLevel: number = 0;
  private isLevelUpScreen: boolean = false;
  private pendingUpgrades: UpgradeOption[] = [];
  private pendingLevelUps: number = 0;

  // === Lifecycle ===

  @subscribe(OnEntityCreateEvent)
  onCreate() {
    console.log('[ArenaVerminComponent] Initializing');
    const customUi = this.entity.getComponent(CustomUiComponent);
    if (customUi != null) {
      customUi.dataContext = this.viewModel;
    }
    this.render();
  }

  @subscribe(OnEntityStartEvent)
  onStart() {
    if (!NetworkingService.get().isPlayerContext()) return;
    this.enableTouchInput();
    console.log('[ArenaVerminComponent] Touch input enabled');
  }

  @subscribe(onStartClicked)
  onStartGame() {
    console.log('[ArenaVerminComponent] START clicked');
    this.gameState = GameState.Playing;
    this.viewModel.titleVisible = false;
    this.viewModel.hudVisible = true;

    // Set HUD sprite textures
    this.viewModel.hudCoinCountTexture = coinCountTexture;
    this.viewModel.hudEnnemiCountTexture = ennemiCountTexture;
    this.viewModel.hudLevelBarTexture = levelBarTexture;
    this.viewModel.hudTimerBoardTexture = timerBoardTexture;
    this.viewModel.hudWaveBarContourTexture = waveBarContourTexture;
    this.viewModel.hudWaveBarInTexture = waveBarInTexture;
    this.viewModel.hudPauseButtonTexture = pauseButtonTexture;
    this.viewModel.hudCartoucheTexture = cartoucheTexture;

    // Init wave system
    const events = startWaveSystem(this.waveState);
    if (events.spawnRequests.length > 0) {
      for (const req of events.spawnRequests) {
        spawnEnemyOfType(this.enemies, this.hero.x, this.hero.y, req.hp, req.type, req.isElite);
      }
    }
    if (events.waveStarted) {
      this.showWaveAnnouncement(this.waveState.waveNumber);
    }
    if (events.hasEliteWarning) {
      this.viewModel.eliteWarningVisible = true;
      this.eliteWarningTimer = ELITE_WARNING_DURATION;
    }
    this.updateHUD();
    console.log('[ArenaVerminComponent] Wave system started, wave 1');
  }

  @subscribe(onPauseClicked)
  onPause() {
    if (this.gameState !== GameState.Playing) return;
    console.log('[ArenaVerminComponent] Paused');
    this.gameState = GameState.Paused;
    this.viewModel.pauseMenuVisible = true;
  }

  @subscribe(onResumeClicked)
  onResume() {
    if (this.gameState !== GameState.Paused) return;
    console.log('[ArenaVerminComponent] Resumed');
    this.gameState = GameState.Playing;
    this.viewModel.pauseMenuVisible = false;
    this.lastTime = Date.now(); // Reset dt to avoid time jump
  }

  @subscribe(onRestartClicked)
  onRestart() {
    console.log('[ArenaVerminComponent] Restarting');
    this.resetGame();
    // Start fresh
    this.gameState = GameState.Playing;
    this.viewModel.titleVisible = false;
    this.viewModel.hudVisible = true;
    this.viewModel.pauseMenuVisible = false;
    this.viewModel.deathScreenVisible = false;
    this.viewModel.deathOverlayVisible = false;
    this.viewModel.deathOverlayOpacity = 0;
    const events = startWaveSystem(this.waveState);
    if (events.spawnRequests.length > 0) {
      for (const req of events.spawnRequests) {
        spawnEnemyOfType(this.enemies, this.hero.x, this.hero.y, req.hp, req.type, req.isElite);
      }
    }
    if (events.waveStarted) {
      this.showWaveAnnouncement(this.waveState.waveNumber);
    }
    if (events.hasEliteWarning) {
      this.viewModel.eliteWarningVisible = true;
      this.eliteWarningTimer = ELITE_WARNING_DURATION;
    }
    this.updateHUD();
  }

  @subscribe(onRetryClicked)
  onRetry() {
    console.log('[ArenaVerminComponent] Retry from death screen');
    this.resetGame();
    this.gameState = GameState.Playing;
    this.viewModel.titleVisible = false;
    this.viewModel.hudVisible = true;
    this.viewModel.deathScreenVisible = false;
    this.viewModel.deathOverlayVisible = false;
    this.viewModel.deathOverlayOpacity = 0;
    const events = startWaveSystem(this.waveState);
    if (events.spawnRequests.length > 0) {
      for (const req of events.spawnRequests) {
        spawnEnemyOfType(this.enemies, this.hero.x, this.hero.y, req.hp, req.type, req.isElite);
      }
    }
    if (events.waveStarted) {
      this.showWaveAnnouncement(this.waveState.waveNumber);
    }
    if (events.hasEliteWarning) {
      this.viewModel.eliteWarningVisible = true;
      this.eliteWarningTimer = ELITE_WARNING_DURATION;
    }
    this.updateHUD();
  }

  @subscribe(onReturnToMenuClicked)
  onReturnToMenu() {
    console.log('[ArenaVerminComponent] Return to menu from death screen');
    this.resetGame();
    this.gameState = GameState.Title;
    this.viewModel.titleVisible = true;
    this.viewModel.hudVisible = false;
    this.viewModel.deathScreenVisible = false;
    this.viewModel.deathOverlayVisible = false;
    this.viewModel.deathOverlayOpacity = 0;
  }

  @subscribe(onUpgrade0Clicked)
  onUpgrade0() { this.applyUpgradeChoice(0); }

  @subscribe(onUpgrade1Clicked)
  onUpgrade1() { this.applyUpgradeChoice(1); }

  @subscribe(onUpgrade2Clicked)
  onUpgrade2() { this.applyUpgradeChoice(2); }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(payload: OnWorldUpdateEventPayload) {
    const now = Date.now();
    const dt = this.lastTime === 0 ? 1 / 72 : Math.min((now - this.lastTime) / 1000, 1 / 30);
    this.lastTime = now;

    if (this.gameState === GameState.Playing) {
      if (this.isLevelUpScreen) {
        // During upgrade selection: still render but don't update game logic
      } else if (this.heroDying) {
        // During death: only update death timer, particles, floating texts, camera shake
        this.heroDeathTimer += dt;

        // Update death overlay opacity (lerp from 0 to 0.8 over DEATH_FADE_END seconds)
        this.viewModel.deathOverlayOpacity = Math.min(0.8, (this.heroDeathTimer / DEATH_FADE_END) * 0.8);

        updateParticles(this.particles, this.rings, dt);
        updateSpriteEffects(this.spriteEffects, dt);
        updateFloatingTexts(this.floatingTexts, dt);
        updateCameraShake(this.cameraShake, dt);
        this.updateSlashEffects(dt);

        if (this.heroHurtFlashTimer > 0) {
          this.heroHurtFlashTimer -= dt;
          if (this.heroHurtFlashTimer < 0) this.heroHurtFlashTimer = 0;
        }

        // Transition to GameOver when death animation completes
        if (this.heroDeathTimer >= DEATH_FADE_END) {
          this.gameState = GameState.GameOver;
          this.viewModel.deathScreenVisible = true;
          this.viewModel.deathWavesText = `Waves survived: ${this.waveState.waveNumber} / 20`;
          this.viewModel.deathCoinsText = String(this.stats.coins);
          this.viewModel.deathXpText = String(this.stats.xp);
          console.log('[ArenaVerminComponent] Game Over - hero died');
        }
      } else if (this.hitPauseTimer > 0) {
        this.hitPauseTimer -= dt;
        updateParticles(this.particles, this.rings, dt);
        updateSpriteEffects(this.spriteEffects, dt);
        updateFloatingTexts(this.floatingTexts, dt);
        updateCameraShake(this.cameraShake, dt);
        this.updateSlashEffects(dt);
      } else {
        this.updateGameLogic(dt);
      }
    }
    // Paused/GameOver: no game logic update, just render

    this.render();
  }

  private updateGameLogic(dt: number): void {
    this.gameTime += dt;
    this.updateHero(dt);
    updateEnemyAI(this.enemies, this.hero, dt);
    updateEnemyTimers(this.enemies, dt);

    // Wave system update
    const waveEvents = updateWaveSystem(this.waveState, dt);

    if (waveEvents.spawnRequests.length > 0) {
      for (const req of waveEvents.spawnRequests) {
        spawnEnemyOfType(this.enemies, this.hero.x, this.hero.y, req.hp, req.type, req.isElite);
      }
    }

    if (waveEvents.waveEnded) {
      // Despawn remaining enemies (reduced loot)
      const despawned = despawnRemainingEnemies(this.enemies);
      for (let i = 0; i < despawned; i++) {
        if (Math.random() < 0.5) {
          const rx = Math.random() * WORLD_W;
          const ry = Math.random() * WORLD_H;
          spawnPickup(this.pickups, rx, ry, PickupType.GreenGem);
        }
      }
      // Clear projectiles and gas clouds on wave end
      this.projectiles = [];
      this.gasClouds = [];
      this.droneProjectiles = [];
      this.minigunBullets = [];
      this.damageCirclePulses = [];

      // Auto-vacuum all remaining pickups toward hero
      for (const pickup of this.pickups) {
        if (!pickup.collected) {
          pickup.magnetActive = true;
          pickup.magnetSpeed = PICKUP_MAGNET_MAX_SPEED;
          pickup.maxAge = pickup.age + 10; // Extend lifetime so they don't despawn during collection
        }
      }
    }

    if (waveEvents.waveStarted || waveEvents.breatherEnded) {
      this.showWaveAnnouncement(this.waveState.waveNumber);
    }

    // Elite warning from wave system
    if (waveEvents.hasEliteWarning) {
      this.viewModel.eliteWarningVisible = true;
      this.eliteWarningTimer = ELITE_WARNING_DURATION;
    }

    // Boss warning from wave system
    if (waveEvents.hasBossWarning) {
      this.viewModel.bossWarningVisible = true;
      this.bossWarningTimer = BOSS_WARNING_DURATION;
    }

    // Boss summon phase: spawn GruntRat minions near boss
    for (const enemy of this.enemies) {
      if (enemy.enemyType === EnemyType.Boss && !enemy.isDead && enemy.bossSummonCount > 0) {
        const count = enemy.bossSummonCount;
        enemy.bossSummonCount = 0;
        for (let i = 0; i < count; i++) {
          const offsetX = (Math.random() - 0.5) * 2;
          const offsetY = (Math.random() - 0.5) * 2;
          const minionX = Math.max(0, Math.min(WORLD_W, enemy.x + offsetX));
          const minionY = Math.max(0, Math.min(WORLD_H, enemy.y + offsetY));
          spawnEnemyOfType(this.enemies, minionX, minionY, GRUNT_HP, EnemyType.GruntRat);
        }
      }
    }

    // === Milestone 4: Gunner Mouse projectiles ===
    for (const enemy of this.enemies) {
      if (enemy.isDead || enemy.isSpawning) continue;
      if (enemy.enemyType === EnemyType.GunnerMouse && enemy.fireBurstCount > 0) {
        enemy.burstShotDelay -= dt;
        if (enemy.burstShotDelay <= 0) {
          const barrelOffsetX = 0.3 * enemy.facing;
          spawnProjectile(this.projectiles, enemy.x + barrelOffsetX, enemy.y, this.hero.x, this.hero.y, GUNNER_PROJECTILE_DMG);
          enemy.fireBurstCount--;
          enemy.burstShotDelay = 0.12; // 120ms between burst shots
        }
      }
      // Gas Rat cloud spawning
      if (enemy.enemyType === EnemyType.GasRat && enemy.gasSpawnFlag) {
        spawnGasCloud(this.gasClouds, enemy.x, enemy.y, GAS_RAT_CLOUD_RADIUS, GAS_RAT_CLOUD_DAMAGE, GAS_RAT_CLOUD_DURATION);
        enemy.gasSpawnFlag = false;
      }
    }

    // Update projectiles
    const projectileHits = updateProjectiles(this.projectiles, dt, this.hero.x, this.hero.y, 0.8);
    for (const hit of projectileHits) {
      this.heroHp -= hit.damage;
      this.heroHurtFlashTimer = HERO_HURT_FLASH_DUR;
      if (this.heroHp < 0) this.heroHp = 0;
    }

    // Update gas clouds
    const gasHits = updateGasClouds(this.gasClouds, dt, this.hero.x, this.hero.y, this.gameTime);
    for (const hit of gasHits) {
      this.heroHp -= hit.damage;
      this.heroHurtFlashTimer = HERO_HURT_FLASH_DUR;
      if (this.heroHp < 0) this.heroHp = 0;
    }

    // Auto-attack
    const screenCX = CANVAS_W / 2;
    const screenCY = CANVAS_H / 2;
    const result = autoAttackUpdate(
      this.attackState, this.hero, this.enemies, this.attackSwing, dt
    );
    if (result.hit && result.target) {
      const { sx, sy } = worldToScreen(result.target.x, result.target.y);
      const hitX = sx - this.camera.offsetX + screenCX;
      const hitY = sy - this.camera.offsetY + screenCY;

      if (result.isCrit) {
        spawnCritSparks(this.particles, this.rings, hitX, hitY);
        spawnCritiqueEffect(this.spriteEffects, hitX, hitY);
        spawnDamageNumber(this.floatingTexts, hitX, hitY - 16, result.damage, true);
        spawnCritLabel(this.floatingTexts, hitX, hitY - 16);
      } else {
        spawnHitSparks(this.particles, hitX, hitY);
        spawnImpactEffect(this.spriteEffects, hitX, hitY);
        spawnDamageNumber(this.floatingTexts, hitX, hitY - 16, result.damage, false);
      }

      if (result.killed) {
        spawnDeathExplosion(this.particles, hitX, hitY, '#FF6040');
        // Drop pickups at enemy death position
        this.dropLoot(result.target.x, result.target.y, result.target.enemyType, result.target.isElite);
      }

      // Slash VFX
      const { sx: tsx, sy: tsy } = worldToScreen(result.target.x, result.target.y);
      const targetScreenX = tsx - this.camera.offsetX + screenCX;
      const targetScreenY = tsy - this.camera.offsetY + screenCY;
      const slashDx = targetScreenX - screenCX;
      const slashDy = targetScreenY - screenCY;
      const slashAngle = Math.atan2(slashDy, slashDx) * (180 / Math.PI);
      const midX = (screenCX + targetScreenX) / 2;
      const midY = (screenCY + targetScreenY) / 2;
      this.slashEffects.push({
        x: midX, y: midY,
        angleDeg: slashAngle,
        timer: 0,
        duration: SLASH_DURATION,
      });

      this.hitPauseTimer = result.hitPause;
      triggerCameraShake(this.cameraShake);
    }

    // Contact damage
    const contactDmg = applyContactDamage(this.hero, this.enemies, dt, this.gameTime);
    if (contactDmg > 0) {
      this.heroHp -= contactDmg;
      this.heroHurtFlashTimer = HERO_HURT_FLASH_DUR;
      if (this.heroHp < 0) this.heroHp = 0;
    }

    // Check hero death
    if (this.heroHp <= 0 && !this.heroDying) {
      this.heroDying = true;
      this.heroDeathTimer = 0;
      // Stop joystick input
      this.joystick.active = false;
      this.joystick.dirX = 0;
      this.joystick.dirY = 0;
      this.joystick.magnitude = 0;
      this.hero.isMoving = false;
      this.hero.vx = 0;
      this.hero.vy = 0;
      // Show death overlay (starts transparent, will fade in)
      this.viewModel.deathOverlayOpacity = 0;
      this.viewModel.deathOverlayVisible = true;
      console.log('[ArenaVerminComponent] Hero died, starting death animation');
      return; // Skip remaining game logic
    }

    // Pickups
    const collectionRadius = PICKUP_COLLECTION_RADIUS;
    const pickupEvents = updatePickups(this.pickups, dt, this.hero.x, this.hero.y, collectionRadius, PICKUP_MAGNET_RADIUS);
    for (const evt of pickupEvents) {
      if (evt.type === PickupType.GreenGem) {
        this.stats.xp += 3;
        this.checkLevelUp();
      } else if (evt.type === PickupType.HealthHeart) {
        // Heal the hero (capped at max)
        const oldHp = this.heroHp;
        this.heroHp = Math.min(HERO_HP, this.heroHp + HEALTH_RESTORE_AMOUNT);
        const healed = this.heroHp - oldHp;
        if (healed > 0) {
          // Spawn green floating text for healing
          const { sx, sy } = worldToScreen(evt.worldX, evt.worldY);
          const screenCX = CANVAS_W / 2;
          const screenCY = CANVAS_H / 2;
          const hx = sx - this.camera.offsetX + screenCX;
          const hy = sy - this.camera.offsetY + screenCY;
          spawnDamageNumber(this.floatingTexts, hx, hy - 16, healed, false, '#40FF40');
        }
      } else {
        this.stats.coins += 1;
      }
    }

    updateAttackSwing(this.attackSwing, dt);

    // Drone weapon update
    if (this.droneLevel > 0) {
      updateDrones(this.drones, this.hero.x, this.hero.y, this.enemies, dt, this.droneLevel, this.gameTime, this.droneProjectiles);
      const droneHits = updateDroneProjectiles(this.droneProjectiles, dt, this.enemies);
      for (const hit of droneHits) {
        const enemy = this.enemies[hit.enemyIndex];
        if (!enemy || enemy.isDead) continue;
        enemy.hp -= hit.damage;
        enemy.hurtTimer = 0.05;
        enemy.flashTimer = 0.05;
        if (enemy.hp <= 0) {
          enemy.isDead = true;
          enemy.deathTimer = 0;
          this.dropLoot(enemy.x, enemy.y, enemy.enemyType, enemy.isElite);
        }
      }
    }

    // Minigun weapon update
    if (this.minigunLevel > 0) {
      updateMinigun(this.minigunState, this.hero.x, this.hero.y, this.enemies, dt, this.minigunLevel, this.gameTime, this.minigunBullets);
      const minigunHits = updateMinigunBullets(this.minigunBullets, dt, this.enemies);
      for (const hit of minigunHits) {
        const enemy = this.enemies[hit.enemyIndex];
        if (!enemy || enemy.isDead) continue;
        enemy.hp -= hit.damage;
        enemy.hurtTimer = 0.05;
        enemy.flashTimer = 0.05;
        if (enemy.hp <= 0) {
          enemy.isDead = true;
          enemy.deathTimer = 0;
          this.dropLoot(enemy.x, enemy.y, enemy.enemyType, enemy.isElite);
        }
      }
    }

    // Damage circle weapon update
    if (this.damageCircleLevel > 0) {
      const circleHits = updateDamageCircle(
        this.damageCircleState, this.hero.x, this.hero.y,
        this.enemies, dt, this.damageCircleLevel, this.gameTime,
        this.damageCirclePulses,
      );
      for (const hit of circleHits) {
        const enemy = this.enemies[hit.enemyIndex];
        if (!enemy || enemy.isDead) continue;
        enemy.hp -= hit.damage;
        enemy.hurtTimer = 0.05;
        enemy.flashTimer = 0.05;
        if (enemy.hp <= 0) {
          enemy.isDead = true;
          enemy.deathTimer = 0;
          this.dropLoot(enemy.x, enemy.y, enemy.enemyType, enemy.isElite);
        }
      }
      updateDamageCirclePulses(this.damageCirclePulses, dt);
    }

    updateParticles(this.particles, this.rings, dt);
    updateSpriteEffects(this.spriteEffects, dt);
    updateFloatingTexts(this.floatingTexts, dt);
    updateCameraShake(this.cameraShake, dt);
    this.updateCamera();

    if (this.heroHurtFlashTimer > 0) {
      this.heroHurtFlashTimer -= dt;
      if (this.heroHurtFlashTimer < 0) this.heroHurtFlashTimer = 0;
    }

    removeFinishedEnemies(this.enemies);
    this.updateJoystickFade(dt);
    this.updateSlashEffects(dt);

    // Wave announcement timer
    if (this.waveAnnounceTimer > 0) {
      this.waveAnnounceTimer -= dt;
      if (this.waveAnnounceTimer <= 0) {
        this.waveAnnounceTimer = 0;
        this.viewModel.waveAnnouncementVisible = false;
      }
    }

    // Elite warning timer
    if (this.eliteWarningTimer > 0) {
      this.eliteWarningTimer -= dt;
      if (this.eliteWarningTimer <= 0) {
        this.eliteWarningTimer = 0;
        this.viewModel.eliteWarningVisible = false;
      }
    }

    // Boss warning timer
    if (this.bossWarningTimer > 0) {
      this.bossWarningTimer -= dt;
      if (this.bossWarningTimer <= 0) {
        this.bossWarningTimer = 0;
        this.viewModel.bossWarningVisible = false;
      }
    }

    // Boss HP bar update
    let bossAlive = false;
    for (const enemy of this.enemies) {
      if (enemy.enemyType === EnemyType.Boss && !enemy.isDead) {
        bossAlive = true;
        const pct = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
        this.viewModel.bossHpBarWidth = Math.floor(pct * 330);
        this.viewModel.bossHpBarText = `RAT KING  ${enemy.hp} / ${enemy.maxHp}`;
        break;
      }
    }
    this.viewModel.bossHpBarVisible = bossAlive;

    // Update HUD every frame
    this.updateHUD();
  }

  // === Loot & Progression ===

  private dropLoot(worldX: number, worldY: number, enemyType: EnemyType, isElite: boolean = false): void {
    let gemCount = GRUNT_GEM_DROP;
    let coinChance = GRUNT_COIN_CHANCE;
    let coinCount = 1;

    switch (enemyType) {
      case EnemyType.GunnerMouse:
        gemCount = GUNNER_GEM_DROP; coinChance = GUNNER_COIN_CHANCE; break;
      case EnemyType.DroneRat:
        gemCount = DRONE_GEM_DROP; coinChance = DRONE_COIN_CHANCE; break;
      case EnemyType.SewerBruiser:
        gemCount = BRUISER_GEM_DROP; coinChance = BRUISER_COIN_CHANCE; coinCount = BRUISER_COIN_DROP; break;
      case EnemyType.GasRat:
        gemCount = GAS_RAT_GEM_DROP; coinChance = GAS_RAT_COIN_CHANCE; break;
      case EnemyType.Boss:
        gemCount = BOSS_GEM_DROP; coinChance = BOSS_COIN_CHANCE; coinCount = BOSS_COIN_DROP; break;
    }

    // Elite enemies drop double loot
    if (isElite) {
      gemCount *= ELITE_LOOT_MULT;
      coinCount *= ELITE_LOOT_MULT;
    }

    for (let i = 0; i < gemCount; i++) {
      spawnPickup(this.pickups, worldX, worldY, PickupType.GreenGem);
    }
    if (Math.random() < coinChance) {
      for (let i = 0; i < coinCount; i++) {
        spawnPickup(this.pickups, worldX, worldY, PickupType.GoldCoin);
      }
    }
    // Health heart drop chance
    if (Math.random() < HEALTH_DROP_CHANCE || enemyType === EnemyType.Boss) {
      spawnPickup(this.pickups, worldX, worldY, PickupType.HealthHeart);
    }
  }

  private checkLevelUp(): void {
    while (this.stats.xp >= this.stats.xpToNext) {
      this.stats.xp -= this.stats.xpToNext;
      this.stats.level++;
      this.stats.xpToNext = calcXpToNext(this.stats.level);
      console.log('[ArenaVerminComponent] Level up! Level', this.stats.level);
      this.pendingLevelUps++;
    }
    // Show upgrade screen for the first pending level-up (if not already showing)
    if (this.pendingLevelUps > 0 && !this.isLevelUpScreen) {
      this.pendingLevelUps--;
      this.showUpgradeScreen();
    }
  }

  private showUpgradeScreen(): void {
    const upgrades = this.upgradeSystem.getAvailableUpgrades();
    if (upgrades.length === 0) return; // No upgrades available, skip
    this.pendingUpgrades = upgrades;
    this.isLevelUpScreen = true;
    this.viewModel.upgradeScreenVisible = true;

    // Populate upgrade cards
    for (let i = 0; i < 3; i++) {
      const u = upgrades[i];
      const visible = u != null;
      const name = u ? u.name : '';
      const desc = u ? u.description : '';
      const lvl = u ? (u.currentLevel === 0 ? 'NEW!' : `Lv ${u.currentLevel} → ${u.nextLevel}`) : '';
      if (i === 0) {
        this.viewModel.upgrade0Visible = visible;
        this.viewModel.upgrade0Name = name;
        this.viewModel.upgrade0Desc = desc;
        this.viewModel.upgrade0Level = lvl;
      } else if (i === 1) {
        this.viewModel.upgrade1Visible = visible;
        this.viewModel.upgrade1Name = name;
        this.viewModel.upgrade1Desc = desc;
        this.viewModel.upgrade1Level = lvl;
      } else {
        this.viewModel.upgrade2Visible = visible;
        this.viewModel.upgrade2Name = name;
        this.viewModel.upgrade2Desc = desc;
        this.viewModel.upgrade2Level = lvl;
      }
    }
    console.log('[ArenaVerminComponent] Upgrade screen shown with', upgrades.length, 'options');
  }

  private applyUpgradeChoice(index: number): void {
    if (index >= this.pendingUpgrades.length) return;
    const chosen = this.pendingUpgrades[index];
    const newLevel = this.upgradeSystem.applyUpgrade(chosen.weaponId);
    console.log('[ArenaVerminComponent] Applied upgrade:', chosen.name, 'now level', newLevel);

    // Handle drone weapon upgrade
    if (chosen.weaponId === WeaponId.Drone) {
      this.droneLevel = newLevel;
      this.drones = initDrones(newLevel);
    }

    // Handle minigun weapon upgrade
    if (chosen.weaponId === WeaponId.Minigun) {
      this.minigunLevel = newLevel;
      this.minigunState = initMinigun(newLevel);
    }

    // Handle damage circle weapon upgrade
    if (chosen.weaponId === WeaponId.DamageCircle) {
      this.damageCircleLevel = newLevel;
      this.damageCircleState = initDamageCircle(newLevel);
    }

    // Check if there are more pending level-ups
    if (this.pendingLevelUps > 0) {
      this.pendingLevelUps--;
      this.pendingUpgrades = [];
      this.showUpgradeScreen();
    } else {
      // Hide upgrade screen, resume game
      this.isLevelUpScreen = false;
      this.viewModel.upgradeScreenVisible = false;
      this.pendingUpgrades = [];
      this.lastTime = Date.now(); // Avoid dt spike
    }
  }

  private showWaveAnnouncement(wave: number): void {
    this.viewModel.waveAnnouncementText = `WAVE ${wave}`;
    this.viewModel.waveAnnouncementVisible = true;
    this.waveAnnounceTimer = HUD_WAVE_ANNOUNCE_DUR;
  }

  private updateHUD(): void {
    // HP bar (track width = 390 canvas − 20 border padding − 40 left margin = 330px)
    const hpPct = this.heroHp / HERO_HP;
    this.viewModel.hpBarWidth = Math.floor(hpPct * 330);
    this.viewModel.hpBarColorHex = hpPct > 0.25 ? '#40C040' : '#C04020';
    this.viewModel.hpText = `${this.heroHp} / ${HERO_HP}`;

    // Level bar (330px base − ~35px "Lv.X" label ≈ 290px available)
    const levelPct = this.stats.xpToNext > 0 ? this.stats.xp / this.stats.xpToNext : 0;
    this.viewModel.levelBarWidth = Math.floor(levelPct * 290);
    this.viewModel.levelBarText = `${this.stats.xp} / ${this.stats.xpToNext}`;

    // Wave number & player level
    this.viewModel.waveNumber = this.waveState.waveNumber;
    this.viewModel.playerLevel = this.stats.level;

    // Timer bar
    const timerPct = this.waveState.waveDuration > 0
      ? this.waveState.waveTimer / this.waveState.waveDuration : 0;
    this.viewModel.timerBarWidth = Math.floor(timerPct * 194);

    // Timer color (green > yellow > red)
    if (timerPct > 0.5) {
      this.viewModel.timerColorHex = '#50D050';
    } else if (timerPct > 0.2) {
      this.viewModel.timerColorHex = '#D0C030';
    } else {
      this.viewModel.timerColorHex = '#D04030';
    }

    // Wave bar (progress through 20 waves)
    const wavePct = Math.min(this.waveState.waveNumber / 20, 1);
    this.viewModel.waveBarWidth = Math.floor(wavePct * 78);

    // Enemy count
    const aliveCount = this.enemies.filter(e => !e.isDead && !e.isSpawning).length;
    this.viewModel.enemyCountText = String(aliveCount);

    // Coin count
    this.viewModel.coinCountText = String(this.stats.coins);
  }

  // === Reset ===

  private resetGame(): void {
    this.hero = {
      x: WORLD_W / 2, y: WORLD_H / 2,
      vx: 0, vy: 0, facing: 1, isMoving: false, animTime: 0,
    };
    this.heroHp = HERO_HP;
    this.heroHurtFlashTimer = 0;
    this.heroDying = false;
    this.heroDeathTimer = 0;
    this.camera = { offsetX: 0, offsetY: 0 };
    this.cameraShake = { active: false, timer: 0, magnitude: 0, frequency: 0, offsetX: 0, offsetY: 0 };
    this.enemies = [];
    this.attackState = { cooldown: 0, currentTarget: null, targetEvalTimer: 0 };
    this.attackSwing = { active: false, phase: 0, timer: 0, weaponRotDeg: 0, bodyScaleX: 1, bodyScaleY: 1 };
    this.hitPauseTimer = 0;
    this.particles = [];
    this.rings = [];
    this.floatingTexts = [];
    this.slashEffects = [];
    this.spriteEffects = [];
    this.waveState = initWaveSystem();
    this.pickups = [];
    this.projectiles = [];
    this.gasClouds = [];
    this.stats = { xp: 0, coins: 0, level: 1, xpToNext: calcXpToNext(1) };
    this.waveAnnounceTimer = 0;
    this.eliteWarningTimer = 0;
    this.viewModel.eliteWarningVisible = false;
    this.bossWarningTimer = 0;
    this.viewModel.bossWarningVisible = false;
    this.viewModel.bossHpBarVisible = false;
    this.gameTime = 0;
    this.lastTime = Date.now();
    // Reset upgrade/weapon system
    this.upgradeSystem.reset();
    this.drones = [];
    this.droneProjectiles = [];
    this.droneLevel = 0;
    this.minigunState = { lastFireTime: -999 };
    this.minigunBullets = [];
    this.minigunLevel = 0;
    this.damageCircleState = { lastPulseTime: -999 };
    this.damageCirclePulses = [];
    this.damageCircleLevel = 0;
    this.isLevelUpScreen = false;
    this.pendingUpgrades = [];
    this.pendingLevelUps = 0;
    this.viewModel.upgradeScreenVisible = false;
  }

  // === Input ===

  private enableTouchInput(): void {
    const service = FocusedInteractionService.get();
    try {
      service.enableFocusedInteraction({
        disableFocusExitButton: false,
        disableEmotesButton: true,
        interactionStringId: 'arena_vermin_touch',
      });
      service.setTapOptions(false, {
        startColor: new Color(0, 0, 0, 0),
        endColor: new Color(0, 0, 0, 0),
        duration: 0, startScale: 0, endScale: 0,
      });
      service.setTrailOptions(false, {
        startColor: new Color(0, 0, 0, 0),
        endColor: new Color(0, 0, 0, 0),
        startWidth: 0, endWidth: 0, length: 0,
      });
    } catch (e) {
      console.error('[ArenaVerminComponent] Failed to enable touch input:', e);
    }
  }

  private screenToCanvas(screenPos: Vec2): { x: number; y: number } {
    const gameAspect = CANVAS_W / CANVAS_H;
    const screenAspect = CameraModeProvisionalService.get().aspectRatio;
    let canvasX: number;
    let canvasY: number;

    if (screenAspect > gameAspect) {
      const gameWidthInScreenSpace = gameAspect / screenAspect;
      const offsetX = (1.0 - gameWidthInScreenSpace) / 2.0;
      canvasX = ((screenPos.x - offsetX) / gameWidthInScreenSpace) * CANVAS_W;
      canvasY = screenPos.y * CANVAS_H;
    } else {
      const gameHeightInScreenSpace = screenAspect / gameAspect;
      const offsetY = (1.0 - gameHeightInScreenSpace) / 2.0;
      canvasX = screenPos.x * CANVAS_W;
      canvasY = ((screenPos.y - offsetY) / gameHeightInScreenSpace) * CANVAS_H;
    }
    return { x: canvasX, y: canvasY };
  }

  @subscribe(OnFocusedInteractionInputStartedEvent)
  onTouchStart(payload: OnFocusedInteractionInputEventPayload) {
    if (payload.interactionIndex !== 0) return;
    if (this.gameState !== GameState.Playing || this.heroDying || this.isLevelUpScreen) return;
    const pos = this.screenToCanvas(payload.screenPosition);
    this.joystick.active = true;
    this.joystick.centerX = pos.x;
    this.joystick.centerY = pos.y;
    this.joystick.currentX = pos.x;
    this.joystick.currentY = pos.y;
    this.joystick.dirX = 0;
    this.joystick.dirY = 0;
    this.joystick.magnitude = 0;
    this.joystick.idleTime = 0;
  }

  @subscribe(OnFocusedInteractionInputMovedEvent)
  onTouchMove(payload: OnFocusedInteractionInputEventPayload) {
    if (payload.interactionIndex !== 0) return;
    if (!this.joystick.active) return;
    const pos = this.screenToCanvas(payload.screenPosition);
    this.joystick.currentX = pos.x;
    this.joystick.currentY = pos.y;

    const dx = pos.x - this.joystick.centerX;
    const dy = pos.y - this.joystick.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < JOY_RADIUS * JOY_DEAD_ZONE) {
      this.joystick.dirX = 0;
      this.joystick.dirY = 0;
      this.joystick.magnitude = 0;
    } else {
      this.joystick.dirX = dx / dist;
      this.joystick.dirY = dy / dist;
      const effectiveDist = dist / JOY_RADIUS;
      const normalizedMag = (effectiveDist - JOY_DEAD_ZONE) / (JOY_MAX_ZONE - JOY_DEAD_ZONE);
      this.joystick.magnitude = Math.min(1, Math.max(0, normalizedMag));
      this.joystick.idleTime = 0;
    }
  }

  @subscribe(OnFocusedInteractionInputEndedEvent)
  onTouchEnd(payload: OnFocusedInteractionInputEventPayload) {
    if (payload.interactionIndex !== 0) return;
    this.joystick.active = false;
    this.joystick.dirX = 0;
    this.joystick.dirY = 0;
    this.joystick.magnitude = 0;
  }

  // === Game Logic ===

  private updateHero(dt: number): void {
    // Flat 2D: screen directions map directly to world directions
    this.hero.vx = this.joystick.dirX * HERO_SPEED * this.joystick.magnitude;
    this.hero.vy = this.joystick.dirY * HERO_SPEED * this.joystick.magnitude;
    this.hero.isMoving = this.joystick.magnitude > 0;

    // Attempt unclamped movement first
    let newX = this.hero.x + this.hero.vx * dt;
    let newY = this.hero.y + this.hero.vy * dt;

    // Detect which world-space axes hit a boundary
    const xClamped = newX < 0 || newX > WORLD_W;
    const yClamped = newY < 0 || newY > WORLD_H;

    // Wall-slide with speed preservation:
    // When one axis is clamped, scale up the free axis to maintain original speed
    if ((xClamped || yClamped) && this.hero.isMoving) {
      let slideVx = xClamped ? 0 : this.hero.vx;
      let slideVy = yClamped ? 0 : this.hero.vy;

      const originalSpeed = Math.sqrt(this.hero.vx * this.hero.vx + this.hero.vy * this.hero.vy);
      const slideSpeed = Math.sqrt(slideVx * slideVx + slideVy * slideVy);

      if (slideSpeed > 0.0001 && originalSpeed > 0.0001) {
        const scale = originalSpeed / slideSpeed;
        slideVx *= scale;
        slideVy *= scale;
      }

      newX = this.hero.x + slideVx * dt;
      newY = this.hero.y + slideVy * dt;
    }

    this.hero.x = clampCoord(newX, WORLD_W);
    this.hero.y = clampCoord(newY, WORLD_H);

    if (this.joystick.magnitude > 0 && Math.abs(this.joystick.dirX) > 0.1) {
      this.hero.facing = this.joystick.dirX > 0 ? 1 : -1;
    }
    this.hero.animTime += dt;
  }

  private updateCamera(): void {
    const { sx, sy } = worldToScreen(this.hero.x, this.hero.y);
    this.camera.offsetX = sx;
    this.camera.offsetY = sy;

    // Rectangular clamp: keep camera within map bounds
    const mapW = WORLD_W * PIXELS_PER_UNIT;
    const mapH = WORLD_H * PIXELS_PER_UNIT;
    const halfCanvasW = CANVAS_W / 2;
    const halfCanvasH = CANVAS_H / 2;
    this.camera.offsetX = Math.max(halfCanvasW, Math.min(mapW - halfCanvasW, this.camera.offsetX));
    this.camera.offsetY = Math.max(halfCanvasH, Math.min(mapH - halfCanvasH, this.camera.offsetY));
  }

  private updateJoystickFade(dt: number): void {
    if (this.joystick.magnitude > 0) {
      this.joystick.idleTime = 0;
    } else {
      this.joystick.idleTime += dt;
    }
  }

  // === Rendering ===

  private render(): void {
    this.builder.clear();

    if (this.gameState === GameState.Playing || this.gameState === GameState.Paused) {
      this.renderGame();
    } else {
      this.builder.drawRect(titleBgBrush, null, { x: 0, y: 0, width: CANVAS_W, height: CANVAS_H });
    }

    this.viewModel.drawCommands = this.builder.build();

    // Crit effects overlay (rendered above XAML sprites)
    this.critBuilder.clear();
    if (this.gameState === GameState.Playing || this.gameState === GameState.Paused) {
      drawSpriteEffectsCrit(this.critBuilder, this.spriteEffects);
    }
    this.viewModel.critDrawCommands = this.critBuilder.build();
  }

  private renderGame(): void {
    const shakeX = this.cameraShake.offsetX;
    const shakeY = this.cameraShake.offsetY;
    if (shakeX !== 0 || shakeY !== 0) {
      this.builder.pushTranslate({x: shakeX, y: shakeY});
    }

    // 1. Tiles
    drawTileGrid(this.builder, this.camera);

    // 2. (Attack range ring removed)

    // 2.5 Projectiles & gas clouds (ground-level effects)
    drawGasClouds(this.builder, this.gasClouds, this.camera, this.hero.x, this.hero.y);
    drawProjectiles(this.builder, this.projectiles, this.camera, this.hero.x, this.hero.y);

    // 3. Pickups (above ground, below characters)
    drawPickups(this.builder, this.pickups, this.camera, this.gameTime);

    // 3.5 Drone weapon sprites (between pickups and slash)
    if (this.droneLevel > 0) {
      drawDrones(this.builder, this.drones, this.camera, this.hero.x, this.hero.y, this.droneLevel);
      if (this.droneProjectiles.length > 0) {
        drawDroneProjectiles(this.builder, this.droneProjectiles, this.camera);
      }
    }

    // 3.6 Minigun bullets
    if (this.minigunLevel > 0 && this.minigunBullets.length > 0) {
      drawMinigunBullets(this.builder, this.minigunBullets, this.camera);
    }

    // 3.7 Elite enemy markers (DrawingSurface floating indicators)
    drawEliteMarkers(this.builder, this.enemies, this.camera, this.cameraShake, this.hero.x, this.hero.y, this.gameTime);

    // 3.8 Damage circle pulse VFX
    if (this.damageCircleLevel > 0 && this.damageCirclePulses.length > 0) {
      drawDamageCirclePulses(this.builder, this.damageCirclePulses, this.camera);
    }

    // 4. Slash VFX
    this.drawSlashEffects();

    if (shakeX !== 0 || shakeY !== 0) {
      this.builder.pop();
    }

    // 5. Particles (screen-space, outside shake)
    drawParticles(this.builder, this.particles, this.rings);
    drawSpriteEffectsBase(this.builder, this.spriteEffects);

    // 6. Floating text
    drawFloatingTexts(this.builder, this.floatingTexts);

    // 7. Joystick
    this.drawJoystick();

    // 8. Update XAML sprite overlays (hero + enemies)
    updateHeroSprites(
      this.viewModel, this.hero, this.camera,
      this.attackSwing, this.heroHurtFlashTimer, this.cameraShake,
      this.heroDying, this.heroDeathTimer
    );
    updateEnemySprites(this.viewModel, this.enemies, this.camera, this.cameraShake, this.hero.x, this.hero.y, this.gameTime);
  }

  private drawJoystick(): void {
    if (!this.joystick.active) return;

    const fadeT = Math.min(this.joystick.idleTime / JOY_FADE_TIME, 1);
    const alpha = 1 - fadeT * (1 - JOY_FADE_ALPHA);

    const ringBrush = new SolidBrush(new Color(1, 1, 1, 0.15 * alpha));
    const ringPen = new Pen(new SolidBrush(new Color(1, 1, 1, 0.3 * alpha)), 2);
    this.builder.drawEllipse(
      ringBrush, ringPen,
      {x: this.joystick.centerX, y: this.joystick.centerY},
      {x: JOY_RADIUS, y: JOY_RADIUS}
    );

    const knobX = this.joystick.centerX + this.joystick.dirX * this.joystick.magnitude * JOY_RADIUS;
    const knobY = this.joystick.centerY + this.joystick.dirY * this.joystick.magnitude * JOY_RADIUS;
    const knobBrush = new SolidBrush(new Color(1, 1, 1, 0.4 * alpha));
    this.builder.drawEllipse(knobBrush, null, {x: knobX, y: knobY}, {x: 20, y: 20});
  }

  private updateSlashEffects(dt: number): void {
    for (let i = this.slashEffects.length - 1; i >= 0; i--) {
      this.slashEffects[i].timer += dt;
      if (this.slashEffects[i].timer >= this.slashEffects[i].duration) {
        this.slashEffects.splice(i, 1);
      }
    }
  }

  private drawSlashEffects(): void {
    for (const slash of this.slashEffects) {
      const t = slash.timer / slash.duration;
      const scaleT = t < 0.33 ? t / 0.33 : 1;
      const scale = SLASH_SCALE_START + (SLASH_SCALE_END - SLASH_SCALE_START) * scaleT;
      const alpha = 1 - t;

      const halfAngle = SLASH_ARC_HALF_ANGLE * (Math.PI / 180);
      const innerR = SLASH_RADIUS - SLASH_WIDTH / 2;
      const outerR = SLASH_RADIUS + SLASH_WIDTH / 2;

      const ax1 = outerR * Math.cos(-halfAngle);
      const ay1 = outerR * Math.sin(-halfAngle);
      const ax2 = outerR * Math.cos(halfAngle);
      const ay2 = outerR * Math.sin(halfAngle);
      const ix1 = innerR * Math.cos(halfAngle);
      const iy1 = innerR * Math.sin(halfAngle);
      const ix2 = innerR * Math.cos(-halfAngle);
      const iy2 = innerR * Math.sin(-halfAngle);

      const crescentPath = `M ${ax1.toFixed(1)} ${ay1.toFixed(1)} `
        + `A ${outerR.toFixed(1)} ${outerR.toFixed(1)} 0 0 1 ${ax2.toFixed(1)} ${ay2.toFixed(1)} `
        + `L ${ix1.toFixed(1)} ${iy1.toFixed(1)} `
        + `A ${innerR.toFixed(1)} ${innerR.toFixed(1)} 0 0 0 ${ix2.toFixed(1)} ${iy2.toFixed(1)} Z`;

      const r = 1;
      const g = 0.85 + 0.15 * (1 - t);
      const b = 0.5 * (1 - t);
      const slashBrush = new SolidBrush(new Color(r, g, b, 0.8 * alpha));

      this.builder.pushTranslate({x: slash.x, y: slash.y});
      this.builder.pushRotate(slash.angleDeg, {x: 0, y: 0});
      this.builder.pushScale({x: scale, y: scale}, {x: 0, y: 0});
      this.builder.drawPath(slashBrush, null, crescentPath);
      this.builder.pop();
      this.builder.pop();
      this.builder.pop();
    }
  }
}
