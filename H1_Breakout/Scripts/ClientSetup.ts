import {
  CameraComponent,
  CameraMode,
  CameraService,
  Component,
  ExecuteOn,
  FocusedInteractionService,
  OnEntityStartEvent,
  TransformComponent,
  component,
  property,
  subscribe,
  type Entity,
} from 'meta/worlds';

@component()
export class ClientSetup extends Component
{
  @property()
  private camera? : Entity;

  @property()
  private initDelay : number = 0;

  private setupCamera() : void
  {
    const cameraTransform = this.camera?.getComponent(TransformComponent) ?? this.entity.getComponent(TransformComponent)!;
    const cameraComponent = this.camera?.getComponent(CameraComponent) ?? this.entity.getComponent(CameraComponent);

    CameraService.get().setCameraMode(CameraMode.Fixed, {
      position: cameraTransform.worldPosition,
      rotation: cameraTransform.worldRotation,
      fov : cameraComponent?.fieldOfView ?? 60,
    });
  }

  private setupFocusInteraction()
  {
    FocusedInteractionService.get().enableFocusedInteraction({disableEmotesButton:true, disableFocusExitButton:true});
  }

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart() {
    setTimeout(() => {
      this.setupCamera();
      this.setupFocusInteraction();
    }, this.initDelay * 1000)

  }
}
