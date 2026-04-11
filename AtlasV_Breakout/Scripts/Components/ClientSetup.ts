import {
  CameraComponent,
  CameraMode,
  CameraService,
  Component,
  ExecuteOn,
  FocusedInteractionService,
  NetworkingService,
  OnEntityStartEvent,
  OnPlayerCreateEvent,
  TransformComponent,
  component,
  property,
  subscribe,
  type Entity,
  type OnPlayerCreateEventPayload,
} from 'meta/worlds';
import { CameraShakeService } from '../Services/CameraShakeService';

@component()
export class ClientSetup extends Component {
  @property()
  private camera?: Entity;

  @property()
  private initDelay: number = 0;

  private setupCamera(): void {
    const cameraTransform = this.camera?.getComponent(TransformComponent) ?? this.entity.getComponent(TransformComponent)!;
    const cameraComponent = this.camera?.getComponent(CameraComponent) ?? this.entity.getComponent(CameraComponent);

    if (cameraComponent) {
      CameraService.get().setActiveCamera({ camera: cameraComponent })
      CameraShakeService.get().init(this.camera ?? this.entity);
    }
    else {
      CameraService.get().setCameraMode(CameraMode.Fixed, {
        position: cameraTransform.worldPosition,
        rotation: cameraTransform.worldRotation,
        fov: 60,
      });
    }
  }

  private setupFocusInteraction() {
    FocusedInteractionService.get().enableFocusedInteraction({ disableEmotesButton: true, disableFocusExitButton: true });
  }

  @subscribe(OnPlayerCreateEvent)
  onPlayerCreate(p: OnPlayerCreateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    setTimeout(() => {
      this.setupCamera();
      this.setupFocusInteraction();
    }, this.initDelay * 1000)
  }
}
