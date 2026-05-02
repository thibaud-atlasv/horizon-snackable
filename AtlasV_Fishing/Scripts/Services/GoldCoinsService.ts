import {
  ExecuteOn,
  NetworkMode,
  NetworkingService,
  OnWorldUpdateEvent,
  type OnWorldUpdateEventPayload,
  Quaternion,
  Service,
  Vec3,
  WorldService,
  service,
  subscribe,
  type Maybe,
} from 'meta/worlds';

import { Assets } from '../Assets';
import { FISH_DEFS } from '../FishDefs';
import { Events } from '../Types';
import {
  CANVAS_CENTER_WORLD_Y,
  CANVAS_ENTITY_SCALE,
  COIN_POOL_SIZE,
  TEXT_POOL_SIZE,
  COIN_ROT_SPEED_MIN,
  COIN_ROT_SPEED_MAX,
  worldToCanvas,
} from '../Constants';
import { GoldCoinsAnimatorViewModel } from '../Components/UI/GoldCoinsAnimatorViewModel';

// ── Coin physics ───────────────────────────────────────────────────────────────
const COIN_GRAVITY = -5.0; // wu/s²

// ── Text animation ─────────────────────────────────────────────────────────────
const TEXT_FLOAT_SPEED = 1.4;  // wu/s upward
const TEXT_DURATION    = 1.3;  // s
// Approximate half-width of the "+N" text in canvas px at scale=1 — used to center it.
// FontSize=30 in a 600px canvas: "+40" ≈ 72px wide → half ≈ 36px.
const TEXT_HALF_W  = 36;
const TEXT_Y_OFFSET = -30; // canvas px upward from coin anchor

// ── Per-value burst config — derived from gold value, not rarity ───────────────
// Text colors form a warm heat scale: yellow → orange → deep orange → fiery red.
// Coin count and speed scale proportionally so expensive fish feel more spectacular.
type BurstParams = {
  coinCount  : number;
  speedMin   : number;
  speedMax   : number;
  coinDurMin : number;
  coinDurMax : number;
  textScale  : number;
  textColor  : string;
};

function _paramsForGold(gold: number): BurstParams {
  if (gold >= 50) return { coinCount: 14, speedMin: 5.5, speedMax: 9.0, coinDurMin: 1.15, coinDurMax: 1.40, textScale: 1.8, textColor: '#FF3D00' };
  if (gold >= 25) return { coinCount: 10, speedMin: 4.0, speedMax: 7.0, coinDurMin: 1.05, coinDurMax: 1.25, textScale: 1.4, textColor: '#FF6D00' };
  if (gold >= 15) return { coinCount:  7, speedMin: 3.0, speedMax: 5.5, coinDurMin: 0.95, coinDurMax: 1.15, textScale: 1.2, textColor: '#FFA500' };
  return               { coinCount:  5, speedMin: 2.5, speedMax: 4.5, coinDurMin: 0.85, coinDurMax: 1.05, textScale: 1.0, textColor: '#FFD700' };
}

// ── Animation data ─────────────────────────────────────────────────────────────
interface CoinAnim {
  wx: number; wy: number;
  vx: number; vy: number;
  rotation: number;
  rotSpeed: number;  // deg/s
  age: number;
  duration: number;
}

interface TextAnim {
  wx: number; wy: number;  // current world position (wy updated each frame)
  age: number;
  text: string;
  textScale: number;
  color: string;
}

// =============================================================================
//  GoldCoinsService
//
//  Handles the coin burst + gold value text for every FishCollected event.
//  All animation runs entirely in code on a single GoldCoinsAnimator canvas entity.
//
//  Coin burst: 270° fan (no straight-down), physics arc, spin, scale pop.
//  Text: floats upward, same pop scale amplified by rarity, fades out.
// =============================================================================

@service()
export class GoldCoinsService extends Service {

  private _vm         : Maybe<GoldCoinsAnimatorViewModel> = null;
  private _coins      : Array<CoinAnim | null> = new Array(COIN_POOL_SIZE).fill(null);
  private _texts      : Array<TextAnim | null> = new Array(TEXT_POOL_SIZE).fill(null);

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  @subscribe(Events.GameStarted)
  async onGameStarted(): Promise<void> {
    if (NetworkingService.get().isServerContext()) return;

    const entity = await WorldService.get().spawnTemplate({
      templateAsset: Assets.GoldCoinsAnimator,
      position:      new Vec3(0, CANVAS_CENTER_WORLD_Y, -0.1),
      rotation:      Quaternion.identity,
      scale:         new Vec3(CANVAS_ENTITY_SCALE, CANVAS_ENTITY_SCALE, CANVAS_ENTITY_SCALE),
      networkMode:   NetworkMode.LocalOnly,
    }).catch(() => null);

    if (!entity) { console.error('[GoldCoins] spawnTemplate failed'); return; }

    this._vm = entity.getComponent(GoldCoinsAnimatorViewModel);
    if (!this._vm) { console.error('[GoldCoins] ViewModel not found'); return; }

    this._vm.setCoinCount(COIN_POOL_SIZE);
    this._vm.setTextCount(TEXT_POOL_SIZE);

    for (let i = 0; i < COIN_POOL_SIZE; i++) this._vm.setCoin(i, 0, 0, 0, 0, 0, 0);
    for (let i = 0; i < TEXT_POOL_SIZE; i++) this._vm.setText(i, '', 0, 0, 0, 0, 0, '#FFD700');
  }

