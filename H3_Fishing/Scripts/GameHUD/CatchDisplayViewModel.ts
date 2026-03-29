import {
  Component,
  CustomUiComponent,
  NetworkingService,
  OnEntityStartEvent,
  UiViewModel,
  component,
  subscribe,
  uiViewModel,
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
  fishId       : string  = '';   // padded, e.g. '#042'
  rarityStars  : string  = '';   // '★', '★★', '★★★'
  catchCount   : number  = 0;
  isNew        : boolean = false;
  newLabel     : string  = '';   // 'NEW!' or ''
  newVisibility: string  = 'Collapsed'; // 'Visible' when isNew, 'Collapsed' otherwise
}

// ─── Component ────────────────────────────────────────────────────────────────
/**
 * CatchDisplayViewModel — drives the catch reveal screen.
 *
 * ── Editor setup ────────────────────────────────────────────────────────────
 * Attach to the entity that holds the CatchDisplay CustomUiComponent.
 *
 * ── Component Attachment ────────────────────────────────────────────────────
 * Attached to: Scene Entity (CatchDisplayHUD)
 * Component Networking: Local (UI runs on client only)
 * Component Ownership: Not Networked (scene entity, executes everywhere but
 *                      UI operations are filtered to client-side only)
 *
 * ── XAML bindings ───────────────────────────────────────────────────────────
 * <Panel Visibility="{Binding visibility}">
 *   <Label Text="{Binding newLabel}" Visibility="{Binding newVisibility}" />
 *   <Label Text="{Binding fishName}" />
 *   <Label Text="{Binding fishId}" />
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

  private _vm  = new CatchDisplayData();
  private _ui: Maybe<CustomUiComponent> = null;

  /** All caught fish IDs for journal navigation. */
  private _journalIds: number[] = [];
  private _journalIndex = 0;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._ui = this.entity.getComponent(CustomUiComponent);
    if (this._ui) this._ui.dataContext = this._vm;
  }

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

  private _showFish(fishId: number, isNew: boolean, catchCount: number): void {
    const def = FISH_DEFS.find(d => d.id === fishId);
    if (!def) return;
    this._vm.fishName     = def.name;
    this._vm.fishId       = `#${String(def.id).padStart(3, '0')}`;
    this._vm.rarityStars  = def.rarity === 'legendary' ? '★★★' : def.rarity === 'rare' ? '★★' : '★';
    this._vm.catchCount   = catchCount;
    this._vm.isNew        = isNew;
    this._vm.newLabel     = isNew ? 'NEW!' : '';
    this._vm.newVisibility = isNew ? 'Visible' : 'Collapsed';
  }

  private _refreshJournal(): void {
    this._journalIds = FishCollectionService.get().caughtDefs();
  }
}
