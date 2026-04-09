---
name: sound-design
summary: Where and how to add audio triggers in H4_Idle
include: on-demand
---

# Sound Design — H4_Idle

## Audio Hook Points

Create a dedicated `AudioController` component — never add audio calls inside service/logic files.

| Event | Suggested sound |
|-------|----------------|
| `Events.PlayerTap` | Click sfx (short, satisfying) |
| `Events.GeneratorChanged` | Purchase confirmation chime |
| `Events.UpgradePurchased` | Upgrade fanfare (slightly more impactful) |
| `Events.TierUnlocked` | Tier unlock jingle |
| `Events.OfflineIncome` | Income received whoosh |
| `Events.Tick` | Optional subtle tick (ambient only) |

## Pattern

```typescript
@component()
export class AudioController extends Component {
  @subscribe(Events.PlayerTap)
  private _onTap(_p: Events.PlayerTapPayload): void {
    // AudioService.get().play(Assets.SfxClick, this.entity);
  }

  @subscribe(Events.UpgradePurchased)
  private _onUpgrade(_p: Events.UpgradePurchasedPayload): void {
    // AudioService.get().play(Assets.SfxUpgrade, this.entity);
  }
}
```

## Ambient

A looping background music track and ambient idle hum can be started in `ClientSetup` after camera init. Vary music intensity or layer based on total income/sec thresholds (subscribe to `Events.ResourceChanged`, compare `incomePerSec` brackets).
