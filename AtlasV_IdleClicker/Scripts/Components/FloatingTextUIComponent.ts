import {
  Component, OnEntityStartEvent,
  NetworkingService,
  CustomUiComponent,
  UiViewModel, uiViewModel,
  component, subscribe,
} from 'meta/worlds';
import { Events, GainSource } from '../Types';

const POOL_SIZE = 20;
const ANIMATION_DURATION = 0.7;
const BASE_OFFSET_X = 350;
const BASE_OFFSET_Y = 350;
const RANDOM_OFFSET_X = 80;
const FLOAT_DISTANCE = 150; // pixels to travel upward over the animation

/** EaseOutQuad: decelerating curve */
function easeOutQuad(t: number): number {
  return t * (2 - t);
}

const SUFFIXES: [number, string][] = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'k']];

function formatAmount(value: number): string {
  const n = Math.floor(value);
  for (const [threshold, suffix] of SUFFIXES) {
    if (n >= threshold) {
      const scaled = n / threshold;
      const formatted = scaled >= 100 ? Math.floor(scaled).toString()
                      : scaled >= 10  ? scaled.toFixed(1).replace(/\.0$/, '')
                      :                 scaled.toFixed(2).replace(/\.?0+$/, '');
      return `${formatted}${suffix}`;
    }
  }
  return n >= 10 ? n.toString() : value.toFixed(1).replace(/\.0$/, '');
}

