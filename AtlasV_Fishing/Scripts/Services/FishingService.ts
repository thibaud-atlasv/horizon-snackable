import { Service, service, subscribe, OnServiceReadyEvent } from 'meta/worlds';
import { TIP_X, TIP_Y, BAIT_IDLE_X, BAIT_IDLE_Y } from '../Constants';

/**
 * FishingService — source of truth for the fishing rod tip and idle bait position.
 * Constants serve as fallback if no component registers via setIdlePose().
 */
@service()
export class FishingService extends Service {

  private _tipX  = TIP_X;
  private _tipY  = TIP_Y;
  private _idleX = BAIT_IDLE_X;
  private _idleY = BAIT_IDLE_Y;

  get tipX():  number { return this._tipX; }
  get tipY():  number { return this._tipY; }
  get idleX(): number { return this._idleX; }
  get idleY(): number { return this._idleY; }

  @subscribe(OnServiceReadyEvent)
  onReady(): void {}

  setIdlePose(tipX: number, tipY: number, idleX: number, idleY: number): void {
    this._tipX  = tipX;
    this._tipY  = tipY;
    this._idleX = idleX;
    this._idleY = idleY;
  }
}
