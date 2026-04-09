import {
  Component,
  CustomUiComponent,
  EventService,
  NetworkingService,
  NetworkMode,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  type OnWorldUpdateEventPayload,
  Quaternion,
  serializable,
  TransformComponent,
  UiEvent,
  UiViewModel,
  Vec3,
  WorldService,
  component,
  property,
  subscribe,
  uiViewModel,
  type Entity,
  type Maybe,
  FocusedInteractionService,
  UiService,
} from 'meta/worlds';

import { HUDEvents } from '../Types';
import { FISH_DEFS } from '../Fish/FishDefs';
import { FishCollectionService } from '../Fish/FishCollectionService';

// ─── Module-level UiEvent constants for navigation buttons ───────────────────
@serializable()
class NavigateButtonPayload {
  readonly parameter: string = "";
}

export const navigatePreviousEvent = new UiEvent('CatchDisplayViewModel-onNavigatePrevious', NavigateButtonPayload);
export const navigateNextEvent = new UiEvent('CatchDisplayViewModel-onNavigateNext', NavigateButtonPayload);

// ─── Module-level UiEvent constant for dismiss backdrop ──────────────────────
@serializable()
class DismissPayload {
  readonly parameter: string = "";
}

export const dismissEvent = new UiEvent('CatchDisplayViewModel-onDismiss', DismissPayload);

// ─── ViewModel ────────────────────────────────────────────────────────────────
/**
 * CatchDisplayData — ViewModel for the catch reveal screen.
 * 
 * Bindings:
 * - visibility: 'Visible' or 'Collapsed' to show/hide the panel
 * - fishName: Name of the caught fish
 * - fishId: Journal number formatted as "#001", "#002", etc.
 * - rarityStars: '★', '★★', or '★★★' based on rarity
 * - showStar2: true for rare and legendary fish (2+ stars)
 * - showStar3: true for legendary fish only (3 stars)
 * - catchCount: Total number of this fish caught
 * - newVisibility: true when this is the first catch of this fish
 * 
 * Animation trigger properties (set to true to trigger animations):
 * - animPanel: Main panel bounce animation
 * - animStar1/2/3: Individual star pop animations
 * - animNewBadge: NEW! badge pop animation
 * - animFishId: Fish ID slide-in animation
 * - animFishName: Fish name fade + slide animation
 * - animCatchCount: Catch count pop animation
 * - animTapContinue: "Tap to continue" fade + pulse animation
 */
@uiViewModel()
export class CatchDisplayData extends UiViewModel {
  // Data properties
  visibility   : string  = 'Collapsed';  // 'Visible' or 'Collapsed'
  fishName     : string  = '';
  fishId       : string  = '#001';       // Journal number formatted as "#001", "#002", etc.
  rarityStars  : string  = '';           // '★', '★★', '★★★'
  showStar2    : boolean = false;        // true for rare and legendary (2+ stars)
  showStar3    : boolean = false;        // true for legendary only (3 stars)
  catchCount   : number  = 0;
  newVisibility: boolean = false;        // true when isNew

  // Navigation visibility properties
  canNavigatePrevious: boolean = false;  // true when not at first fish
  canNavigateNext    : boolean = false;  // true when not at last fish

  // Animation trigger properties (toggle to true to trigger DataTrigger animations)
  animPanel      : boolean = false;
  animStar1      : boolean = false;
  animStar2      : boolean = false;
  animStar3      : boolean = false;
  animNewBadge   : boolean = false;
  animFishId     : boolean = false;
  animFishName   : boolean = false;
  animCatchCount : boolean = false;
  animTapContinue: boolean = false;

  // Navigation events for XAML button bindings
  override readonly events = {
    navigatePrevious: navigatePreviousEvent,
    navigateNext: navigateNextEvent,
    dismiss: dismissEvent,
  };
}

