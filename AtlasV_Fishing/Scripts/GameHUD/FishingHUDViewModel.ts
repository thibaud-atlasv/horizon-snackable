import {
  Component,
  CustomUiComponent,
  NetworkingService,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  type OnWorldUpdateEventPayload,
  UiViewModel,
  WorldService,
  component,
  subscribe,
  uiViewModel,
  type Maybe,
} from 'meta/worlds';

import { Events, HUDEvents, GamePhase } from '../Types';
import { FishCollectionService } from '../Fish/FishCollectionService';
import { FISH_DEFS } from '../Fish/FishDefs';
import { UNLOCK_ZONE_2_UNIQUE, UNLOCK_ZONE_3_UNIQUE } from '../Constants';
import { ZoneProgressionService } from '../Fish/ZoneProgressionService';

// ─── Constants ────────────────────────────────────────────────────────────────
/** Total number of fish species in the game */
const TOTAL_FISH_COUNT = FISH_DEFS.length;

/** Width of the XP progress bar in pixels (must match XAML) */
const XP_BAR_WIDTH = 868; // 880 - 12 (margins)

/** Duration in seconds before the progress bar fades out */
const PROGRESS_BAR_DISPLAY_DURATION = 3.5;

/** Duration in seconds before the zone unlocked message fades out */
const ZONE_UNLOCKED_DISPLAY_DURATION = 3.5;

// ─── ViewModel ────────────────────────────────────────────────────────────────
@uiViewModel()
export class FishingHUDData extends UiViewModel {
  /** Show gauge container. */
  showGauge: boolean = false;
  /** Gauge fill 0-1. */
  gaugeValue: number = 0;
  /** 'cast' or 'reel' - drives gauge color in XAML. */
  gaugeMode: string = 'cast';
  /** Total unique species caught. */
  uniqueCaught: number = 0;
  /** Dynamic gauge fill color (hex string) based on fill level during charging. */
  gaugeColor: string = '#00FF00';

  // ─── XP Progress Bar Properties ─────────────────────────────────────────────
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

  // ─── Zone Unlocked Message Properties ─────────────────────────────────────────
  /** Controls zone unlocked message visibility and animation trigger */
  zoneUnlockedVisible: boolean = false;
}

// ─── Component ────────────────────────────────────────────────────────────────
/**
 * FishingHUDViewModel - binds the main gameplay HUD to reactive XAML.
 *
 * -- Editor setup ----------------------------------------------------------------
 * Attach to the entity that has the CustomUiComponent for the main HUD XAML.
 *
 * -- XAML bindings ---------------------------------------------------------------
 * <Label text="{phaseLabel}" />
 * <Panel visible="{showGauge}">
 *   <Gauge value="{gaugeValue}" mode="{gaugeMode}" />
 * </Panel>
 * <Label text="Caught: {uniqueCaught}" />
 * 
 * -- XP Progress Bar bindings ----------------------------------------------------
 * <ProgressBar width="{progressBarWidth}" />
 * <Text text="{fishProgressText}" />
 * <Cursor1 position="{cursor1PixelPosition}" />
 * <Cursor2 position="{cursor2PixelPosition}" />
 * 
 * Component Attachment: Scene Entity (FishingHUD entity with CustomUiComponent)
 * Component Networking: Local
 * Component Ownership: Not Networked
 */
@component()
export class FishingHUDViewModel extends Component {

  private _vm  = new FishingHUDData();
  private _ui: Maybe<CustomUiComponent> = null;
  
  /** Timer for auto-hiding the progress bar (world time when to hide) */
  private _progressBarHideTime: number = 0;
  /** Whether the progress bar timer is active */
  private _progressBarTimerActive: boolean = false;

  /** Timer for auto-hiding the zone unlocked message (world time when to hide) */
  private _zoneUnlockedHideTime: number = 0;
  /** Whether the zone unlocked timer is active */
  private _zoneUnlockedTimerActive: boolean = false;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._ui = this.entity.getComponent(CustomUiComponent);
    if (this._ui) this._ui.dataContext = this._vm;
    
