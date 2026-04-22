---
name: falling-objects
summary: Adding a new falling object type — the primary extension point of TIME STOP
include: as_needed
---

# Adding a New Falling Object Type

Every falling object variant is identified by a value in `FallingObjType` (enum in `Types.ts`). Adding an **entity-based** type requires exactly **4 file changes** — `SpawnManager` and `FallingObjService` never need to be touched.

---

## Two Patterns

### A — Entity-based (e.g. BallObj)

The object is a real scene entity with a `@component()`. `SpawnManager` spawns the entity and sends `Events.InitFallingObj` targeted to it. The component self-registers in `FallingObjService`.

**Use when:** the object needs its own mesh, `TransformComponent`, `ColorComponent`, or non-trivial visual behaviour not handled by the 2D renderer.

### B — Simulated (e.g. LogSim inside FallingObjService)

No entity. A plain TypeScript class runs physics inside `FallingObjService`. Every frame, it emits a `FallingObjRenderState` that `FallingObjCanvas` draws.

**Use when:** the object can be fully described by a flat rectangle rendered by the existing 2D bamboo renderer.

---

## How the init flow works (entity-based)

```
SpawnManager (onPrepareRound)
  spawns entity at computed cx position
  sends Events.InitFallingObj → { objId, cx, roundIndex, config: WaveObjDef }
    ↓ (targeted to the spawned entity)
YourObj component (onInitFallingObj)
  reads cx from this._transform.worldPosition.x
  reads p.config.bounce / p.config.pivot from WaveObjDef
  randomizes own physics
  calls FallingObjService.get().registerBall(this)
```

`SpawnManager` is generic — it passes the whole `WaveObjDef` through as `config` without knowing per-type physics.

---

## Step-by-step: entity-based type

### 1. `Types.ts` — Add the enum value

```typescript
export enum FallingObjType {
  Log  = 0,
  Ball = 1,
  Star = 2,   // ← new
}
```

If the new type needs config flags beyond `bounce` and `pivot`, add them to `WaveObjDef` here.

### 2. `Assets.ts` — Register the template

```typescript
export const FallingObjTemplates: Record<FallingObjType, TemplateAsset> = {
  [FallingObjType.Log]:  new TemplateAsset('@Templates/GameplayObjects/Log.hstf'),
  [FallingObjType.Ball]: new TemplateAsset('@Templates/GameplayObjects/Ball.hstf'),
  [FallingObjType.Star]: new TemplateAsset('@Templates/GameplayObjects/Star.hstf'), // ← new
};
```

The `.hstf` template must exist. Mesh should fit in a **1 × 1 × 1 unit cube centered at origin** — code scales it at runtime.

### 3. `LevelConfig.ts` — Use the type in a round

```typescript
{ type: FallingObjType.Star, count: 2, bounce: true, pivot: false }
```

### 4. `components/GameplayObjects/StarObj.ts` — Implement IFallingObj

