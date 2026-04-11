import { Vec3 } from 'meta/worlds';
import type { ICollider } from '../Types';

export class StickyBallState {
  private _active = false;
  private _stuck = false;
  private _offsetX = 0;
  private _paddle: ICollider | null = null;

  get isStuck(): boolean { return this._stuck; }

  activate(): void { this._active = true; }

  /** Returns true if the ball was stuck and needs to be launched. */
  deactivate(): boolean {
    this._active = false;
    return this._stuck;
  }

  tryStick(paddle: ICollider, ballX: number): boolean {
    if (!this._active) return false;
    const b = paddle.getColliderBounds();
    this._offsetX = ballX - (b.x + b.w / 2);
    this._stuck = true;
    this._paddle = paddle;
    return true;
  }

  getConstrainedPosition(r: number, posZ: number): Vec3 | null {
    if (!this._stuck || !this._paddle) return null;
    const b = this._paddle.getColliderBounds();
    return new Vec3(b.x + b.w / 2 + this._offsetX, b.y + b.h + r, posZ);
  }

  /** Computes launch velocity and releases the ball. */
  getLaunchVelocity(speed: number, ballX: number): Vec3 | null {
    if (!this._paddle) return new Vec3(speed, speed, 0);;
    const b = this._paddle.getColliderBounds();
    const hitFactor = (ballX - (b.x + b.w / 2)) / (b.w / 2);
    const angle = hitFactor * (Math.PI / 3);
    this._stuck = false;
    this._paddle = null;
    return new Vec3(speed * Math.sin(angle), speed * Math.cos(angle), 0);
  }

  reset(): void {
    this._stuck = false;
    this._active = false;
    this._paddle = null;
  }
}