const ROTATE_SPEED_DEG  = 40;   // degrees per second (Y-axis spin)
const SPAWN_ANIM_DUR    = 0.55;  // seconds for scale-up bounce

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// Animation timing constants (in milliseconds)
const ANIM_TIMING = {
  PANEL:        0,      // 0.0s - Panel bounce
  STAR1:        300,    // 0.3s - Star 1 pop
  STAR2:        400,    // 0.4s - Star 2 pop
  STAR3:        500,    // 0.5s - Star 3 pop
  NEW_BADGE:    600,    // 0.6s - NEW! badge pop
  FISH_ID:      700,    // 0.7s - Fish ID slide-in
  FISH_NAME:    750,    // 0.75s - Fish name fade + slide
  CATCH_COUNT:  850,    // 0.85s - Catch count pop
  TAP_CONTINUE: 1200,   // 1.2s - "Tap to continue" fade + pulse
};

// ─── Component ────────────────────────────────────────────────────────────────
/**
 * CatchDisplayViewModel — drives the catch reveal screen + 3D fish display.
 *
 * ── Editor setup ──────────────────────────────────────────────────────────────
 * Attach to the entity that holds the CatchDisplay CustomUiComponent.
 * Assign fishAnchor to the entity in front of the camera where the 3D fish
 * should appear (position/scale set in scene).
 *
 * ── Component Attachment ──────────────────────────────────────────────────────
 * Scene Entity (CatchDisplayHUD entity with CustomUiComponent)
 *
 * ── Component Networking ──────────────────────────────────────────────────────
 * Local - UI is client-side only
 *
 * ── Component Ownership ──────────────────────────────────────────────────────
 * Not Networked - runs locally on each client
 *
 * ── XAML bindings ─────────────────────────────────────────────────────────────
 * <Panel Visibility="{Binding visibility}">
 *   <Label Text="NEW!" Visibility="{Binding newVisibility}" />
 *   <Label Text="{Binding fishId}" />
 *   <Label Text="{Binding fishName}" />
 *   <Star1 /> <!-- always visible -->
 *   <Star2 Visibility="{Binding showStar2}" />
 *   <Star3 Visibility="{Binding showStar3}" />
 *   <Label Text="×{Binding catchCount}" />
 * </Panel>
 *
 * Navigation buttons (Prev / Next) fire HUDEvents.NavigateCatch via input
 * routing in GameManager — they are handled here to update which caught fish
 * is displayed in the journal view.
 */
@component()
export class CatchDisplayViewModel extends Component {

  /** Anchor entity in front of the camera — the 3D fish spawns here. */
  @property() fishAnchor: Maybe<Entity> = null;

  private _vm  = new CatchDisplayData();
  private _ui: Maybe<CustomUiComponent> = null;

  private _journalIds: number[] = [];
  private _journalIndex = 0;

  private _spawnedFish: Entity | null = null;
  private _fishVisible = false;
  private _spawnAnimT  = SPAWN_ANIM_DUR; // set to 0 on spawn to trigger animation
  private _anchorScale = Vec3.one;

