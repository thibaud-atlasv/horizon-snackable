import {
  Component, component,
  OnEntityStartEvent,
  NetworkingService,
  subscribe,
  EventService,
  FocusedInteractionService,
  OnFocusedInteractionInputStartedEvent,
  type OnFocusedInteractionInputEventPayload,
  type TextureAsset,
} from 'meta/worlds';
import { GameStateService } from '../Services/GameStateService';
import { RoundService } from '../Services/RoundService';
import { TimerService } from '../Services/TimerService';
import { Events } from '../Types';
import { SHAPE_TEXTURE_MAP } from '../Assets';

/**
 * Entry point placed on the root entity in the scene.
 *
 * Responsibilities:
 *   - Guard server context
 *   - Force instantiation of every service via explicit .get() references
 *
 * Game flow starts when the UI fires Events.GameStartRequested.
 * From that point on, services communicate exclusively through events.
 */
@component()
export class GameManager extends Component {
  private readonly _networkingService = NetworkingService.get();

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (this._networkingService.isServerContext()) return;
    // Force instantiation of all services.
    // Fire Events.GameStartRequested from the UI "Play" button to begin.
    void GameStateService.get();
    void RoundService.get();
    void TimerService.get();

    FocusedInteractionService.get().enableFocusedInteraction({
      disableEmotesButton:    true,
      disableFocusExitButton: true,
    });
  }

  @subscribe(Events.AnswerSubmitted)
  onAnswerSubmitted(_p: Events.AnswerSubmittedPayload): void {
    if (GameStateService.get().gameOver) EventService.sendLocally(Events.GameOverDismiss, {});
  }

  @subscribe(OnFocusedInteractionInputStartedEvent)
  onTouchStarted(_p: OnFocusedInteractionInputEventPayload): void {
    if (GameStateService.get().gameOver) EventService.sendLocally(Events.GameOverDismiss, {});
  }
}
