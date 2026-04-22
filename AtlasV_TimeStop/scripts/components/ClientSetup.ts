import {
  CameraComponent,
  CameraMode,
  CameraService,
  Component,
  EventService,
  ExecuteOn,
  FocusedInteractionService,
  NetworkingService,
  OnEntityStartEvent,
  OnFocusedInteractionInputEventPayload,
  OnFocusedInteractionInputStartedEvent,
  OnPlayerCreateEvent,
  TransformComponent,
  component,
  property,
  subscribe,
  type Entity,
  type OnPlayerCreateEventPayload,
} from 'meta/worlds';
import { Events } from '../Types';

/**
 * ClientSetup — configures the fixed camera and enables touch/focused interaction.
 *
 * Place on the Camera entity (or any persistent scene entity).
 * Assign the `camera` property in the inspector if this component lives on a
 * different entity than the camera.
 *
 * initDelay: small positive value (e.g. 0.1) if the camera needs one frame to
 * settle before being locked.
 */
@component()
export class ClientSetup extends Component {
  @property()
  private camera?: Entity;

  @property()
  private initDelay: number = 0;

  private setupCamera(): void {
    const cameraComponent = this.camera?.getComponent(CameraComponent) ?? this.entity.getComponent(CameraComponent);
    if (cameraComponent)
      CameraService.get().setActiveCamera({ camera: cameraComponent });
  }

  private setupFocusInteraction(): void {
    FocusedInteractionService.get().enableFocusedInteraction({ disableEmotesButton: true, disableFocusExitButton: true });
  }

  @subscribe(OnFocusedInteractionInputStartedEvent)
  onTouchStarted(_payload: OnFocusedInteractionInputEventPayload): void {
    EventService.sendLocally(Events.PlayerTap, {});
  }

  @subscribe(OnPlayerCreateEvent)
  onPlayerCreate(_payload: OnPlayerCreateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    setTimeout(() => {
      this.setupFocusInteraction();
      this.setupCamera();
    }, this.initDelay * 1000);
  }
}
