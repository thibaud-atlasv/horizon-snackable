# ART_DIRECTION

> This document defines the **visual and sensory identity** of the game. It is intentionally directional, not prescriptive — it tells the agent what we want the game to *feel* like to look at, without dictating exact assets. Specific palettes, exact dimensions, and asset formats are the agent's call.

---

## 1. North-star feeling

**Squishy, warm, alive, modern.** The game should feel like picking up a handful of soft candy. Items should look like you want to touch them. The screen should breathe.

It is **not**:
- Flat-design minimalist (too cold).
- Skeuomorphic-realistic (too heavy).
- Hyper-polished AAA (too generic, too expensive-looking, anonymous).
- Pixel art (overused in the merge genre, ages the project).
- Generic "asset store" mobile look — bevels, gradients, drop-shadows by default.

It **is**:
- Soft-shaded with intent. Volume and weight, but stylized.
- Bold, confident shapes that read at thumbnail size.
- A small set of distinctive characters or items the player recognizes immediately.
- Playful but not childish. A 10-year-old and a 35-year-old should both want to play it.

---

## 2. Mood references (verbal, not literal)

Think of the texture of these adjectives, not the surface of any one game:

- **Gummy** — soft outlines, faintly translucent edges, things that look like they'd squish.
- **Vinyl figure** — clean silhouettes, characterful proportions, satisfying volume.
- **Stickers on a notebook** — saturated, layered, tactile.
- **Confectionery window display** — appetizing, inviting, abundant.

If the agent finds itself producing something that looks like a default mobile game template, it should stop and rework the direction.

---

## 3. The merge ladder — visual progression

The ladder of items (the chain of merges from smallest to largest) is the **single most important visual decision** in the project. The player will look at these items thousands of times.

Requirements:

- **Recognizable at a glance, even tiny.** A player must instantly know the difference between two adjacent tiers in their peripheral vision.
- **Progressive in scale and personality.** Larger tiers should feel more "important" — slightly more detail, slightly more presence — without becoming visually noisy.
- **Cohesive as a set.** The ladder should feel like one family, not eleven random objects glued together. Same rendering style, same lighting logic, same line weight.
- **Color-distinct.** Adjacent tiers must have clearly different hues. No two neighbors that share a color family.
- **Charming.** Each item should have a tiny bit of character — a face, a quirk, a posture. The player should grow fond of them across runs.

The agent decides the theme of the ladder. The default expectation is that this theme is **easily swappable** — see Pillar 4 in `PROJECT_SUMMARY.md`. Whatever theme is chosen, it should be picked because it's *fun*, not because it's safe.

---

## 4. Color & light

Guidance, not law:

- **Saturated, not garish.** Colors should pop on a phone screen in daylight without making the player's eyes tired in a dark bedroom.
- **High contrast between item and container background.** Items must always read clearly against the play area.
- **Limited palette overall.** Background and UI live in a narrow, calm range so items can carry the color load.
- **Soft shadows, not hard ones.** A subtle ambient drop under each item gives weight without harshness.
- **Light comes from one direction**, consistently across all items. Pick a direction and stick to it.

Avoid: muddy gradients, gray-on-gray UI chrome, "premium" dark mode that drains the joy out, neon overload, default Material Design palettes.

---

## 5. The container & playfield

The container is the stage. It should:

- Have a **distinct silhouette** — the shape of the container is part of the game's identity.
- Feel **physical** — like a jar, a tank, a cauldron, a snowglobe — something that contains, not just a rectangle.
- Show the **danger line** clearly but not aggressively. The line should make the player tense as items approach it, but never be so loud it dominates the screen during normal play.
- Sit in a **calm environment**. The world around the container is decorative, not distracting. Background animation is allowed but must be slow, ambient, and never compete with merges for attention.

---

## 6. UI

The UI must feel like part of the same world as the items, not a separate dashboard pasted on top.