  // ── Events ────────────────────────────────────────────────────────────────────

  @subscribe(Events.FishCollected)
  onFishCollected(p: Events.FishCollectedPayload): void {
    if (!this._vm) return;
    if (NetworkingService.get().isServerContext()) return;

    const def = FISH_DEFS.find(d => d.id === p.defId);
    if (!def) return;
    const params = _paramsForGold(def.gold);

    this._burstCoins(p.x, p.y, params);
    this._showText(p.x, p.y, def.gold, params);
  }

  // ── Per-frame update ──────────────────────────────────────────────────────────

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(p: OnWorldUpdateEventPayload): void {
    if (!this._vm) return;
    const dt = p.deltaTime;

    for (let i = 0; i < COIN_POOL_SIZE; i++) {
      const c = this._coins[i];
      if (!c) continue;

      c.wx       += c.vx * dt;
      c.wy       += c.vy * dt;
      c.vy       += COIN_GRAVITY * dt;
      c.rotation += c.rotSpeed * dt;
      c.age      += dt;

      if (c.age >= c.duration) {
        this._coins[i] = null;
        this._vm.setCoin(i, 0, 0, 0, 0, 0, 0);
        continue;
      }

      const t       = c.age / c.duration;
      const { x, y } = worldToCanvas(c.wx, c.wy);
      this._vm.setCoin(i, x, y, _scale(t), _scale(t), c.rotation, _opacity(t));
    }

    for (let i = 0; i < TEXT_POOL_SIZE; i++) {
      const tx = this._texts[i];
      if (!tx) continue;

      tx.wy  += TEXT_FLOAT_SPEED * dt;
      tx.age += dt;

      if (tx.age >= TEXT_DURATION) {
        this._texts[i] = null;
        this._vm.setText(i, '', 0, 0, 0, 0, 0, '#FFD700');
        continue;
      }

      const t       = tx.age / TEXT_DURATION;
      const s       = _scale(t) * tx.textScale;
      const { x, y } = worldToCanvas(tx.wx, tx.wy);
      this._vm.setText(i, tx.text, x - TEXT_HALF_W, y + TEXT_Y_OFFSET, s, s, _opacity(t), tx.color);
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  private _burstCoins(wx: number, wy: number, params: BurstParams): void {
    const { coinCount, speedMin, speedMax, coinDurMin, coinDurMax } = params;
    let spawned = 0;

    for (let i = 0; i < COIN_POOL_SIZE && spawned < coinCount; i++) {
      if (this._coins[i] !== null) continue;

      // Distribute evenly in a 270° fan (−135° to +135° from vertical-up), with jitter
      const t     = coinCount > 1 ? spawned / (coinCount - 1) : 0.5;
      const angle = (t * 2 - 1) * (3 * Math.PI / 4) + (Math.random() - 0.5) * 0.35;
      const speed = speedMin + Math.random() * (speedMax - speedMin);

      this._coins[i] = {
        wx: wx, wy: wy,
        vx: Math.sin(angle) * speed,
        vy: Math.cos(angle) * speed,  // cos(0)=1 → straight up at angle=0
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() < 0.5 ? 1 : -1) * (COIN_ROT_SPEED_MIN + Math.random() * (COIN_ROT_SPEED_MAX - COIN_ROT_SPEED_MIN)),
        age: 0,
        duration: coinDurMin + Math.random() * (coinDurMax - coinDurMin),
      };
      spawned++;
    }

    if (spawned < coinCount) console.warn(`[GoldCoins] pool exhausted (${spawned}/${coinCount})`);
  }

  private _showText(wx: number, wy: number, gold: number, params: BurstParams): void {
    for (let i = 0; i < TEXT_POOL_SIZE; i++) {
      if (this._texts[i] !== null) continue;
      this._texts[i] = {
        wx, wy,
        age: 0,
        text: `+${gold}`,
        textScale: params.textScale,
        color: params.textColor,
      };
      return;
    }
    console.warn('[GoldCoins] text pool exhausted');
  }
}

// ── Animation curves ───────────────────────────────────────────────────────────

/** Quick pop to 1.4× then settle at 1.0. */
function _scale(t: number): number {
  if (t < 0.05) return (t / 0.05) * 1.4;
  if (t < 0.16) return 1.4 - ((t - 0.05) / 0.11) * 0.4;
  return 1.0;
}

/** Full opacity until 60%, then linear fade to 0. */
function _opacity(t: number): number {
  return t < 0.6 ? 1 : Math.max(0, 1 - (t - 0.6) / 0.4);
}
