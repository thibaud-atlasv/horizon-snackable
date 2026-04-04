/**
 * ClientSetup — Initializes camera and routes touch input to game events.
 *
 * Responsibilities:
 *   - Set camera to Fixed mode pointing at the play area (ExecuteOn.Owner)
 *   - Enable FocusedInteraction so the screen captures taps
 *
 * ── Does NOT own ─────────────────────────────────────────────────────────────
 *   - Game logic → GameManager
 *
 * ── Scene setup ───────────────────────────────────────────────────────────────
 *   Attach this component to an entity in the scene.
 *   Assign the `cameraAnchor` property to a scene entity whose transform defines
 *   the desired camera position and rotation.
 */
import {
  Component, OnEntityStartEvent,
  NetworkingService, 
  CameraService, CameraMode,
  FocusedInteractionService,
  TransformComponent,
  type Maybe, type Entity,
  ExecuteOn, component, property, subscribe,
  CameraComponent,
} from 'meta/worlds';

@component()
export class ClientSetup extends Component {

  /** Scene entity whose world transform is used as the camera pose. */
  @property() cameraAnchor: Maybe<Entity> = null;

  /** Camera field of view in degrees. */
  @property() cameraFov: number = 60;

  /** Camera field of view in degrees. */
  @property() initDelay: number = 0;

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
      const cameraC = this.cameraAnchor?.getComponent(CameraComponent);

      CameraService.get().setCameraMode(CameraMode.Fixed, {
        position: anchorTc?.worldPosition,
        rotation: anchorTc?.worldRotation,
        duration: 0,
        fov: cameraC?.fieldOfView ??    this.cameraFov,
      });
    }, this.initDelay * 1000);
  }
}
