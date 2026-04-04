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
