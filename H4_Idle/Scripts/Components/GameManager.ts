/**
 * GameManager — Tick loop only.
 *
 * All gameplay logic lives in autonomous services:
 *   - Tap input + click upgrades → TapService
 *   - Generator purchases + upgrades → GeneratorService
 *   - Feature systems → each self-manages via ActionService
 */
import {
  Component,
  OnEntityStartEvent, OnWorldUpdateEvent,
  type OnWorldUpdateEventPayload,
  NetworkingService, EventService,
  ExecuteOn, Service, component, subscribe,
} from 'meta/worlds';
import { TICK_INTERVAL } from '../Constants';
import { Events } from '../Types';
import { ResourceService } from '../Services/ResourceService';
import { ActionService } from '../Services/ActionService';
import { GeneratorService } from '../Services/GeneratorService';
import { FrenzyService } from '../Services/FrenzyService';
import { CritService } from '../Services/CritService';
import { InterestService } from '../Services/InterestService';
import { TapService } from '../Services/TapService';
import { VaultService } from '../Services/VaultService';

@component()
export class GameManager extends Component {

  // force service availability
  private services: Service[] = [
    ResourceService.get(),
    ActionService.get(),
    GeneratorService.get(),
    FrenzyService.get(),
    CritService.get(),
    InterestService.get(),
    TapService.get(),
    VaultService.get(),
  ];
  private _network  : NetworkingService = NetworkingService.get();
  private _tickAccum: number = 0;

  // DEBUG — auto-buy cursor every 5s
  private _debugAccum: number = 0;
  private readonly DEBUG_BUY_INTERVAL = 5;

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (this._network.isServerContext()) return;
  }

  // ── Tick loop ────────────────────────────────────────────────────────────────

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(p: OnWorldUpdateEventPayload): void {
    this._tickAccum += p.deltaTime;
    if (this._tickAccum >= TICK_INTERVAL) {
      EventService.sendLocally(Events.Tick, { dt: this._tickAccum });
      this._tickAccum = 0;
    }
  }

}
