import { Service, service } from 'meta/worlds';
import { OnServiceReadyEvent, subscribe } from 'meta/worlds';
import { HitService } from './HitService';
import { CRIT_MULTIPLIER } from '../Constants';

@service()
export class CritService extends Service {
  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    HitService.get().register(ctx => {
      const chance = (ctx.props['critChance'] as number | undefined) ?? 0;
      const mult = (ctx.props['critMultiplier'] as number | undefined) ?? 1;
      
      if (chance <= 0 || Math.random() >= chance) return ctx;
      return { ...ctx, damage: ctx.damage * mult, props: { ...ctx.props, isCrit: true } };
    });
  }
}
