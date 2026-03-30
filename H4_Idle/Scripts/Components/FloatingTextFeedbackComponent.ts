/**
 * FloatingTextFeedbackComponent.ts — Spawns floating text when gold is gained.
 *
 * Component Attachment: Scene entity (e.g., Game or dedicated FX root)
 * Component Networking: Local (client-only visual feedback)
 * Component Ownership: Not Networked (client-only)
 *
 * Listens to Events.GainApplied and spawns FloatingText templates showing
 * the gained amount. Text floats upward and fades out via FloatingTextBehaviorComponent.
 */
import {
  Component,
  component,
  property,
  subscribe,
  NetworkMode,
  Quaternion,
  Vec3,
  WorldService,
  NetworkingService,
  WorldTextComponent,
} from 'meta/worlds';
import type { Entity, Maybe, TemplateAsset } from 'meta/worlds';
import { Events } from '../Types';

/** Small random horizontal offset range to prevent overlap. */
const SPAWN_OFFSET_X = 0.5;
/** Vertical offset from origin to spawn text slightly above center. */
const SPAWN_OFFSET_Y = 0.5;

@component()
export class FloatingTextFeedbackComponent extends Component {
  /** The template to spawn for floating text. Assign in editor. */
  @property() floatingTextTemplate: Maybe<TemplateAsset> = null;

  @subscribe(Events.GainApplied)
  onGainApplied(payload: Events.GainAppliedPayload): void {
    // Client-only feedback — skip on server
    if (NetworkingService.get().isServerContext()) return;

    const amount = payload.amount;
    if (amount <= 0) return;

    console.log(`[FloatingTextFeedback] Gain applied: +${amount} (source: ${payload.source})`);

    this._spawnFloatingText(amount);
  }

  private async _spawnFloatingText(amount: number): Promise<void> {
    if (!this.floatingTextTemplate) {
      console.log('[FloatingTextFeedback] floatingTextTemplate not assigned');
      return;
    }

    // Random horizontal offset to prevent stacking
    const offsetX = (Math.random() - 0.5) * SPAWN_OFFSET_X * 2;

    const entity: Entity = await WorldService.get().spawnTemplate({
      templateAsset: this.floatingTextTemplate,
      position: new Vec3(offsetX, SPAWN_OFFSET_Y, 0),
      rotation: Quaternion.identity,
      scale: Vec3.one,
      networkMode: NetworkMode.LocalOnly,
    });

    // Set the display text directly on the WorldTextComponent
    const worldText = entity.getComponent(WorldTextComponent);
    if (worldText) {
      worldText.text = `+${Math.floor(amount)}`;
    }

    console.log(`[FloatingTextFeedback] Spawned floating text: +${Math.floor(amount)}`);
  }
}
