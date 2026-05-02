/**
 * GameComponent — Main game logic for the Suika Merge Game.
 *
 * Component Attachment: Scene Entity (with CustomUiComponent) — NOT the player
 * Component Networking: Local (client-side 2D UI game)
 * Component Ownership: Not Networked
 *
 * Handles: game loop, input (FocusedInteractionService), drop/merge logic,
 * physics stepping, rendering via GameRenderer, state management,
 * visual effects integration (particles, shake, chain, squash/stretch, danger),
 * multi-phase merge animations (compress → flash → pop-in with overshoot).
 */
import { CustomUiComponent } from 'meta/custom_ui';
import { DrawingCommandsBuilder } from 'meta/custom_ui_experimental';
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
  Vec2 as WorldsVec2,
} from 'meta/worlds';
import type { OnFocusedInteractionInputEventPayload } from 'meta/worlds';
import { CameraModeProvisionalService } from 'meta/worlds_provisional';

import { TIER_DEFS, pickRandomTier } from '../data/MergeLadder';
import { GameViewModel, onRestartClicked } from './GameViewModel';
import { GameState, MergePhase } from './Types';
import type { GameItem, FloatingTag, MergeAnimation } from './Types';
import {
  CANVAS_W,
  CANVAS_H,
  CONTAINER_LEFT,
  CONTAINER_RIGHT,
  DROP_Y,
  DANGER_LINE_Y,
  DROP_COOLDOWN,
  MERGE_COOLDOWN,
  GAME_OVER_DELAY,
  SCORE_COUNT_UP_SPEED,
  SCORE_PULSE_SCALE,
  SCORE_PULSE_DECAY,
  FLOAT_TAG_DURATION,
  FLOAT_TAG_SPEED,
} from './Constants';
import { physicsStep } from './Physics';
import { renderFullScene } from './GameRenderer';
import {
  spawnMergeParticles,
  updateParticles,
  updateShake,
  triggerShake,
  registerMerge,
  updateChain,
  getChainDepth,
  updateDangerShimmer,
  updateSquashStretch,
  detectLanding,
  applyMergeStretch,
  applyCollisionSquash,
  resetAllEffects,
} from './VisualEffects';

const VERBOSE_LOG = false;

// Merge animation phase durations (seconds)
const COMPRESS_DURATION = 0.12;
const FLASH_DURATION = 0.08;
const POPIN_DURATION = 0.30;

// PopIn spring parameters
const POPIN_SPRING_K = 200;
const POPIN_SPRING_DAMP = 10;

// Module-level best score persists across component instances within a session.
let bestScore = 0;

@component()
export class MergeGameComponent extends Component {
  private viewModel: GameViewModel = new GameViewModel();
  private builder: DrawingCommandsBuilder = new DrawingCommandsBuilder();

  // Game state
  private gameState: GameState = GameState.Playing;
  private items: GameItem[] = [];
  private score: number = 0;
  private nextItemId: number = 0;

  // Merge animations
  private mergeAnimations: MergeAnimation[] = [];

  // Score animation
  private displayedScore: number = 0;
  private scorePulse: number = 1.0;
  private floatingTags: FloatingTag[] = [];

  // Held item (the one being positioned before drop)
  private heldTier: number = 0;
  private heldX: number = CANVAS_W / 2;
  private hasHeldItem: boolean = true;

  // Next-up preview
  private nextTier: number = 0;

  // Drop cooldown
  private dropCooldownRemaining: number = 0;

  // Next preview pop animation (spring-based)
  private nextPreviewScale: number = 1.0;
  private nextPreviewVelocity: number = 0;
  private nextPreviewAnimating: boolean = false;

  // Game over detection
  private dangerTimer: number = 0;

  // Touch state
  private isTouching: boolean = false;
  private touchX: number = CANVAS_W / 2;

  // Timing
  private lastTime: number = 0;
  private frameCount: number = 0;
  private gameTime: number = 0;

  // Coordinate mapping
  private readonly gameAspectRatio = CANVAS_W / CANVAS_H;

