import {
  Component,
  CustomUiComponent,
  NetworkingService,
  NetworkMode,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  type OnWorldUpdateEventPayload,
  Quaternion,
  TransformComponent,
  UiViewModel,
  Vec3,
  WorldService,
  component,
  property,
  subscribe,
  uiViewModel,
  type Entity,
  type Maybe,
} from 'meta/worlds';

import { HUDEvents } from '../Types';
import { FISH_DEFS } from '../Fish/FishDefs';
import { FishCollectionService } from '../Fish/FishCollectionService';

// ─── ViewModel ────────────────────────────────────────────────────────────────
@uiViewModel()
export class CatchDisplayData extends UiViewModel {
  visibility   : string  = 'Collapsed';  // 'Visible' or 'Collapsed'
  fishName     : string  = '';
  rarityStars  : string  = '';   // '★', '★★', '★★★'
  catchCount   : number  = 0;
  newVisibility: boolean  = false; // 'Visible' when isNew, 'Collapsed' otherwise
}

const ROTATE_SPEED_DEG = 40; // degrees per second (Y-axis spin)

// ─── Component ────────────────────────────────────────────────────────────────
/**
 * CatchDisplayViewModel — drives the catch reveal screen + 3D fish display.
 *
 * ── Editor setup ────────────────────────────────────────────────────────────
 * Attach to the entity that holds the CatchDisplay CustomUiComponent.
 * Assign fishAnchor to the entity in front of the camera where the 3D fish
 * should appear (position/scale set in scene).
 *
 * ── XAML bindings ───────────────────────────────────────────────────────────
 * <Panel Visibility="{Binding visibility}">
 *   <Label Text="NEW!" Visibility="{Binding newVisibility}" />
 *   <Label Text="{Binding fishName}" />
 *   <Label Text="{Binding rarityStars}" />
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

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._ui = this.entity.getComponent(CustomUiComponent);
    if (this._ui) this._ui.dataContext = this._vm;
  }

  // ── UI events ────────────────────────────────────────────────────────────────

  @subscribe(HUDEvents.ShowCatch)
  private _onShowCatch(p: HUDEvents.ShowCatchPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._refreshJournal();
    this._journalIndex = this._journalIds.indexOf(p.defId);
    if (this._journalIndex < 0) this._journalIndex = this._journalIds.length - 1;
    this._showFish(p.defId, p.isNew, p.catchCount);
    this._vm.visibility = 'Visible';
  }

  @subscribe(HUDEvents.HideCatch)
  private _onHideCatch(_p: HUDEvents.HideCatchPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._vm.visibility = 'Collapsed';
    this._despawnFish();
  }

  @subscribe(HUDEvents.NavigateCatch)
  private _onNavigate(p: HUDEvents.NavigateCatchPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (this._journalIds.length === 0) return;
    this._journalIndex = (this._journalIndex + p.direction + this._journalIds.length) % this._journalIds.length;
    const fishId = this._journalIds[this._journalIndex];
    const count  = FishCollectionService.get().getCount(fishId);
    this._showFish(fishId, false, count);
  }

  // ── 3D fish rotation ─────────────────────────────────────────────────────────

  @subscribe(OnWorldUpdateEvent)
  private _onUpdate(_p: OnWorldUpdateEventPayload): void {
    if (!this._fishVisible || !this._spawnedFish) return;
    const tc = this._spawnedFish.getComponent(TransformComponent);
    if (!tc) return;
    const deg = WorldService.get().getWorldTime() * ROTATE_SPEED_DEG;
    tc.worldRotation = Quaternion.fromEuler(new Vec3(0, deg, 0));
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private _showFish(defId: number, isNew: boolean, catchCount: number): void {
    const def = FISH_DEFS.find(d => d.id === defId);
    if (!def) return;

    this._vm.fishName     = def.name;
    this._vm.rarityStars  = def.rarity === 'legendary' ? '★★★' : def.rarity === 'rare' ? '★★' : '★';
    this._vm.catchCount   = catchCount;
    this._vm.newVisibility = isNew;

    void this._spawnFish(def.id);
  }

  private async _spawnFish(defId: number): Promise<void> {
    console.log("SPANWNING")
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

    console.log("SPAWNED")
    this._spawnedFish = entity;
    this._fishVisible = true;
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
