import { Color, EventService, type ColorComponent, type Maybe, type TransformComponent, Vec3 } from 'meta/worlds';
import { Events, PowerUpType } from '../Types';

export type PaddleContext = {
  readonly transform: TransformComponent;
  readonly colorComponent?: Maybe<ColorComponent>;
  readonly normalScale: Vec3;
};

export interface IPowerUpEffect {
  /** true → multiple instances can coexist, each with its own timer. */
  readonly stackable: boolean;
  readonly color: Color;
  onStart(ctx: PaddleContext): void;
  onEnd(ctx: PaddleContext): void;
  /** Called only when stackable=true, each time the stack count changes. */
  onStackChanged?(ctx: PaddleContext, count: number): void;
}

// --- Concrete effects ---

export class BigPaddleEffect implements IPowerUpEffect {
  readonly stackable = true;
  readonly color = new Color(0, 1, 0, 1);

  onStart(_ctx: PaddleContext): void { }

  onStackChanged(ctx: PaddleContext, count: number): void {
    const s = ctx.transform.localScale;
    ctx.transform.localScale = new Vec3(ctx.normalScale.x * (1 + (count * 0.2)), s.y, s.z);
  }

  onEnd(ctx: PaddleContext): void {
    const s = ctx.transform.localScale;
    ctx.transform.localScale = new Vec3(ctx.normalScale.x, s.y, s.z);
  }
}

export class StickyPaddleEffect implements IPowerUpEffect {
  readonly stackable = false;
  readonly color = new Color(1, 1, 0, 1);

  onStart(_ctx: PaddleContext): void {
    EventService.sendLocally(Events.StickyPaddleActivated, {});
  }

  onEnd(_ctx: PaddleContext): void {
    EventService.sendLocally(Events.StickyPaddleDeactivated, {});
  }
}

// --- Factory ---
export function createPaddleEffect(type: PowerUpType): IPowerUpEffect {
  switch (type) {
    case PowerUpType.BigPaddle: return new BigPaddleEffect();
    case PowerUpType.StickyPaddle: return new StickyPaddleEffect();
  }
  return null as never;
}
