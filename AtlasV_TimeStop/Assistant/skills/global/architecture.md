---
name: architecture
summary: Project structure, execution model, event communication, singleton pattern
include: always
---

# Project Architecture

## Execution Model

**ALL gameplay is client-only.** Server context is never used for logic.

Every `Component.onStart()` must guard at the top:

```typescript
@subscribe(OnEntityStartEvent)
onStart(): void {
  if (NetworkingService.get().isServerContext()) return;
  // client-only code below
}
```

All spawned entities use `NetworkMode.LocalOnly` — no exceptions:

```typescript
await WorldService.get().spawnTemplate({
  templateAsset: asset,
  position: new Vec3(x, y, z),
  rotation: Quaternion.identity,
  scale: Vec3.one,
  networkMode: NetworkMode.LocalOnly,
});
```

---

## Folder Structure

```
scripts/
  Types.ts                       ← ALL enums, interfaces, events, payloads — zero local imports
  Constants.ts                   ← ALL numeric constants — zero local imports
  Assets.ts                      ← ALL TemplateAsset references (one entry per .hstf)
  ClientSetup.ts                 ← Fixed camera + FocusedInteraction → Events.PlayerTap
  GameManager.ts                 ← Phase orchestration, score, restart, tap-to-restart delay
  InputManager.ts                ← Tap → score → freeze → Clearing / RoundComplete
  SpawnManager.ts                ← Ghost spawn + InitFallingObj dispatch + AllObjsSpawned
  LevelConfig.ts                 ← ROUND_DEFS: per-round wave definitions and physics tuning
  LogRegistry.ts                 ← FallingObjRegistry singleton — tracks active falling objects
  CollisionManager.ts            ← Generic AABB singleton (available, not used by main physics)
  GameHUD/
    GameHUDViewModel.ts          ← Score + center text (XAML ViewModel)
    LeaderboardHUDViewModel.ts   ← Leaderboard overlay (XAML ViewModel, NetworkEvents)
  GameplayObjects/
    Log.ts                       ← FallingObj — Log type physics and lifecycle
    BallObj.ts                   ← FallingObj — Ball type physics and lifecycle
    FreezeLineVisual.ts          ← Visual feedback: colored line at freeze Y
    FloatingScoreText.ts         ← Visual feedback: animated grade + score text
  Shared/
    FallingObjUtils.ts           ← getPrecision() pure utility (no SDK imports)

Templates/
  GameplayObjects/               ← .hstf entity templates — one per FallingObjType

assets/
  UI/
    GameHUD.xaml                 ← Main HUD (score + center text)
    LeaderboardHUD.xaml          ← Leaderboard overlay
```

Rules:
- One class per file. File name = class name.
- `Types.ts` and `Constants.ts` must not import from any sibling file.
- Cross-feature utilities go in `Shared/`.

---

## Template Asset Registration

Every `.hstf` template **must** be registered in `Assets.ts` with its path. No component may reference a template path directly.

```typescript
// Assets.ts
import { TemplateAsset } from 'meta/worlds';
import { FallingObjType } from './Types';

export const FallingObjTemplates: Record<FallingObjType, TemplateAsset> = {
  [FallingObjType.Log]:  new TemplateAsset('../Templates/GameplayObjects/Log.hstf'),
  [FallingObjType.Ball]: new TemplateAsset('../Templates/GameplayObjects/Ball.hstf'),
} as const;

export const Assets = {
  FloatingText: new TemplateAsset('../Templates/GameplayObjects/FloatingText.hstf'),
  FreezeLine:   new TemplateAsset('../Templates/GameplayObjects/HorizontalLine.hstf'),
} as const;
```

---

## Communication Pattern

Components **never hold references to each other**. All inter-component communication uses `LocalEvent` (or `NetworkEvent` for score sync with leaderboard).

```typescript
// Dispatch
EventService.sendLocally(Events.SomethingHappened, { value: 42 });

// Subscribe
@subscribe(Events.SomethingHappened)
private onSomethingHappened(p: Events.SomethingHappenedPayload): void { … }
```

---

## Singleton Managers

Pure-logic managers (not Components) use the lazy singleton pattern:

```typescript
export class MyManager {
  private static _instance: MyManager;
  private constructor() {}

  static get(): MyManager {
    if (!MyManager._instance) MyManager._instance = new MyManager();
    return MyManager._instance;
  }

  dispose(): void {
    MyManager._instance = undefined!;
  }
}
```

Call `Manager.dispose()` on all singletons during restart (`Events.Restart`).

---

## Game Phase Flow

```
Start → (tap) → Intro (Round X, 3, 2, 1, GO!) → Falling → Clearing → RoundEnd
                                                       ↑________________________↓
                                                 (all frozen → next round or End)
                                                 (object hits floor → GameOver)
```

`GameManager` owns all phase transitions. Only `InputManager` may also send `PhaseChanged` (Falling ↔ Clearing).

After entering `GameOver` or `End`, taps are ignored for `TAP_LOCK_MS` (1500 ms) to prevent accidental restart.

---

## Constants

| Scope | Location |
|---|---|
| Shared across multiple files | `Constants.ts` |
| Single-component tuning | `@property()` on that component (inspector-editable) |

Never hardcode a value that appears in more than one place.
