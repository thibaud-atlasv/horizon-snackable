import { Component, EventService, ColorComponent, Color } from 'meta/worlds';
import { component, subscribe, property } from 'meta/worlds';
import { OnEntityStartEvent, OnWorldUpdateEvent } from 'meta/worlds';
import type { OnWorldUpdateEventPayload, Maybe, Entity } from 'meta/worlds';
import { NetworkingService } from 'meta/worlds';
import { Events, GamePhase } from '../Types';
import { GROUND_COLOR, hexColor } from '../Constants';
import { WaveService } from '../Services/WaveService';
import { ResourceService } from '../Services/ResourceService';
import { SplashSystem } from '../Services/SplashSystem';
import { SlowService } from '../Services/SlowService';
import { PlacementService } from '../Services/PlacementService';
import { PathService } from '../Services/PathService';
import { ProjectilePool } from '../Services/ProjectilePool';
import { HealthBarService } from '../Services/HealthBarService';
import { FloatingTextService } from '../Services/FloatingTextService';
import { CritService } from '../Services/CritService';

@component()
export class GameManager extends Component {
  @property() ground: Maybe<Entity> = null; // link the ground mesh in the editor

  private _running: boolean = false;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    if (this.ground) {
      const c = this.ground.getComponent(ColorComponent);
      const gc = hexColor(GROUND_COLOR);
      if (c) c.color = new Color(gc.r, gc.g, gc.b);
    }
    SplashSystem.get(); // force instantiation so it registers its HitService modifier
    SlowService.get();  // force instantiation so it subscribes to TakeDamage
    this._startGame();
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(p: OnWorldUpdateEventPayload): void {
    if (!this._running) return;
    const dt = p.deltaTime;
    WaveService.get().tick(dt);
  }

  @subscribe(Events.EnemyReachedEnd)
  onEnemyReachedEnd(_p: Events.EnemyReachedEndPayload): void {
    if (ResourceService.get().lives <= 0) {
      this._endGame(false);
    }
  }

  @subscribe(Events.GamePhaseChanged)
  onPhaseChanged(p: Events.GamePhaseChangedPayload): void {
    if (p.phase === GamePhase.Victory) {
      this._endGame(true);
    }
  }

  @subscribe(Events.RestartGame)
  onRestart(_p: Events.RestartGamePayload): void {
    // Services have already cleaned up their state before this fires.
    this._running = true;
    ResourceService.get().reset();
    WaveService.get().startGame();
  }

  private _startGame(): void {
    this._running = true;
    PathService.get().prewarm();
    ProjectilePool.get().prewarm();
    HealthBarService.get().prewarm();
    PlacementService.get().prewarm();
    FloatingTextService.get().prewarm();
    CritService.get();
    ResourceService.get().reset();
    WaveService.get().startGame();
  }

  private _endGame(won: boolean): void {
    this._running = false;
    const p = new Events.GameOverPayload();
    p.won = won;
    EventService.sendLocally(Events.GameOver, p);

    const phaseP = new Events.GamePhaseChangedPayload();
    phaseP.phase = won ? GamePhase.Victory : GamePhase.GameOver;
    EventService.sendLocally(Events.GamePhaseChanged, phaseP);
  }
}
