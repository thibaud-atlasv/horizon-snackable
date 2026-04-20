/**
 * FloatingTextController.ts — Animates individual floating text entities.
 *
 * Component Attachment: Spawned FloatingText template entities
 * Component Networking: Local only (client-side visual effect)
 * Component Ownership: Each client owns its local copies
 */
import { Component, TransformComponent, Vec3, WorldTextComponent, Color } from 'meta/worlds';
import { component, subscribe } from 'meta/worlds';
import { OnEntityStartEvent, OnWorldUpdateEvent } from 'meta/worlds';
import type { OnWorldUpdateEventPayload, Maybe } from 'meta/worlds';
import { FLOATING_TEXT_PARK_Y, GROUND_Y } from '../Constants';
import { Events } from '../Types';

// Animation configuration
const ANIM_DURATION = 1.0;  // seconds
const RISE_AMOUNT_Y = 2;  // world units to rise on Y
const RISE_AMOUNT_X = 0.5; // world units to drift on X

// Gold color RGB values (hex #f5c518)
const GOLD_R = 0.96;
const GOLD_G = 0.77;
const GOLD_B = 0.09;

@component()
export class FloatingTextController extends Component {
  private _transform: Maybe<TransformComponent> = null;
  private _textComponent: Maybe<WorldTextComponent> = null;
  private _isAnimating: boolean = false;
  private _elapsed: number = 0;
  private _startY: number = 0;
  private _startX: number = 0;
  private _startZ: number = 0;
  private _colorR: number = GOLD_R;
  private _colorG: number = GOLD_G;
  private _colorB: number = GOLD_B;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    this._transform = this.entity.getComponent(TransformComponent);
    this._textComponent = this.entity.getComponent(WorldTextComponent);
    // Configure text appearance
    if (this._textComponent) {
      this._textComponent.color = new Color(GOLD_R, GOLD_G, GOLD_B, 1);
      this._textComponent.fontSize = 0.5;
      this._textComponent.outlineWidth = 0.1;
      this._textComponent.outlineColor = new Color(0, 0, 0, 1);
    }
  }

  /**
   * Subscribe to ActivateFloatingText event to trigger animation.
   */
  @subscribe(Events.ActivateFloatingText)
  onActivate(p: Events.ActivateFloatingTextPayload): void {
    if (!this._transform || !this._textComponent) return;

    // Store starting position
    this._startX = p.worldX;
    this._startY = GROUND_Y + 1.5; // Slightly above ground
    this._startZ = p.worldZ;

    // Position the text
    this._transform.worldPosition = new Vec3(this._startX, this._startY, this._startZ);

    // Set the text and store color for fade animation
    this._colorR = p.colorR;
    this._colorG = p.colorG;
    this._colorB = p.colorB;
    this._textComponent.text = p.text;
    this._textComponent.color = new Color(this._colorR, this._colorG, this._colorB, 1);

    // Start animation
    this._elapsed = 0;
    this._isAnimating = true;
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(p: OnWorldUpdateEventPayload): void {
    if (!this._isAnimating || !this._transform || !this._textComponent) return;

    this._elapsed += p.deltaTime;
    const t = Math.min(this._elapsed / ANIM_DURATION, 1.0);

    const currentY = this._startY + (RISE_AMOUNT_Y * t);
    const currentX = this._startX + (RISE_AMOUNT_X * t);
    this._transform.worldPosition = new Vec3(currentX, currentY, this._startZ);

    // Fade out via alpha (ease out)
    const alpha = 1.0 - (t * t); // Quadratic ease out for smoother fade
    this._textComponent.color = new Color(this._colorR, this._colorG, this._colorB, alpha);

    // Animation complete - park the entity
    if (t >= 1.0) {
      this._isAnimating = false;
      this._park();
    }
  }

  /**
   * Moves entity to park position (off-screen).
   */
  private _park(): void {
    if (this._transform) {
      this._transform.worldPosition = new Vec3(0, FLOATING_TEXT_PARK_Y, 0);
    }
    if (this._textComponent) {
      this._textComponent.text = '';
    }
  }
}
