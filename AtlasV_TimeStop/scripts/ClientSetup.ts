import {
  CameraComponent,
  CameraMode,
  CameraService,
  Component,
  EventService,
  ExecuteOn,
  FocusedInteractionService,
  OnEntityStartEvent,
  OnFocusedInteractionInputEventPayload,
  OnFocusedInteractionInputStartedEvent,
  TransformComponent,
  component,
  property,
  subscribe,
  type Entity,
} from 'meta/worlds';
import { Events } from './Types';

/**
 * ClientSetup — runs on ALL contexts (ExecuteOn.Everywhere) to configure
 * the fixed camera and enable touch/focused interaction.
 *
 * Place this component on the Camera entity (or any persistent entity in the scene).
 * Assign the `camera` property to the Camera entity in the inspector if this
 * component lives on a different entity.
 *
 * initDelay: use a small positive value (e.g. 0.1) if the camera position
 * needs one frame to settle before being locked.
 */
@component()
export class ClientSetup extends Component {
    @property()
  private camera?: Entity;

  @property()
  private initDelay: number = 0;

  private setupCamera(): void {
    const cameraTransform = this.camera?.getComponent(TransformComponent) ?? this.entity.getComponent(TransformComponent)!;
    const cameraComponent = this.camera?.getComponent(CameraComponent) ?? this.entity.getComponent(CameraComponent);
    CameraService.get().setCameraMode(CameraMode.Fixed, {
      position: cameraTransform.worldPosition,
      rotation: cameraTransform.worldRotation,
      duration: 0,
      fov: cameraComponent?.fieldOfView ?? 60,
    });
  }

  private setupFocusInteraction() {
    FocusedInteractionService.get().enableFocusedInteraction({ disableEmotesButton: true, disableFocusExitButton: true });
  }

  @subscribe(OnFocusedInteractionInputStartedEvent)
  onTouchStarted(_payload: OnFocusedInteractionInputEventPayload): void {
    EventService.sendLocally(Events.PlayerTap, {});
  }

  @subscribe(OnEntityStartEvent, {execution:ExecuteOn.Owner})
  onStart() {
    this.camera?.requestOwnership();
    setTimeout(() => {
      this.setupFocusInteraction();
      this.setupCamera();
    }, this.initDelay * 1000)

  }
}
