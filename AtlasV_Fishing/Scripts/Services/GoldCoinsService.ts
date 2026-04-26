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
import { Events, type FishRarity } from '../Types';
import {
  CANVAS_CENTER_WORLD_Y,
  CANVAS_ENTITY_SCALE,
  GOLD_REWARD_COMMON,
  GOLD_REWARD_RARE,
  GOLD_REWARD_LEGENDARY,
  worldToCanvas,
} from '../Constants';
import { GoldCoinsAnimatorViewModel } from '../Components/UI/GoldCoinsAnimatorViewModel';

// ── Pool sizes ─────────────────────────────────────────────────────────────────
const COIN_POOL_SIZE = 60;
const TEXT_POOL_SIZE = 10;

// ── Coin physics ───────────────────────────────────────────────────────────────
const COIN_GRAVITY = -5.0; // wu/s²

// ── Text animation ─────────────────────────────────────────────────────────────
const TEXT_FLOAT_SPEED = 1.4;  // wu/s upward
const TEXT_DURATION    = 1.3;  // s — all rarities (scale differentiates them visually)
// Approximate half-width of the "+N" text in canvas px at scale=1 — used to center it.
// FontSize=30 in a 600px canvas: "+40" ≈ 72px wide → half ≈ 36px.
const TEXT_HALF_W = 36;
// Vertical shift so the text sits above the coin center rather than on top of it
const TEXT_Y_OFFSET = -30; // canvas px upward from coin anchor

// ── Per-rarity config ──────────────────────────────────────────────────────────
type RarityParams = {
  coinCount  : number;
  speedMin   : number;
  speedMax   : number;
  coinDurMin : number;  // each coin gets a random duration in [durMin, durMax]
  coinDurMax : number;
  textScale  : number;
  textColor  : string;
  gold       : number;
};

const RARITY_PARAMS: Record<FishRarity, RarityParams> = {
  common: {
    coinCount: 5,  speedMin: 2.5, speedMax: 4.5,
    coinDurMin: 0.85, coinDurMax: 1.05,
    textScale: 1.0, textColor: '#FFD700',
    gold: GOLD_REWARD_COMMON,
  },
  rare: {
    coinCount: 8,  speedMin: 3.5, speedMax: 6.0,
    coinDurMin: 1.00, coinDurMax: 1.20,
    textScale: 1.25, textColor: '#FFA500',
    gold: GOLD_REWARD_RARE,
  },
  legendary: {
    coinCount: 12, speedMin: 5.0, speedMax: 8.5,
    coinDurMin: 1.10, coinDurMax: 1.35,
    textScale: 1.6, textColor: '#FFFFFF',
    gold: GOLD_REWARD_LEGENDARY,
  },
};

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

    const def    = FISH_DEFS.find(d => d.id === p.defId);
    const params = RARITY_PARAMS[def?.rarity ?? 'common'];

    this._burstCoins(p.x, p.y, params);
    this._showText(p.x, p.y, params);
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

  private _burstCoins(wx: number, wy: number, params: RarityParams): void {
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
        rotSpeed: (Math.random() < 0.5 ? 1 : -1) * (280 + Math.random() * 320),
        age: 0,
        duration: coinDurMin + Math.random() * (coinDurMax - coinDurMin),
      };
      spawned++;
    }

    if (spawned < coinCount) console.warn(`[GoldCoins] pool exhausted (${spawned}/${coinCount})`);
  }

  private _showText(wx: number, wy: number, params: RarityParams): void {
    for (let i = 0; i < TEXT_POOL_SIZE; i++) {
      if (this._texts[i] !== null) continue;
      this._texts[i] = {
        wx, wy,
        age: 0,
        text: `+${params.gold}`,
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