- **Score** is large, prominent, and reactive. It pulses on merge, counts up, and is the most legible thing on screen after the items themselves.
- **Best score** is visible but secondary — a quiet companion to current score.
- **Next-up indicator** for the upcoming item is clear and close to the play area, not buried in a corner.
- **Game-over** screen is generous and emotional, not punitive. Big number, instant restart, no nags.
- **Buttons** are tactile — they squish when pressed.
- **Typography** is rounded, friendly, weighty. Avoid thin or technical fonts. Numbers especially must be highly readable.

UI motion: **everything moves**. Nothing snaps into place. Elements ease, settle, breathe. But no element should be in motion while the player is making a decision — UI is calm during aim, expressive during outcome.

---

## 7. Animation principles

- **Anticipation before action.** Items wiggle slightly while held. The drop has a tiny wind-up.
- **Squash and stretch on impact.** Items deform on landing and on merge, then settle back. This is the heart of the game's feel.
- **Overshoot and settle.** Score counters, UI elements, merged items — nothing arrives at its final state in a straight line. They overshoot and bounce in.
- **Idle life.** Items in the container should subtly shift, not be statues. The whole screen has a low-level breathing pulse.
- **Chain escalation.** Each link in a merge chain should be visually *more* than the last — bigger particles, brighter flash, longer trail. The player should feel the chain growing.

---

## 8. Particles & feedback FX

Particles are not decoration. They are the player's reward.

- **On merge**: a burst keyed to the resulting item's color. Soft, rounded particles, not sharp shards. They drift, they don't fly violently.
- **On chain**: each link adds intensity — more particles, a brighter halo, a brief radial flash on the new item.
- **On danger**: a subtle warning shimmer near the danger line as items hover close. Not a red alarm. The player should feel pressure, not be yelled at.
- **On game over**: a single big, slow, almost ceremonial visual. The run ending should feel meaningful, not buzzy.

Restraint matters. **Particles serve the merge, not themselves.** If the screen ever looks busy enough that the player can't see what merged with what, the FX have failed.

---

## 9. Sound (briefly — feel-critical)

Sound is half of the juice. The agent should plan for it from the start, not bolt it on.

- **Drop**: soft, weighty thud, slightly varied per drop so it doesn't fatigue.
- **Merge**: short, satisfying pop with a pitch that **rises with each link in a chain**. This single audio choice does an enormous amount of work for game feel.
- **Game over**: a soft, sad-but-not-tragic descending tone. Inviting a retry, not punishing.
- **UI taps**: warm, tactile clicks.
- **Music**: light, looping, low-key. Should be possible to mute without losing anything essential.

Audio assets must be **easy to swap**. A modder should be able to replace the soundtrack and the merge sound in minutes.

---

## 10. Things to avoid (the "AI-generated mobile game" trap)

The agent should actively resist these failure modes, which are the default output of unattended generation:

- Generic round-cornered buttons with linear gradients.
- Default mobile UI chrome (top bar, settings cog, hamburger menu) — none of these belong here.
- Item designs that look like clip art — symmetrical, characterless, "stock fruit."
- Inconsistent rendering styles across the ladder (one item is flat-shaded, another is photorealistic).
- Overuse of emoji or stock iconography in place of bespoke art.
- Drop shadows everywhere, especially harsh black ones.
- Visual chaos on merge — too many particles, too much screen shake, too many simultaneous effects.
- A logo or title screen that looks like every other mobile game.

If the result is good, a screenshot should be **identifiable as this game** at a thumbnail. If it could be confused with anything else on the App Store, the direction has drifted.

---

## 11. Customization-friendliness as a visual constraint

Every visual decision should be made with this question in mind: **how easily could a player swap this for their own version?**

This means:

- Items should be self-contained assets, not baked into a sprite sheet of the entire scene.
- The palette should live in one place a curious player can find and edit.
- The container, the background, and the items should be three separate visual layers that can be reskinned independently.
- File names and asset organization should be **legible to a human**, not just to the engine.

The art is a kit. Treat it that way.

---

## 12. The visual brief, in one sentence

**A small, charming family of squishy items merging in a friendly jar, on a calm stage, with confident shapes, tactile motion, and feedback that makes every merge feel like a tiny gift.**