  @subscribe(OnEntityCreateEvent)
  onCreate(): void {
    console.log('[MergeGameComponent] Initializing merge game');
    const customUi = this.entity.getComponent(CustomUiComponent);
    if (customUi != null) {
      customUi.dataContext = this.viewModel;
      console.log('[MergeGameComponent] ViewModel connected');
    } else {
      console.error('[MergeGameComponent] CustomUiComponent not found!');
    }
    this.startNewGame();
    this.render();
  }

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    this.enableTouchInput();
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    const now = Date.now();
    const rawDt = this.lastTime === 0 ? 1 / 72 : (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(rawDt, 1 / 30);

    this.frameCount++;
    this.gameTime += dt;

    if (this.gameState === GameState.Playing) {
      this.updatePlaying(dt);
    }

    // === Visual effects updates (run even when game over for particles to finish) ===
    this.updateMergeAnimations(dt);
    this.updateScaleAnimations(dt);
    updateSquashStretch(this.items, dt);
    updateParticles(dt);
    updateShake(dt);
    updateChain(this.gameTime);
    updateDangerShimmer(this.items, dt);

    // Next preview pop animation (spring physics)
    if (this.nextPreviewAnimating) {
      const force = (1.0 - this.nextPreviewScale) * 200;
      this.nextPreviewVelocity = (this.nextPreviewVelocity + force * dt) * Math.exp(-10 * dt);
      this.nextPreviewScale += this.nextPreviewVelocity * dt;

      // Settle when close to 1.0 with low velocity
      if (Math.abs(this.nextPreviewScale - 1.0) < 0.01 && Math.abs(this.nextPreviewVelocity) < 0.5) {
        this.nextPreviewScale = 1.0;
        this.nextPreviewVelocity = 0;
        this.nextPreviewAnimating = false;
      }
    }

    // Score count-up animation
    if (this.displayedScore !== this.score) {
      this.displayedScore += (this.score - this.displayedScore) * (1 - Math.exp(-dt / SCORE_COUNT_UP_SPEED * 10));
      if (Math.abs(this.score - this.displayedScore) < 0.5) {
        this.displayedScore = this.score;
      }
      this.viewModel.scoreText = String(Math.round(this.displayedScore));
    }

    // Score pulse decay
    if (this.scorePulse !== 1.0) {
      this.scorePulse = 1.0 + (this.scorePulse - 1.0) * Math.exp(-SCORE_PULSE_DECAY * dt);
      if (Math.abs(this.scorePulse - 1.0) < 0.005) {
        this.scorePulse = 1.0;
      }
      this.viewModel.scoreScale = this.scorePulse;
    }

    // Update floating tags
    this.updateFloatingTags(dt);

    this.render();
  }

  // === Touch Input ===

  private enableTouchInput(): void {
    if (!NetworkingService.get().isPlayerContext()) return;

    try {
      const service = FocusedInteractionService.get();
      service.enableFocusedInteraction({
        disableFocusExitButton: false,
        disableEmotesButton: true,
        interactionStringId: 'merge_game_touch',
      });

      service.setTapOptions(false, {
        startColor: new Color(0, 0, 0, 0),
        endColor: new Color(0, 0, 0, 0),
        duration: 0,
        startScale: 0,
        endScale: 0,
      });

      service.setTrailOptions(false, {
        startColor: new Color(0, 0, 0, 0),
        endColor: new Color(0, 0, 0, 0),
        startWidth: 0,
        endWidth: 0,
        length: 0,
      });

      console.log('[MergeGameComponent] Touch input enabled');
    } catch (e) {
      console.error('[MergeGameComponent] Failed to enable touch:', e);
    }
  }

