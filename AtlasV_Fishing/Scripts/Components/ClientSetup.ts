import {
  Component,
  FocusedInteractionService,
  NetworkingService,
  OnEntityStartEvent,
  component,
  property,
  subscribe,
  type Entity,
} from 'meta/worlds';

import { GameCameraService } from '../Services/GameCameraService';
import { VFXService } from '../Services/VFXService';

// ── Editor setup ──────────────────────────────────────────────────────────────
// Place on any persistent entity.
// camera     — camera entity (TransformComponent + CameraComponent)
// flashPlane — full-screen plane in front of camera with a ColorComponent
// initDelay  — seconds before locking camera (default 0.1)
@component()
export class ClientSetup extends Component {

  @property() private camera     ?: Entity;
  @property() private flashPlane ?: Entity;
  @property() private initDelay   : number = 0.1;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this.camera?.requestOwnership();
    setTimeout(() => {
      this._setupFocusedInteraction();
      if (this.camera)     GameCameraService.get().registerCamera(this.camera);
      if (this.flashPlane) VFXService.get().registerFlashPlane(this.flashPlane);
    }, this.initDelay * 1000);
  }

  private _setupFocusedInteraction(): void {
    FocusedInteractionService.get().enableFocusedInteraction({
      disableEmotesButton:    true,
      disableFocusExitButton: true,
    });
  }
}
