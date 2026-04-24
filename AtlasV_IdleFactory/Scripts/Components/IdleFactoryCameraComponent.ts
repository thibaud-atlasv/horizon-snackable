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
  FocusedInteractionService,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

@component({ description: 'Fixed top-down camera for Idle Factory portrait mobile view' })
export class IdleFactoryCameraComponent extends Component {
  private _camera: Maybe<CameraComponent> = null;

  @subscribe(OnEntityStartEvent, {execution: ExecuteOn.Owner})
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._camera = this.entity.getComponent(CameraComponent);

    FocusedInteractionService.get().enableFocusedInteraction({disableEmotesButton:true, disableFocusExitButton:true});
    if (!this._camera) return;
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
