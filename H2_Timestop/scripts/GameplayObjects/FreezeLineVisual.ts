import {
  Color,
  ColorComponent,
  Component,
  NetworkingService,
  NetworkMode,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  OnWorldUpdateEventPayload,
  Quaternion,
  TransformComponent,
  Vec3,
  WorldService,
  component,
  subscribe,
} from 'meta/worlds';
import type { Entity, Maybe } from 'meta/worlds';
import { Events, ScoreGrade } from '../Types';
import { FREEZE_HOLD_MS, FREEZE_FADE_MS, WIDTH } from '../Constants';
import { Primitives } from '../Assets';

/**
 * FreezeLineVisual — spawns a horizontal line when objects are frozen.
 *
 * Component Attachment: Scene entity (e.g., GameManager entity or dedicated UI entity)
 * Component Networking: Local (client-only)
 * Component Ownership: N/A (runs locally on each client)
 *
 * When a falling object is frozen, this spawns a thin horizontal cube at the
 * object's lowest Y position. The line color indicates the score grade.
 * After a hold duration, the line fades out and is destroyed.
 */
@component()
export class FreezeLineVisual extends Component {
  // Template for the cube primitive
  private readonly _cubeTemplate = Primitives.Cube;

  // Active lines being animated
  private readonly _activeLines: FreezeLineData[] = [];

  // Grade to color mapping
  private readonly _gradeColors: Record<ScoreGrade, Color> = {
    [ScoreGrade.Perfect]: Color.fromHex('#FFD700'), // Gold
    [ScoreGrade.Great]:   Color.fromHex('#00FF00'), // Green
    [ScoreGrade.Good]:    Color.fromHex('#00BFFF'), // Blue
    [ScoreGrade.Early]:   Color.fromHex('#FFA500'), // Orange
    [ScoreGrade.Miss]:    Color.fromHex('#808080'), // Gray
  };

  // Line dimensions
  private readonly _lineWidth  = WIDTH;      // 9 wu - full play area width
  private readonly _lineHeight = 0.03;       // Very thin
  private readonly _lineDepth  = 0.1;        // Slight depth for visibility
  private readonly _lineZ      = -0.5;       // In front of objects at Z=0

  // Timing (convert ms to seconds)
  private readonly _holdDuration = FREEZE_HOLD_MS / 1000;
  private readonly _fadeDuration = FREEZE_FADE_MS / 1000;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    // Client-only execution
    if (NetworkingService.get().isServerContext()) return;
    console.log('[FreezeLineVisual] Initialized');
  }

  @subscribe(Events.FallingObjFrozen)
  onFallingObjFrozen(payload: Events.FallingObjFrozenPayload): void {
    // Client-only
    if (NetworkingService.get().isServerContext()) return;

    console.log(`[FreezeLineVisual] Spawning line at Y=${payload.lowestY}, grade=${ScoreGrade[payload.grade]}`);
    this._spawnLine(payload.lowestY, payload.grade);
  }

  @subscribe(OnWorldUpdateEvent)
  onWorldUpdate(payload: OnWorldUpdateEventPayload): void {
    // Client-only
    if (NetworkingService.get().isServerContext()) return;

    const dt = payload.deltaTime;

    // Update all active lines (iterate in reverse for safe removal)
    for (let i = this._activeLines.length - 1; i >= 0; i--) {
      const line = this._activeLines[i];
      line.elapsed += dt;

      const totalDuration = this._holdDuration + this._fadeDuration;

      if (line.elapsed >= totalDuration) {
        // Fade complete - destroy the entity
        this._destroyLine(line);
        this._activeLines.splice(i, 1);
      } else if (line.elapsed > this._holdDuration) {
        // In fade phase - update alpha
        const fadeProgress = (line.elapsed - this._holdDuration) / this._fadeDuration;
        const alpha = 1 - fadeProgress;
        this._updateLineAlpha(line, alpha);
      }
      // During hold phase, do nothing (line stays at full opacity)
    }
  }

  private async _spawnLine(yPos: number, grade: ScoreGrade): Promise<void> {
    const position = new Vec3(0, yPos, this._lineZ);
    const scale = new Vec3(this._lineWidth, this._lineHeight, this._lineDepth);

    const entity = await WorldService.get().spawnTemplate({
      templateAsset: this._cubeTemplate,
      networkMode: NetworkMode.LocalOnly,
      position: position,
      rotation: Quaternion.identity,
    });

    // Set scale
    const transform = entity.getComponent(TransformComponent);
    if (transform) {
      transform.localScale = scale;
    }

    // Get or add ColorComponent and set color
    const colorComp = entity.getComponent(ColorComponent);
    const baseColor = this._gradeColors[grade];

    if (colorComp) {
      colorComp.color = baseColor;
    }

    // Track for animation
    const lineData: FreezeLineData = {
      entity,
      colorComp,
      baseColor,
      elapsed: 0,
    };

    this._activeLines.push(lineData);
    console.log(`[FreezeLineVisual] Line spawned, active count: ${this._activeLines.length}`);
  }

  private _updateLineAlpha(line: FreezeLineData, alpha: number): void {
    if (line.colorComp) {
      const c = line.baseColor;
      line.colorComp.color = new Color(c.r, c.g, c.b, alpha);
    }
  }

  private _destroyLine(line: FreezeLineData): void {
    if (line.entity && !line.entity.isDestroyed()) {
      line.entity.destroy();
      console.log('[FreezeLineVisual] Line destroyed');
    }
  }
}

/** Internal data structure for tracking active freeze lines */
interface FreezeLineData {
  entity: Entity;
  colorComp: Maybe<ColorComponent>;
  baseColor: Color;
  elapsed: number;
}
