import {
  component,
  Component,
  CustomUiComponent,
  NetworkingService,
  OnEntityStartEvent,
  OnEntityDestroyEvent,
  OnWorldUpdateEvent,
  subscribe,
  uiViewModel,
  UiViewModel,
} from 'meta/worlds';
import type { OnWorldUpdateEventPayload } from 'meta/worlds';

import { HighScoreHUDEvents, type HighScoreEntry } from '../Types';

// Classic arcade-style 3-letter names for padding empty leaderboard slots
const ARCADE_NAMES = [
  'ACE', 'ZAP', 'MAX', 'JET', 'NRG',
  'BLZ', 'VEX', 'ION', 'RAY', 'ZEN',
  'ARC', 'NEO', 'PKR', 'GHO', 'DAX',
];

const REVEAL_INTERVAL_MS = 200;
const SLIDE_DURATION = 0.4;
const SLIDE_START_X = 1800;
const VERBOSE_LOG = false;

const COLOR_GOLD = '#FFD700';
const COLOR_SILVER = '#C0C0C0';
const COLOR_BRONZE = '#CD7F32';
const COLOR_CYAN = '#00FFFF';
const COLOR_HIGHLIGHT_TEXT = '#FFFFFF';
const COLOR_HIGHLIGHT_BG = '#40FFD700';
const COLOR_TRANSPARENT = '#00000000';

function colorForRank(rank: number, isCurrentPlayer: boolean): string {
  if (isCurrentPlayer) return COLOR_HIGHLIGHT_TEXT;
  if (rank === 1) return COLOR_GOLD;
  if (rank === 2) return COLOR_SILVER;
  if (rank === 3) return COLOR_BRONZE;
  return COLOR_CYAN;
}

/**
 * Nested ViewModel for a single high score row.
 * XAML DataTemplate binds translateX to the Grid's TranslateTransform.X;
 * the slide-in animation is driven from code via OnWorldUpdateEvent.
 */
@uiViewModel()
export class HighScoreEntryViewModel extends UiViewModel {
  rank: string = '';
  name: string = '';
  score: string = '';
  color: string = COLOR_CYAN;
  bgColor: string = COLOR_TRANSPARENT;
  isCurrentPlayer: boolean = false;
  translateX: number = SLIDE_START_X;
}

/**
 * Parent ViewModel for the High Score HUD.
 * XAML binds an ItemsControl to the entries array.
 */
@uiViewModel()
export class HighScoreHUDViewModelData extends UiViewModel {
  showScreen: boolean = false;
  titleText: string = 'HIGH SCORES';
  entries: readonly HighScoreEntryViewModel[] = [];
}

/**
 * Component Attachment: Scene Entity (HighScoreHUD entity with CustomUiComponent)
 * Component Networking: Local
 * Component Ownership: Not Networked
 *
 * Controller that binds the ViewModel to CustomUiComponent and
 * drives the staggered slide-in animation via setInterval + OnWorldUpdateEvent.
 * Each entry's translateX is lerped from 900 → 0 with quadratic ease-out over 0.4s.
 */
@component()
export class HighScoreHUDViewModel extends Component {
  private _viewModel = new HighScoreHUDViewModelData();
  private _revealIntervalId: number | null = null;
  private _currentRevealIndex: number = 0;
  private _entryPool: HighScoreEntryViewModel[] = [];
  private _isAnimating: boolean = false;