```typescript
import { FallingObjService } from '../../services/FallingObjService';

@component()
export class StarObj extends Component implements IFallingObj {
  get objId():   number         { return this._objId; }
  get objType(): FallingObjType { return FallingObjType.Star; }
  waiting():     boolean        { return !this._launched; }

  private _objId:    number  = -1;
  private _initialized: boolean = false;
  private _frozen:      boolean = false;
  private _launched:    boolean = false;
  private _paused:      boolean = false;
  private _fading:      boolean = false;
  private _fadeElapsed: number  = 0;
  // ... type-specific physics fields

  private _transform!: TransformComponent;
  private _colorComp!: ColorComponent;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._transform = this.entity.getComponent(TransformComponent)!;
    this._colorComp = this.entity.getComponent(ColorComponent)!;
  }

  @subscribe(Events.InitFallingObj)
  onInitFallingObj(p: Events.InitFallingObjPayload): void {
    if (this._initialized) return;
    this._initialized = true;
    this._launched    = false;

    this._objId = p.objId;
    // cx is already set by SpawnManager via the spawn position:
    this._cx = this._transform.worldPosition.x;
    this._cy = START_Y;

    // Difficulty scaling
    const vxScale = 0.6 + (p.roundIndex / (TOTAL_ROUNDS - 1)) * 0.4;
    // Read structural config
    const bounce = p.config['bounce'] as boolean;
    const pivot  = p.config['pivot']  as boolean;
    // Randomize physics here...

    this._applyTransform();
    FallingObjService.get().registerBall(this);  // ← required
  }

  @subscribe(Events.FallingObjActivate)
  onActivate(p: Events.FallingObjActivatePayload): void {
    if (!this._initialized || p.objId !== this._objId) return;
    this._launched = true;
  }

  @subscribe(Events.FallingObjFreeze)
  onFreeze(p: Events.FallingObjFreezePayload): void {
    if (p.objId !== this._objId || this._frozen) return;
    this._frozen = true;
    FallingObjService.get().unregister(this._objId);

    const { pts, grade } = calcScore(getPrecision(this.getLowestY()));
    EventService.sendLocally(Events.FallingObjFrozen, {
      objId: this._objId, pts, grade, lowestY: this.getLowestY(),
    });

    const c = this._colorComp.color;
    this._baseR = c.r; this._baseG = c.g; this._baseB = c.b;
    setTimeout(() => { this._fading = true; this._fadeElapsed = 0; }, FREEZE_HOLD_MS);
  }

  @subscribe(Events.PhaseChanged)
  onPhaseChanged(p: Events.PhaseChangedPayload): void {
    this._paused = (p.phase !== GamePhase.Falling);
  }

  @subscribe(Events.Restart)
  onRestart(_p: Events.RestartPayload): void {
    this.entity.destroy();
  }

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    if (!this._initialized) return;
    const dt = payload.deltaTime;

    if (this._fading) {
      this._fadeElapsed += dt * 1000;
      const alpha = 1 - Math.min(this._fadeElapsed / FREEZE_FADE_MS, 1);
      this._colorComp.color = new Color(this._baseR, this._baseG, this._baseB, alpha);
      if (alpha <= 0) this.entity.destroy();
      return;
    }

    if (this._frozen || this._paused || !this._launched) return;
    this._tick(dt);

    if (this.getLowestY() <= FLOOR_Y) {
      EventService.sendLocally(Events.FallingObjHitFloor, {});
      this._frozen = true;
      return;
    }
    this._applyTransform();
  }

  getLowestY(): number { /* shape-specific — see table below */ }
  getWorldX():  number { return this._cx; }
}
```

---

## getLowestY() by Shape

| Shape | Formula |
|---|---|
| Rectangle (Log) | Rotate 4 corners by current angle + pivot offset; return `Math.min(...corners.map(c => c.y))` |
| Circle / Sphere | `centerY - radius` |
| Triangle | Rotate 3 corners; return min Y |
| Generic irregular | Bounding circle (conservative) |

---

## Lifecycle events summary

| Event | What to do |
|---|---|
| `Events.InitFallingObj` | Randomize physics; register via `FallingObjService.get().registerBall(this)` |
| `Events.FallingObjActivate` | If `p.objId === this._objId`, set `_launched = true` |
| `Events.FallingObjFreeze` | If matching id: stop physics, compute score, send `FallingObjFrozen`, start fade |
| `Events.PhaseChanged` | `_paused = (p.phase !== GamePhase.Falling)` |
| `Events.Restart` | `this.entity.destroy()` |
| `OnWorldUpdateEvent` | Tick physics; check `FLOOR_Y`; apply transform |

---

## Asset Checklist

- [ ] Mesh fits in a **1 × 1 × 1 unit cube**, centered at origin
- [ ] Silhouette is **recognizable at any rotation angle**
- [ ] **Bottom edge is visually distinct**
- [ ] `FallingObjType` has the new value in `Types.ts`
- [ ] Template registered in `Assets.ts → FallingObjTemplates`
- [ ] Type used in `LevelConfig.ts → ROUND_DEFS`
- [ ] New component file in `components/GameplayObjects/` implements `IFallingObj`
- [ ] `FallingObjService.get().registerBall(this)` called in `onInitFallingObj`
- [ ] `FallingObjService.get().unregister(this._objId)` called in `onFreeze`
- [ ] `SpawnManager`: **no changes needed**
- [ ] `FallingObjService`: **no changes needed**
