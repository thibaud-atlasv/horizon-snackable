---
name: sound-design
summary: Where and how to add audio triggers in H3_Fishing
include: on-demand
---

# Sound Design — H3_Fishing

## Audio hook points

All game audio should be event-driven. Create a dedicated `AudioController` component that subscribes to game events — never add audio calls inside existing gameplay files.

| Event | Suggested sound |
|-------|----------------|
| `Events.CastReleased` | Fishing line whip / swoosh |
| `Events.BaitHitBottom` | Thud / splash on floor |
| `Events.FishHooked` | Hook sfx + tension sting |
| `Events.FishCaught` | Victory jingle (short) |
| `Events.ZoneUnlocked` | Zone reveal fanfare |
| `Events.PhaseChanged → Reeling` | Reel tension loop start |
| `Events.PhaseChanged → CatchDisplay` | Reel tension loop stop |
| `HUDEvents.ShowCatch` | Catch reveal whoosh |
| `HUDEvents.NavigateCatch` | Page turn click |
| tap during Reeling (`OnFocusedInteractionInputStartedEvent` in `Reeling` phase) | Reel click |

## Pattern

```typescript
@component()
export class AudioController extends Component {

  @subscribe(Events.FishHooked)
  private _onHooked(_p: Events.FishHookedPayload): void {
    // AudioService.get().play(Assets.SfxHook, this.entity);
  }

  @subscribe(Events.FishCaught)
  private _onCaught(_p: Events.FishCaughtPayload): void {
    // AudioService.get().play(Assets.SfxCatch, this.entity);
  }
}
```

Add audio asset refs in `Assets.ts` alongside the template refs.

## Ambient

Underwater ambience (bubbles, water hum) and depth-based music layers can be driven by `Events.ZoneUnlocked` and the camera Y scroll position. No architecture changes needed — a new `AmbientAudioController` subscribing to these events is sufficient.