  // Timer handles for animation cascade
  private _animTimers: number[] = [];

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._ui = this.entity.getComponent(CustomUiComponent);
    if (this._ui) this._ui.dataContext = this._vm;
  }

  // ── Navigation button events ─────────────────────────────────────────────────

  @subscribe(navigatePreviousEvent)
  private _onNavigatePreviousButton(): void {
    console.log("ok");
    if (NetworkingService.get().isServerContext()) return;
    EventService.sendLocally(HUDEvents.NavigateCatch, { direction: -1 });
  }

  @subscribe(navigateNextEvent)
  private _onNavigateNextButton(): void {
    console.log("ok2");
    if (NetworkingService.get().isServerContext()) return;
    EventService.sendLocally(HUDEvents.NavigateCatch, { direction: 1 });
  }

  // ── Dismiss backdrop event ─────────────────────────────────────────────────────

  @subscribe(dismissEvent)
  private _onDismissBackdrop(): void {
    if (NetworkingService.get().isServerContext()) return;
    EventService.sendLocally(HUDEvents.DismissCatch, {});
  }

  // ── UI events ────────────────────────────────────────────────────────────────

  @subscribe(HUDEvents.ShowCatch)
  private _onShowCatch(p: HUDEvents.ShowCatchPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    UiService.get().focus(this.entity, {fillPercentage:3});
    this._refreshJournal();
    this._journalIndex = this._journalIds.indexOf(p.defId);
    if (this._journalIndex < 0) this._journalIndex = this._journalIds.length - 1;
    this._showFish(p.defId, p.isNew, p.catchCount);
    this._updateNavigationVisibility();
    this._vm.visibility = 'Visible';
    
    // Trigger cascade animation
    this.playAnimation();
  }

  @subscribe(HUDEvents.HideCatch)
  private _onHideCatch(_p: HUDEvents.HideCatchPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._vm.visibility = 'Collapsed';
    this._despawnFish();
    this._resetAnimations();
  }

  @subscribe(HUDEvents.NavigateCatch)
  private _onNavigate(p: HUDEvents.NavigateCatchPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (this._journalIds.length === 0) return;
    this._journalIndex = (this._journalIndex + p.direction + this._journalIds.length) % this._journalIds.length;
    const fishId = this._journalIds[this._journalIndex];
    const count  = FishCollectionService.get().getCount(fishId);
    this._showFish(fishId, false, count);
    this._updateNavigationVisibility();
    
    // Replay animation for navigation
    this.playAnimation();
  }

  /**
   * Updates canNavigatePrevious and canNavigateNext based on current journal position.
   */
  private _updateNavigationVisibility(): void {
    const total = this._journalIds.length;
    // Show arrows only if there's more than one fish in the journal
    this._vm.canNavigatePrevious = total > 1;
    this._vm.canNavigateNext = total > 1;
  }

  // ── 3D fish rotation ───────────────────────────────────────────────────────

  @subscribe(OnWorldUpdateEvent)
  private _onUpdate(p: OnWorldUpdateEventPayload): void {
    if (!this._fishVisible || !this._spawnedFish) return;
    const tc = this._spawnedFish.getComponent(TransformComponent);
    if (!tc) return;

    // Scale-up bounce animation
    if (this._spawnAnimT < SPAWN_ANIM_DUR) {
      this._spawnAnimT += p.deltaTime;
      const t = Math.min(this._spawnAnimT / SPAWN_ANIM_DUR, 1);
      const s = easeOutBack(t);
      tc.localScale = new Vec3(
        this._anchorScale.x * s,
        this._anchorScale.y * s,
        this._anchorScale.z * s,
      );
    }

    const deg = WorldService.get().getWorldTime() * ROTATE_SPEED_DEG;
    tc.worldRotation = Quaternion.fromEuler(new Vec3(0, deg, 0));
  }

  // ── Animation Control ──────────────────────────────────────────────────────

  /**
   * Triggers the cascade animation sequence.
   * Call this method to play all animations in order with proper timing.
   * 
   * Timing sequence:
   * - 0.0s  - Panel (bounce élastique)
   * - 0.3s  - Star 1 (pop)
   * - 0.4s  - Star 2 (pop)
   * - 0.5s  - Star 3 (pop)
   * - 0.6s  - Badge NEW! (pop)
   * - 0.7s  - Fish ID (slide-in)
   * - 0.75s - Fish name (fade + slide)
   * - 0.85s - Catch count (pop)
   * - 1.2s  - "Tap to continue" (fade + pulse)
   */
  public playAnimation(): void {
    // Clear any pending timers and reset animation states
    this._clearAnimTimers();
    this._resetAnimationStates();

    // Schedule each animation trigger with proper delays
    // Panel - immediate (0.0s)
    this._scheduleAnim(() => { this._vm.animPanel = true; }, ANIM_TIMING.PANEL);

    // Star 1 - 0.3s
    this._scheduleAnim(() => { this._vm.animStar1 = true; }, ANIM_TIMING.STAR1);

    // Star 2 - 0.4s (only if visible)
    if (this._vm.showStar2) {
      this._scheduleAnim(() => { this._vm.animStar2 = true; }, ANIM_TIMING.STAR2);
    }

    // Star 3 - 0.5s (only if visible)
    if (this._vm.showStar3) {
      this._scheduleAnim(() => { this._vm.animStar3 = true; }, ANIM_TIMING.STAR3);
    }

    // NEW! Badge - 0.6s (only if visible)
    if (this._vm.newVisibility) {
      this._scheduleAnim(() => { this._vm.animNewBadge = true; }, ANIM_TIMING.NEW_BADGE);
    }

    // Fish ID - 0.7s
    this._scheduleAnim(() => { this._vm.animFishId = true; }, ANIM_TIMING.FISH_ID);

    // Fish Name - 0.75s
    this._scheduleAnim(() => { this._vm.animFishName = true; }, ANIM_TIMING.FISH_NAME);

    // Catch Count - 0.85s
    this._scheduleAnim(() => { this._vm.animCatchCount = true; }, ANIM_TIMING.CATCH_COUNT);

    // Tap to Continue - 1.2s
    this._scheduleAnim(() => { this._vm.animTapContinue = true; }, ANIM_TIMING.TAP_CONTINUE);
  }

  /**
   * Schedules an animation callback after a delay.
   */
  private _scheduleAnim(callback: () => void, delayMs: number): void {
    const timerId = setTimeout(callback, delayMs) as unknown as number;
    this._animTimers.push(timerId);
  }

  /**
   * Clears all pending animation timers.
   */
  private _clearAnimTimers(): void {
    for (const timerId of this._animTimers) {
      clearTimeout(timerId);
    }
    this._animTimers = [];
  }

  /**
   * Resets all animation trigger states to false.
   * This prepares the ViewModel for a fresh animation sequence.
   */
  private _resetAnimationStates(): void {
    this._vm.animPanel       = false;
    this._vm.animStar1       = false;
    this._vm.animStar2       = false;
    this._vm.animStar3       = false;
    this._vm.animNewBadge    = false;
    this._vm.animFishId      = false;
    this._vm.animFishName    = false;
    this._vm.animCatchCount  = false;
    this._vm.animTapContinue = false;
  }

  /**
   * Full reset: clears timers and resets animation states.
   * Called when hiding the catch display.
   */
  private _resetAnimations(): void {
    this._clearAnimTimers();
    this._resetAnimationStates();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private _showFish(defId: number, isNew: boolean, catchCount: number): void {
    const def = FISH_DEFS.find(d => d.id === defId);
    if (!def) return;

    // Update ViewModel properties
    this._vm.fishName     = def.name;
    this._vm.fishId       = this._formatFishId(def.id);
    this._vm.rarityStars  = this._getRarityStars(def.rarity);
    this._vm.showStar2    = def.rarity === 'rare' || def.rarity === 'legendary';
    this._vm.showStar3    = def.rarity === 'legendary';
    this._vm.catchCount   = catchCount;
    this._vm.newVisibility = isNew;

    void this._spawnFish(def.id);
  }

  /**
   * Formats the fish ID as a journal number: "#001", "#002", etc.
   */
  private _formatFishId(id: number): string {
    return '#' + id.toString().padStart(3, '0');
  }

  /**
   * Converts rarity to star string.
   * common = '★', rare = '★★', legendary = '★★★'
   */
  private _getRarityStars(rarity: 'common' | 'rare' | 'legendary'): string {
    switch (rarity) {
      case 'legendary': return '★★★';
      case 'rare':      return '★★';
      case 'common':
      default:          return '★';
    }
  }

  private async _spawnFish(defId: number): Promise<void> {
    this._despawnFish();
    
    const def = FISH_DEFS.find(d => d.id === defId);
    if (!def || !this.fishAnchor) return;

    const anchorTc = this.fishAnchor.getComponent(TransformComponent);
    if (!anchorTc) return;

    const entity = await WorldService.get().spawnTemplate({
      templateAsset: def.template,
      position: anchorTc.worldPosition,
      rotation: Quaternion.identity,
      scale: anchorTc.localScale,
      networkMode: NetworkMode.LocalOnly,
    });

    this._spawnedFish = entity;
    this._fishVisible = true;
    this._spawnAnimT  = 0;
    this._anchorScale = anchorTc.localScale;
    // Start at zero scale — animation will grow it
    const tc = entity.getComponent(TransformComponent);
    if (tc) tc.localScale = Vec3.zero;
  }

  private _despawnFish(): void {
    this._fishVisible = false;
    if (this._spawnedFish) {
      this._spawnedFish.destroy();
      this._spawnedFish = null;
    }
  }

  private _refreshJournal(): void {
    this._journalIds = FishCollectionService.get().caughtDefs();
  }
}
