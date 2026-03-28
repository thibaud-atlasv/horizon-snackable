import {
  Color,
  Component,
  NetworkingService,
  NetworkMode,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  Quaternion,
  TemplateAsset,
  TransformComponent,
  Vec3,
  WorldService,
  WorldTextComponent,
  component,
  property,
  subscribe,
  ColorComponent,
  lerp,
} from 'meta/worlds';
import type { Entity, Maybe, OnWorldUpdateEventPayload } from 'meta/worlds';
import { Events, ScoreGrade } from '../Types';
import { FloatingText } from '../Assets';

/**
 * FloatingScoreText — spawns animated score/grade text on freeze events.
 *
 * **Attachment:** Scene entity (e.g., Game in space.hstf)
 * **Networking:** Local-only (client-side visual effect)
 * **Ownership:** N/A (local entities)
 *
 * On FallingObjFrozen, creates a text entity at the freeze position that:
 * 1. Displays grade + score (e.g., "PERFECT\n+1250")
 * 2. Animates upward over ~1 second
 * 3. Fades out (alpha 1 → 0)
 * 4. Self-destructs after animation completes
 */
@component()
export class FloatingScoreText extends Component {
  // ── Template Reference ────────────────────────────────────────────────────

  private _textTemplate: TemplateAsset = FloatingText;

  // ── Tunable Properties ────────────────────────────────────────────────────

  @property()
  private _fontSize: number = 0.35;

  @property()
  private _animDuration: number = 1.0;

  @property()
  private _riseDistance: number = 2.5;

  @property()
  private _textZ: number = -1.0;

  private _colorComponent: Maybe<ColorComponent> = null;

  // ── Grade Colors ──────────────────────────────────────────────────────────

  private readonly _gradeColors: Map<ScoreGrade, Color> = new Map([
    [ScoreGrade.Perfect, Color.fromHex('#FFD700')], // Gold
    [ScoreGrade.Great, Color.fromHex('#00FF00')],   // Green
    [ScoreGrade.Good, Color.fromHex('#00BFFF')],    // Blue
    [ScoreGrade.Early, Color.fromHex('#FFA500')],   // Orange
    [ScoreGrade.Miss, Color.fromHex('#808080')],    // Gray
  ]);

  private readonly _gradeNames: Map<ScoreGrade, string> = new Map([
    [ScoreGrade.Perfect, 'PERFECT'],
    [ScoreGrade.Great, 'GREAT'],
    [ScoreGrade.Good, 'GOOD'],
    [ScoreGrade.Early, 'EARLY'],
    [ScoreGrade.Miss, 'MISS'],
  ]);

  // ── Active Text Tracking ──────────────────────────────────────────────────

  private _activeTexts: FloatingText[] = [];
  private _worldService!: WorldService;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._worldService = WorldService.get();
    console.log('[FloatingScoreText] Initialized');
    
    this._colorComponent = this.entity.getChildrenWithComponent(ColorComponent)[0]?.getComponent(ColorComponent);
    this.updateColor(new Color(0,0,0,0));
  }

  updateColor(color: Color) : void
  {
    if (!this._colorComponent) return;
    this._colorComponent.color = color;
  }

  // ── Event: FallingObjFrozen ───────────────────────────────────────────────

  @subscribe(Events.FallingObjFrozen)
  onFallingObjFrozen(p: Events.FallingObjFrozenPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    const gradeName = this._gradeNames.get(p.grade) ?? 'MISS';
    const scoreSign = p.pts >= 0 ? '+' : '';
    const displayText = `${gradeName}\n${scoreSign}${p.pts}`;

    const color = this._gradeColors.get(p.grade) ?? Color.fromHex('#808080');

    const startPos = new Vec3(0, p.lowestY, this._textZ);
    const transform = this.entity.getComponent(TransformComponent);
    if (transform)
      transform.worldPosition = new Vec3(0, startPos.y, startPos.z);

    this._spawnFloatingText(displayText, color, startPos);
  }

  // ── Animation Update ──────────────────────────────────────────────────────

  @subscribe(OnWorldUpdateEvent)
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (this._activeTexts.length === 0) return;

    const dt = payload.deltaTime;
    const toRemove: number[] = [];

    let maxAlpha: Color = new Color(0,0,0,0);
    for (let i = 0; i < this._activeTexts.length; i++) {
      const ft = this._activeTexts[i];
      
      // Skip if entity was destroyed externally
      if (!ft.entity || ft.entity.isDestroyed()) {
        toRemove.push(i);
        continue;
      }
      ft.elapsed += dt;

      const t = Math.min(ft.elapsed / this._animDuration, 1.0);

      // Ease-out for smooth deceleration
      const easeOut = 1 - (1 - t) * (1 - t);

      // Update position (rise upward)
      const newY = ft.startY + easeOut * this._riseDistance;
      const transform = ft.entity.getComponent(TransformComponent);
      if (transform) {
        transform.localPosition = new Vec3(ft.startX, newY, this._textZ);
      }

      // Update alpha (fade out)
      const alpha = 1 - easeOut;
      const textComp = ft.entity.getComponent(WorldTextComponent);
      if (textComp) {
        textComp.color = new Color(ft.baseColor.r, ft.baseColor.g, ft.baseColor.b, alpha);  
        if (alpha > maxAlpha.a)
          maxAlpha = textComp.color;
      }

      // Mark for removal if animation complete
      if (t >= 1.0) {
        toRemove.push(i);
      }
    }
    this.updateColor(maxAlpha);
    
    // Remove completed texts (iterate in reverse to preserve indices)
    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      const ft = this._activeTexts[idx];
      if (ft.entity && !ft.entity.isDestroyed()) {
        ft.entity.destroy();
      }
      this._activeTexts.splice(idx, 1);
    }
  }

  // ── Spawn Helper ──────────────────────────────────────────────────────────

  private async _spawnFloatingText(text: string, color: Color, startPos: Vec3): Promise<void> {
    if (!this._textTemplate) {
      console.warn('[FloatingScoreText] No text template assigned!');
      return;
    }

    const entity = await this._worldService.spawnTemplate({
      templateAsset: this._textTemplate,
      networkMode: NetworkMode.LocalOnly,
      position: startPos,
      rotation: Quaternion.identity,
    });

    if (!entity) {
      console.warn('[FloatingScoreText] Failed to spawn text entity');
      return;
    }

    // Configure the text component
    const textComp = entity.getComponent(WorldTextComponent);
    if (textComp) {
      textComp.text = text;
      textComp.color = color;
      textComp.fontSize = this._fontSize;
    }

    // Track for animation
    this._activeTexts.push({
      entity,
      startX: startPos.x,
      startY: startPos.y,
      baseColor: color,
      elapsed: 0,
    });

    console.log(`[FloatingScoreText] Spawned: "${text.replace('\n', ' ')}" at Y=${startPos.y.toFixed(2)}`);
  }
}

// ── Internal Data Structure ─────────────────────────────────────────────────

interface FloatingText {
  entity: Entity;
  startX: number;
  startY: number;
  baseColor: Color;
  elapsed: number;
}