/** Linear blend between two 6-digit hex colors (#RRGGBB), t in [0,1]. */
function _blendHex(a: string, b: string, t: number): string {
  const r = Math.round(parseInt(a.slice(1, 3), 16) * (1 - t) + parseInt(b.slice(1, 3), 16) * t);
  const g = Math.round(parseInt(a.slice(3, 5), 16) * (1 - t) + parseInt(b.slice(3, 5), 16) * t);
  const bl = Math.round(parseInt(a.slice(5, 7), 16) * (1 - t) + parseInt(b.slice(5, 7), 16) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`.toUpperCase();
}

@uiViewModel()
class FloatingTextUIViewModel extends UiViewModel {
  Text0: string = ''; Text1: string = ''; Text2: string = ''; Text3: string = '';
  Text4: string = ''; Text5: string = ''; Text6: string = ''; Text7: string = '';
  Text8: string = ''; Text9: string = ''; Text10: string = ''; Text11: string = '';
  Text12: string = ''; Text13: string = ''; Text14: string = ''; Text15: string = '';
  Text16: string = ''; Text17: string = ''; Text18: string = ''; Text19: string = '';

  OffsetX0: number = 0; OffsetX1: number = 0; OffsetX2: number = 0; OffsetX3: number = 0;
  OffsetX4: number = 0; OffsetX5: number = 0; OffsetX6: number = 0; OffsetX7: number = 0;
  OffsetX8: number = 0; OffsetX9: number = 0; OffsetX10: number = 0; OffsetX11: number = 0;
  OffsetX12: number = 0; OffsetX13: number = 0; OffsetX14: number = 0; OffsetX15: number = 0;
  OffsetX16: number = 0; OffsetX17: number = 0; OffsetX18: number = 0; OffsetX19: number = 0;

  OffsetY0: number = 0; OffsetY1: number = 0; OffsetY2: number = 0; OffsetY3: number = 0;
  OffsetY4: number = 0; OffsetY5: number = 0; OffsetY6: number = 0; OffsetY7: number = 0;
  OffsetY8: number = 0; OffsetY9: number = 0; OffsetY10: number = 0; OffsetY11: number = 0;
  OffsetY12: number = 0; OffsetY13: number = 0; OffsetY14: number = 0; OffsetY15: number = 0;
  OffsetY16: number = 0; OffsetY17: number = 0; OffsetY18: number = 0; OffsetY19: number = 0;

  // Per-slot opacity (driven by TypeScript for individual fade)
  Opacity0: number = 0; Opacity1: number = 0; Opacity2: number = 0; Opacity3: number = 0;
  Opacity4: number = 0; Opacity5: number = 0; Opacity6: number = 0; Opacity7: number = 0;
  Opacity8: number = 0; Opacity9: number = 0; Opacity10: number = 0; Opacity11: number = 0;
  Opacity12: number = 0; Opacity13: number = 0; Opacity14: number = 0; Opacity15: number = 0;
  Opacity16: number = 0; Opacity17: number = 0; Opacity18: number = 0; Opacity19: number = 0;

  // Visible triggers for XAML scale animation
  Visible0: boolean = false; Visible1: boolean = false; Visible2: boolean = false; Visible3: boolean = false;
  Visible4: boolean = false; Visible5: boolean = false; Visible6: boolean = false; Visible7: boolean = false;
  Visible8: boolean = false; Visible9: boolean = false; Visible10: boolean = false; Visible11: boolean = false;
  Visible12: boolean = false; Visible13: boolean = false; Visible14: boolean = false; Visible15: boolean = false;
  Visible16: boolean = false; Visible17: boolean = false; Visible18: boolean = false; Visible19: boolean = false;

  // Per-slot color (hex string, driven by TypeScript)
  Color0: string = '#FFFFD700'; Color1: string = '#FFFFD700'; Color2: string = '#FFFFD700'; Color3: string = '#FFFFD700';
  Color4: string = '#FFFFD700'; Color5: string = '#FFFFD700'; Color6: string = '#FFFFD700'; Color7: string = '#FFFFD700';
  Color8: string = '#FFFFD700'; Color9: string = '#FFFFD700'; Color10: string = '#FFFFD700'; Color11: string = '#FFFFD700';
  Color12: string = '#FFFFD700'; Color13: string = '#FFFFD700'; Color14: string = '#FFFFD700'; Color15: string = '#FFFFD700';
  Color16: string = '#FFFFD700'; Color17: string = '#FFFFD700'; Color18: string = '#FFFFD700'; Color19: string = '#FFFFD700';
}

/**
 * FloatingTextUIComponent — drives "+gold" floating text animation.
 * XAML Storyboard handles: scale pop (triggered by VisibleN).
 * TypeScript handles: Y position animation (easeOutQuad upward) + opacity fade per slot.
 *
 * Component Attachment: Scene Entity (FloatingText template with CustomUiComponent)
 * Component Networking: Local (client-only rendering)
 * Component Ownership: Not Networked
 */
@component()
export class FloatingTextUIComponent extends Component {

  private _viewModel = new FloatingTextUIViewModel();
  /** poolIndex → { startTime, startY } */
  private _activeSlots: Map<number, { startTime: number; startY: number }> = new Map();
  private _currentTime: number = 0;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    const ui = this.entity.getComponent(CustomUiComponent);
    if (ui) ui.dataContext = this._viewModel;
  }

  private _findAvailableSlot(): number {
    for (let i = 0; i < POOL_SIZE; i++) {
      if (!this._activeSlots.has(i)) return i;
    }
    let oldestSlot = 0;
    let oldestStart = Infinity;
    for (const [slot, data] of this._activeSlots) {
      if (data.startTime < oldestStart) { oldestStart = data.startTime; oldestSlot = slot; }
    }
    return oldestSlot;
  }

  private _setText(i: number, text: string): void {
    (this._viewModel as any)[`Text${i}`] = text;
  }

  private _setOffset(i: number, x: number, y: number): void {
    const vm = this._viewModel as any;
    vm[`OffsetX${i}`] = x;
    vm[`OffsetY${i}`] = y;
  }

  private _setOffsetY(i: number, y: number): void {
    (this._viewModel as any)[`OffsetY${i}`] = y;
  }

  private _setOpacity(i: number, opacity: number): void {
    (this._viewModel as any)[`Opacity${i}`] = opacity;
  }

  private _setVisible(i: number, visible: boolean): void {
    (this._viewModel as any)[`Visible${i}`] = visible;
  }

  private _setColor(i: number, color: string): void {
    (this._viewModel as any)[`Color${i}`] = color;
  }

  private _colorForGain(source: GainSource, isCrit: boolean, isFrenzy: boolean): string {
    const base = this._baseColor(source);
    if (isCrit && isFrenzy) return _blendHex(base, '#FF2200', 0.7); // crit + frenzy — intense red
    if (isCrit)             return '#FF6600';                        // crit only — orange (always priority)
    if (isFrenzy)           return _blendHex(base, '#FFFF00', 0.4); // frenzy only — warm yellow tint on base
    return base;
  }

  private _baseColor(source: GainSource): string {
    switch (source) {
      case GainSource.Passive:     return '#90EE90'; // generators — light green
      case GainSource.Interest:    return '#00BFFF'; // interest — cyan
      case GainSource.VaultPayout: return '#DA70D6'; // vault — orchid
      default:                     return '#FFD700'; // tap — gold
    }
  }

  private _showFloatingText(payload: Events.GainAppliedPayload): void {
    const amount = payload.amount;
    const slot = this._findAvailableSlot();
    const offsetX = BASE_OFFSET_X + (Math.random() - 0.5) * 2 * RANDOM_OFFSET_X;

    // Reset the slot first (set visible to false to allow re-triggering)
    this._setVisible(slot, false);

    this._setText(slot, `+${formatAmount(amount)}`);
    this._setOffset(slot, offsetX, BASE_OFFSET_Y);
    this._setColor(slot, this._colorForGain(payload.source, payload.isCrit, payload.isFrenzy));
    
    // Set initial opacity to 1 (fully visible)
    this._setOpacity(slot, 1);

    // Trigger the XAML storyboard (scale pop) by setting visible to true
    this._setVisible(slot, true);

    this._activeSlots.set(slot, { startTime: this._currentTime, startY: BASE_OFFSET_Y });
  }

  private _resetSlot(slot: number): void {
    this._setVisible(slot, false);
    this._setOpacity(slot, 0);
    this._setText(slot, '');
    this._activeSlots.delete(slot);
  }

  @subscribe(Events.GainApplied)
  onGainApplied(payload: Events.GainAppliedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (payload.amount > 0) this._showFloatingText(payload);
  }

  @subscribe(Events.Tick)
  onTick(payload: Events.TickPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._currentTime += payload.dt;

    for (const [slot, data] of this._activeSlots) {
      const elapsed = this._currentTime - data.startTime;
      if (elapsed >= ANIMATION_DURATION) {
        this._resetSlot(slot);
      } else {
        // Animate Y position upward with easeOutQuad
        const t = elapsed / ANIMATION_DURATION;
        const easedT = easeOutQuad(t);
        const newY = data.startY - FLOAT_DISTANCE * easedT;
        this._setOffsetY(slot, newY);

        // Animate opacity: stay visible for first half, then fade out
        const fadeStartT = 0.5; // Start fading at 50% of animation
        if (t < fadeStartT) {
          this._setOpacity(slot, 1);
        } else {
          // Fade from 1 to 0 over the remaining time
          const fadeT = (t - fadeStartT) / (1 - fadeStartT);
          this._setOpacity(slot, 1 - fadeT);
        }
      }
    }
  }
}
