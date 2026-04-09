/**
 * ShapeIntruderHomeScreenComponent — Title / home screen UI.
 *
 * Component Attachment: Entity with CustomUiComponent ("HomeScreen" entity in space.hstf)
 * Component Networking: Local (all UI, client-side only)
 * Component Ownership: Not Networked
 *
 * Visible at launch and after game over. Hides when the game starts.
 * "Tap to start" fires Events.GameStartRequested via EventService.sendLocally.
 */

import {
  Component, component,
  CustomUiComponent,
  OnEntityCreateEvent,
  NetworkingService,
  EventService,
  subscribe,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';
import {
  onHomeScreenTapToStart,
  ShapeIntruderHomeScreenViewModel,
} from './HomeScreenViewModel';
import { Events } from '../Types';

@component()
export class ShapeIntruderHomeScreenComponent extends Component {
  private _isServer = false;
  private _customUi: Maybe<CustomUiComponent> = null;
  private _homeScreenVM = new ShapeIntruderHomeScreenViewModel();

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  @subscribe(OnEntityCreateEvent)
  onCreate(): void {
    this._isServer = NetworkingService.get().isServerContext();
    if (this._isServer) return;

    this._customUi = this.entity.getComponent(CustomUiComponent);
    if (this._customUi) {
      this._customUi.dataContext = this._homeScreenVM;
    }

    // Visible at launch
    this._setVisibility(true);
  }

  // ─── UI Event: Tap to start ─────────────────────────────────────────────────

  @subscribe(onHomeScreenTapToStart)
  onTapToStart(): void {
    if (this._isServer) return;
    EventService.sendLocally(Events.GameStartRequested, {});
  }

  // ─── Game Events ────────────────────────────────────────────────────────────

  @subscribe(Events.GameStarted)
  onGameStarted(_p: Events.GameStartedPayload): void {
    if (this._isServer) return;
    this._setVisibility(false);
  }

  @subscribe(Events.GameOverDismiss)
  onGameOver(_p: Events.GameOverDismissPayload): void {
    if (this._isServer) return;
    this._setVisibility(true);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private _setVisibility(visible: boolean): void {
    this._homeScreenVM.isHomeVisible = visible;
    if (this._customUi) this._customUi.isVisible = visible;
  }
}
