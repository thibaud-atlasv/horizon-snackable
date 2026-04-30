# Suika Merge Game

archetype: drop_merge_puzzle

## Core Idea

summary: A physics-driven fruit merge game where dropping identical fruits triggers cascading chain reactions for escalating scores.

The player fantasy is being a strategic chaos orchestrator — each drop is a deliberate choice, but physics makes outcomes unpredictable enough that surprise chain merges feel like gifts. The game is distinct within the genre through its gummy/vinyl figure art style with charming fruit characters that players grow fond of across runs.

## Gameplay

summary: Drop fruits into a jar, let physics trigger merges between identical tiers, chase chain reactions for high scores.

- **Aim** — Drag horizontally to position the next fruit above the container
- **Drop** — Release to let gravity pull the fruit into the jar
- **Merge** — Same-tier fruits collide and combine into the next tier up
- **Survive** — Keep items below the danger line or the run ends

## Mechanics

summary: Circle physics, tier-based merging, weighted spawning, and container pressure create emergent chain reactions.

The physics engine (gravity, restitution, damping) makes items settle unpredictably, creating opportunities for unplanned merges. The 11-tier ladder (Cherry → Watermelon) means each merge produces a larger item that takes more container space while being worth more points. Only the smallest 5 tiers spawn directly, ensuring large items must be earned through chains. The danger line grace period (2 seconds) gives settled items a fair chance while maintaining pressure.

## Game Feel

summary: Squishy, warm, alive — every merge is a tiny gift that pulls you into one more run.

The emotional arc of a session goes: calm placement → building tension as the jar fills → excitement during chain merges → brief disappointment at game over → immediate "I can do better" restart impulse. Difficulty is self-regulating — the container fills at the rate the player drops, so skilled players who chain effectively buy themselves more space. The game should feel like picking up soft candy — tactile, warm, satisfying.

## Inspiration

- **Suika Game** — The original drop-merge-in-container loop with circle physics
- **2048** — The "just one more" chase of building higher-tier combinations

Unique to this project: gummy/vinyl figure aesthetic with cute character faces on fruits, emphasis on remixability (swap themes, tune physics, modify ladder without touching engine code).

## Visual Identity

Art direction: Squishy, warm, modern. Soft-shaded with volume, bold shapes readable at thumbnail size. Gummy/vinyl figure aesthetic — not flat design, not pixel art, not photorealistic.

Palette: Saturated but not garish. Items carry the color load against a calm, narrow-range background. High contrast between fruits and container.

Mood: Confectionery window display — appetizing, inviting, abundant. Playful but not childish.

Image Generation Keywords: cute fruit character, gummy texture, vinyl figure style, soft shading, saturated colors, kawaii face, clean silhouette, dark blurred background, centered subject, game item icon, round shape, glossy highlight

## Modules

- **MergeLadder** — The 11-tier fruit progression that defines what merges into what
  includes: merge_ladder
- **Physics** — How fruits fall, bounce, settle, and collide inside the jar
  includes: physics
- **Scoring** — How your runs are measured and rewarded with points and best-score tracking
  includes: scoring
- **Gameplay** — Drop timing, spawn rules, danger detection, and session flow
  includes: gameplay
- **VisualIdentity** — The game's look and feel: palette, container, backgrounds, and UI style
  includes: visual_identity

## Relationships

- Merge Ladder defines tier sizes that Physics uses for collision radii
- Merge Ladder defines score values that Scoring awards on each merge
- Gameplay's spawn weights reference Merge Ladder tiers 0-4
- Physics restitution and damping affect how quickly items settle, impacting Gameplay's danger detection
- Visual Identity's container bounds define the physical play area for Physics wall collisions
