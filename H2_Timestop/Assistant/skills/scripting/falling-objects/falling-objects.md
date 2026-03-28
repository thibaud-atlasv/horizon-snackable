---
name: falling-objects
summary: Adding a new falling object type — the primary extension point of TIME STOP
include: as_needed
---

# Adding a New Falling Object Type

Every falling object variant is identified by a value in `FallingObjType` (enum in `Types.ts`). Adding one requires exactly **4 file changes** — SpawnManager never needs to be touched.

---

## How the init flow works

```
SpawnManager
  spawns entity at computed cx position
  sends Events.InitFallingObj → { objId, roundIndex, config: WaveObjDef }
    ↓ (targeted to the spawned entity)
FallingObj component
  reads cx from this._transform.worldPosition.x  (already set by spawn)
  reads p.config.bounce, p.config.pivot from WaveObjDef
  randomizes its own physics entirely
  registers in FallingObjRegistry
```

`SpawnManager` is generic — it passes the `WaveObjDef` through as `config` without knowing anything about per-type physics. Each object is fully responsible for its own randomization.

---

## InitFallingObjPayload

```typescript
export class InitFallingObjPayload {
  readonly objId:      number                 = 0;
  readonly roundIndex: number                 = 0;   // for speed / vxScale derivation
  readonly config:     {[key: string]: any}   = {};  // the WaveObjDef passed through
}
```

The object reads `p.config.bounce`, `p.config.pivot`, and any other `WaveObjDef` fields it needs.
The horizontal position (`cx`) is read from `this._transform.worldPosition.x` — already set by SpawnManager at spawn time.

---

## WaveObjDef (Types.ts)

```typescript
export type WaveObjDef = {
  type:   FallingObjType;
  count:  number;
  bounce: boolean;   // hard wall bounce vs soft deflection
  pivot:  boolean;   // off-center rotation pivot
  // Add fields here if a new type needs additional structural config
};
```

Any field added to `WaveObjDef` is automatically available in `p.config` inside the object component.

---

## 1. Types.ts — Add the enum value

```typescript
export enum FallingObjType {
  Log  = 0,
  Ball = 1,
  Star = 2,   // ← new
}
```

If your new type needs config flags beyond `bounce` and `pivot`, add them to `WaveObjDef` here.

---

## 2. Assets.ts — Register the template

```typescript
export const FallingObjTemplates: Record<FallingObjType, TemplateAsset> = {
  [FallingObjType.Log]:  new TemplateAsset('../Templates/GameplayObjects/Log.hstf'),
  [FallingObjType.Ball]: new TemplateAsset('../Templates/GameplayObjects/Ball.hstf'),
  [FallingObjType.Star]: new TemplateAsset('../Templates/GameplayObjects/Star.hstf'), // ← new
} as const;
```

The `.hstf` template must exist in `Templates/GameplayObjects/`. The mesh must fit in a **1 × 1 × 1 unit cube centered at origin** — the code scales it at runtime.

---

## 3. LevelConfig.ts — Use the type in a round

```typescript
{ type: FallingObjType.Star, count: 2, bounce: true, pivot: false }
```

Add this as a `WaveObjDef` entry in the relevant round(s) in `ROUND_DEFS`.

---

## 4. GameplayObjects/[TypeName].ts — Implement IFallingObj

Create `scripts/GameplayObjects/StarObj.ts`. Use `LogObj.ts` or `BallObj.ts` as a reference.

### Minimal skeleton

```typescript
@component()
export class StarObj extends Component implements IFallingObj {
  get objId():   number         { return this._objId; }
  get objType(): FallingObjType { return FallingObjType.Star; }
  waiting():     boolean        { return !this._launched; }

  private _objId:    number  = -1;
  private _cx:       number  = 0;
  private _cy:       number  = 0;
  // ... type-specific physics fields

  private _initialized: boolean = false;
  private _frozen:      boolean = false;
  private _launched:    boolean = false;
  private _paused:      boolean = false;
  private _fading:      boolean = false;
  private _fadeElapsed: number  = 0;

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
    this._cx    = this._transform.worldPosition.x;  // cx set by SpawnManager at spawn
    this._cy    = START_Y;

    // Difficulty scaling
    const vxScale = 0.6 + (p.roundIndex / (TOTAL_ROUNDS - 1)) * 0.4;

    // Structural config from WaveObjDef
    const bounce = p.config.bounce as boolean;
    const pivot  = p.config.pivot  as boolean;

    // Randomize own physics here
    // ...

    this._applyTransform();
    FallingObjRegistry.get().register(this);
  }
}
```

### Lifecycle events to handle

| Event | What to do |
|---|---|
| `Events.InitFallingObj` | Randomize physics from `p.config` + `p.roundIndex`; register in `FallingObjRegistry` |
| `Events.FallingObjActivate` | If `p.objId === this._objId`, set `_launched = true` |
| `Events.FallingObjFreeze` | If `p.objId === this._objId`, stop movement, compute score, send `FallingObjFrozen`, start fade |
| `Events.PhaseChanged` | `_paused = (p.phase !== GamePhase.Falling)` |
| `Events.Restart` | `this.entity.destroy()` |
| `OnWorldUpdateEvent` | Tick physics; check `FLOOR_Y`; apply transform |

### Freeze and score

Objects compute their own score on freeze:

```typescript
@subscribe(Events.FallingObjFreeze)
onFreeze(p: Events.FallingObjFreezePayload): void {
  if (p.objId !== this._objId || this._frozen) return;
  this._frozen = true;
  FallingObjRegistry.get().unregister(this._objId);

  const { pts, grade } = calcScore(getPrecision(this.getLowestY()));
  EventService.sendLocally(Events.FallingObjFrozen, {
    objId: this._objId, pts, grade, lowestY: this.getLowestY(),
  });

  const c = this._colorComp.color;
  this._baseR = c.r; this._baseG = c.g; this._baseB = c.b;
  setTimeout(() => { this._fading = true; this._fadeElapsed = 0; }, FREEZE_HOLD_MS);
}
```

---

## getLowestY() by Shape

| Shape | Formula |
|---|---|
| Rectangle (Log) | Rotate 4 corners by current angle + pivot offset; return `Math.min(...corners.map(c => c.y))` |
| Circle / Sphere | `centerY - radius` — no rotation needed |
| Triangle | Rotate 3 corners; return min Y |
| Generic irregular | Use bounding circle (conservative) or bounding rectangle |

---

## Asset Checklist

Before integrating a new template:

- [ ] Mesh fits in a **1 × 1 × 1 unit cube**, centered at origin
- [ ] Silhouette is **recognizable at any rotation angle** (0–360°)
- [ ] **Bottom edge is visually distinct** (the player reads it to time the tap)
- [ ] Good contrast against the background (outline or rim light)
- [ ] No perfect top/bottom symmetry (or intentional)
- [ ] `FallingObjType` has the new value in `Types.ts`
- [ ] Template registered in `Assets.ts → FallingObjTemplates`
- [ ] Type used in `LevelConfig.ts → ROUND_DEFS`
- [ ] New component file implements `IFallingObj` and handles all lifecycle events
- [ ] `FallingObjRegistry` registration / unregistration is correct
- [ ] SpawnManager: **no changes needed**