  // Per-entry animation progress tracked in parallel arrays
  private _animating: boolean[] = [];
  private _animTimers: number[] = [];

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    const customUi = this.entity.getComponent(CustomUiComponent);
    if (customUi) {
      customUi.dataContext = this._viewModel;
    }
    console.log('[HighScoreHUDViewModel] Initialized');
  }

  @subscribe(OnEntityDestroyEvent)
  onDestroy(): void {
    this._clearRevealInterval();
  }

  @subscribe(HighScoreHUDEvents.ShowHighScores)
  onShowHighScores(payload: HighScoreHUDEvents.ShowHighScoresPayload): void {
    console.log(`[HighScoreHUDViewModel] ShowHighScores received, ${payload.entries.length} entries`);
    this._clearRevealInterval();

    // Pad entries to 10 with arcade-style filler names
    const realEntries = payload.entries;
    const padded: HighScoreEntry[] = [...realEntries];
    if (padded.length < 10) {
      // Generate descending scores below the lowest real entry
      const realCount = padded.length;
      const lowestScore = realCount > 0 ? padded[realCount - 1].score : 1000;
      const usedNames = new Set(padded.map(e => e.name));
      const available = ARCADE_NAMES.filter(n => !usedNames.has(n));
      let nameIdx = 0;
      for (let i = realCount; i < 10; i++) {
        const fakeScore = Math.max(0, Math.floor(lowestScore * (0.7 ** (i - realCount + 1))));
        const fakeName = available[nameIdx % available.length];
        nameIdx++;
        padded.push({ rank: i + 1, name: fakeName, score: fakeScore, isCurrentPlayer: false } as HighScoreEntry);
      }
    }

    // Build entry ViewModels, reusing pooled instances where possible
    const count = padded.length;
    while (this._entryPool.length < count) {
      this._entryPool.push(new HighScoreEntryViewModel());
    }

    const items: HighScoreEntryViewModel[] = [];
    this._animating = [];
    this._animTimers = [];

    for (let i = 0; i < count; i++) {
      const e = padded[i];
      const vm = this._entryPool[i];
      vm.rank = `${e.rank}.`;
      vm.name = e.name;
      vm.score = `${e.score}`;
      vm.color = colorForRank(e.rank, e.isCurrentPlayer);
      vm.bgColor = e.isCurrentPlayer ? COLOR_HIGHLIGHT_BG : COLOR_TRANSPARENT;
      vm.isCurrentPlayer = e.isCurrentPlayer;
      vm.translateX = SLIDE_START_X;
      items.push(vm);
      this._animating.push(false);
      this._animTimers.push(0);
    }

    // Immutable replacement triggers UI update
    this._viewModel.entries = items;
    this._viewModel.showScreen = true;
    this._currentRevealIndex = 0;
    this._isAnimating = false;

    // Stagger reveal: start animation for one row at a time
    this._revealIntervalId = setInterval(() => {
      this._revealNextEntry();
    }, REVEAL_INTERVAL_MS);
  }

  @subscribe(HighScoreHUDEvents.HideHighScores)
  onHideHighScores(_payload: HighScoreHUDEvents.HideHighScoresPayload): void {
    console.log('[HighScoreHUDViewModel] HideHighScores received');
    this._clearRevealInterval();
    this._isAnimating = false;
    this._viewModel.showScreen = false;
    this._viewModel.entries = [];
  }

  @subscribe(OnWorldUpdateEvent)
  onWorldUpdate(payload: OnWorldUpdateEventPayload): void {
    if (!this._isAnimating) return;

    const dt = payload.deltaTime;
    const entries = this._viewModel.entries;
    let anyStillAnimating = false;

    for (let i = 0; i < entries.length; i++) {
      if (!this._animating[i]) continue;

      this._animTimers[i] += dt;
      const progress = Math.min(this._animTimers[i] / SLIDE_DURATION, 1);
      // Quadratic ease-out: t = 1 - (1 - t)^2
      const eased = 1 - (1 - progress) * (1 - progress);
      entries[i].translateX = SLIDE_START_X * (1 - eased);

      if (progress >= 1) {
        entries[i].translateX = 0;
        this._animating[i] = false;
      } else {
        anyStillAnimating = true;
      }
    }

    if (!anyStillAnimating) {
      this._isAnimating = false;
    }
  }

  private _revealNextEntry(): void {
    const entries = this._viewModel.entries;
    if (this._currentRevealIndex >= entries.length) {
      this._clearRevealInterval();
      return;
    }

    // Start animation for this entry
    this._animating[this._currentRevealIndex] = true;
    this._animTimers[this._currentRevealIndex] = 0;
    this._isAnimating = true;
    this._currentRevealIndex++;

    if (VERBOSE_LOG) {
      console.log(`[HighScoreHUDViewModel] Started slide for entry ${this._currentRevealIndex}`);
    }
  }

  private _clearRevealInterval(): void {
    if (this._revealIntervalId !== null) {
      clearInterval(this._revealIntervalId);
      this._revealIntervalId = null;
    }
  }
}
