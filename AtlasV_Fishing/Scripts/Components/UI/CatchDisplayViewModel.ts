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

import { HUDEvents } from '../../Types';
import { FISH_DEFS } from '../../FishDefs';
import { FishCollectionService } from '../../Services/FishCollectionService';

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
@uiViewModel()
export class CatchDisplayData extends UiViewModel {
  // Data properties
  visibility   : string  = 'Collapsed';
  fishName     : string  = '';
  fishId       : string  = '#001';
  rarityStars  : string  = '';
  showStar2    : boolean = false;
  showStar3    : boolean = false;
  catchCount   : number  = 0;
  newVisibility: boolean = false;

  // Navigation visibility properties
  canNavigatePrevious: boolean = false;
  canNavigateNext    : boolean = false;

  // Animation trigger properties
  animPanel      : boolean = false;
  animStar1      : boolean = false;
  animStar2      : boolean = false;
  animStar3      : boolean = false;
  animNewBadge   : boolean = false;
  animFishId     : boolean = false;
  animFishName   : boolean = false;
  animCatchCount : boolean = false;
  animTapContinue: boolean = false;

  override readonly events = {
    navigatePrevious: navigatePreviousEvent,
    navigateNext: navigateNextEvent,
    dismiss: dismissEvent,
  };
}

const ROTATE_SPEED_DEG  = 40;
const SPAWN_ANIM_DUR    = 0.55;

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

const ANIM_TIMING = {
  PANEL:        0,
  STAR1:        300,
  STAR2:        400,
  STAR3:        500,
  NEW_BADGE:    600,
  FISH_ID:      700,
  FISH_NAME:    750,
  CATCH_COUNT:  850,
  TAP_CONTINUE: 1200,
};

// ─── Component ────────────────────────────────────────────────────────────────
@component()
export class CatchDisplayViewModel extends Component {

  @property() fishAnchor: Maybe<Entity> = null;

  private _vm  = new CatchDisplayData();
  private _ui: Maybe<CustomUiComponent> = null;

  private _journalIds: number[] = [];
  private _journalIndex = 0;

  private _spawnedFish: Entity | null = null;
  private _fishVisible = false;
  private _spawnAnimT  = SPAWN_ANIM_DUR;
  private _anchorScale = Vec3.one;

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
    if (NetworkingService.get().isServerContext()) return;
    EventService.sendLocally(HUDEvents.NavigateCatch, { direction: -1 });
  }

  @subscribe(navigateNextEvent)
  private _onNavigateNextButton(): void {
    if (NetworkingService.get().isServerContext()) return;
    EventService.sendLocally(HUDEvents.NavigateCatch, { direction: 1 });
  }

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
    this.playAnimation();
  }

  private _updateNavigationVisibility(): void {
    const total = this._journalIds.length;
    this._vm.canNavigatePrevious = total > 1;
    this._vm.canNavigateNext = total > 1;
  }

  // ── 3D fish rotation ───────────────────────────────────────────────────────

  @subscribe(OnWorldUpdateEvent)
  private _onUpdate(p: OnWorldUpdateEventPayload): void {
    if (!this._fishVisible || !this._spawnedFish) return;
    const tc = this._spawnedFish.getComponent(TransformComponent);
    if (!tc) return;

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

  public playAnimation(): void {
    this._clearAnimTimers();
    this._resetAnimationStates();

    this._scheduleAnim(() => { this._vm.animPanel = true; }, ANIM_TIMING.PANEL);
    this._scheduleAnim(() => { this._vm.animStar1 = true; }, ANIM_TIMING.STAR1);
    if (this._vm.showStar2) {
      this._scheduleAnim(() => { this._vm.animStar2 = true; }, ANIM_TIMING.STAR2);
    }
    if (this._vm.showStar3) {
      this._scheduleAnim(() => { this._vm.animStar3 = true; }, ANIM_TIMING.STAR3);
    }
    if (this._vm.newVisibility) {
      this._scheduleAnim(() => { this._vm.animNewBadge = true; }, ANIM_TIMING.NEW_BADGE);
    }
    this._scheduleAnim(() => { this._vm.animFishId = true; }, ANIM_TIMING.FISH_ID);
    this._scheduleAnim(() => { this._vm.animFishName = true; }, ANIM_TIMING.FISH_NAME);
    this._scheduleAnim(() => { this._vm.animCatchCount = true; }, ANIM_TIMING.CATCH_COUNT);
    this._scheduleAnim(() => { this._vm.animTapContinue = true; }, ANIM_TIMING.TAP_CONTINUE);
  }

  private _scheduleAnim(callback: () => void, delayMs: number): void {
    const timerId = setTimeout(callback, delayMs) as unknown as number;
    this._animTimers.push(timerId);
  }

  private _clearAnimTimers(): void {
    for (const timerId of this._animTimers) {
      clearTimeout(timerId);
    }
    this._animTimers = [];
  }

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

  private _resetAnimations(): void {
    this._clearAnimTimers();
    this._resetAnimationStates();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private _showFish(defId: number, isNew: boolean, catchCount: number): void {
    const def = FISH_DEFS.find(d => d.id === defId);
    if (!def) return;

    this._vm.fishName     = def.name;
    this._vm.fishId       = this._formatFishId(def.id);
    this._vm.rarityStars  = this._getRarityStars(def.rarity);
    this._vm.showStar2    = def.rarity === 'rare' || def.rarity === 'legendary';
    this._vm.showStar3    = def.rarity === 'legendary';
    this._vm.catchCount   = catchCount;
    this._vm.newVisibility = isNew;

    void this._spawnFish(def.id);
  }

  private _formatFishId(id: number): string {
    return '#' + id.toString().padStart(3, '0');
  }

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
