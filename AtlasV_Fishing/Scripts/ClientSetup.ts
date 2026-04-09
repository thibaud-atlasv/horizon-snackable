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

import { GameCameraService } from './Fishing/GameCameraService';

/**
 * ClientSetup — camera lock and focused interaction setup.
 *
 * ── Editor setup ────────────────────────────────────────────────────────────────
 * Place on any persistent entity.
 * @property camera     — the camera entity (must have TransformComponent + CameraComponent)
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
      if (this.camera) GameCameraService.get().registerCamera(this.camera);
    }, this.initDelay * 1000);
  }

  private _setupFocusedInteraction(): void {
    FocusedInteractionService.get().enableFocusedInteraction({
      disableEmotesButton:    true,
      disableFocusExitButton: true,
    });
  }
}
