# Drop & Merge Archetype

## Genre Definition

Players drop items into a container one at a time, positioning each horizontally before releasing. Identical items collide and merge into the next tier up, creating chain reactions. The container slowly fills and the run ends when items overflow the top. The core fantasy is setting up cascading merges that clear space and rack up score.

## Reference Games

- **Suika Game (Watermelon Game)** — the definitive drop-merge loop with physics-driven cascading merges in a fixed container
- **2048** — the merge-chain satisfaction and "one more try" pull, adapted from grid to physics

## Session Length

A single run lasts 30 seconds to 5 minutes depending on skill. The session ends when items overflow the danger line. Players expect to play 5-15 runs per sitting, chasing personal bests.

## Required Modules

- **merge_ladder** — Defines the tier chain (items, sizes, what merges into what). Without this, there is no merge progression — the entire genre identity collapses. The ladder determines visual variety, difficulty curve, and scoring ceiling.
- **physics** — Governs how items fall, collide, and settle in the container. Without physics, items don't pile unpredictably — the strategic positioning and chain reactions that define the genre disappear.
- **scoring** — Awards points on merge and tracks high score. Without scoring, the run has no measurable outcome and the "one more run" pull evaporates.
- **gameplay** — Controls the drop flow (cooldown, spawn selection, danger detection). Without gameplay timing, items either flood instantly or the loop feels sluggish — pacing is what makes each drop feel weighty.
- **visual_identity** — The item designs and container are on screen 100% of the time. Without cohesive visuals, the merge ladder is unreadable and the game loses its identity.

## Optional Modules

- **audio** — Merge pops and rising pitch chains provide half the juice but the loop works without them.
- **power_ups** — Special items or abilities that clear, freeze, or transform — add variety but not required for core loop.
- **modes** — Time attack, zen, daily challenge — extend replayability beyond high-score chasing.
- **meta_progression** — Unlockable themes, persistent upgrades — add long-term goals.

## Excluded Modules

- **multiplayer** — The meditative single-player pacing conflicts with competitive real-time pressure.
- **inventory** — There is nothing to collect or equip; items exist only to merge.
- **narrative** — The tight arcade loop has no room for story progression or dialogue.
- **crafting** — Merging IS the crafting; a separate crafting system would be redundant.

## Design Patterns

These patterns define the genre. Removing any of them results in a fundamentally different game type.

### Physics-Driven Pile
Items settle according to physics, creating unpredictable arrangements. Without physics, the game becomes a deterministic puzzle (like 2048) rather than a spatial-reasoning challenge with emergent cascades.

### Single-Item Drop Pacing
The player positions and releases one item at a time with a brief cooldown between drops. Without this constraint, the game becomes a frantic action game rather than a deliberate, satisfying placement puzzle.

### Merge Cascade
When two same-tier items touch, they merge into the next tier — and the resulting item may immediately collide with another same-tier neighbor, chaining further. Without cascades, merging is linear and the "big moment" payoff disappears.

### Container Pressure
The play area has a fixed bottom and a danger threshold at the top. The container fills over time, creating mounting pressure. Without container pressure, there is no loss condition and no tension in each drop.

### Tier Progression
Items exist on a linear ladder from small/common to large/rare. Higher tiers are only reachable through repeated merging. Without this progression, there is no sense of building toward something.

## Common Pitfalls

- **Floaty physics** — Items that don't settle quickly make the game feel unresponsive and prevent cascades from resolving satisfyingly.
- **Indistinguishable tiers** — If adjacent tiers look too similar, players can't plan merges at a glance and the game feels random.
- **Punishing game-over** — Instant death when one pixel crosses the line feels unfair; a grace period lets players recover from lucky cascades.
- **Spawn weight imbalance** — Spawning large tiers too often trivializes the merge chain; spawning only the smallest makes early game tedious.
- **No merge feedback** — Without visual/audio pop on merge, the core reward moment goes unnoticed and the loop feels flat.
- **Container too wide or narrow** — Too wide means items never stack; too narrow means no room for strategy.

## Visual Style Expectations

- Items must be instantly distinguishable by tier at thumbnail size through distinct color AND shape/size.
- The container boundary must be clearly visible but not visually dominant.
- Merge events need obvious particle/animation feedback — this IS the reward.
- The danger zone should communicate threat through subtle environmental cues, not aggressive UI overlays.
- Score and next-item preview must be readable without competing with the play area.
- Visual progression in the tier ladder should feel like "leveling up" — bigger items should feel more important.
