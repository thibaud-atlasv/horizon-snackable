import { Service, EventService } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import { OnServiceReadyEvent } from 'meta/worlds';
import { Events } from '../Types';
import { START_GOLD, START_LIVES } from '../Constants';

@service()
export class ResourceService extends Service {
  private _gold: number = 0;
  private _lives: number = 0;

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    this._gold = START_GOLD;
    this._lives = START_LIVES;
  }

  get gold(): number { return this._gold; }
  get lives(): number { return this._lives; }

  canAfford(amount: number): boolean { return this._gold >= amount; }

  spend(amount: number): boolean {
    if (!this.canAfford(amount)) return false;
    this._gold -= amount;
    this._notify();
    return true;
  }

  earn(amount: number): void {
    this._gold += amount;
    this._notify();
  }

  loseLife(): void {
    this._lives = Math.max(0, this._lives - 1);
    this._notify();
  }

  reset(): void {
    this._gold = START_GOLD;
    this._lives = START_LIVES;
    this._notify();
  }

  private _notify(): void {
    const p = new Events.ResourceChangedPayload();
    p.gold = this._gold;
    p.lives = this._lives;
    EventService.sendLocally(Events.ResourceChanged, p);
  }
}
