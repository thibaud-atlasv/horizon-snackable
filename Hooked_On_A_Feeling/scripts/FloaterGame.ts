/**
 * FloaterGame — Main game component for Hooked on a Feeling.
 * Manages Cast loop, input, state machine, rendering, save/load.
 * New in v2: 4-action system (WAIT/TWITCH/DRIFT/REEL), emotion icons,
 * affection bar, catch sequence, endings, per-cast progression.
 *
 * Component Attachment: Scene Entity (2d_game_entity)
 * Component Networking: Local (single-player 2D game)
 * Component Ownership: Not Networked
 */

import {
  Component,
  component,
  subscribe,
} from 'meta/platform_api';
import {
  OnEntityCreateEvent,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  OnWorldUpdateEventPayload,
} from 'meta/platform_api';
import { CustomUiComponent, DrawingCommandsBuilder } from 'meta/custom_ui';
import {
  FocusedInteractionService,
  OnFocusedInteractionInputStartedEvent,
  OnFocusedInteractionInputEventPayload,
  NetworkingService,
  Vec2,
} from 'meta/worlds';
import { CameraModeProvisionalService } from 'meta/worlds_provisional';
import type { Maybe } from 'meta/worlds';

import {
  floaterVM,
  onFloaterStartGame,
  onFloaterActionSelected,
  onFloaterNewCast,
  onFloaterSkipBeat,
  onFloaterCastStart,
  onFloaterCatchChoice,
  onJournalOpen,
  onJournalClose,
  onJournalTabSwitch,
  onInventoryOpen,
  onInventoryClose,
  onInventoryEquip,
  FloaterActionSelectedPayload,
  FloaterTabSelectedPayload,
  FloaterLureSelectedPayload,
  FloaterCatchChoicePayload,
} from './FloaterViewModel';
import { FloaterRenderer } from './FloaterRenderer';
import { FlagSystem } from './FlagSystem';
import { SaveSystem } from './SaveSystem';
import { AffectionSystem } from './AffectionSystem';
import { createNereia, getBeatsForTier, getCastForTier, getCastCountForTier } from './CastData';
import { characterRegistry } from './CharacterRegistry';
import { QuestSystem } from './QuestSystem';
import { EncounterSystem } from './EncounterSystem';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, GAME_ASPECT_RATIO,
  AFFECTION_TIER_1_MAX, AFFECTION_TIER_2_MAX, AFFECTION_TIER_3_MAX, AFFECTION_TIER_4_MAX,
  APPROACH_DURATION, DEPARTURE_DURATION,
  TEXT_DISPLAY_SPEED, BEAT_PAUSE_DURATION,
  GAUGE_CYCLE_TIME, AFFECTION_MAX,
  CAST_START_X, CAST_START_Y, CAST_TARGET_X, CAST_TARGET_Y,
  CAST_FLIGHT_TIME, CAST_MIN_ARC_HEIGHT, CAST_MAX_ARC_HEIGHT,
  SPLASH_RIPPLE_COUNT, SPLASH_RIPPLE_DELAY,
  SPLASH_RIPPLE_EXPAND_SPEED, FLOAT_LANDED_PAUSE,
  FISH_PORTRAIT_X, FISH_PORTRAIT_Y, FISH_PORTRAIT_SIZE,
  EMOTION_ICON_DURATION, EMOTION_ICON_FADE_TIME, EMOTION_ICON_SPACING, EMOTION_ICON_Y_OFFSET, EMOTION_ICON_BOUNCE_TIME, FLOAT_SURPRISE_EMOJI_DURATION,
  FLOAT_X, FLOAT_Y, FLOAT_BOB_SPEED, FLOAT_BOB_AMPLITUDE,
  FLOAT_BOUNCE_DURATION, FLOAT_BOUNCE_COUNT, FLOAT_BOUNCE_AMPLITUDE,
  ACTION_ANIM_WAIT_DURATION, ACTION_ANIM_WAIT_AMPLITUDE, ACTION_ANIM_WAIT_SPEED,
  ACTION_ANIM_REEL_DURATION, ACTION_ANIM_REEL_PULL_Y, ACTION_ANIM_REEL_BOUNCE_COUNT, ACTION_ANIM_REEL_BOUNCE_DECAY,
  ACTION_ANIM_DRIFT_DURATION, ACTION_ANIM_DRIFT_AMPLITUDE_X, ACTION_ANIM_DRIFT_AMPLITUDE_Y,
  ACTION_ANIM_TWITCH_DURATION, ACTION_ANIM_TWITCH_AMPLITUDE_Y, ACTION_ANIM_TWITCH_AMPLITUDE_X,
  USE_POV_CAST_ANIMATION,
  USE_3D_PHYSICS_CAST,
  CAST_3D_GRAVITY_Y, CAST_3D_NUM_LINE_SEGMENTS, CAST_3D_SEGMENT_LENGTH,
  CAST_3D_FOCAL_LENGTH, CAST_3D_WATER_Y, CAST_3D_MAX_FLIGHT_TIME,
  CAST_3D_BASE_SPEED, CAST_3D_POWER_MULTIPLIER, CAST_3D_START_DEPTH, CAST_3D_SCALE_MULTIPLIER,
  CAST_3D_CALC_MIN_FLIGHT_TIME, CAST_3D_CALC_MAX_FLIGHT_TIME,
  CAST_LANDING_NEAR_Y, CAST_LANDING_FAR_Y, CAST_LANDING_X_VARIANCE,
  POV_CAST_START_X, POV_CAST_START_Y, POV_CAST_START_SCALE, POV_CAST_END_SCALE, POV_CAST_FLIGHT_TIME,
  POV_CAST_PEAK_X, POV_CAST_PEAK_Y, POV_CAST_PEAK_SCALE, POV_CAST_PEAK_T,
  POV_LINE_START_X, POV_LINE_START_Y,
  ROD_3D_LENGTH, ROD_3D_BASE_X, ROD_3D_BASE_Y, ROD_3D_BASE_Z,
  ROD_3D_INITIAL_ANGLE, ROD_3D_TIP_Z_FACTOR,
  ROD_PHASE_WINDUP_END, ROD_PHASE_ACCELERATE_END, ROD_PHASE_RELEASE_END,
  ROD_WINDUP_PULLBACK, ROD_ACCELERATE_SWING, ROD_RELEASE_ANGLE, ROD_FOLLOWTHROUGH_SETTLE,
  RodState,
  ActionId,
  NOTHING_BITES_DURATION,
} from './Constants';
import { Vec3D } from './Vec3D';
import {
  GamePhase, DriftState, ExpressionState,
  AffectionTier, TIER_NAMES, EmotionIconType, CatchChoice, EndingType,
} from './Types';
import type { Beat, ActionEffect, FishCharacter, FishAffection, SaveData, SplashRipple, FloatingEmotionIcon, EmotionIconAnchor, CharacterConfig } from './Types';

@component()
export class FloaterGame extends Component {
  // Core systems
  private builder: DrawingCommandsBuilder = new DrawingCommandsBuilder();
  private renderer: Maybe<FloaterRenderer> = null;
  private flagSystem: FlagSystem = new FlagSystem();
  private saveSystem: SaveSystem = new SaveSystem();
  private affectionSystem: AffectionSystem = new AffectionSystem();
  private questSystem: QuestSystem = new QuestSystem();
  private encounterSystem: EncounterSystem = new EncounterSystem();

  // Affection data
  private fishAffection: FishAffection = this.affectionSystem.createAffection('nereia'); // Re-initialized in loadGame()
  private sessionId: string = `session_${Date.now()}`;

  // Game state
  private phase: GamePhase = GamePhase.Title;
  private fish: FishCharacter = createNereia();
  private beats: Beat[] = [];
  private currentBeatIndex: number = 0;
  private seenBeats: Set<string> = new Set();
  private castCount: number = 0;
  private castIndexWithinTier: number = 0;
  private driftScaredCount: number = 0;
  private equippedLureId: string | null = null;
  private perFishCastIndex: Record<string, number> = {};

  // Dialogue state
  private currentLines: string[] = [];
  private currentLineIndex: number = 0;
  private displayedText: string = '';
  private textProgress: number = 0;
  private isTextComplete: boolean = false;
  private isShowingReaction: boolean = false;

  // Timing
  private time: number = 0;
  private lastTime: number = 0;
  private phaseTimer: number = 0;
  private beatPauseTimer: number = 0;
  private tierNotifyTimer: number = 0;
  private noLureWarningTimer: number = 0;
  private nothingBitesTimer: number = 0;

  // Silent Beat (Four Minutes)
  private silentBeatActive: boolean = false;
  private silentBeatTimer: number = 0;
  private silentBeatDuration: number = 0;
  private silentBeatUnlocked: boolean = false;

  // Float animation
  private floatDip: number = 0;
  private lineTension: number = 0.5;

  // Action Animation State
  private actionAnimType: ActionId | null = null;
  private actionAnimTimer: number = 0;
  private actionAnimDuration: number = 0;
  private actionAnimOffsetX: number = 0;
  private actionAnimOffsetY: number = 0;

  // Fish approach/departure
  private fishAlpha: number = 0;

  // Skip system
  private canSkip: boolean = false;

  // Cast Mechanics
  private powerGaugeValue: number = 0;
  private powerGaugeDir: number = 1;
  private castFlightT: number = 0;
  private castPower: number = 50;
  private castFloatX: number = 0;
  private castFloatY: number = 0;
  private castFloatScale: number = 1.0;
  private splashRipples: SplashRipple[] = [];
  private splashTimer: number = 0;
  private floatLandedTimer: number = 0;

  // Landing line transition (smooth morph from 3D physics line to resting Bézier)
  private landingLineSnapshot: { x: number; y: number }[] = [];

  // Float Bounce (post-landing)
  private floatBounceTimer: number = 0;
  private surpriseEmojiTimer: number = 0;
  private showingSurpriseEmoji: boolean = false;

  // Pre-determined encounter result (resolved at bounce start, consumed by startCast)
  private pendingEncounterCharacter: CharacterConfig | null = null;

  // Dynamic landing target (varies with power)
  private landingTargetX: number = FLOAT_X;
  private landingTargetY: number = FLOAT_Y;

  // 3D Physics Cast State
  private floater3DPos: Vec3D = new Vec3D();
  private floater3DVel: Vec3D = new Vec3D();
  private lineSegments3D: Vec3D[] = [];
  private castFlyingTimer: number = 0;
  private lineExtensionProgress: number = 0;
  private lastCastPower: number = 50;
  private castPeakFraction: number = 0.4; // Fraction of flight at which float peaks (computed per-cast)

  // 3D Fishing Rod State
  private rod3D: { basePos: Vec3D; tipPos: Vec3D; angle: number } = {
    basePos: new Vec3D(),
    tipPos: new Vec3D(),
    angle: 0,
  };
  private rodState: RodState = RodState.WindUp;

