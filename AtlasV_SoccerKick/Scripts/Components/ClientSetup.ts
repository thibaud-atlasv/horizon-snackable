import {
  Component, OnEntityStartEvent,
  NetworkingService,
  CameraService, CameraMode,
  FocusedInteractionService,
  TransformComponent, CameraComponent,
  EventService,
  ExecuteOn, component, property, subscribe,
  OnFocusedInteractionInputStartedEvent,
  OnFocusedInteractionInputMovedEvent,
  OnFocusedInteractionInputEndedEvent,
  OnPlayerCreateEvent,
} from 'meta/worlds';
import type {
  Maybe, Entity,
  OnFocusedInteractionInputEventPayload,
} from 'meta/worlds';
import { GamePhase } from '../Types';
import { SWIPE_DEAD_ZONE, SWIPE_POWER_RANGE, SWIPE_SIDE_RANGE } from '../Constants';
import { GameStateService } from '../Services/GameStateService';
import { BallService } from '../Services/BallService';
import { GoalkeeperService } from '../Services/GoalkeeperService';
import { CameraShakeService } from '../Services/CameraShakeService';
import { AimStartedEvent, AimUpdatedEvent } from '../Events/GameEvents';

@component()
export class ClientSetup extends Component {

  @property() cameraAnchor: Maybe<Entity> = null;
  @property() initDelay: number = 0;

  // ── Swipe tracking (normalised 0..1 screen coords) ──────────────────────────

  private _dragging = false;
  private _startX = 0;
  private _startY = 0;

  private _networkingService = NetworkingService.get();

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (this._networkingService.isServerContext()) return;
    this._initCamera();
  }
  
  @subscribe(OnPlayerCreateEvent, { execution: ExecuteOn.Owner })
  onPlayerCreted(): void {
    if (this._networkingService.isServerContext()) return;
    this._initCamera();
  }

  private _initCamera(): void {
    setTimeout(() => {
      FocusedInteractionService.get().enableFocusedInteraction({
        disableEmotesButton: true,
        disableFocusExitButton: true,
      });

      const anchorTc = this.cameraAnchor?.getComponent(TransformComponent);
      const cameraC = this.cameraAnchor?.getComponent(CameraComponent);

      if (cameraC)
        CameraService.get().setActiveCamera({ camera: cameraC })
      else {
        CameraService.get().setCameraMode(CameraMode.Fixed, {
          position: anchorTc?.worldPosition,
          rotation: anchorTc?.worldRotation,
          duration: 0,
          fov: 58,
        });
      }

      if (this.cameraAnchor) {
        CameraShakeService.get().init(this.cameraAnchor);
      }
    }, this.initDelay * 1000);
  }

  // ── Touch input ──────────────────────────────────────────────────────────────

  @subscribe(OnFocusedInteractionInputStartedEvent)
  onTouchStart(p: OnFocusedInteractionInputEventPayload): void {
    const phase = GameStateService.get().phase;

    // Only allow aiming in Aim phase — GameOver waits for Replay button
    if (phase !== GamePhase.Aim) return;

    this._startX = p.screenPosition.x;
    this._startY = p.screenPosition.y;
    this._dragging = true;
    EventService.sendLocally(AimStartedEvent, {});
  }

  @subscribe(OnFocusedInteractionInputMovedEvent)
  onTouchMove(p: OnFocusedInteractionInputEventPayload): void {
    if (!this._dragging) return;
    const dy = p.screenPosition.y - this._startY;
    const power = Math.min(1, Math.abs(dy) / SWIPE_POWER_RANGE);
    EventService.sendLocally(AimUpdatedEvent, { power });
  }

  @subscribe(OnFocusedInteractionInputEndedEvent)
  onTouchEnd(p: OnFocusedInteractionInputEventPayload): void {
    if (!this._dragging) return;
    this._dragging = false;

    if (GameStateService.get().phase !== GamePhase.Aim) return;

    const endX = p.screenPosition.x;
    const endY = p.screenPosition.y;
    const dx = endX - this._startX;
    const dy = endY - this._startY;
    // screenPosition is normalised [0..1]; Y direction unknown — use abs
    const upDist = Math.abs(dy);

    if (upDist <= SWIPE_DEAD_ZONE) return;

    const power = Math.min(1, upDist / SWIPE_POWER_RANGE);
    const sideRatio = Math.max(-1, Math.min(1, dx / SWIPE_SIDE_RANGE));

    // Fire!
    const state = GameStateService.get();
    state.notifyShotFired();
    state.setPhase(GamePhase.Flying);
    const ball = BallService.get();
    ball.kick(power, sideRatio);
    GoalkeeperService.get().onBallKicked(ball.posX, ball.posZ, ball.velX, ball.velZ);
  }
}