    // Initialize progress bar with current collection state
    this._updateProgressBar();
  }

  /*
  @subscribe(OnWorldUpdateEvent)
  private _onUpdate(_p: OnWorldUpdateEventPayload): void {
    // Handle progress bar auto-hide timer
    if (this._progressBarTimerActive) {
      const currentTime = WorldService.get().getWorldTime();
      if (currentTime >= this._progressBarHideTime) {
        this._progressBarTimerActive = false;
        this._vm.progressBarVisible = false;
      }
    }
  }*/

  @subscribe(Events.PhaseChanged)
  private _onPhase(p: Events.PhaseChangedPayload): void {
    this._vm.showGauge  = p.phase === GamePhase.Charging || p.phase === GamePhase.Reeling;
  }

  @subscribe(HUDEvents.UpdateGauge)
  private _onGauge(p: HUDEvents.UpdateGaugePayload): void {
    this._vm.gaugeValue = p.value;
    this._vm.gaugeMode  = p.mode;
    
    // Update gauge color based on fill level during charging
    // Only apply dynamic colors in 'cast' mode (charging phase)
    if (p.mode === 'cast') {
      this._vm.gaugeColor = this._getGaugeColorForValue(p.value);
    } else {
      // Reel mode uses the static turquoise color from XAML
      this._vm.gaugeColor = '#00CED1';
    }
  }

  /**
   * Calculates gauge fill color by lerping between three stops (0-1):
   *   0.0 -> green  (#00FF00)
   *   0.5 -> orange (#FFAA00)
   *   1.0 -> red    (#FF0000)
   */
  private _getGaugeColorForValue(value: number): string {
    const v = Math.max(0, Math.min(1, value));
    let r: number, g: number, b: number;
    if (v <= 0.5) {
      // green -> orange  (t: 0->1 over first half)
      const t = v / 0.5;
      r = Math.round(0x00 + t * (0xFF - 0x00));
      g = Math.round(0xFF + t * (0xAA - 0xFF));
      b = 0x00;
    } else {
      // orange -> red  (t: 0->1 over second half)
      const t = (v - 0.5) / 0.5;
      r = 0xFF;
      g = Math.round(0xAA + t * (0x00 - 0xAA));
      b = 0x00;
    }
    return `#${r.toString(16).padStart(2, '0').toUpperCase()}${g.toString(16).padStart(2, '0').toUpperCase()}${b.toString(16).padStart(2, '0').toUpperCase()}`;
  }
  private zone : number = 50;
  @subscribe(Events.FishCaught)
  private _onFishCaught(p: Events.FishCaughtPayload): void {
    this._updateProgressBar();
    this._vm.progressBarVisible = true;
  }

  @subscribe(HUDEvents.UpdateProgress)
  private _onUpdateProgress(p: HUDEvents.UpdateProgressPayload): void {
    setTimeout(() => {
      this.zone = ZoneProgressionService.get().getUnlockedZones();
      this._updateProgressBar();
    },50);
  }

  @subscribe(HUDEvents.HideCatch)
  private _onHideCatch(_p: HUDEvents.HideCatchPayload): void {
    if (NetworkingService.get().isServerContext()) return;
      this._progressBarTimerActive = false;
      this._vm.progressBarVisible = false;
  }

  // ─── XP Progress Bar Methods ────────────────────────────────────────────────

  /**
   * Updates the progress bar values based on current fish collection.
   */
  private _updateProgressBar(): void {
    const discovered = FishCollectionService.get().totalUnique();
    const total = TOTAL_FISH_COUNT;
    const percent = total > 0 ? (discovered / total) * 100 : 0;
    
    this._vm.fishDiscovered = discovered;
    this._vm.fishTotal = total;
    this._vm.progressPercent = percent;
    this._vm.progressBarWidth = (percent / 100) * XP_BAR_WIDTH;
    this._vm.fishProgressText = `${discovered}/${total}`;
    
    // Update cursor pixel positions based on percentage
    this._vm.cursor1PixelPosition = (this._vm.cursor1Position / 100) * XP_BAR_WIDTH;
    this._vm.cursor2PixelPosition = (this._vm.cursor2Position / 100) * XP_BAR_WIDTH;

    
    const zone =ZoneProgressionService.get().getUnlockedZones();
    if (zone > this.zone)
    {
      console.log("show unloick", zone, this.zone);
      this.showZoneUnlocked();
    }
    this.zone = zone;
  }

  /**
   * Shows the progress bar with fade in animation.
   * Automatically hides after PROGRESS_BAR_DISPLAY_DURATION seconds.
   */
  public showProgressBar(): void {
    // Trigger fade in
    this._vm.progressBarVisible = true;
    
    // Set timer to hide after duration
    const currentTime = WorldService.get().getWorldTime();
    this._progressBarHideTime = currentTime + PROGRESS_BAR_DISPLAY_DURATION;
    this._progressBarTimerActive = true;
  }

  /**
   * Sets the cursor positions for depth threshold markers.
   * @param cursor1 Position of first cursor (0-100 percentage)
   * @param cursor2 Position of second cursor (0-100 percentage)
   */
  public setCursorPositions(cursor1: number, cursor2: number): void {
    this._vm.cursor1Position = Math.max(0, Math.min(100, cursor1));
    this._vm.cursor2Position = Math.max(0, Math.min(100, cursor2));
    this._vm.cursor1PixelPosition = (this._vm.cursor1Position / 100) * XP_BAR_WIDTH;
    this._vm.cursor2PixelPosition = (this._vm.cursor2Position / 100) * XP_BAR_WIDTH;
  }

  // ─── Zone Unlocked Message Methods ────────────────────────────────────────────

  /**
   * Shows the "NEW ZONE UNLOCKED!" message with pop-in animation.
   * Automatically hides after ZONE_UNLOCKED_DISPLAY_DURATION seconds.
   */
  public showZoneUnlocked(): void {
    // Trigger pop-in animation
    this._vm.zoneUnlockedVisible = true;
    
    // Set timer to hide after duration using setTimeout
    this._zoneUnlockedTimerActive = true;
    setTimeout(() => {
      if (this._zoneUnlockedTimerActive) {
        this._zoneUnlockedTimerActive = false;
        this._vm.zoneUnlockedVisible = false;
      }
    }, ZONE_UNLOCKED_DISPLAY_DURATION * 1000);
  }

  /**
   * Immediately hides the zone unlocked message.
   */
  public hideZoneUnlocked(): void {
    this._zoneUnlockedTimerActive = false;
    this._vm.zoneUnlockedVisible = false;
  }
}