  // Approach Sequence Timers (cinematic bite → portrait → emotion)
  private approachPortraitDelay: number = 0.3; // seconds before portrait starts fading in
  private approachEmotionDelay: number = 0.8; // seconds before emotion icon appears
  private approachEmotionSpawned: boolean = false; // whether the arrival icon has been spawned this approach

  // Portrait Animation
  private portraitAnimType: 'none' | 'shake' | 'bounce' = 'none';
  private portraitAnimTimer: number = 0;
  private portraitAnimDuration: number = 0;
  private portraitOffsetX: number = 0;
  private portraitOffsetY: number = 0;

  // Emotion Icons
  private floatingIcons: FloatingEmotionIcon[] = [];

  // Catch Sequence
  private catchDialogueIndex: number = 0;
  private catchDialogueShown: boolean = false;

  // Ending
  private currentEnding: EndingType = EndingType.Reel;

  @subscribe(OnEntityCreateEvent)
  onCreate(): void {
    this.renderer = new FloaterRenderer(this.builder);
    const customUi = this.entity.getComponent(CustomUiComponent);
    if (customUi != null) { customUi.dataContext = floaterVM; }
    this.loadGame();
    this.render();
    console.log('[FloaterGame] Created');
  }

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (!NetworkingService.get().isPlayerContext()) return;
    this.enableTouchInput();
    console.log('[FloaterGame] Started, touch enabled');
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    const now = Date.now();
    const dt = this.lastTime === 0 ? 1 / 72 : (now - this.lastTime) / 1000;
    this.lastTime = now;
    const clampedDt = Math.min(dt, 1 / 30);
    this.time += clampedDt;