  private screenToCanvas(screenPos: WorldsVec2): { x: number; y: number } {
    const screenAspect = CameraModeProvisionalService.get().aspectRatio;
    let canvasX: number;
    let canvasY: number;

    if (screenAspect > this.gameAspectRatio) {
      const gameWidthInScreenSpace = this.gameAspectRatio / screenAspect;
      const offsetX = (1.0 - gameWidthInScreenSpace) / 2.0;
      canvasX = ((screenPos.x - offsetX) / gameWidthInScreenSpace) * CANVAS_W;
      canvasY = screenPos.y * CANVAS_H;
    } else {
      const gameHeightInScreenSpace = screenAspect / this.gameAspectRatio;
      const offsetY = (1.0 - gameHeightInScreenSpace) / 2.0;
      canvasX = screenPos.x * CANVAS_W;
      canvasY = ((screenPos.y - offsetY) / gameHeightInScreenSpace) * CANVAS_H;
    }

    return { x: canvasX, y: canvasY };
  }

  @subscribe(OnFocusedInteractionInputStartedEvent)
  onTouchStart(payload: OnFocusedInteractionInputEventPayload): void {
    if (payload.interactionIndex !== 0) return;
    this.isTouching = true;
    const pos = this.screenToCanvas(payload.screenPosition);
    this.touchX = pos.x;
  }

  @subscribe(OnFocusedInteractionInputMovedEvent)
  onTouchMove(payload: OnFocusedInteractionInputEventPayload): void {
    if (payload.interactionIndex !== 0) return;
    const pos = this.screenToCanvas(payload.screenPosition);
    this.touchX = pos.x;
  }

  @subscribe(OnFocusedInteractionInputEndedEvent)
  onTouchEnd(payload: OnFocusedInteractionInputEventPayload): void {
    if (payload.interactionIndex !== 0) return;
    this.isTouching = false;

    if (this.gameState === GameState.Playing && this.hasHeldItem) {
      this.dropItem();
    }
  }

  // === Restart ===

  @subscribe(onRestartClicked)
  onRestart(): void {
    console.log('[MergeGameComponent] Restart clicked');
    this.startNewGame();
  }

  // === Game Logic ===

  private startNewGame(): void {
    this.items = [];
    this.score = 0;
    this.nextItemId = 0;
    this.gameState = GameState.Playing;
    this.dangerTimer = 0;
    this.dropCooldownRemaining = 0;
    this.gameTime = 0;
    this.mergeAnimations = [];

    // Reset score animation state
    this.displayedScore = 0;
    this.scorePulse = 1.0;
    this.floatingTags = [];

    this.heldTier = pickRandomTier(Math.random());
    this.nextTier = pickRandomTier(Math.random());
    this.heldX = CANVAS_W / 2;
    this.hasHeldItem = true;

    this.viewModel.scoreText = '0';
    this.viewModel.gameOverVisible = false;
    this.viewModel.isNewBest = false;
    this.viewModel.scoreScale = 1.0;
    this.viewModel.bestScoreText = String(bestScore);

    // Reset all visual effects
    resetAllEffects();

    if (VERBOSE_LOG) {
      console.log('[MergeGameComponent] New game started');
    }
  }

