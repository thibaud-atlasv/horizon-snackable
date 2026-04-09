import {
  component,
  Component,
  OnEntityStartEvent,
  ExecuteOn,
  subscribe,
  OnWorldUpdateEvent,
  OnWorldUpdateEventPayload,
  type Maybe,
  TransformComponent,
  EventService,
  property,
  Vec3,
  Quaternion,
  NetworkingService
} from 'meta/worlds';
import { Events, PowerUpType, type ICollider, type Rect } from '../Types';
import { CollisionManager } from '../CollisionManager';
import { BOUNDS } from '../Constants';

/**
 * PowerUp Component
 * 
 * Component Attachment: Spawned Entity (power-up pickup)
 * Component Networking: Local (runs on client only)
 * Component Ownership: Client owns this local entity
 * 
 * This power-up falls from destroyed bricks and can be caught by the paddle.
 * When caught, it activates the effect defined by powerUpType.
 */
@component()
export class PowerUp extends Component implements ICollider {

  private transform: Maybe<TransformComponent> = null;

  readonly colliderTag = 'powerup';

  @property()
  private fallSpeed: number = 3;
  @property()
  powerUpType: PowerUpType = PowerUpType.BigPaddle;
  @property()
  powerUpDuration: number = 10;

  private _isActive: boolean = false;
  private _pulseTime: number = 0;
  private _spinAngle: number = 0;
  private _isClient = false;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart() {
    this._isClient = !NetworkingService.get().isServerContext();
    if (!this._isClient) return;
    
    this.transform = this.entity.getComponent(TransformComponent);
    
    // Register with collision manager
    CollisionManager.get().register(this);
    this._isActive = true;
  }

  getColliderBounds(): Rect {
    if (!this.transform) return { x: 0, y: 0, w: 0, h: 0 };
    
    const pos = this.transform.worldPosition;
    const scale = this.transform.localScale;
    const hw = scale.x * 0.5;
    const hh = scale.y * 0.5;
    return { x: pos.x - hw, y: pos.y - hh, w: hw * 2, h: hh * 2 };
  }

  onCollision(other: ICollider): void {
    if (!this._isActive) return;
    
    if (other.colliderTag === 'paddle') {
      this._isActive = false;
      
      // Send event to activate the power-up
      EventService.sendLocally(Events.PowerUpCollected, { 
        powerUpType: this.powerUpType,
        duration : this.powerUpDuration,
      });
      CollisionManager.get().unregister(this);
      this.entity.destroy();
    }
  }

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Everywhere })
  onUpdate(params: OnWorldUpdateEventPayload) {
    if (!this._isClient) return;
    if (!this._isActive || !this.transform) return;
    
    const dt = params.deltaTime;
    const pos = this.transform.worldPosition;
    
    // Fall downward
    const newY = pos.y - this.fallSpeed * dt;
    
    // Check if below play area
    if (newY < BOUNDS.y) {
      this._isActive = false;
      CollisionManager.get().unregister(this);
      this.entity.destroy();
      return;
    }
    
    this.transform.worldPosition = new Vec3(pos.x, newY, pos.z);

    // Spin around Y axis
    this._spinAngle += dt * 300;
    console.log("Spin angle:", this._spinAngle);  
    this.transform.localRotation = Quaternion.fromEuler(new Vec3(0, this._spinAngle, 0));

    CollisionManager.get().checkAgainst(this);
  }

  @subscribe(Events.ResetRound)
  private onResetRound(): void {
    if (this._isActive) {
      this._isActive = false;
      CollisionManager.get().unregister(this);
      this.entity.destroy();
    }
  }

}