    this.saveSystem.update(clampedDt, () => this.buildSaveData());
    this.updatePhase(clampedDt);
    this.updateFloat(clampedDt);
    this.updateActionAnimation(clampedDt);
    this.updateEmotionIcons(clampedDt);
    this.updatePortraitAnimation(clampedDt);
    this.render();
  }

  // === Event Handlers ===

  @subscribe(onFloaterStartGame)
  onStartGame(): void {
    console.log('[FloaterGame] Start game → LakeIdle');
    floaterVM.titleVisible = false;
    this.enterLakeIdle();
  }

  @subscribe(onFloaterActionSelected)
  onActionSelected(payload: FloaterActionSelectedPayload): void {
    if (this.phase !== GamePhase.ActionSelect) return;
    const actionId = payload.parameter as ActionId;
    console.log(`[FloaterGame] Action selected: ${actionId}`);
    this.handleAction(actionId);
  }

  @subscribe(onFloaterNewCast)
  onNewCast(): void {
    if (this.phase !== GamePhase.Idle) return;
    floaterVM.idleVisible = false;
    this.enterLakeIdle();
  }

  @subscribe(onFloaterSkipBeat)
  onSkipBeat(): void {
    if (!this.canSkip) return;
    this.advanceBeat();
  }

  @subscribe(onFloaterCastStart)
  onCastStart(): void {
    if (this.phase !== GamePhase.LakeIdle) return;
    console.log('[FloaterGame] Cast button pressed → CastCharging');
    this.phase = GamePhase.CastCharging;
    this.powerGaugeValue = 0;
    this.powerGaugeDir = 1;
    floaterVM.castButtonVisible = false;
    floaterVM.inventoryButtonVisible = false;
    floaterVM.journalButtonVisible = false;
  }

  @subscribe(onFloaterCatchChoice)
  onCatchChoiceEvent(payload: FloaterCatchChoicePayload): void {
    if (this.phase !== GamePhase.CatchSequence) return;
    const choice = payload.parameter as CatchChoice;
    console.log(`[FloaterGame] Catch choice: ${choice}`);
    floaterVM.catchChoiceVisible = false;

    if (choice === CatchChoice.Reel) {
      this.triggerEnding(EndingType.Reel);
    } else {
      this.triggerEnding(EndingType.Release);
    }
  }

  // === Journal/Inventory Events ===
  @subscribe(onJournalOpen)
  onJournalOpenEvent(): void { floaterVM.journalVisible = true; floaterVM.setJournalTab(0); }

  @subscribe(onJournalClose)
  onJournalCloseEvent(): void { floaterVM.journalVisible = false; }

  @subscribe(onJournalTabSwitch)
  onJournalTabSwitchEvent(payload: FloaterTabSelectedPayload): void {
    const idx = parseInt(payload.parameter, 10);
    if (idx >= 0 && idx <= 2) floaterVM.setJournalTab(idx);
  }

  @subscribe(onInventoryOpen)
  onInventoryOpenEvent(): void {
    if (this.phase !== GamePhase.LakeIdle && this.phase !== GamePhase.Idle) return;
    floaterVM.inventoryVisible = true;
  }

  @subscribe(onInventoryClose)
  onInventoryCloseEvent(): void { floaterVM.inventoryVisible = false; }

  @subscribe(onInventoryEquip)
  onInventoryEquipEvent(payload: FloaterLureSelectedPayload): void {
    // Simplified - accept any lure equip
    const lureId = payload.parameter;
    this.equippedLureId = lureId && lureId !== 'None' ? lureId : null;
    floaterVM.equippedLureName = payload.parameter;
    this.saveSystem.requestSave();
  }

  // === Touch Input ===
  @subscribe(OnFocusedInteractionInputStartedEvent)
  onTouchStart(payload: OnFocusedInteractionInputEventPayload): void {
    if (payload.interactionIndex !== 0) return;

    if (this.phase === GamePhase.CastCharging) {
      this.castPower = this.powerGaugeValue;
      this.launchFloat();
      return;
    }

    if (this.phase === GamePhase.CatchSequence && !this.catchDialogueShown) {
      // Advance catch dialogue
      if (this.isTextComplete) { this.advanceCatchDialogue(); }
      else { this.completeCurrentText(); }
      return;
    }

    if (this.phase === GamePhase.Departure) {
      if (this.isTextComplete) { this.advanceDepartureDialogue(); }
      else { this.completeCurrentText(); }
      return;
    }

    if (this.phase === GamePhase.Exchange || this.phase === GamePhase.FishReaction) {
      // GUARD: During beat pause, currentLines is empty and isTextComplete may be true.
      // Don't advance dialogue in that state — wait for startNextBeat to fire.
      if (this.beatPauseTimer > 0) {
        console.log('[FloaterGame] Tap ignored during beat pause');
        return;
      }
      if (this.isTextComplete) { this.advanceDialogue(); }
      else { this.completeCurrentText(); }
    }
  }

  // === Phase Logic ===
  private updatePhase(dt: number): void {
    switch (this.phase) {
      case GamePhase.CastCharging: this.updatePowerGauge(dt); break;
      case GamePhase.CastFlying: this.updateCastFlight(dt); break;
      case GamePhase.FloatLanded: this.updateFloatLanded(dt); break;
      case GamePhase.FloatBounce: this.updateFloatBounce(dt); break;
      case GamePhase.NothingBites:
        this.nothingBitesTimer -= dt;
        this.updateTypewriter(dt);
        if (this.nothingBitesTimer <= 0) {
          console.log('[FloaterGame] Nothing bites timer expired → LakeIdle');
          floaterVM.dialogueVisible = false;
          this.enterLakeIdle();
        }
        break;
      case GamePhase.Approach:
        this.phaseTimer += dt;
        // Sequenced approach: portrait starts fading in after delay
        if (this.phaseTimer >= this.approachPortraitDelay) {
          const fadeElapsed = this.phaseTimer - this.approachPortraitDelay;
          const fadeDuration = 0.5; // 0.5s fade-in
          this.fishAlpha = Math.min(1, fadeElapsed / fadeDuration);
        } else {
          this.fishAlpha = 0;
        }
        // Spawn emotion icon after delay (once)
        if (!this.approachEmotionSpawned && this.phaseTimer >= this.approachEmotionDelay) {
          this.approachEmotionSpawned = true;
          this.spawnEmotionIcon(EmotionIconType.Hesitation);
        }
        if (this.phaseTimer >= APPROACH_DURATION) this.enterExchange();
        break;
      case GamePhase.Exchange: this.updateTypewriter(dt); break;
      case GamePhase.FishReaction: this.updateTypewriter(dt); break;
      case GamePhase.ActionSelect:
        // Update silent beat timer during ActionSelect
        if (this.silentBeatActive && !this.silentBeatUnlocked) {
          this.silentBeatTimer += dt;
          if (this.silentBeatTimer >= this.silentBeatDuration) {
            this.silentBeatUnlocked = true;
            floaterVM.actionTwitchEnabled = true;
            floaterVM.actionDriftEnabled = true;
            floaterVM.actionReelEnabled = true;
            console.log('[FloaterGame] Silent beat timer expired — all actions unlocked');
          }
        }
        break;
      case GamePhase.CatchSequence: this.updateTypewriter(dt); break;
      case GamePhase.Departure:
        this.phaseTimer += dt;
        this.fishAlpha = Math.max(0, 1 - this.phaseTimer / DEPARTURE_DURATION);
        this.updateTypewriter(dt);
        break;
      default: break;
    }

    if (this.beatPauseTimer > 0) {
      this.beatPauseTimer -= dt;
      if (this.beatPauseTimer <= 0) {
        this.beatPauseTimer = 0;
        // GUARD: Only fire startNextBeat if we're still in Exchange phase waiting for next beat.
        // If the player tapped during the pause and triggered a phase change (ActionSelect, Departure, etc.),
        // we must NOT call startNextBeat — the game has already moved on.
        if (this.phase === GamePhase.Exchange) {
          this.startNextBeat();
        } else {
          console.log(`[FloaterGame] beatPauseTimer expired but phase is ${this.phase}, skipping startNextBeat`);
        }
      }
    }
    if (this.tierNotifyTimer > 0) {
      this.tierNotifyTimer -= dt;
      if (this.tierNotifyTimer <= 0) { this.tierNotifyTimer = 0; floaterVM.tierTransitionVisible = false; }
    }
    if (this.noLureWarningTimer > 0) {
      this.noLureWarningTimer -= dt;
      if (this.noLureWarningTimer <= 0) { this.noLureWarningTimer = 0; floaterVM.noLureWarningVisible = false; }
    }
  }

  private updateTypewriter(dt: number): void {
    if (this.isTextComplete) return;
    const currentFullText = this.currentLines[this.currentLineIndex] || '';
    this.textProgress += dt;
    const charsToShow = Math.floor(this.textProgress / TEXT_DISPLAY_SPEED);
    if (charsToShow >= currentFullText.length) {
      this.displayedText = currentFullText;
      this.isTextComplete = true;
    } else {
      this.displayedText = currentFullText.substring(0, charsToShow);
    }
  }

  private updateFloat(dt: number): void {
    if (this.floatDip > 0) this.floatDip = Math.max(0, this.floatDip - dt * 20);
  }

  // === Portrait Animation ===
  private triggerPortraitAnimation(type: 'shake' | 'bounce', duration: number): void {
    this.portraitAnimType = type;
    this.portraitAnimTimer = 0;
    this.portraitAnimDuration = duration;
    this.portraitOffsetX = 0;
    this.portraitOffsetY = 0;
  }

  private updatePortraitAnimation(dt: number): void {
    if (this.portraitAnimType === 'none') return;

    this.portraitAnimTimer += dt;
    const progress = Math.min(1, this.portraitAnimTimer / this.portraitAnimDuration);

    if (progress >= 1) {
      this.portraitAnimType = 'none';
      this.portraitOffsetX = 0;
      this.portraitOffsetY = 0;
      return;
    }

    // Decay envelope (stronger at start, fades out)
    const decay = 1 - progress;

    if (this.portraitAnimType === 'shake') {
      // Quick horizontal shake using sine wave with decay
      const frequency = 30; // Hz - fast shaking
      const amplitude = 4 * decay; // pixels max offset
      this.portraitOffsetX = Math.sin(this.portraitAnimTimer * frequency) * amplitude;
      this.portraitOffsetY = 0;
    } else if (this.portraitAnimType === 'bounce') {
      // Vertical bounce using abs(sin) with decay
      const frequency = 12; // Hz
      const amplitude = 5 * decay; // pixels max offset
      this.portraitOffsetY = -Math.abs(Math.sin(this.portraitAnimTimer * frequency)) * amplitude;
      this.portraitOffsetX = 0;
    }
  }

  // === Cast Management ===
  private startCast(): void {
    this.castCount++;
    this.currentBeatIndex = 0;

    // Use pre-determined encounter result from enterFloatBounce()
    const selectedCharacter = this.pendingEncounterCharacter;
    this.pendingEncounterCharacter = null;

    if (!selectedCharacter) {
      // Nothing bites — no fish matches zone/lure conditions
      console.log('[FloaterGame] Nothing bites — entering NothingBites phase');
      this.phase = GamePhase.NothingBites;
      this.nothingBitesTimer = NOTHING_BITES_DURATION;
      this.currentLines = ['*Nothing bites...'];
      this.currentLineIndex = 0;
      this.startNewLine();
      floaterVM.dialogueVisible = true;
      // Clear any leftover floating icons — no fish, no reactions
      this.floatingIcons = [];
      // Reset portrait animation so nothing bobs/shakes
      this.portraitAnimType = 'none';
      this.portraitOffsetX = 0;
      this.portraitOffsetY = 0;
      return;
    }

    // Surprise emoji was already spawned in enterFloatBounce() at bob start
    console.log('[FloaterGame] Fish confirmed — proceeding with approach');

    // Initialize or restore fish state for selected character
    if (this.fish.id !== selectedCharacter.id) {
      this.fish = selectedCharacter.initialState();
      // Restore affection from per-fish save if available
      const savedFishData = this.buildSaveData().fish[selectedCharacter.id];
      if (savedFishData) {
        this.fish.affection = savedFishData.affection;
        this.fish.tier = savedFishData.tier;
        this.fish.currentDrift = savedFishData.drift;
        this.fish.tierFloor = savedFishData.tierFloor;
        this.fishAffection = this.affectionSystem.restoreFromSave(selectedCharacter.id, {
          value: savedFishData.affection,
          tier: savedFishData.tier,
          floor: savedFishData.floor ?? savedFishData.tierFloor,
          peakValue: savedFishData.peakValue ?? savedFishData.affection,
          lastChangeSessionId: savedFishData.lastChangeSessionId ?? '',
          lastChangeDelta: savedFishData.lastChangeDelta ?? 0,
        });
      } else {
        this.fishAffection = this.affectionSystem.createAffection(selectedCharacter.id);
      }
    }

    // Get per-fish cast index
    this.castIndexWithinTier = this.perFishCastIndex[this.fish.id] ?? 0;

    // Auto-promote: if all casts in current tier are exhausted, force tier advancement
    const totalCastsInTier = getCastCountForTier(this.fish.tier);
    if (this.castIndexWithinTier >= totalCastsInTier && this.fish.tier < AffectionTier.Bonded) {
      const nextTier = (this.fish.tier + 1) as AffectionTier;
      const tierThreshold = this.getTierThresholdValue(nextTier);
      console.log(`[FloaterGame] Auto-promoting: all ${totalCastsInTier} casts in ${TIER_NAMES[this.fish.tier]} exhausted. Advancing to ${TIER_NAMES[nextTier]} (affection ${this.fishAffection.value} → ${tierThreshold})`);

      // Force affection to the tier threshold so checkTierTransition fires
      this.fishAffection.value = Math.max(this.fishAffection.value, tierThreshold);
      const transition = this.affectionSystem.checkTierTransition(this.fishAffection);
      if (transition) {
        this.fish.tier = this.fishAffection.tier;
        this.fish.tierFloor = this.fishAffection.floor;
        this.fish.affection = this.fishAffection.value;
        if (transition.isPromotion) {
          this.showTierTransition(transition.newTierName);
        }
      }
      this.castIndexWithinTier = 0;
      this.saveSystem.requestSave();
    }

    const currentCast = getCastForTier(this.fish.tier, this.castIndexWithinTier);
    const totalCastsNow = getCastCountForTier(this.fish.tier);
    console.log(`[FloaterGame] startCast: castCount=${this.castCount}, tier=${TIER_NAMES[this.fish.tier]}, castIndexWithinTier=${this.castIndexWithinTier}/${totalCastsNow}, castName="${currentCast.name}", castId="${currentCast.id}"`);
    this.beats = getBeatsForTier(this.fish.tier, this.castIndexWithinTier);
    console.log(`[FloaterGame] Loaded ${this.beats.length} beats for cast "${currentCast.name}"`);

    this.phase = GamePhase.Approach;
    this.phaseTimer = 0;
    this.fishAlpha = 0;
    this.approachEmotionSpawned = false;
    this.fish.currentExpression = ExpressionState.Neutral;

    floaterVM.hudVisible = true;
    floaterVM.fishNameText = this.fish.name;
    this.syncAffectionDisplay();

    console.log(`[FloaterGame] Cast #${this.castCount}, tier ${TIER_NAMES[this.fish.tier]}, castIdx ${this.castIndexWithinTier}`);
  }

  private enterExchange(): void {
    this.phase = GamePhase.Exchange;
    this.startNextBeat();
  }

  private startNextBeat(): void {
    if (this.currentBeatIndex >= this.beats.length) {
      // Check if this is Cast 10 Beat 2 complete + catch available
      if (this.flagSystem.check(`${this.fish.id}.catch_available`) && this.fish.tier === AffectionTier.Bonded) {
        this.enterCatchSequence();
      } else {
        this.enterDeparture(this.fish.currentDrift || DriftState.Warm);
      }
      return;
    }

    const beat = this.beats[this.currentBeatIndex];
    console.log(`[FloaterGame] startNextBeat: beatIndex=${this.currentBeatIndex}, beatId="${beat.beatId}", firstLine="${beat.fishLines[0]}"`);
    if (this.seenBeats.has(beat.beatId)) {
      this.canSkip = true; floaterVM.skipButtonVisible = true; floaterVM.skipButtonOpacity = 1;
    } else {
      this.canSkip = false; floaterVM.skipButtonVisible = false; floaterVM.skipButtonOpacity = 0;
    }

    // Handle silent beat (Four Minutes mechanic)
    if (beat.silentBeat) {
      console.log(`[FloaterGame] Silent beat detected: ${beat.silentBeatDurationSec ?? 240}s`);
      this.silentBeatActive = true;
      this.silentBeatTimer = 0;
      this.silentBeatDuration = beat.silentBeatDurationSec ?? 240;
      this.silentBeatUnlocked = false;
      // Show scenery line then go to ActionSelect with restricted buttons
      this.phase = GamePhase.Exchange;
      this.currentLines = beat.fishLines;
      this.currentLineIndex = 0;
      this.startNewLine();
      return;
    }

    this.phase = GamePhase.Exchange;
    this.currentLines = beat.fishLines;
    this.currentLineIndex = 0;
    this.startNewLine();
  }

  private startNewLine(): void {
    this.textProgress = 0;
    this.displayedText = '';
    this.isTextComplete = false;
  }

  private advanceDialogue(): void {
    if (this.isShowingReaction) {
      // Advance through all reaction lines before moving to next beat
      this.currentLineIndex++;
      if (this.currentLineIndex >= this.currentLines.length) {
        // All reaction lines shown — advance to next beat
        this.isShowingReaction = false;
        floaterVM.actionMenuVisible = false;
        this.currentBeatIndex++;

        const beat = this.beats[this.currentBeatIndex - 1];
        this.seenBeats.add(beat.beatId);
        this.saveSystem.requestSave();

        if (this.currentBeatIndex >= this.beats.length) {
          if (this.flagSystem.check(`${this.fish.id}.catch_available`) && this.fish.tier === AffectionTier.Bonded) {
            this.enterCatchSequence();
          } else {
            this.enterDeparture(this.fish.currentDrift || DriftState.Warm);
          }
        } else {
          this.beatPauseTimer = BEAT_PAUSE_DURATION;
          this.phase = GamePhase.Exchange;
          // Keep currentLines and displayedText intact so dialogue box stays visible
          this.isTextComplete = false; // Prevent premature advance during pause
        }
      } else {
        // More reaction lines to show
        this.startNewLine();
      }
      return;
    }

    this.currentLineIndex++;
    if (this.currentLineIndex >= this.currentLines.length) {
      // If this is a silent beat, enter ActionSelect with restricted buttons
      if (this.silentBeatActive && !this.silentBeatUnlocked) {
        this.phase = GamePhase.ActionSelect;
        floaterVM.actionMenuVisible = true;
        floaterVM.actionWaitEnabled = true;
        floaterVM.actionTwitchEnabled = false;
        floaterVM.actionDriftEnabled = false;
        floaterVM.actionReelEnabled = false;
        floaterVM.skipButtonVisible = false; floaterVM.skipButtonOpacity = 0;
      } else {
        this.phase = GamePhase.ActionSelect;
        floaterVM.actionMenuVisible = true;
        floaterVM.actionWaitEnabled = true;
        floaterVM.actionTwitchEnabled = true;
        floaterVM.actionDriftEnabled = true;
        floaterVM.actionReelEnabled = true;
        floaterVM.skipButtonVisible = false; floaterVM.skipButtonOpacity = 0;
      }
    } else {
      this.startNewLine();
    }
  }

  private completeCurrentText(): void {
    const currentFullText = this.currentLines[this.currentLineIndex] || '';
    this.displayedText = currentFullText;
    this.isTextComplete = true;
  }

  private handleAction(actionId: ActionId): void {
    const beat = this.beats[this.currentBeatIndex];
    const effect = beat.actionEffects[actionId];
    if (!effect) return;

    // Reset silent beat state after action is taken
    if (this.silentBeatActive) {
      console.log(`[FloaterGame] Silent beat action: ${actionId}, unlocked=${this.silentBeatUnlocked}, timer=${this.silentBeatTimer.toFixed(1)}s`);
      this.silentBeatActive = false;
    }

    // Reset action button states to enabled
    floaterVM.actionWaitEnabled = true;
    floaterVM.actionTwitchEnabled = true;
    floaterVM.actionDriftEnabled = true;
    floaterVM.actionReelEnabled = true;

    floaterVM.actionMenuVisible = false;

    // Apply affection
    this.affectionSystem.applyDelta(this.fishAffection, effect.affectionDelta, this.sessionId);
    this.fish.affection = this.fishAffection.value;

    // Check tier transition
    const transition = this.affectionSystem.checkTierTransition(this.fishAffection);
    if (transition) {
      const oldTier = this.fish.tier;
      this.fish.tier = this.fishAffection.tier;
      this.fish.tierFloor = this.fishAffection.floor;
      if (transition.isPromotion) {
        this.showTierTransition(transition.newTierName);
        // Reset cast index for new tier
        if (this.fish.tier !== oldTier) {
          console.log(`[FloaterGame] Tier promotion! ${TIER_NAMES[oldTier]} → ${TIER_NAMES[this.fish.tier]}, resetting castIndexWithinTier from ${this.castIndexWithinTier} to 0`);
          this.castIndexWithinTier = 0;
        }
      }
    }

    // Apply expression and drift
    this.fish.currentExpression = effect.resultExpression;
    if (effect.resultDrift) this.fish.currentDrift = effect.resultDrift;

    // Set flags
    if (effect.flagsToSet) {
      for (const flag of effect.flagsToSet) { this.flagSystem.set(flag, true); }
    }

    // Spawn emotion icon
    if (effect.emotionIcon && effect.emotionIcon !== EmotionIconType.None) {
      this.spawnEmotionIcon(effect.emotionIcon);
    }

    // Animate float
    this.animateAction(actionId);

    // Show reaction
    this.phase = GamePhase.FishReaction;
    this.isShowingReaction = true;
    this.currentLines = effect.responseLines;
    this.currentLineIndex = 0;
    this.startNewLine();

    // Update HUD
    this.syncAffectionDisplay();
  }

  private advanceBeat(): void {
    this.currentBeatIndex++;
    this.seenBeats.add(this.beats[this.currentBeatIndex - 1].beatId);
    floaterVM.skipButtonVisible = false;
    this.canSkip = false;

    if (this.currentBeatIndex >= this.beats.length) {
      this.enterDeparture(DriftState.Warm);
    } else {
      this.beatPauseTimer = BEAT_PAUSE_DURATION;
      // Keep currentLines and displayedText intact so dialogue box stays visible
      this.isTextComplete = false; // Prevent premature advance during pause
    }
  }

  private enterDeparture(drift: DriftState): void {
    this.phase = GamePhase.Departure;
    this.phaseTimer = 0;
    // Fix: DriftState.None is truthy ('none'), so || fallback doesn't work.
    // Explicitly default to Warm if drift is None or not in departures map.
    const effectiveDrift = (drift === DriftState.None) ? DriftState.Warm : drift;
    this.fish.currentDrift = effectiveDrift;
    floaterVM.actionMenuVisible = false;
    floaterVM.skipButtonVisible = false;

    // Get departure data from cast
    const cast = getCastForTier(this.fish.tier, this.castIndexWithinTier);
    const departureData = cast.departures[effectiveDrift] || cast.departures[DriftState.Warm];

    // Use tap-to-advance dialogue system for departure lines
    if (departureData) {
      this.currentLines = departureData.dialogue;
      if (departureData.icon && departureData.icon !== EmotionIconType.None) {
        this.spawnEmotionIcon(departureData.icon);
      }
      if (departureData.flagsToSet) {
        for (const flag of departureData.flagsToSet) { this.flagSystem.set(flag, true); }
      }
    } else {
      this.currentLines = ['She drifts away...'];
    }

    this.currentLineIndex = 0;
    this.startNewLine();

    // Don't show old departure overlay — use dialogue panel instead
    floaterVM.departureVisible = false;

    // Track drift scared count
    if (drift === DriftState.Scared) {
      this.driftScaredCount++;
      if (this.driftScaredCount >= 3) {
        this.triggerEnding(EndingType.DriftAway);
        return;
      }
    } else if (drift === DriftState.Charmed || drift === DriftState.Warm) {
      this.driftScaredCount = 0; // Reset on positive drift
    }

    console.log(`[FloaterGame] Departure: ${drift}`);
  }

  private advanceDepartureDialogue(): void {
    console.log(`[FloaterGame] advanceDepartureDialogue: lineIdx=${this.currentLineIndex}, totalLines=${this.currentLines.length}, castIndexWithinTier=${this.castIndexWithinTier}`);
    this.currentLineIndex++;
    if (this.currentLineIndex >= this.currentLines.length) {
      // All departure lines shown — increment cast index and go to LakeIdle
      const oldIdx = this.castIndexWithinTier;
      this.castIndexWithinTier++;
      this.perFishCastIndex[this.fish.id] = this.castIndexWithinTier;
      console.log(`[FloaterGame] Departure complete, castIndexWithinTier: ${oldIdx} → ${this.castIndexWithinTier}`);

      // Track quest events: talked to fish and fish left
      this.questSystem.recordTalkedToFish(this.fish.id);
      this.questSystem.recordFishLeft(this.fish.id);

      this.saveSystem.requestSave();
      this.enterLakeIdle();
    } else {
      this.startNewLine();
    }
  }

  private enterIdle(): void {
    this.phase = GamePhase.Idle;
    floaterVM.departureVisible = false;
    floaterVM.hudVisible = false;
    floaterVM.idleVisible = true;
    floaterVM.inventoryButtonVisible = true;
    floaterVM.journalButtonVisible = true;
    this.fishAlpha = 0;
    this.saveSystem.requestSave();
  }

  // === Catch Sequence ===
  private enterCatchSequence(): void {
    this.phase = GamePhase.CatchSequence;
    this.catchDialogueIndex = 0;
    this.catchDialogueShown = false;
    floaterVM.actionMenuVisible = false;
    floaterVM.skipButtonVisible = false;

    // Show silence dialogue
    const catchData = characterRegistry.getCatchSequenceData(this.fish.id);
    this.currentLines = catchData?.silenceDialogue ?? ['...'];
    this.currentLineIndex = 0;
    this.startNewLine();

    // Set dynamic catch choice label from character data
    floaterVM.catchChoiceReleaseLabel = catchData?.releaseChoiceLabel ?? this.fish.name;

    console.log('[FloaterGame] Entering Catch Sequence');
  }

  private advanceCatchDialogue(): void {
    this.currentLineIndex++;
    if (this.currentLineIndex >= this.currentLines.length) {
      // Dialogue done, show choice
      this.catchDialogueShown = true;
      floaterVM.catchChoiceVisible = true;
      floaterVM.dialogueVisible = false;
    } else {
      this.startNewLine();
    }
  }

  // === Endings ===
  private triggerEnding(type: EndingType): void {
    this.phase = GamePhase.Ending;
    this.currentEnding = type;

    const endingCatchData = characterRegistry.getCatchSequenceData(this.fish.id);
    switch (type) {
      case EndingType.Reel:
        floaterVM.endingText = endingCatchData?.reelEpitaph ?? 'End.';
        break;
      case EndingType.Release:
        floaterVM.endingText = endingCatchData?.releaseEpitaph ?? 'Released.';
        this.flagSystem.set(`cross.${this.fish.id}.released`, true);
        break;
      case EndingType.DriftAway:
        floaterVM.endingText = 'She was not there.\n\nThe file was closed.\n\n7:14. The surface was empty.';
        break;
    }

    floaterVM.endingVisible = true;
    floaterVM.departureVisible = false;
    floaterVM.catchChoiceVisible = false;
    floaterVM.hudVisible = false;
    floaterVM.actionMenuVisible = false;

    // Mark catch as used
    this.flagSystem.set(`${this.fish.id}.catch_available`, false);
    this.saveSystem.requestSave();

    console.log(`[FloaterGame] Ending triggered: ${type}`);
  }

  // === Emotion Icons ===
  private spawnEmotionIcon(type: EmotionIconType, anchor: EmotionIconAnchor = 'portrait'): void {
    if (type === EmotionIconType.None) return;

    let baseX: number;
    let baseY: number;

    if (anchor === 'float') {
      // Position above the float's landing position
      baseX = this.landingTargetX;
      baseY = this.landingTargetY + EMOTION_ICON_Y_OFFSET - 35; // Above the float (closer to float)
    } else {
      // Position above portrait center, offset by existing icons
      baseX = FISH_PORTRAIT_X + FISH_PORTRAIT_SIZE / 2;
      baseY = FISH_PORTRAIT_Y + EMOTION_ICON_Y_OFFSET; // Just above portrait top edge
    }

    // Only offset for portrait-anchored icons (multiple can stack)
    const portraitIcons = this.floatingIcons.filter(i => i.anchor === 'portrait');
    const offsetX = anchor === 'portrait' ? portraitIcons.length * EMOTION_ICON_SPACING : 0;

    const duration = anchor === 'float' ? FLOAT_SURPRISE_EMOJI_DURATION : EMOTION_ICON_DURATION;
    this.floatingIcons.push({
      type,
      x: anchor === 'portrait' ? baseX + offsetX - (portraitIcons.length * EMOTION_ICON_SPACING / 2) : baseX,
      y: baseY,
      scale: 0,
      alpha: 1,
      timer: duration,
      maxDuration: duration,
      anchor,
    });

    // Trigger portrait animation based on emotion type
    switch (type) {
      case EmotionIconType.Surprise:
      case EmotionIconType.Delight:
      case EmotionIconType.Curiosity:
        this.triggerPortraitAnimation('bounce', 0.35);
        break;
      case EmotionIconType.Shock:
      case EmotionIconType.Sadness:
        this.triggerPortraitAnimation('shake', 0.4);
        break;
      default:
        break;
    }
  }

  private updateEmotionIcons(dt: number): void {
    for (let i = this.floatingIcons.length - 1; i >= 0; i--) {
      const icon = this.floatingIcons[i];
      icon.timer -= dt;

      // Scale animation (dynamic bounce-in with overshoot)
      const elapsed = icon.maxDuration - icon.timer;
      if (elapsed < EMOTION_ICON_BOUNCE_TIME) {
        const t = elapsed / EMOTION_ICON_BOUNCE_TIME;
        // Multi-phase bounce: 0→1.3→0.95→1.05→1.0
        if (t < 0.25) {
          icon.scale = (t / 0.25) * 1.3;
        } else if (t < 0.5) {
          icon.scale = 1.3 - ((t - 0.25) / 0.25) * 0.35; // 1.3 → 0.95
        } else if (t < 0.75) {
          icon.scale = 0.95 + ((t - 0.5) / 0.25) * 0.1; // 0.95 → 1.05
        } else {
          icon.scale = 1.05 - ((t - 0.75) / 0.25) * 0.05; // 1.05 → 1.0
        }
      } else {
        icon.scale = 1.0;
      }

      // Fade out: scale down + float upward in last EMOTION_ICON_FADE_TIME seconds
      if (icon.timer < EMOTION_ICON_FADE_TIME) {
        const fadeT = 1 - (icon.timer / EMOTION_ICON_FADE_TIME); // 0→1
        icon.alpha = 1 - fadeT; // alpha decreases
        icon.scale *= (1 - fadeT * 0.6); // shrink during fade
        icon.y -= dt * 30; // float upward during fade
      }

      // Remove expired
      if (icon.timer <= 0) {
        this.floatingIcons.splice(i, 1);
      }
    }
  }

  // === Float Animation ===
  private animateAction(actionId: ActionId): void {
    this.actionAnimType = actionId;
    this.actionAnimTimer = 0;
    this.actionAnimOffsetX = 0;
    this.actionAnimOffsetY = 0;

    switch (actionId) {
      case ActionId.Wait:
        this.actionAnimDuration = ACTION_ANIM_WAIT_DURATION;
        this.lineTension = 0.5;
        break;
      case ActionId.Twitch:
        this.actionAnimDuration = ACTION_ANIM_TWITCH_DURATION;
        this.lineTension = 0.7;
        this.triggerPortraitAnimation('bounce', 0.35);
        break;
      case ActionId.Drift:
        this.actionAnimDuration = ACTION_ANIM_DRIFT_DURATION;
        this.lineTension = 0.2;
        break;
      case ActionId.Reel:
        this.actionAnimDuration = ACTION_ANIM_REEL_DURATION;
        this.lineTension = 1.0;
        this.triggerPortraitAnimation('shake', 0.4);
        break;
    }
  }

  private updateActionAnimation(dt: number): void {
    if (this.actionAnimType === null) return;

    this.actionAnimTimer += dt;
    const t = Math.min(1, this.actionAnimTimer / this.actionAnimDuration);

    switch (this.actionAnimType) {
      case ActionId.Wait: {
        // Slow, regular enhanced bobbing - gentle sine wave
        const decay = 1 - t; // Fade out over duration
        this.actionAnimOffsetY = Math.sin(this.actionAnimTimer * ACTION_ANIM_WAIT_SPEED) * ACTION_ANIM_WAIT_AMPLITUDE * decay;
        this.actionAnimOffsetX = 0;
        break;
      }
      case ActionId.Reel: {
        // Quick pull upward then bouncing resistance
        if (t < 0.25) {
          // Pull phase: quick ease-out upward
          const pullT = t / 0.25;
          const eased = 1 - Math.pow(1 - pullT, 3); // ease-out cubic
          this.actionAnimOffsetY = ACTION_ANIM_REEL_PULL_Y * eased;
        } else {
          // Bounce phase: decaying oscillation settling back to 0
          const bounceT = (t - 0.25) / 0.75;
          const decay = Math.pow(ACTION_ANIM_REEL_BOUNCE_DECAY, bounceT * ACTION_ANIM_REEL_BOUNCE_COUNT);
          const bounce = Math.sin(bounceT * ACTION_ANIM_REEL_BOUNCE_COUNT * Math.PI * 2);
          this.actionAnimOffsetY = ACTION_ANIM_REEL_PULL_Y * decay * bounce * (1 - bounceT);
        }
        this.actionAnimOffsetX = 0;
        break;
      }
      case ActionId.Drift: {
        // Gentle lateral drift with subtle vertical bob
        // Smooth ease-in, hold, ease-out for X movement
        let driftX: number;
        if (t < 0.2) {
          // Ease in
          const easeT = t / 0.2;
          driftX = easeT * easeT * ACTION_ANIM_DRIFT_AMPLITUDE_X;
        } else if (t < 0.7) {
          // Hold with gentle sine variation
          const holdT = (t - 0.2) / 0.5;
          driftX = ACTION_ANIM_DRIFT_AMPLITUDE_X + Math.sin(holdT * Math.PI) * 4;
        } else {
          // Ease out back to center
          const easeT = (t - 0.7) / 0.3;
          const eased = 1 - Math.pow(easeT, 2);
          driftX = ACTION_ANIM_DRIFT_AMPLITUDE_X * eased;
        }
        this.actionAnimOffsetX = driftX;
        // Subtle vertical bob during drift (like rocking on water)
        this.actionAnimOffsetY = Math.sin(this.actionAnimTimer * 4) * ACTION_ANIM_DRIFT_AMPLITUDE_Y;
        break;
      }
      case ActionId.Twitch: {
        // Sharp, quick jerk upward then rapid settle
        if (t < 0.15) {
          // Sharp impulse: instant jerk up
          const impulseT = t / 0.15;
          this.actionAnimOffsetY = ACTION_ANIM_TWITCH_AMPLITUDE_Y * impulseT;
          this.actionAnimOffsetX = ACTION_ANIM_TWITCH_AMPLITUDE_X * Math.sin(impulseT * Math.PI);
        } else {
          // Rapid settle with wobble
          const settleT = (t - 0.15) / 0.85;
          const decay = Math.pow(1 - settleT, 3); // fast decay
          this.actionAnimOffsetY = ACTION_ANIM_TWITCH_AMPLITUDE_Y * decay * Math.cos(settleT * Math.PI * 4);
          this.actionAnimOffsetX = ACTION_ANIM_TWITCH_AMPLITUDE_X * decay * Math.sin(settleT * Math.PI * 6);
        }
        break;
      }
    }

    // Animation complete
    if (t >= 1) {
      this.actionAnimType = null;
      this.actionAnimOffsetX = 0;
      this.actionAnimOffsetY = 0;
    }
  }

  // === Affection Display ===
  private syncAffectionDisplay(): void {
    const percent = Math.min(100, (this.fishAffection.value / AFFECTION_MAX) * 100);
    floaterVM.affectionBarWidth = (percent / 100) * 200; // 200px max width
    floaterVM.emotionName = TIER_NAMES[this.fishAffection.tier];
    floaterVM.tierText = TIER_NAMES[this.fishAffection.tier];
  }

  /** Get the minimum affection value needed to be in a tier */
  private getTierThresholdValue(tier: AffectionTier): number {
    switch (tier) {
      case AffectionTier.Curious: return AFFECTION_TIER_1_MAX + 1;
      case AffectionTier.Familiar: return AFFECTION_TIER_2_MAX + 1;
      case AffectionTier.Trusting: return AFFECTION_TIER_3_MAX + 1;
      case AffectionTier.Bonded: return AFFECTION_TIER_4_MAX + 1;
      default: return 0;
    }
  }

  private showTierTransition(newTierName: string): void {
    floaterVM.tierTransitionVisible = true;
    floaterVM.tierTransitionText = `${this.fish.name} feels closer.\nRelationship: ${newTierName}`;
    this.tierNotifyTimer = 2.5;
  }

  // === Cast Mechanics ===
  private enterLakeIdle(): void {
    this.phase = GamePhase.LakeIdle;
    this.fishAlpha = 0;
    floaterVM.castButtonVisible = true;
    floaterVM.hudVisible = false;
    floaterVM.inventoryButtonVisible = true;
    floaterVM.journalButtonVisible = true;
  }

  private updatePowerGauge(dt: number): void {
    const speed = (100 / (GAUGE_CYCLE_TIME / 2));
    this.powerGaugeValue += this.powerGaugeDir * speed * dt;
    if (this.powerGaugeValue >= 100) { this.powerGaugeValue = 100; this.powerGaugeDir = -1; }
    else if (this.powerGaugeValue <= 0) { this.powerGaugeValue = 0; this.powerGaugeDir = 1; }
  }

  private launchFloat(): void {
    this.phase = GamePhase.CastFlying;
    this.castFlightT = 0;

    // Track lure usage for quest system
    if (this.equippedLureId) {
      this.questSystem.recordLureUsed(this.equippedLureId);
    }

    if (USE_3D_PHYSICS_CAST) {
      this.initCast3D(this.castPower);
      // Project initial 3D rod tip position to 2D so the float starts OFF-SCREEN
      // (at the rod tip) and arcs INTO view — no position swap needed
      const projected = this.project3Dto2D(this.floater3DPos);
      this.castFloatX = projected.x;
      this.castFloatY = projected.y;
      this.castFloatScale = projected.scale;
    } else if (USE_POV_CAST_ANIMATION) {
      this.castFloatX = POV_CAST_START_X;
      this.castFloatY = POV_CAST_START_Y;
      this.castFloatScale = POV_CAST_START_SCALE;
    } else {
      this.castFloatX = CAST_START_X;
      this.castFloatY = CAST_START_Y;
      this.castFloatScale = 1.0;
    }
  }

  private updateCastFlight(dt: number): void {
    if (USE_3D_PHYSICS_CAST) {
      this.updateCastFlying3D(dt);
    } else if (USE_POV_CAST_ANIMATION) {
      this.updateCastFlightPOV(dt);
    } else {
      this.updateCastFlightSideView(dt);
    }
  }

  // Issue 2 fix: All segments are simulated continuously. No activeSegmentCount gating.

  // === 3D Fishing Rod Methods ===

  /** Initialize rod 3D position based on constants */
  private initRod3D(): void {
    this.rod3D.basePos = new Vec3D(ROD_3D_BASE_X, ROD_3D_BASE_Y, ROD_3D_BASE_Z);
    this.rod3D.angle = ROD_3D_INITIAL_ANGLE;
    this.rodState = RodState.WindUp;
    this.updateRodTip();
  }

  /** Recalculate rod tip position from base + angle */
  private updateRodTip(): void {
    this.rod3D.tipPos = new Vec3D(
      this.rod3D.basePos.x + Math.cos(this.rod3D.angle) * ROD_3D_LENGTH * 0.5,
      this.rod3D.basePos.y + Math.sin(this.rod3D.angle) * ROD_3D_LENGTH,
      this.rod3D.basePos.z + ROD_3D_LENGTH * ROD_3D_TIP_Z_FACTOR,
    );
  }

  /** Animate rod through cast phases based on normalized time t (0..1) */
  private updateRodAnimation(t: number): void {
    if (t < ROD_PHASE_WINDUP_END) {
      // Wind-up: Pull back
      this.rodState = RodState.WindUp;
      const windupT = t / ROD_PHASE_WINDUP_END;
      this.rod3D.angle = ROD_3D_INITIAL_ANGLE - windupT * ROD_WINDUP_PULLBACK;

    } else if (t < ROD_PHASE_ACCELERATE_END) {
      // Accelerate: Swing forward rapidly
      this.rodState = RodState.Accelerate;
      const accelT = (t - ROD_PHASE_WINDUP_END) / (ROD_PHASE_ACCELERATE_END - ROD_PHASE_WINDUP_END);
      const eased = accelT * accelT; // Ease-in (accelerating)
      this.rod3D.angle = (ROD_3D_INITIAL_ANGLE - ROD_WINDUP_PULLBACK) + eased * ROD_ACCELERATE_SWING;

    } else if (t < ROD_PHASE_RELEASE_END) {
      // Release: Hold at peak
      this.rodState = RodState.Release;
      this.rod3D.angle = ROD_RELEASE_ANGLE;

    } else {
      // Follow-through: Settle back down
      this.rodState = RodState.FollowThrough;
      const followT = (t - ROD_PHASE_RELEASE_END) / (1.0 - ROD_PHASE_RELEASE_END);
      const eased = 1 - Math.pow(1 - followT, 2); // Ease-out
      this.rod3D.angle = ROD_RELEASE_ANGLE - eased * ROD_FOLLOWTHROUGH_SETTLE;
    }

    this.updateRodTip();
  }

  /** 3D physics cast: realistic projectile with gravity, projected to 2D.
   *  FIX Issue 2: All segments are always simulated continuously (no activeSegmentCount).
   *  This prevents the visual discontinuity/"break" that occurred when segments
   *  activated mid-flight from stale positions. */
  private updateCastFlying3D(dt: number): void {
    this.castFlyingTimer += dt;

    // Calculate normalized flight progress
    const normalizedPower = this.lastCastPower / 100;
    const totalFlightTime = CAST_3D_CALC_MAX_FLIGHT_TIME + normalizedPower * (CAST_3D_CALC_MIN_FLIGHT_TIME - CAST_3D_CALC_MAX_FLIGHT_TIME);
    const t = Math.min(this.castFlyingTimer / totalFlightTime, 1.0);

    // Animate rod
    this.updateRodAnimation(t);

    // Update floater velocity with gravity
    this.floater3DVel = this.floater3DVel.add(new Vec3D(0, CAST_3D_GRAVITY_Y * dt, 0));
    // Update floater position
    this.floater3DPos = this.floater3DPos.add(this.floater3DVel.scale(dt));

    // FIX Issue 2: Always simulate ALL segments continuously.
    // No activeSegmentCount gating - every segment participates from the start.
    const totalSegments = this.lineSegments3D.length;

    // Last segment follows floater
    this.lineSegments3D[totalSegments - 1] = this.floater3DPos.clone();

    // Apply slight gravity to middle segments for natural sag
    const segGravity = CAST_3D_GRAVITY_Y * 0.15 * dt;
    for (let i = 1; i < totalSegments - 1; i++) {
      this.lineSegments3D[i] = new Vec3D(
        this.lineSegments3D[i].x,
        this.lineSegments3D[i].y + segGravity,
        this.lineSegments3D[i].z
      );
    }

    // Backward pass: constrain each segment to be EXACTLY segment_length from next
    for (let i = totalSegments - 2; i >= 1; i--) {
      const target = this.lineSegments3D[i + 1];
      const current = this.lineSegments3D[i];
      const dir = target.subtract(current);
      const dist = dir.length();

      if (dist > 0.001) {
        const pull = dir.normalize().scale(CAST_3D_SEGMENT_LENGTH);
        this.lineSegments3D[i] = target.subtract(pull);
      } else {
        const toRod = this.rod3D.tipPos.subtract(target).normalize();
        this.lineSegments3D[i] = target.subtract(toRod.scale(CAST_3D_SEGMENT_LENGTH));
      }
    }

    // Forward pass: ensure segments don't bunch from rod side either
    for (let i = 1; i < totalSegments - 1; i++) {
      const prev = this.lineSegments3D[i - 1];
      const current = this.lineSegments3D[i];
      const dir = current.subtract(prev);
      const dist = dir.length();

      if (dist > 0.001 && dist < CAST_3D_SEGMENT_LENGTH * 0.5) {
        const pushed = prev.add(dir.normalize().scale(CAST_3D_SEGMENT_LENGTH));
        this.lineSegments3D[i] = new Vec3D(
          current.x * 0.5 + pushed.x * 0.5,
          current.y * 0.5 + pushed.y * 0.5,
          current.z * 0.5 + pushed.z * 0.5
        );
      }
    }

    // First segment follows rod tip
    this.lineSegments3D[0] = this.rod3D.tipPos.clone();

    // Project floater to 2D screen space
    const projected = this.project3Dto2D(this.floater3DPos);
    this.castFloatX = projected.x;
    this.castFloatY = projected.y;
    this.castFloatScale = projected.scale;

    // Check if landed (Y below water level or timeout)
    if (this.floater3DPos.y < CAST_3D_WATER_Y || this.castFlyingTimer > CAST_3D_MAX_FLIGHT_TIME) {
      this.onFloatLanded();
    }
  }

  /** Unproject a 2D screen position + desired scale back to 3D space.
   *  Inverts the perspective projection used in project3Dto2D. */
  private unproject2Dto3D(screenX: number, screenY: number, desiredScale: number): Vec3D {
    // From project3Dto2D: scale = (focalLength / depth) * scaleMultiplier
    // Solve for depth: depth = (focalLength * scaleMultiplier) / scale
    const depth = (CAST_3D_FOCAL_LENGTH * CAST_3D_SCALE_MULTIPLIER) / desiredScale;
    const z = depth - CAST_3D_FOCAL_LENGTH;

    // From project3Dto2D: screenX = (x / depth) * 200 + CANVAS_WIDTH / 2
    // Solve for x: x = (screenX - CANVAS_WIDTH/2) * depth / 200
    const x = (screenX - CANVAS_WIDTH / 2) * depth / 200;

    // From project3Dto2D: screenY = (-y / depth) * 200 + CANVAS_HEIGHT / 2
    // Solve for y: y = -(screenY - CANVAS_HEIGHT/2) * depth / 200
    const y = -(screenY - CANVAS_HEIGHT / 2) * depth / 200;

    return new Vec3D(x, y, z);
  }

  /** Calculate the initial velocity needed to travel from start to target
   *  in exactly flightTime seconds under gravity. */
  private calculateBallisticVelocity(start: Vec3D, target: Vec3D, flightTime: number): Vec3D {
    // Ballistic equation: target = start + velocity * t + 0.5 * gravity * t²
    // Solve for velocity: velocity = (target - start - 0.5 * gravity * t²) / t
    const gravity = new Vec3D(0, CAST_3D_GRAVITY_Y, 0);
    const displacement = target.subtract(start);
    const gravityTerm = gravity.scale(0.5 * flightTime * flightTime);
    const velocity = displacement.subtract(gravityTerm).scale(1 / flightTime);
    return velocity;
  }

  /** Initialize 3D cast physics state with designed upward arc.
   *  Y velocity is calculated to peak at 60% of planned flight time (when line fully extends).
   *  X/Z velocities target the pond center based on actual time to reach water level.
   *  Landing distance now varies with power: low power = close, high power = far. */
  private initCast3D(power: number): void {
    this.lastCastPower = power;

    // Initialize rod
    this.initRod3D();

    // Start floater at rod tip
    const start3D = this.rod3D.tipPos.clone();

    // Calculate power-based landing position
    // normalizedPower: 0 = weak (lands close/low), 1 = strong (lands far/high)
    const normalizedPower = power / 100;
    this.landingTargetY = CAST_LANDING_NEAR_Y + (CAST_LANDING_FAR_Y - CAST_LANDING_NEAR_Y) * normalizedPower;
    // Slight X variance for realism (seeded from power to be deterministic)
    this.landingTargetX = FLOAT_X + (normalizedPower - 0.5) * CAST_LANDING_X_VARIANCE * 0.5;

    // Target position: power-adjusted landing spot at normal scale (1.0)
    const target3D = this.unproject2Dto3D(this.landingTargetX, this.landingTargetY, 1.0);

    // Flight time based on power: higher power = shorter time (faster, flatter arc)
    const plannedFlightTime = CAST_3D_CALC_MAX_FLIGHT_TIME + normalizedPower * (CAST_3D_CALC_MIN_FLIGHT_TIME - CAST_3D_CALC_MAX_FLIGHT_TIME);

    // Design Y velocity so the arc peaks at 60% of planned flight time
    // (matching when lineExtensionProgress reaches 1.0)
    // At peak: vy + g * t_peak = 0, so vy = -g * t_peak = |g| * peakFraction * T
    const peakFraction = 0.6;
    const vy = Math.abs(CAST_3D_GRAVITY_Y) * peakFraction * plannedFlightTime;

    // Calculate actual time for floater to reach water level with this Y velocity
    // y(t) = start_y + vy*t + 0.5*g*t² → solving for y = CAST_3D_WATER_Y:
    // 0.5*|g|*t² - vy*t + (WATER_Y - start_y) = 0
    const aCoeff = 0.5 * Math.abs(CAST_3D_GRAVITY_Y);
    const bCoeff = -vy;
    const cCoeff = CAST_3D_WATER_Y - start3D.y;
    const discriminant = bCoeff * bCoeff - 4 * aCoeff * cCoeff;
    const actualFlightTime = discriminant > 0
      ? (-bCoeff + Math.sqrt(discriminant)) / (2 * aCoeff)
      : plannedFlightTime * 2.5; // fallback

    // X and Z velocities: reach target position in actualFlightTime
    // (no gravity on X/Z, so simple displacement/time)
    const vx = (target3D.x - start3D.x) / actualFlightTime;
    const vz = (target3D.z - start3D.z) / actualFlightTime;

    const velocity = new Vec3D(vx, vy, vz);

    // Set initial state
    this.floater3DPos = start3D.clone();
    this.floater3DVel = velocity;

    // FIX Issue 2: Initialize line segments distributed along a short line
    // from rod tip toward the initial velocity direction. This prevents all
    // segments starting at the same position (which caused "straight then physics"
    // discontinuity as the backward pass spread them out one-by-one).
    this.lineSegments3D = [];
    const initDir = velocity.normalize();
    for (let i = 0; i < CAST_3D_NUM_LINE_SEGMENTS; i++) {
      // Distribute segments from rod tip outward along cast direction
      // First segment at tip, last segment slightly ahead (fraction of total line length)
      const fraction = i / (CAST_3D_NUM_LINE_SEGMENTS - 1);
      const offset = initDir.scale(fraction * CAST_3D_SEGMENT_LENGTH * 3);
      this.lineSegments3D.push(this.rod3D.tipPos.add(offset));
    }

    this.castFlyingTimer = 0;
    this.lineExtensionProgress = 0;
    console.log(`[FloaterGame] initCast3D: power=${power.toFixed(1)}, landingTarget=(${this.landingTargetX.toFixed(0)}, ${this.landingTargetY.toFixed(0)}), plannedT=${plannedFlightTime.toFixed(2)}s, actualT=${actualFlightTime.toFixed(2)}s, vy=${vy.toFixed(2)}, vel=(${velocity.x.toFixed(2)}, ${velocity.y.toFixed(2)}, ${velocity.z.toFixed(2)})`);
  }

  /** Project 3D position to 2D screen space with perspective */
  private project3Dto2D(pos3D: Vec3D): { x: number; y: number; scale: number } {
    const depth = pos3D.z + CAST_3D_FOCAL_LENGTH;

    if (depth <= 0.1) {
      return { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, scale: 0.1 };
    }

    // Project to screen space
    const screenX = (pos3D.x / depth) * 200 + CANVAS_WIDTH / 2;
    const screenY = (-pos3D.y / depth) * 200 + CANVAS_HEIGHT / 2; // Flip Y

    // Increase scale multiplier for more dramatic size changes
    const scale = (CAST_3D_FOCAL_LENGTH / depth) * CAST_3D_SCALE_MULTIPLIER;

    return { x: screenX, y: screenY, scale };
  }

  /** POV-style cast: floater starts in right hand, arcs up and left (arm swing), then falls to pond center */
  private updateCastFlightPOV(dt: number): void {
    this.castFlightT += dt / POV_CAST_FLIGHT_TIME;
    if (this.castFlightT >= 1) { this.castFlightT = 1; this.onFloatLanded(); return; }
    const t = this.castFlightT;

    const startX = POV_CAST_START_X;
    const startY = POV_CAST_START_Y;
    const startScale = POV_CAST_START_SCALE;

    const peakX = POV_CAST_PEAK_X;
    const peakY = POV_CAST_PEAK_Y;
    const peakScale = POV_CAST_PEAK_SCALE;
    const peakT = POV_CAST_PEAK_T;

    const endX = this.landingTargetX; // Power-adjusted landing position
    const endY = this.landingTargetY; // Power-adjusted landing position
    const endScale = POV_CAST_END_SCALE;

    let currentX: number;
    let currentY: number;
    let currentScale: number;

    if (t < peakT) {
      // Rising phase: hand to sky (ease-out for natural arm swing)
      const riseT = t / peakT;
      const eased = 1 - Math.pow(1 - riseT, 2); // ease-out quadratic

      currentX = startX + (peakX - startX) * eased;
      currentY = startY + (peakY - startY) * eased;
      currentScale = startScale + (peakScale - startScale) * eased;
    } else {
      // Falling phase: sky to pond (ease-in for gravity feel)
      const fallT = (t - peakT) / (1 - peakT);
      const eased = fallT * fallT; // ease-in quadratic (gravity)

      currentX = peakX + (endX - peakX) * eased;
      currentY = peakY + (endY - peakY) * eased;
      currentScale = peakScale + (endScale - peakScale) * fallT; // Linear scale for natural feel
    }

    this.castFloatX = currentX;
    this.castFloatY = currentY;
    this.castFloatScale = currentScale;
  }

  /** Side-view arc cast (original animation, kept as backup) */
  private updateCastFlightSideView(dt: number): void {
    this.castFlightT += dt / CAST_FLIGHT_TIME;
    if (this.castFlightT >= 1) { this.castFlightT = 1; this.onFloatLanded(); return; }
    const t = this.castFlightT;
    const arcHeight = CAST_MIN_ARC_HEIGHT + (this.castPower / 100) * (CAST_MAX_ARC_HEIGHT - CAST_MIN_ARC_HEIGHT);
    this.castFloatX = CAST_START_X + (this.landingTargetX - CAST_START_X) * t;
    this.castFloatY = CAST_START_Y + (this.landingTargetY - CAST_START_Y) * t - arcHeight * Math.sin(Math.PI * t);
    this.castFloatScale = 1.0;
  }

  private onFloatLanded(): void {
    this.phase = GamePhase.FloatLanded;

    // FIX Issues 2+3: Capture a snapshot of the current line's 2D positions
    // before snapping to the final position. This enables a smooth transition.
    if (USE_3D_PHYSICS_CAST && this.lineSegments3D.length > 0) {
      this.landingLineSnapshot = [];
      for (let i = 0; i < this.lineSegments3D.length; i++) {
        const p = this.project3Dto2D(this.lineSegments3D[i]);
        this.landingLineSnapshot.push({ x: p.x, y: p.y });
      }
      // Force first point to off-screen anchor and blend early points
      // (matching drawSegmentedLine3D off-screen clamping behavior)
      if (this.landingLineSnapshot.length > 0) {
        const anchor = { x: POV_LINE_START_X, y: POV_LINE_START_Y };
        this.landingLineSnapshot[0] = anchor;
        // Blend early points toward anchor (same as renderer)
        const fadeCount = Math.min(3, this.landingLineSnapshot.length - 1);
        for (let i = 1; i < fadeCount; i++) {
          const blendT = 1 - (i / fadeCount);
          const blendFactor = blendT * 0.6;
          this.landingLineSnapshot[i] = {
            x: this.landingLineSnapshot[i].x + (anchor.x - this.landingLineSnapshot[i].x) * blendFactor,
            y: this.landingLineSnapshot[i].y + (anchor.y - this.landingLineSnapshot[i].y) * blendFactor,
          };
        }
      }
    } else {
      this.landingLineSnapshot = [];
    }

    this.castFloatX = this.landingTargetX;
    this.castFloatY = this.landingTargetY;
    this.floatLandedTimer = 0;
    this.splashTimer = 0;
    this.splashRipples = [];
    for (let i = 0; i < SPLASH_RIPPLE_COUNT; i++) {
      this.splashRipples.push({ x: this.landingTargetX, y: this.landingTargetY, radius: 0, maxRadius: 45, alpha: 0 });
    }
  }

  private updateFloatLanded(dt: number): void {
    this.splashTimer += dt;
    this.floatLandedTimer += dt;
    for (let i = 0; i < this.splashRipples.length; i++) {
      const ripple = this.splashRipples[i];
      const rippleStartTime = i * SPLASH_RIPPLE_DELAY;
      if (this.splashTimer >= rippleStartTime) {
        const elapsed = this.splashTimer - rippleStartTime;
        ripple.radius = elapsed * SPLASH_RIPPLE_EXPAND_SPEED;
        ripple.alpha = Math.max(0, 1 - ripple.radius / ripple.maxRadius);
      }
    }
    // FIX Issue 3: Continue physics line settling during FloatLanded
    this.settleLineSegments(dt);
    if (this.floatLandedTimer >= FLOAT_LANDED_PAUSE) { this.splashRipples = []; this.enterFloatBounce(); }
  }

  private enterFloatBounce(): void {
    this.phase = GamePhase.FloatBounce;
    this.floatBounceTimer = 0;
    this.showingSurpriseEmoji = false;
    this.surpriseEmojiTimer = 0;

    // Pre-determine encounter at bounce start so "!" can appear immediately
    const selectedCharacter = this.encounterSystem.selectCharacter(
      this.lastCastPower,
      this.equippedLureId,
      this.flagSystem,
      this.questSystem,
    );
    this.pendingEncounterCharacter = selectedCharacter;

    if (selectedCharacter) {
      // Fish found — spawn surprise emoji NOW (at the start of the bob)
      this.spawnEmotionIcon(EmotionIconType.Surprise, 'float');
      console.log('[FloaterGame] FloatBounce started — fish found, surprise emoji spawned!');
    } else {
      console.log('[FloaterGame] FloatBounce started — nothing bites');
    }
  }

  /** FIX Issue 3: Gradually settle line segments toward rest position.
   *  Lerps each segment toward where the static Bézier line would be,
   *  creating a smooth transition from physics to rest state. */
  private settleLineSegments(dt: number): void {
    if (this.lineSegments3D.length < 2) return;
    const numSegments = this.lineSegments3D.length;

    // Compute target "rest" positions: evenly spaced 3D points between
    // the rod tip (off-screen anchor) and the floater landing position.
    // Use the off-screen anchor as the rod tip target for settling.
    const rodTipTarget = this.rod3D.tipPos.clone();
    const floaterTarget = this.unproject2Dto3D(this.landingTargetX, this.landingTargetY, 1.0);

    // Lerp speed: settle quickly (exponential smoothing)
    const settleRate = 4.0; // per second
    const t = 1 - Math.exp(-settleRate * dt);

    // Keep first and last fixed
    this.lineSegments3D[0] = rodTipTarget;
    this.lineSegments3D[numSegments - 1] = floaterTarget;

    // Lerp intermediate segments toward evenly-spaced rest positions
    for (let i = 1; i < numSegments - 1; i++) {
      const fraction = i / (numSegments - 1);
      // Target: lerp between rod tip and floater with slight sag
      const targetX = rodTipTarget.x + (floaterTarget.x - rodTipTarget.x) * fraction;
      const targetZ = rodTipTarget.z + (floaterTarget.z - rodTipTarget.z) * fraction;
      // Add parabolic sag in Y
      const sagAmount = -0.5 * fraction * (1 - fraction) * 4; // max sag at midpoint
      const targetY = rodTipTarget.y + (floaterTarget.y - rodTipTarget.y) * fraction + sagAmount;

      const current = this.lineSegments3D[i];
      this.lineSegments3D[i] = new Vec3D(
        current.x + (targetX - current.x) * t,
        current.y + (targetY - current.y) * t,
        current.z + (targetZ - current.z) * t
      );
    }
  }

  private updateFloatBounce(dt: number): void {
    this.floatBounceTimer += dt;
    // FIX Issue 3: Continue physics line settling during FloatBounce
    this.settleLineSegments(dt);
    if (this.floatBounceTimer >= FLOAT_BOUNCE_DURATION) {
      // Bounce done — proceed to startCast which decides if a fish bites
      // Surprise emoji is spawned inside startCast only if a fish is found
      this.startCast();
    }
  }

  // === Save/Load ===
  private buildSaveData(): SaveData {
    return {
      fish: {
        [this.fish.id]: {
          affection: this.fishAffection.value,
          tier: this.fishAffection.tier,
          drift: this.fish.currentDrift,
          tierFloor: this.fishAffection.floor,
          peakValue: this.fishAffection.peakValue,
          lastChangeSessionId: this.fishAffection.lastChangeSessionId,
          lastChangeDelta: this.fishAffection.lastChangeDelta,
          floor: this.fishAffection.floor,
        },
      },
      flags: this.flagSystem.serialize(),
      seenBeats: Array.from(this.seenBeats),
      castCount: this.castCount,
      castIndexWithinTier: this.castIndexWithinTier,
      driftScaredCount: this.driftScaredCount,
      quests: this.questSystem.serialize(),
      perFishCastIndex: { ...this.perFishCastIndex },
    };
  }

  private loadGame(): void {
    const data = this.saveSystem.loadSave();
    if (data) {
      const fishData = data.fish[this.fish.id];
      if (fishData) {
        this.fish.affection = fishData.affection;
        this.fish.tier = fishData.tier;
        this.fish.currentDrift = fishData.drift;
        this.fish.tierFloor = fishData.tierFloor;
        this.fishAffection = this.affectionSystem.restoreFromSave(this.fish.id, {
          value: fishData.affection, tier: fishData.tier,
          floor: fishData.floor ?? fishData.tierFloor,
          peakValue: fishData.peakValue ?? fishData.affection,
          lastChangeSessionId: fishData.lastChangeSessionId ?? '',
          lastChangeDelta: fishData.lastChangeDelta ?? 0,
        });
      }
      this.flagSystem.deserialize(data.flags);
      this.seenBeats = new Set(data.seenBeats);
      this.castCount = data.castCount;
      this.castIndexWithinTier = data.castIndexWithinTier ?? 0;
      this.driftScaredCount = data.driftScaredCount ?? 0;
      if (data.quests) {
        this.questSystem.deserialize(data.quests);
      }
      if (data.perFishCastIndex) {
        this.perFishCastIndex = { ...data.perFishCastIndex };
      }
      console.log(`[FloaterGame] Loaded save: castCount=${this.castCount}, castIndexWithinTier=${this.castIndexWithinTier}, tier=${TIER_NAMES[this.fish.tier]}`);
    } else {
      console.log('[FloaterGame] No save data found, starting fresh');
    }
  }

  // === Rendering ===
  private render(): void {
    if (!this.renderer) return;
    this.renderer.clear();
    this.renderer.drawBackground();

    // Only show static float during active phases (hide during Title, LakeIdle, Idle, CastCharging, Ending)
    const showStaticFloat = this.phase === GamePhase.FloatBounce
      || this.phase === GamePhase.Approach
      || this.phase === GamePhase.Exchange
      || this.phase === GamePhase.ActionSelect
      || this.phase === GamePhase.FishReaction
      || this.phase === GamePhase.Departure
      || this.phase === GamePhase.CatchSequence
      || this.phase === GamePhase.NothingBites;
    if (showStaticFloat) {
      // Use the same Bézier curve as the cast line (consistent appearance)
      // floatDip provides action animation feedback (Twitch/Reel dip the float)
      const bobOffset = Math.sin(this.time * FLOAT_BOB_SPEED) * FLOAT_BOB_AMPLITUDE;
      const dipOffset = this.floatDip;
      const floatDrawX = this.landingTargetX + this.actionAnimOffsetX;
      const floatDrawY = this.landingTargetY + bobOffset + dipOffset + this.actionAnimOffsetY;
      this.renderer.drawCastFishingLine(floatDrawX, floatDrawY, 1.0, USE_POV_CAST_ANIMATION);
      // During FloatBounce, draw float with bounce offset
      if (this.phase === GamePhase.FloatBounce && !this.showingSurpriseEmoji) {
        const t = this.floatBounceTimer / FLOAT_BOUNCE_DURATION;
        const amplitude = FLOAT_BOUNCE_AMPLITUDE * (1 - t);
        const bobY = amplitude * Math.sin(t * FLOAT_BOUNCE_COUNT * 2 * Math.PI);
        this.renderer.drawFloatAtScaled(this.landingTargetX, this.landingTargetY + bobY, 1.0);
      } else {
        this.renderer.drawFloatAtScaled(floatDrawX, floatDrawY, 1.0);
      }
    }

    if (this.phase === GamePhase.CastFlying) {
      if (USE_3D_PHYSICS_CAST) {
        this.renderer.drawSegmentedLine3D(this.lineSegments3D, (v: Vec3D) => this.project3Dto2D(v));
      } else {
        this.renderer.drawCastFishingLine(this.castFloatX, this.castFloatY, this.castFlightT, USE_POV_CAST_ANIMATION);
      }
      this.renderer.drawFloatAtScaled(this.castFloatX, this.castFloatY, this.castFloatScale);
    }
    if (this.phase === GamePhase.FloatLanded) {
      // FIX Issues 2+3: Use transition line that lerps from snapshot to resting curve
      if (this.landingLineSnapshot.length > 0) {
        const progress = Math.min(1.0, this.floatLandedTimer / FLOAT_LANDED_PAUSE);
        this.renderer.drawTransitionLine(this.landingLineSnapshot, this.castFloatX, this.castFloatY, progress, USE_POV_CAST_ANIMATION);
      } else {
        this.renderer.drawCastFishingLine(this.castFloatX, this.castFloatY, 1.0, USE_POV_CAST_ANIMATION);
      }
      this.renderer.drawFloatAt(this.castFloatX, this.castFloatY);
      this.renderer.drawSplashRipples(this.splashRipples);
    }
    if (this.phase === GamePhase.CastCharging) this.renderer.drawPowerGauge(this.powerGaugeValue);
    if (this.fishAlpha > 0) this.renderer.drawFishPortrait(this.fishAlpha, this.portraitOffsetX, this.portraitOffsetY);


    // Draw floating emotion icons
    this.renderer.drawFloatingEmotionIcons(this.floatingIcons);

    // Update XAML dialogue panel — controlled by phase, not text length (prevents flicker)
    const isDialoguePhase = this.phase === GamePhase.Exchange
      || this.phase === GamePhase.FishReaction
      || this.phase === GamePhase.ActionSelect
      || this.phase === GamePhase.CatchSequence
      || this.phase === GamePhase.Departure
      || this.phase === GamePhase.NothingBites;
    const showDialogue = isDialoguePhase && !this.catchDialogueShown;
    floaterVM.dialogueVisible = showDialogue;

    // Scenery/narration mode: triggered by asterisk prefix in dialogue text
    const isScenery = this.displayedText.startsWith('*');
    floaterVM.speakerNameVisible = !isScenery;
    floaterVM.dialogueTextAlignment = isScenery ? 'Center' : 'Left';
    floaterVM.dialogueTextFontStyle = isScenery ? 'Italic' : 'Normal';

    if (showDialogue) {
      floaterVM.speakerName = this.fish.name;
      floaterVM.speakerColor = this.fish.accentColor;
      floaterVM.dialogueText = this.displayedText;
      floaterVM.showContinue = this.isTextComplete;
      floaterVM.tapIndicatorVisible = this.isTextComplete;
    } else {
      floaterVM.tapIndicatorVisible = false;
    }

    floaterVM.drawCommands = this.builder.build();
  }

  // === Touch Setup ===
  private enableTouchInput(): void {
    try {
      const service = FocusedInteractionService.get();
      service.enableFocusedInteraction({
        disableFocusExitButton: true,
        disableEmotesButton: true,
        interactionStringId: 'floater_touch',
      });
    } catch (e) {
      console.log('[FloaterGame] Failed to enable touch input');
    }
  }

  // === Hot Reload ===
  override onBeforeHotReload(): Maybe<Record<string, unknown>> {
    return super.onBeforeHotReload();
  }

  override onAfterHotReload(savedState: Record<string, unknown>): void {
    super.onAfterHotReload(savedState);
    this.renderer = new FloaterRenderer(this.builder);
    const customUi = this.entity.getComponent(CustomUiComponent);
    if (customUi != null) { customUi.dataContext = floaterVM; }
    this.syncViewModelFromState();
    if (NetworkingService.get().isPlayerContext()) { this.enableTouchInput(); }
    this.render();
  }

  private syncViewModelFromState(): void {
    floaterVM.titleVisible = this.phase === GamePhase.Title;
    floaterVM.hudVisible = this.phase !== GamePhase.Title && this.phase !== GamePhase.Idle
      && this.phase !== GamePhase.LakeIdle && this.phase !== GamePhase.CastCharging
      && this.phase !== GamePhase.CastFlying && this.phase !== GamePhase.FloatLanded
      && this.phase !== GamePhase.Ending;
    floaterVM.actionMenuVisible = this.phase === GamePhase.ActionSelect;
    floaterVM.departureVisible = false; // Departure now uses dialogue panel
    floaterVM.idleVisible = this.phase === GamePhase.Idle;
    floaterVM.skipButtonVisible = this.canSkip;
    floaterVM.skipButtonOpacity = this.canSkip ? 1 : 0;
    floaterVM.castButtonVisible = this.phase === GamePhase.LakeIdle;
    floaterVM.fishNameText = this.fish.name;
    floaterVM.inventoryVisible = false;
    floaterVM.journalVisible = false;
    floaterVM.noLureWarningVisible = false;
    floaterVM.catchChoiceVisible = false;
    floaterVM.endingVisible = this.phase === GamePhase.Ending;
    floaterVM.inventoryButtonVisible = this.phase === GamePhase.LakeIdle || this.phase === GamePhase.Idle;
    floaterVM.journalButtonVisible = this.phase === GamePhase.LakeIdle || this.phase === GamePhase.Idle;
    floaterVM.tierTransitionVisible = this.tierNotifyTimer > 0;
    this.syncAffectionDisplay();

    const isDialoguePhaseSync = this.phase === GamePhase.Exchange || this.phase === GamePhase.FishReaction
      || this.phase === GamePhase.ActionSelect || this.phase === GamePhase.Departure || this.phase === GamePhase.CatchSequence
      || this.phase === GamePhase.NothingBites;
    const showDialogueSync = isDialoguePhaseSync && !this.catchDialogueShown;
    floaterVM.dialogueVisible = showDialogueSync;

    const isScenerySync = this.displayedText.startsWith('*');
    floaterVM.speakerNameVisible = !isScenerySync;
    floaterVM.dialogueTextAlignment = isScenerySync ? 'Center' : 'Left';
    floaterVM.dialogueTextFontStyle = isScenerySync ? 'Italic' : 'Normal';

    if (showDialogueSync) {
      floaterVM.speakerName = this.fish.name;
      floaterVM.speakerColor = this.fish.accentColor;
      floaterVM.dialogueText = this.displayedText;
      floaterVM.showContinue = this.isTextComplete;
      floaterVM.tapIndicatorVisible = this.isTextComplete;
    } else {
      floaterVM.tapIndicatorVisible = false;
    }
  }
}