  private updatePlaying(dt: number): void {
    // Update held item position from touch
    if (this.hasHeldItem) {
      const r = TIER_DEFS[this.heldTier].radius;
      this.heldX = Math.max(
        CONTAINER_LEFT + r,
        Math.min(CONTAINER_RIGHT - r, this.touchX)
      );
    }

    // Drop cooldown
    if (this.dropCooldownRemaining > 0) {
      this.dropCooldownRemaining -= dt;
      if (this.dropCooldownRemaining <= 0) {
        this.dropCooldownRemaining = 0;
        this.heldTier = this.nextTier;
        this.nextTier = pickRandomTier(Math.random());
        this.hasHeldItem = true;

        // Trigger next-preview pop animation
        this.nextPreviewScale = 0;
        this.nextPreviewVelocity = 8;
        this.nextPreviewAnimating = true;
      }
    }

    // Update merge cooldowns
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].mergeCooldown > 0) {
        this.items[i].mergeCooldown -= dt;
      }
    }

    // Detect landings for squash/stretch (BEFORE physics updates prevVy)
    for (let i = 0; i < this.items.length; i++) {
      if (!this.items[i].merging) {
        detectLanding(this.items[i]);
      }
    }

    // Physics step (returns merge pairs and collision impacts)
    const { mergePairs, impacts } = physicsStep(this.items, dt);

    // Apply collision squash from impacts
    for (let k = 0; k < impacts.length; k++) {
      const imp = impacts[k];
      if (imp.itemIndex < this.items.length) {
        applyCollisionSquash(this.items[imp.itemIndex], imp.intensity);
      }
    }

    // Store current vy as prevVy for next frame's landing detection
    for (let i = 0; i < this.items.length; i++) {
      this.items[i].prevVy = this.items[i].vy;
    }

    // Process merges — starts merge animations instead of immediate removal
    this.processMerges(mergePairs);

    // Check game over condition
    this.checkGameOver(dt);
  }

  private dropItem(): void {
    if (!this.hasHeldItem) return;

    const tier = this.heldTier;
    const def = TIER_DEFS[tier];

    const item: GameItem = {
      id: this.nextItemId++,
      tier: tier,
      x: this.heldX,
      y: DROP_Y,
      vx: 0,
      vy: 0,
      radius: def.radius,
      mergeCooldown: 0,
      scaleAnim: 1,
      angle: 0,
      angularVelocity: 0,
      squashX: 1,
      squashY: 1,
      squashDecay: 12,
      squashVelX: 0,
      squashVelY: 0,
      merging: false,
      idlePhase: Math.random() * Math.PI * 2,
      prevVy: 0,
    };

    this.items.push(item);
    this.hasHeldItem = false;
    this.dropCooldownRemaining = DROP_COOLDOWN;

    if (VERBOSE_LOG) {
      console.log(`[MergeGameComponent] Dropped tier ${tier} at x=${this.heldX.toFixed(0)}`);
    }
  }

  /**
   * Process merge pairs by starting multi-phase merge animations.
   * Instead of immediately removing items and spawning the result,
   * we freeze the merging items and create a MergeAnimation to animate the transition.
   */
  private processMerges(mergePairs: Array<[number, number]>): void {
    if (mergePairs.length === 0) return;

    const mergedIndices = new Set<number>();

    for (const [idxA, idxB] of mergePairs) {
      if (mergedIndices.has(idxA) || mergedIndices.has(idxB)) continue;

      const a = this.items[idxA];
      const b = this.items[idxB];

      if (a.tier !== b.tier || a.mergeCooldown > 0 || b.mergeCooldown > 0) continue;
      if (a.merging || b.merging) continue;

      const nextTierIdx = TIER_DEFS[a.tier].mergesInto;
      if (nextTierIdx < 0) continue;

      mergedIndices.add(idxA);
      mergedIndices.add(idxB);

      // Mark items as merging — freeze them
      a.merging = true;
      b.merging = true;
      a.vx = 0;
      a.vy = 0;
      b.vx = 0;
      b.vy = 0;

      const newDef = TIER_DEFS[nextTierIdx];
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;

      // Register chain and get depth
      registerMerge(this.gameTime);
      const chain = getChainDepth();

      // Award score and show floating tag immediately (responsive feel)
      this.score += newDef.score;
      this.scorePulse = SCORE_PULSE_SCALE;

      this.floatingTags.push({
        x: midX,
        y: midY,
        text: `+${newDef.score}`,
        alpha: 1.0,
        timer: FLOAT_TAG_DURATION,
      });

      if (this.score > bestScore) {
        bestScore = this.score;
        this.viewModel.bestScoreText = String(bestScore);
      }

      // Create merge animation in Compress phase
      const anim: MergeAnimation = {
        phase: MergePhase.Compress,
        timer: COMPRESS_DURATION,
        midX,
        midY,
        itemAId: a.id,
        itemBId: b.id,
        newTier: nextTierIdx,
        colorHex: newDef.color,
        chainDepth: chain,
        aStartX: a.x,
        aStartY: a.y,
        bStartX: b.x,
        bStartY: b.y,
        popScale: 0,
        popVelocity: 0,
        newItemId: -1,
        flashAlpha: 0,
      };

      this.mergeAnimations.push(anim);

      if (VERBOSE_LOG) {
        console.log(`[MergeGameComponent] Merge anim started: 2x tier ${a.tier} -> tier ${nextTierIdx} (chain ${chain})`);
      }
    }
  }

  /**
   * Update all active merge animations.
   * Phases: Compress → Flash → PopIn → done.
   */
  private updateMergeAnimations(dt: number): void {
    for (let i = this.mergeAnimations.length - 1; i >= 0; i--) {
      const anim = this.mergeAnimations[i];
      anim.timer -= dt;

      if (anim.phase === MergePhase.Compress) {
        this.updateCompressPhase(anim, dt);
      } else if (anim.phase === MergePhase.Flash) {
        this.updateFlashPhase(anim, dt);
      } else if (anim.phase === MergePhase.PopIn) {
        this.updatePopInPhase(anim, dt, i);
      }
    }
  }

  private updateCompressPhase(anim: MergeAnimation, dt: number): void {
    // Lerp items toward midpoint
    const progress = 1.0 - Math.max(0, anim.timer / COMPRESS_DURATION);
    const t = this.easeInQuad(progress);

    const itemA = this.findItemById(anim.itemAId);
    const itemB = this.findItemById(anim.itemBId);

    if (itemA) {
      itemA.x = anim.aStartX + (anim.midX - anim.aStartX) * t;
      itemA.y = anim.aStartY + (anim.midY - anim.aStartY) * t;
      // Compress squash (shrink horizontally)
      itemA.squashX = 1.0 - 0.3 * t;
      itemA.squashY = 1.0 + 0.15 * t;
    }
    if (itemB) {
      itemB.x = anim.bStartX + (anim.midX - anim.bStartX) * t;
      itemB.y = anim.bStartY + (anim.midY - anim.bStartY) * t;
      itemB.squashX = 1.0 - 0.3 * t;
      itemB.squashY = 1.0 + 0.15 * t;
    }

    // Transition to Flash phase
    if (anim.timer <= 0) {
      // Remove both merging items
      this.removeItemById(anim.itemAId);
      this.removeItemById(anim.itemBId);

      anim.phase = MergePhase.Flash;
      anim.timer = FLASH_DURATION;
      anim.flashAlpha = 1.0;

      // Spawn particles
      spawnMergeParticles(anim.midX, anim.midY, anim.colorHex, anim.chainDepth);

      // Screen shake on chain depth >= 3
      if (anim.chainDepth >= 3) {
        triggerShake(2 + anim.chainDepth * 1.5);
      }
    }
  }

  private updateFlashPhase(anim: MergeAnimation, dt: number): void {
    // Fade flash alpha
    const progress = 1.0 - Math.max(0, anim.timer / FLASH_DURATION);
    anim.flashAlpha = 1.0 - progress * 0.5; // Keep some flash for PopIn

    // Transition to PopIn phase
    if (anim.timer <= 0) {
      anim.phase = MergePhase.PopIn;
      anim.timer = POPIN_DURATION;
      anim.popScale = 0;
      anim.popVelocity = 8; // Initial outward burst velocity

      // Create the new merged item at midpoint with scale 0
      const newDef = TIER_DEFS[anim.newTier];
      const newItem: GameItem = {
        id: this.nextItemId++,
        tier: anim.newTier,
        x: anim.midX,
        y: anim.midY,
        vx: 0,
        vy: 0,
        radius: newDef.radius,
        mergeCooldown: MERGE_COOLDOWN,
        scaleAnim: 0,
        angle: 0,
        angularVelocity: 0,
        squashX: 1,
        squashY: 1,
        squashDecay: 12,
        squashVelX: 0,
        squashVelY: 0,
        merging: false,
        idlePhase: Math.random() * Math.PI * 2,
        prevVy: 0,
      };

      this.items.push(newItem);
      anim.newItemId = newItem.id;
    }
  }

  private updatePopInPhase(anim: MergeAnimation, dt: number, animIndex: number): void {
    // Spring physics for popScale: target = 1.0
    const force = (1.0 - anim.popScale) * POPIN_SPRING_K;
    anim.popVelocity = (anim.popVelocity + force * dt) * Math.exp(-POPIN_SPRING_DAMP * dt);
    anim.popScale += anim.popVelocity * dt;

    // Fade flash
    anim.flashAlpha = Math.max(0, anim.flashAlpha - dt * 8);

    // Apply popScale as the item's scaleAnim
    const newItem = this.findItemById(anim.newItemId);
    if (newItem) {
      newItem.scaleAnim = Math.max(0, anim.popScale);
    }

    // Complete when settled (scale near 1.0 with low velocity) or timer expired
    const settled = Math.abs(anim.popScale - 1.0) < 0.01 && Math.abs(anim.popVelocity) < 0.5;
    if (settled || anim.timer <= 0) {
      if (newItem) {
        newItem.scaleAnim = 1;
        // Apply merge stretch for the rubbery bounce
        applyMergeStretch(newItem);
      }
      this.mergeAnimations.splice(animIndex, 1);
    }
  }

  /** Quadratic ease-in: starts slow, accelerates */
  private easeInQuad(t: number): number {
    return t * t;
  }

  private findItemById(id: number): GameItem | null {
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].id === id) return this.items[i];
    }
    return null;
  }

  private removeItemById(id: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      if (this.items[i].id === id) {
        this.items.splice(i, 1);
        return;
      }
    }
  }

  private checkGameOver(dt: number): void {
    let anyAbove = false;
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (item.merging) continue;
      if (item.y - item.radius < DANGER_LINE_Y && item.mergeCooldown <= 0) {
        if (item.vy < 50) {
          anyAbove = true;
          break;
        }
      }
    }

    if (anyAbove) {
      this.dangerTimer += dt;
      if (this.dangerTimer >= GAME_OVER_DELAY) {
        this.triggerGameOver();
      }
    } else {
      this.dangerTimer = 0;
    }
  }

  private triggerGameOver(): void {
    this.gameState = GameState.GameOver;
    this.hasHeldItem = false;
    this.viewModel.gameOverVisible = true;
    this.viewModel.isNewBest = (this.score >= bestScore && this.score > 0);
    this.displayedScore = this.score;
    this.viewModel.scoreText = String(this.score);
    console.log(`[MergeGameComponent] Game Over! Final score: ${this.score}${this.viewModel.isNewBest ? ' (NEW BEST!)' : ''}`);
  }

  private updateScaleAnimations(dt: number): void {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      // Only do linear scale-up for items NOT controlled by a merge popIn animation
      if (item.scaleAnim < 1 && !this.isItemInPopIn(item.id)) {
        item.scaleAnim = Math.min(1, item.scaleAnim + dt * 8);
      }
    }
  }

  /** Check if an item is currently being animated by a PopIn merge phase */
  private isItemInPopIn(itemId: number): boolean {
    for (let i = 0; i < this.mergeAnimations.length; i++) {
      if (this.mergeAnimations[i].phase === MergePhase.PopIn &&
          this.mergeAnimations[i].newItemId === itemId) {
        return true;
      }
    }
    return false;
  }

  private updateFloatingTags(dt: number): void {
    for (let i = this.floatingTags.length - 1; i >= 0; i--) {
      const tag = this.floatingTags[i];
      tag.timer -= dt;
      tag.y -= FLOAT_TAG_SPEED * dt;
      tag.alpha = Math.max(0, tag.timer / FLOAT_TAG_DURATION);
      if (tag.timer <= 0) {
        this.floatingTags.splice(i, 1);
      }
    }
  }

  // === Rendering ===

  private render(): void {
    const bobOffset = Math.sin(this.frameCount * 0.06) * 3;

    renderFullScene(
      this.builder,
      this.items,
      this.floatingTags,
      this.mergeAnimations,
      this.hasHeldItem,
      this.heldX,
      this.heldTier,
      this.nextTier,
      bobOffset,
      this.gameState === GameState.Playing,
      this.frameCount,
      this.gameTime,
      this.nextPreviewScale,
    );

    this.viewModel.drawCommands = this.builder.build();
  }
}
