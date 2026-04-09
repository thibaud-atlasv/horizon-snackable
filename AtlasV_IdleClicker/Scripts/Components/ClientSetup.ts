/**
 * ClientSetup — Initializes camera and routes touch input to game events.
 *
 * Responsibilities:
 *   - Set camera to Fixed mode pointing at the play area (ExecuteOn.Owner)
 *   - Enable FocusedInteraction so the screen captures taps
 *   - Convert OnFocusedInteractionInputStartedEvent → Events.PlayerTap
 *
 * ── Does NOT own ─────────────────────────────────────────────────────────────
 *   - Game logic → GameManager
 *   - Resources  → ResourceService
 *
 * ── Scene setup ───────────────────────────────────────────────────────────────
 *   Attach this component to an entity in the scene.
 *   Assign the `cameraAnchor` property to a scene entity whose transform defines
 *   the desired camera position and rotation.
 */
import {
  Component, OnEntityStartEvent,
  NetworkingService, EventService,
  CameraService, CameraMode,
  FocusedInteractionService,
  OnFocusedInteractionInputStartedEvent,
  type OnFocusedInteractionInputEventPayload,
  TransformComponent,
  type Maybe, type Entity,
  ExecuteOn, component, property, subscribe,
} from 'meta/worlds';
import { CAMERA_INIT_DELAY } from '../Constants';
import { Events } from '../Types';

@component()
export class ClientSetup extends Component {

  /** Scene entity whose world transform is used as the camera pose. */
  @property() cameraAnchor: Maybe<Entity> = null;

  /** Camera field of view in degrees. */
  @property() cameraFov: number = 60;

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._initCamera();
  }

  // ── Camera setup ─────────────────────────────────────────────────────────────

  private _initCamera(): void {
    setTimeout(() => {
      FocusedInteractionService.get().enableFocusedInteraction({
        disableEmotesButton:    true,
        disableFocusExitButton: true,
      });

      const anchorTc = this.cameraAnchor?.getComponent(TransformComponent);

      CameraService.get().setCameraMode(CameraMode.Fixed, {
        position: anchorTc?.worldPosition,
        rotation: anchorTc?.worldRotation,
        duration: 0,
        fov:      this.cameraFov,
      });
    }, CAMERA_INIT_DELAY * 1000);
  }

  // ── Touch input ───────────────────────────────────────────────────────────────

  @subscribe(OnFocusedInteractionInputStartedEvent)
  onTouchStarted(_p: OnFocusedInteractionInputEventPayload): void {
    EventService.sendLocally(Events.PlayerTap, {});
  }
}
