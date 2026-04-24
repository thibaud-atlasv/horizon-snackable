/**
 * ScoringScaleHUDViewModel — screen-space UI showing scoring grade threshold
 * markers vertically on the left side of the screen.
 *
 * Component Attachment: Scene Entity (ScoringScaleHUD entity in space.hstf)
 * Component Networking: Local (UI-only, no networking)
 * Component Ownership: Not Networked — runs on client only
 */
import {
  Component,
  CustomUiComponent,
  ExecuteOn,
  NetworkingService,
  OnEntityStartEvent,
  UiViewModel,
  component,
  subscribe,
  uiViewModel,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';
import { Events, GamePhase } from '../../Types';
import {
  HEIGHT,
  PLAY_TOP,
  FLOOR_Y,
  PERFECT_DIST,
  GREAT_DIST,
  GOOD_DIST,
  EARLY_DIST,
} from '../../Constants';

const CANVAS_H = 3640; // gameplay canvas height — matches FallingObjCanvas

/** Grade config: label, dist threshold, line color, text color */
interface GradeConfig {
  label: string;
  dist: number;
  lineColor: string;
  textColor: string;
}

const GRADE_CONFIGS: GradeConfig[] = [
  { label: 'MISS',    dist: 1.0,          lineColor: '#FF1744', textColor: '#FF1744' },
  { label: 'EARLY',   dist: EARLY_DIST,   lineColor: '#FF6D00', textColor: '#FF6D00' },
  { label: 'GOOD',    dist: GOOD_DIST,    lineColor: '#00B0FF', textColor: '#00B0FF' },
  { label: 'GREAT',   dist: GREAT_DIST,   lineColor: '#00E676', textColor: '#00E676' },
  { label: 'PERFECT', dist: PERFECT_DIST, lineColor: '#FFD700', textColor: '#FFD700' },
];

// ─── Sub-ViewModel for each marker ─────────────────────────────────────────────

@uiViewModel()
export class ScoringScaleMarkerViewModel extends UiViewModel {
  markerY: number = 0;
  label: string = '';
  lineColor: string = '#FFFFFF';
  textColor: string = '#FFFFFF';
}

// ─── Parent ViewModel ────────────────────────────────────────────────────────────

@uiViewModel()
export class ScoringScaleHUDViewModelData extends UiViewModel {
  markers: readonly ScoringScaleMarkerViewModel[] = [];
}

// ─── Component ───────────────────────────────────────────────────────────────────

@component()
export class ScoringScaleHUDViewModel extends Component {
  // ViewModel field initializer — persists across hot-reload automatically
  private _viewModel = new ScoringScaleHUDViewModelData();

  // Lazy getter — self-heals after hot-reload (onStart won't re-fire)
  private _customUi: Maybe<CustomUiComponent> = null;
  private get customUi(): Maybe<CustomUiComponent> {
    return (this._customUi ??= this.entity.getComponent(CustomUiComponent));
  }

  // ── Hot-reload hooks ──────────────────────────────────────────────────────────

  override onBeforeHotReload(): Maybe<Record<string, unknown>> {
    return super.onBeforeHotReload();
  }

  override onAfterHotReload(savedState: Record<string, unknown>): void {
    super.onAfterHotReload(savedState);
    // Re-bind ViewModel dataContext after hot-reload
    if (NetworkingService.get().isServerContext()) return;
    if (this.customUi) {
      this.customUi.dataContext = this._viewModel;
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  // This entity is local (non-networked scene entity), so Owner executes on all sides.
  // Server guard filters to client-only where UI rendering happens.
  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    console.log('[ScoringScaleHUDViewModel] onStart — initialising markers');

    if (this.customUi) {
      this.customUi.dataContext = this._viewModel;
      // Start hidden — show when gameplay starts
      this.customUi.isVisible = true;
    }

    this._buildMarkers();
  }

  // ── Phase visibility ──────────────────────────────────────────────────────────

  @subscribe(Events.PhaseChanged, { execution: ExecuteOn.Everywhere })
  onPhaseChanged(p: Events.PhaseChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.customUi) return;

    const visible = p.phase == GamePhase.Start;
    this.customUi.isVisible = visible;
  }

  @subscribe(Events.Restart, { execution: ExecuteOn.Everywhere })
  onRestart(_p: Events.RestartPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (this.customUi) this.customUi.isVisible = false;
  }

  // ── Internal ──────────────────────────────────────────────────────────────────

  private _buildMarkers(): void {
    const range = PLAY_TOP - FLOOR_Y;

    const markers: ScoringScaleMarkerViewModel[] = [];

    for (const cfg of GRADE_CONFIGS) {
      const precision = 1 - cfg.dist;
      const worldY = PLAY_TOP - precision * range;
      const vm = new ScoringScaleMarkerViewModel();
      vm.markerY = this._worldYToScreenY(worldY);
      vm.label = cfg.label;
      vm.lineColor = cfg.lineColor;
      vm.textColor = cfg.textColor;
      markers.push(vm);
    }

    // TOO LATE line at FLOOR_Y
    const tooLate = new ScoringScaleMarkerViewModel();
    tooLate.markerY = this._worldYToScreenY(FLOOR_Y);
    tooLate.label = 'TOO LATE';
    tooLate.lineColor = '#FF1744';
    tooLate.textColor = '#FF1744';
    markers.push(tooLate);

    this._viewModel.markers = markers;
  }

  private _worldYToScreenY(worldY: number): number {
    return -(worldY / HEIGHT) * CANVAS_H + CANVAS_H / 2;
  }
}
