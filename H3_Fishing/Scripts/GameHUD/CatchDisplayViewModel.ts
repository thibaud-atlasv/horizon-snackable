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

import { HUDEvents, Events } from '../Types';
import { FISH_DEFS } from '../Fish/FishDefs';
import { FishCollectionService } from '../Fish/FishCollectionService';

// ─── ViewModel ────────────────────────────────────────────────────────────────
@uiViewModel()
export class CatchDisplayData extends UiViewModel {
  visible      : boolean = false;
  fishName     : string  = '';
  fishId       : string  = '';   // padded, e.g. '#042'
  familyName   : string  = '';
  rarityStars  : string  = '';   // '★', '★★', '★★★'
  catchCount   : number  = 0;
  isNew        : boolean = false;
  newLabel     : string  = '';   // 'NEW!' or ''
}

// ─── Component ────────────────────────────────────────────────────────────────
/**
 * CatchDisplayViewModel — drives the catch reveal screen.
 *
 * ── Editor setup ────────────────────────────────────────────────────────────────
 * Attach to the entity that holds the CatchDisplay CustomUiComponent.
 *
 * ── XAML bindings ────────────────────────────────────────────────────────────────
 * <Panel visible="{visible}">
 *   <Label text="{newLabel}" />
 *   <Label text="{fishName}" />
 *   <Label text="{fishId}" />
 *   <Label text="{familyName}" />
 *   <Label text="{rarityStars}" />
 *   <Label text="×{catchCount}" />
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
    this._refreshJournal();
    this._journalIndex = this._journalIds.indexOf(p.fishId);
    if (this._journalIndex < 0) this._journalIndex = this._journalIds.length - 1;
    this._showFish(p.fishId, p.isNew, p.catchCount);
    this._vm.visible = true;
  }

  @subscribe(HUDEvents.HideCatch)
  private _onHideCatch(_p: HUDEvents.HideCatchPayload): void {
    this._vm.visible = false;
  }

  @subscribe(HUDEvents.NavigateCatch)
  private _onNavigate(p: HUDEvents.NavigateCatchPayload): void {
    if (this._journalIds.length === 0) return;
    this._journalIndex = (this._journalIndex + p.direction + this._journalIds.length) % this._journalIds.length;
    const fishId = this._journalIds[this._journalIndex];
    const count  = FishCollectionService.get().getCount(fishId);
    this._showFish(fishId, false, count);
  }

  private _showFish(fishId: number, isNew: boolean, catchCount: number): void {
    const def = FISH_DEFS.find(d => d.id === fishId);
    if (!def) return;
    this._vm.fishName    = def.name;
    this._vm.fishId      = `#${String(def.id).padStart(3, '0')}`;
    this._vm.familyName  = def.family;
    this._vm.rarityStars = def.rarity === 'legendary' ? '★★★' : def.rarity === 'rare' ? '★★' : '★';
    this._vm.catchCount  = catchCount;
    this._vm.isNew       = isNew;
    this._vm.newLabel    = isNew ? 'NEW!' : '';
  }

  private _refreshJournal(): void {
    this._journalIds = FishCollectionService.get().caughtDefs();
  }

  @subscribe(Events.Restart)
  private _onRestart(_p: Events.RestartPayload): void {
    this._vm.visible   = false;
    this._journalIds   = [];
    this._journalIndex = 0;
  }
}
