import {
  CameraComponent,
  CameraMode,
  CameraService,
  Component,
  FocusedInteractionService,
  NetworkingService,
  OnEntityStartEvent,
  TransformComponent,
  component,
  property,
  subscribe,
  type Entity,
} from 'meta/worlds';

/**
 * ClientSetup — camera lock and focused interaction setup.
 *
 * ── Editor setup ────────────────────────────────────────────────────────────────
 * Place on the Camera entity (or any persistent entity).
 * @property camera     — assign if this component is NOT on the camera entity
 * @property initDelay  — seconds to wait before locking camera (default 0.1)
 */
@component()
export class ClientSetup extends Component {

  @property() private camera    ?: Entity;
  @property() private initDelay  : number = 0.1;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this.camera?.requestOwnership();
    setTimeout(() => {
      this._setupFocusedInteraction();
      this._setupCamera();
    }, this.initDelay * 1000);
  }

  private _setupCamera(): void {
    const cameraTransform = this.camera?.getComponent(TransformComponent)
      ?? this.entity.getComponent(TransformComponent)!;
    const cameraComponent = this.camera?.getComponent(CameraComponent)
      ?? this.entity.getComponent(CameraComponent);
    CameraService.get().setCameraMode(CameraMode.Fixed, {
      position: cameraTransform.worldPosition,
      rotation: cameraTransform.worldRotation,
      duration: 0,
      fov:      cameraComponent?.fieldOfView ?? 60,
    });
  }

  private _setupFocusedInteraction(): void {
    FocusedInteractionService.get().enableFocusedInteraction({
      disableEmotesButton:  true,
      disableFocusExitButton: true,
    });
  }
}
