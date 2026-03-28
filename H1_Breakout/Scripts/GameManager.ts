import { component, Component, EventService, ExecuteOn, NetworkingService, OnEntityStartEvent, OnWorldUpdateEvent, OnWorldUpdateEventPayload, property, subscribe } from 'meta/worlds';
import { Events, HUDEvents } from './Types';
import { LEVELS, type LevelConfig } from './LevelConfig';

@component()
export class GameManager extends Component {
  @property()
  private maxLives: number = 3;

  private _lives: number = 3;
  private _currentLevel: number = 0;
  private _bricksDestroyedThisLevel: number = 0;
  private _destructibleBrickCount: number = 0;
  private _survivalTimer: number = 0;
  private _isClient = false;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    this._isClient = !NetworkingService.get().isServerContext();
    if (!this._isClient) return;
    this._lives = this.maxLives;
    this._initLevelState(LEVELS[0]);
    // Initial spawn is handled by LevelLayout.onStart (level 0 by default).
    // LoadLevel is only emitted on subsequent level changes.
    EventService.sendLocally(HUDEvents.UpdateLevel, { level: 1 });
    EventService.sendLocally(HUDEvents.UpdateLives, { lives: this._lives });
    EventService.sendLocally(HUDEvents.ShowMessage, { message: 'Tap to start' });
  }

  private _initLevelState(config: LevelConfig): void {
    this._bricksDestroyedThisLevel = 0;
    this._destructibleBrickCount = this._countDestructibleBricks(config);
    this._survivalTimer = config.victory?.kind === 'survivalTime'
      ? config.victory.seconds
      : 0;
    if (config.livesOverride !== undefined) {
      this._lives = config.livesOverride;
    }
  }

  private _countDestructibleBricks(config: LevelConfig): number {
    let count = 0;
    for (const row of config.grid.split('\n')) {
      for (const char of [...row]) {
        const tmpl = config.brickTemplates[char];
        if (tmpl && !tmpl.indestructible) count++;
      }
    }
    return count;
  }

  // ── Ball lost ─────────────────────────────────────────────────────────────

  @subscribe(Events.BallLost)
  onBallLost(): void {
    this._lives--;

    if (this._lives <= 0) {
      this._lives = this.maxLives;
      EventService.sendLocally(Events.Restart, {});
      this._loadLevel(0);
    }

    EventService.sendLocally(HUDEvents.UpdateLives, { lives: this._lives });
    EventService.sendLocally(Events.ResetRound, {});
    EventService.sendLocally(HUDEvents.ShowMessage, { message: 'Tap to start' });
  }

  // ── Brick destroyed ───────────────────────────────────────────────────────

  @subscribe(Events.BrickDestroyed)
  onBrickDestroyed(): void {
    this._bricksDestroyedThisLevel++;
    this._checkVictory();
  }

  private _checkVictory(): void {
    const victory = LEVELS[this._currentLevel].victory ?? { kind: 'allBricksDestroyed' };

    const won =
      victory.kind === 'allBricksDestroyed'
        ? this._bricksDestroyedThisLevel >= this._destructibleBrickCount
        : victory.kind === 'bricksDestroyed'
          ? this._bricksDestroyedThisLevel >= victory.count
          : false; // survivalTime handled in onUpdate

    if (won) this._advanceLevel();
  }

  // ── Survival (victory: survivalTime) ──────────────────────────────────────

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    if (!this._isClient) return;
    if (this._survivalTimer <= 0) return;

    this._survivalTimer -= payload.deltaTime;
    if (this._survivalTimer <= 0) {
      this._advanceLevel();
    }
  }

  // ── Level progression ─────────────────────────────────────────────────────

  private _advanceLevel(): void {
    const nextIndex = (this._currentLevel + 1) % LEVELS.length;
    this._loadLevel(nextIndex);
    EventService.sendLocally(Events.ResetRound, {});
    EventService.sendLocally(HUDEvents.ShowMessage, { message: 'Tap to start' });
  }

  @subscribe(Events.ReleaseBall)
  onReleaseBall(): void {
    console.log("hide");
    EventService.sendLocally(HUDEvents.HideMessage, {});
  }

  private _loadLevel(index: number): void {
    this._currentLevel = index;
    this._initLevelState(LEVELS[index]);
    EventService.sendLocally(Events.LoadLevel, { levelIndex: index });
    EventService.sendLocally(HUDEvents.UpdateLevel, { level: index + 1 });
    EventService.sendLocally(HUDEvents.UpdateLives, { lives: this._lives });
  }
}
