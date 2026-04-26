import {
  Component,
  CustomUiComponent,
  NetworkingService,
  OnEntityStartEvent,
  UiViewModel,
  WorldService,
  component,
  subscribe,
  uiViewModel,
  type Maybe,
} from 'meta/worlds';

import { Events, HUDEvents } from '../../Types';
import { FishCollectionService } from '../../Services/FishCollectionService';
import { FISH_DEFS } from '../../FishDefs';
import { UNLOCK_ZONE_2_UNIQUE, UNLOCK_ZONE_3_UNIQUE } from '../../Constants';
import { ZoneProgressionService } from '../../Services/ZoneProgressionService';

// ─── Constants ──────────────────────────────────────────────────────────────
/** Total number of fish species in the game */
const TOTAL_FISH_COUNT = FISH_DEFS.length;

/** Width of the XP progress bar in pixels (must match XAML) */
const XP_BAR_WIDTH = 868; // 880 - 12 (margins)

/** Duration in seconds before the zone unlocked message fades out */
const ZONE_UNLOCKED_DISPLAY_DURATION = 3.5;

// ─── ViewModel ──────────────────────────────────────────────────────────────
@uiViewModel()
export class FishingHUDData extends UiViewModel {
  /** HUD visibility — string-valued for XAML DataTrigger ('True'/'False') */
  isHudVisible: string = 'False';
  /** Depth counter text — kept for XAML compatibility but no longer driven */
  depthText: string = '0.0 m';
  /** Total unique species caught. */
  uniqueCaught: number = 0;

  // ─── XP Progress Bar Properties ─────────────────────────────────────────
  /** Number of fish discovered */
  fishDiscovered: number = 0;
  /** Total number of fish species */
  fishTotal: number = TOTAL_FISH_COUNT;
  /** Progress percentage 0-100 */
  progressPercent: number = 0;
  /** Progress bar fill width in pixels */
  progressBarWidth: number = 0;
  /** Cursor 1 position (0-100 percentage) */
  cursor1Position: number = (UNLOCK_ZONE_2_UNIQUE / TOTAL_FISH_COUNT) * 100;
  /** Cursor 2 position (0-100 percentage) */
  cursor2Position: number = (UNLOCK_ZONE_3_UNIQUE / TOTAL_FISH_COUNT) * 100;
  /** Cursor 1 pixel position for XAML binding */
  cursor1PixelPosition: number = 227;
  /** Cursor 2 pixel position for XAML binding */
  cursor2PixelPosition: number = 454;
  /** Controls fade in/out animation trigger */
  progressBarVisible: boolean = false;
  /** Text display "X/Y" format */
  fishProgressText: string = '0/18';

  // ─── Zone Unlocked Message Properties ─────────────────────────────────────
  /** Controls zone unlocked message visibility and animation trigger */
  zoneUnlockedVisible: boolean = false;
}

// ─── Component ──────────────────────────────────────────────────────────────
/**
 * FishingHUDViewModel - binds the FishingHUD XAML for XP bar + zone unlock.
 *
 * Depth counter has been moved to GameHUDViewModel. This component now only
 * manages XP progress bar and zone unlocked message.
 *
 * Component Attachment: Scene entity (FishingHUD entity)
 * Component Networking: Local (UI only, client-side)
 * Component Ownership: Not Networked
 */
@component()
export class FishingHUDViewModel extends Component {

  private _vm  = new FishingHUDData();
  private _ui: Maybe<CustomUiComponent> = null;

  private _zoneUnlockedTimerActive: boolean = false;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._ui = this.entity.getComponent(CustomUiComponent);
    if (this._ui) this._ui.dataContext = this._vm;

    this._updateProgressBar();
  }

  private _lastUnlockedZones = 0;

  @subscribe(Events.FishCaught)
  _onFishCaught(_p: Events.FishCaughtPayload): void {
    this._updateProgressBar();
    this._vm.progressBarVisible = true;
  }

  @subscribe(HUDEvents.UpdateProgress)
  _onUpdateProgress(_p: HUDEvents.UpdateProgressPayload): void {
    setTimeout(() => {
      this._lastUnlockedZones = ZoneProgressionService.get().getUnlockedZones();
      this._updateProgressBar();
    },50);
  }

  @subscribe(HUDEvents.HideCatch)
  _onHideCatch(_p: HUDEvents.HideCatchPayload): void {
    if (NetworkingService.get().isServerContext()) return;
      this._vm.progressBarVisible = false;
  }

  private _updateProgressBar(): void {
    const discovered = FishCollectionService.get().totalUnique();
    const total = TOTAL_FISH_COUNT;
    const percent = total > 0 ? (discovered / total) * 100 : 0;

    this._vm.fishDiscovered = discovered;
    this._vm.fishTotal = total;
    this._vm.progressPercent = percent;
    this._vm.progressBarWidth = (percent / 100) * XP_BAR_WIDTH;
    this._vm.fishProgressText = `${discovered}/${total}`;

    this._vm.cursor1PixelPosition = (this._vm.cursor1Position / 100) * XP_BAR_WIDTH;
    this._vm.cursor2PixelPosition = (this._vm.cursor2Position / 100) * XP_BAR_WIDTH;

    const zone = ZoneProgressionService.get().getUnlockedZones();
    if (zone > this._lastUnlockedZones) {
      this.showZoneUnlocked();
    }
    this._lastUnlockedZones = zone;
  }

  public showProgressBar(): void {
    this._vm.progressBarVisible = true;
  }

  public setCursorPositions(cursor1: number, cursor2: number): void {
    this._vm.cursor1Position = Math.max(0, Math.min(100, cursor1));
    this._vm.cursor2Position = Math.max(0, Math.min(100, cursor2));
    this._vm.cursor1PixelPosition = (this._vm.cursor1Position / 100) * XP_BAR_WIDTH;
    this._vm.cursor2PixelPosition = (this._vm.cursor2Position / 100) * XP_BAR_WIDTH;
  }

  public showZoneUnlocked(): void {
    this._vm.zoneUnlockedVisible = true;
    this._zoneUnlockedTimerActive = true;
    setTimeout(() => {
      if (this._zoneUnlockedTimerActive) {
        this._zoneUnlockedTimerActive = false;
        this._vm.zoneUnlockedVisible = false;
      }
    }, ZONE_UNLOCKED_DISPLAY_DURATION * 1000);
  }

  public hideZoneUnlocked(): void {
    this._zoneUnlockedTimerActive = false;
    this._vm.zoneUnlockedVisible = false;
  }
}
