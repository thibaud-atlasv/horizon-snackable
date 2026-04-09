/**
 * SplashSystem — HitService modifier that expands hit targets to all enemies in splash radius.
 *
 * Reads props.splashRadius from IHitContext. If > 0, replaces ctx.targets with all enemies
 * within that radius of ctx.originX/Z using TargetingService.getEnemiesInRadius().
 * Force-instantiated in GameManager._startGame() to trigger self-registration.
 * Cannon base stats include splashRadius=1.0; Upg.splash adds +0.8 per upgrade.
 */
import { Service, type Maybe } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import { OnServiceReadyEvent } from 'meta/worlds';
import { HitService } from './HitService';
import { TargetingService } from './TargetingService';

@service()
export class SplashSystem extends Service {

  private _hitService : HitService = Service.inject(HitService);
  private _targetingService : Maybe<TargetingService> = Service.injectWeak(TargetingService);

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    this._hitService.register((ctx) => {
      const splashRadius = ctx.props['splashRadius'] as number | undefined;
      if (!splashRadius || splashRadius <= 0) return ctx;
      const targets = this._targetingService?.getEnemiesInRadius(ctx.originX, ctx.originZ, splashRadius);
      if (!targets) return ctx;
      return { ...ctx, targets };
    });
  }
}
