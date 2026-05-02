# Drop-Merge Puzzle Archetype

## Genre Definition

Players drop items into a container where identical items merge on collision into the next tier up, slowly filling the space. The core fantasy is controlled chaos — making deliberate placement decisions that cascade into chain merges for escalating score. The genre blends physics unpredictability with strategic positioning.

## Reference Games

- **Suika Game (Watermelon Game)** — the defining drop-and-merge-on-physics-collision loop with circle-based items in a container
- **2048** — the merge-chain progression where combining identical items creates higher-tier results, driving "one more try" compulsion

## Session Length

A single run lasts 30 seconds to 5 minutes, ending when items overflow the container's danger line. Players typically play 3-10 consecutive runs per sitting, driven by score-chasing and the instant-restart loop.

## Required Modules

- **merge_ladder** — Defines the tier progression (what merges into what, sizes, scoring). Without the ladder, there is no merge chain and therefore no game — the entire progression and strategy depends on understanding and exploiting tier relationships.
- **physics** — Governs how items fall, bounce, settle, and collide. Without physics, items cannot naturally touch each other to trigger merges, and the emergent chaos that creates surprise chain reactions disappears entirely.
- **scoring** — Awards points on merge and tracks progression. Without scoring, there is no session goal, no reason to chase chains, and no "one more run" motivation — the game becomes aimless stacking.
- **gameplay** — Controls drop timing, spawn selection, danger detection, and game-over rules. Without these constraints, there is no pacing, no pressure, and no skill expression in when and where to drop.

## Optional Modules

- **visual_identity** — Enhances the game's brand and feel through palette, container style, and item theming but the core loop works with plain circles.
- **audio** — Adds juice through merge pops, drop thuds, and chain escalation sounds but gameplay functions without it.
- **power_ups** — Special items or abilities (bombs, color changers, freeze) add variety but the base loop is complete without them.
- **modes** — Alternative rule sets (zen, time attack, puzzle) extend replayability but are additive to the core.

## Excluded Modules

- **inventory** — Items exist only in the container as physics objects; there is no persistent collection or equipment system.
- **narrative** — The loop is score-chasing with no story progression; adding narrative would fight the instant-restart flow.
- **multiplayer_pvp** — The genre's satisfaction comes from personal mastery and self-competition, not head-to-head play.
- **crafting** — Merging IS the crafting; adding a separate crafting system would be redundant and confusing.

## Design Patterns

These patterns define the genre. Removing any of them results in a fundamentally different game type.

### Physics-Driven Merging
Items merge when they physically collide, not through deliberate player matching. This creates emergent chain reactions the player didn't fully plan, producing surprise and delight. Without physics-driven merging, this becomes a deterministic puzzle game like 2048.

### Progressive Tier Ladder
Each merge produces a larger, higher-scoring item in a fixed chain. The ladder creates visual and strategic depth — larger items take more space, making late-game container management increasingly tense. Without tier progression, merges have no weight or anticipation.

### Container Pressure
A fixed container that fills over time creates escalating tension. Every drop adds volume; every merge reclaims space. Without the container constraint, there is no loss condition and no strategic urgency to the placement decisions.

### Instant Restart Loop
The path from game-over to playing again is under 2 seconds with no friction. This transforms individual losses into attempts rather than failures, driving the "one more run" compulsion that defines the genre's retention.

### Controlled Randomness in Spawning
The player receives randomly selected items from a limited pool (small tiers only), creating variety while maintaining strategic planning. Without spawn randomness, the game becomes fully deterministic and loses replayability.

## Common Pitfalls

- **Over-tuned physics** — Too much bounce or too little friction makes items feel uncontrollable, converting strategic placement into lottery.
- **Indistinguishable tiers** — If adjacent tiers look too similar, players can't plan merges at a glance, killing the strategic layer.
- **Punitive game-over** — If the danger line triggers too quickly without grace period, players feel cheated rather than challenged.
- **Missing merge feedback** — Without satisfying visual/audio response, merges feel like nothing happened, destroying the core reward signal.
- **Spawn pool too wide** — If large items can spawn directly, the container fills too fast and chain-building strategy is undermined.
- **Drop cooldown too long** — Excessive waiting between drops kills flow and makes sessions feel sluggish rather than rhythmic.

## Visual Style Expectations

- Items must be instantly distinguishable by tier at thumbnail size through color AND shape/size difference.
- The container boundary must be crystal clear — players need to know exactly where items can exist.
- The danger line should create subtle tension as items approach, not alarm the player with aggressive warnings.
- Merge feedback must be the most visually prominent event on screen — bigger than any UI animation.
- Larger tier items should feel progressively more "important" through added detail or presence.
- The overall palette should be warm and inviting — this is a relaxing-yet-tense game, not a stressful one.
