import { Service } from 'meta/worlds';
import { service } from 'meta/worlds';
import type { IDamageContext } from '../Types';

type DamageModifier = (ctx: IDamageContext) => IDamageContext;

@service()
export class DamageService extends Service {
  private _modifiers: DamageModifier[] = [];

  register(modifier: DamageModifier): void {
    this._modifiers.push(modifier);
  }

  resolve(ctx: IDamageContext): IDamageContext {
    return this._modifiers.reduce((c, mod) => mod(c), ctx);
  }
}
