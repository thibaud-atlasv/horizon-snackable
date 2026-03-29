import {
  Color,
  ColorComponent,
  Component,
  NetworkingService,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  type OnWorldUpdateEventPayload,
  TransformComponent,
  Vec3,
  component,
  property,
  subscribe,
  type Entity,
  type Maybe,
} from 'meta/worlds';

import { HALF_W, WATER_SURFACE_Y, WATER_BOTTOM_Y } from '../Constants';

// ─── Layer definitions ─────────────────────────────────────────────────────────
// 10 horizontal slabs from surface to sand, adapted for portrait 9×16.
interface LayerDef {
  y    : number;                           // center Y
  color: { r: number; g: number; b: number };
  causticAmp  : number;                    // primary caustic amplitude
  causticFreq : number;                    // primary caustic frequency
  causticAmp2 : number;                    // secondary harmonic amplitude
  causticFreq2: number;
  phaseOffset : number;                    // per-layer phase lag
  shimmer     : boolean;                   // extra sparkle (waterline only)
  deepGlow    : boolean;                   // bioluminescence (deep layers)
}

const LAYERS: LayerDef[] = [
  { y:  5.50, color: { r: 0.55, g: 0.82, b: 0.45 }, causticAmp: 0.00, causticFreq: 0.8, causticAmp2: 0.00, causticFreq2: 1.6, phaseOffset: 0.0, shimmer: false, deepGlow: false }, // sky/bank
  { y:  4.20, color: { r: 0.88, g: 0.96, b: 1.00 }, causticAmp: 0.08, causticFreq: 1.2, causticAmp2: 0.04, causticFreq2: 2.9, phaseOffset: 0.0, shimmer: true,  deepGlow: false }, // waterline
  { y:  3.20, color: { r: 0.42, g: 0.78, b: 0.95 }, causticAmp: 0.06, causticFreq: 0.9, causticAmp2: 0.03, causticFreq2: 1.8, phaseOffset: 0.3, shimmer: false, deepGlow: false }, // surface
  { y:  1.90, color: { r: 0.28, g: 0.62, b: 0.88 }, causticAmp: 0.05, causticFreq: 0.8, causticAmp2: 0.02, causticFreq2: 1.6, phaseOffset: 0.6, shimmer: false, deepGlow: false },
  { y:  0.50, color: { r: 0.16, g: 0.46, b: 0.78 }, causticAmp: 0.04, causticFreq: 0.7, causticAmp2: 0.02, causticFreq2: 1.4, phaseOffset: 0.9, shimmer: false, deepGlow: false },
  { y: -1.00, color: { r: 0.08, g: 0.30, b: 0.62 }, causticAmp: 0.03, causticFreq: 0.6, causticAmp2: 0.01, causticFreq2: 1.2, phaseOffset: 1.2, shimmer: false, deepGlow: false },
  { y: -2.60, color: { r: 0.04, g: 0.16, b: 0.44 }, causticAmp: 0.02, causticFreq: 0.5, causticAmp2: 0.01, causticFreq2: 1.0, phaseOffset: 1.5, shimmer: false, deepGlow: true  },
  { y: -4.20, color: { r: 0.02, g: 0.08, b: 0.28 }, causticAmp: 0.01, causticFreq: 0.4, causticAmp2: 0.00, causticFreq2: 0.8, phaseOffset: 1.8, shimmer: false, deepGlow: true  },
  { y: -5.80, color: { r: 0.01, g: 0.04, b: 0.16 }, causticAmp: 0.00, causticFreq: 0.3, causticAmp2: 0.00, causticFreq2: 0.6, phaseOffset: 2.1, shimmer: false, deepGlow: true  },
  { y: -7.20, color: { r: 0.02, g: 0.05, b: 0.12 }, causticAmp: 0.00, causticFreq: 0.0, causticAmp2: 0.00, causticFreq2: 0.0, phaseOffset: 0.0, shimmer: false, deepGlow: false }, // sand
];

/**
 * WaterLayerController — animates 10 horizontal water slabs with caustic effects.
 *
 * ── Editor setup ────────────────────────────────────────────────────────────────
 * Attach to a parent entity that holds 10 child cube-mesh entities.
 * Assign them in order (surface first) via layerEntities inspector array.
 * Each child entity needs a ColorComponent.
 *
 * Variants:
 *   skyMode    — 0 Morning, 1 Afternoon, 2 Sunset, 3 Night
 *   stormMode  — intensifies caustic animation
 */
@component()
export class WaterLayerController extends Component {

  @property() private layerEntities: readonly Entity[] = [];
  @property() private skyMode   : number = 1;   // 0-3
  @property() private stormMode : boolean = false;

  private _colorComponents: (ColorComponent | null)[] = [];

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this._colorComponents = this.layerEntities.map(e => e?.getComponent(ColorComponent) ?? null);

    // Set static positions/scales
    const layerH = (WATER_SURFACE_Y - WATER_BOTTOM_Y) / LAYERS.length + 0.2;
    this.layerEntities.forEach((e, i) => {
      if (!e) return;
      const tc = e.getComponent(TransformComponent);
      if (tc) {
        tc.localPosition = new Vec3(0, LAYERS[i].y, -0.1);
        tc.localScale    = new Vec3(HALF_W * 2 + 1, layerH, 0.1);
      }
    });
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(p: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    const t      = p.deltaTime;
    const time   = (p as any).worldTime ?? 0; // fallback
    this._animateLayers(time);
  }

  private _animateLayers(t: number): void {
    const freqMul = this.stormMode ? 2.2 : 1.0;
    const ampMul  = this.stormMode ? 1.8 : 1.0;

    this.layerEntities.forEach((_, i) => {
      const cc = this._colorComponents[i];
      if (!cc) return;
      const def = LAYERS[i];

      // Base color
      let { r, g, b } = def.color;

      // Sky mode tint on top layer
      if (i === 0) {
        const sky = SKY_COLORS[Math.min(3, this.skyMode)];
        r = sky.r; g = sky.g; b = sky.b;
      }

      // Caustic ripple
      const phase  = t * def.causticFreq  * freqMul + def.phaseOffset;
      const phase2 = t * def.causticFreq2 * freqMul + def.phaseOffset * 1.3;
      const caustic = (Math.sin(phase) * def.causticAmp + Math.sin(phase2) * def.causticAmp2) * ampMul;

      // Shimmer (waterline only)
      const shimmer = def.shimmer
        ? (Math.sin(t * 1.8) * 0.04 + Math.sin(t * 2.9) * 0.02)
        : 0;

      // Deep glow pulse
      const glow = def.deepGlow ? Math.sin(t * 0.14) * 0.015 : 0;

      cc.color = new Color(
        Math.max(0, Math.min(1, r + caustic + shimmer)),
        Math.max(0, Math.min(1, g + caustic + shimmer + glow)),
        Math.max(0, Math.min(1, b + caustic + shimmer)),
        1,
      );
    });
  }
}

const SKY_COLORS = [
  { r: 0.70, g: 0.88, b: 0.98 }, // 0 Morning
  { r: 0.45, g: 0.78, b: 0.98 }, // 1 Afternoon
  { r: 0.98, g: 0.62, b: 0.38 }, // 2 Sunset
  { r: 0.08, g: 0.10, b: 0.28 }, // 3 Night
];
