import {
  Component,
  component,
  subscribe,
  OnEntityStartEvent,
  CameraComponent,
  CameraService,
  OnPlayerCreateEventPayload,
  OnPlayerCreateEvent,
  ExecuteOn,
  NetworkingService,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

@component({ description: 'Fixed top-down camera for Idle Factory portrait mobile view' })
export class IdleFactoryCameraComponent extends Component {
  private _camera: Maybe<CameraComponent> = null;

  @subscribe(OnEntityStartEvent, {execution: ExecuteOn.Owner})
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._camera = this.entity.getComponent(CameraComponent);
    if (!this._camera) return;

    this._camera.fieldOfView = 60;

    // Delay activation to ensure the scene and default camera are fully initialized.
    // CameraService.setActiveCamera requires the rendering pipeline to be ready;
    // calling it synchronously in onStart can silently fail on some devices.
    setTimeout(() => {
      CameraService.get().setActiveCamera({ camera: this._camera! });
    }, 1500);
  }

  @subscribe(OnPlayerCreateEvent, {execution: ExecuteOn.Owner})
  onPlayerCreate(p: OnPlayerCreateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._camera = this.entity.getComponent(CameraComponent);
    if (this._camera)
      CameraService.get().setActiveCamera({ camera: this._camera });
  }
}
