/**
 * HitService — Reducer pipeline for hit resolution.
 *
 * Each registered modifier receives IHitContext and returns a modified IHitContext.
 * Modifiers run in registration order (SplashSystem first, then CritService).
 * To add a new hit mechanic (chain, pierce…): create a @service() that calls
 * HitService.get().register(modifier) in onReady(), then force-instantiate it in GameManager.
 * ProjectileController calls resolve() at detonation time.
 */
import { Service } from 'meta/worlds';
import { service } from 'meta/worlds';
import type { IHitContext } from '../Types';

type HitModifier = (ctx: IHitContext) => IHitContext;

@service()
export class HitService extends Service {
  private _modifiers: HitModifier[] = [];

  register(modifier: HitModifier): void {
    this._modifiers.push(modifier);
  }

  resolve(ctx: IHitContext): IHitContext {
    return this._modifiers.reduce((c, mod) => mod(c), ctx);
  }
}
