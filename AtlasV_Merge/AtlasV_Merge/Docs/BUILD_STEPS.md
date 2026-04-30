# BUILD_STEPS

> A list of atomic, ordered building blocks to construct the game from empty project to remix-ready release. Each step is sized to fit a single execution session and is verifiable by the agent itself — no human playtest required to advance.

---

## How to use this file

1. Read `PROJECT_SUMMARY.md` and `ART_DIRECTION.md` once. They are the standing quality bar.
2. Take **Step 1**. Execute it fully, including the polish baked into its requirements. Self-verify against the `Done when` checklist.
3. When done, take Step 2. Do not skip, reorder, or batch.
4. Each step assumes the previous steps are complete and working. None require redoing earlier work.
5. Each step ends in a state where the build still runs.

**Polish is not a later phase.** Every step's `Done when` must be met at *excellent* polish, not at basic-functional level. Half-juiced is not done. If a brick can be made to feel better with a few more iterations within the step, do those iterations before moving on. Better to ship 20 polished bricks than 30 rough ones.

The agent decides engine, language, file structure, and which generation skills to use. This file does not prescribe those.

---

## Skeleton — the loop must work end to end

### Step 1 — Project skeleton in portrait

Set up the project to run in portrait orientation on a representative mobile target. Place an empty container in the scene, defined by colliders on the bottom and two side walls — no top wall. Establish four separate, easily-locatable layers from day one: **gameplay logic**, **content & data**, **visual assets**, **audio assets**. They will fill up across later steps; for now they exist and are clearly named.

**Done when:**
- The project builds and runs in portrait on the target device.
- A container with three walls is visible on screen.
- The four layers exist as distinct, obviously-named locations.

---

### Step 2 — Merge ladder as data

Define the full merge ladder as pure data in a single human-readable file in the data layer. For each of 10–12 tiers, define: an identifier, a placeholder color, a placeholder size, and the index of the tier it merges into (or `final` for the top). The scoring value awarded by a merge into this tier lives here too.

This file must be the *first* place anyone goes to change the game. Adding, removing, or reordering tiers must require editing only this file.

**Done when:**
- A single file describes all tiers in order with all per-tier parameters.
- Adding a tier (e.g., 11th item) requires no code changes outside this file.
- Colors, sizes, and merge-into pointers can all be changed from this file.

---

### Step 3 — Drop spawner with input

A tier-0 item appears at the top of the container, ready to drop. The player drags horizontally anywhere on screen — not just on the item — to position it. Releasing drops it; it falls under gravity and collides with the container walls. After a short cooldown (~0.4–0.6s), the next held item appears.

While held, the item gently bobs in place — never frozen. The held position is clamped within the container's horizontal bounds.

**Done when:**
- Dragging anywhere on the screen moves the held item left/right within bounds.
- Release drops the item, which falls under gravity and settles realistically.
- The next item appears automatically after the drop cooldown.
- The held item has a continuous, subtle idle motion.

---

### Step 4 — Tier randomization on drop

The held item's tier is randomized within a tunable range — typically tiers 0 through 4 — with weighted probability favoring the lowest tiers. The probability table lives in the data layer, not in spawn code.

**Done when:**
- The held item's tier varies across drops.
- Tier 0 is the most common; higher held tiers are progressively rarer.
- The probability distribution is editable from a single data location.

---

### Step 5 — Next-up preview

A small indicator near the play area shows the upcoming tier — the one that will appear after the current drop. It updates the moment the current item is released.

**Done when:**
- The next-up indicator is always visible during play.
- It updates instantly on each release.
- It is positioned where the player notices it without it competing with the play area for attention.

---

### Step 6 — Merge detection and replacement

When two items of the same tier are in contact and stable, both are removed and one item of the next tier appears at their midpoint, inheriting averaged velocity. The top tier is final and never merges. A short merge cooldown prevents an item from being consumed in two merges in the same physics tick. Multiple simultaneous merges across the container all resolve correctly without dropping items.

The new item appears with a quick scale-in pop, not an instant snap.

**Done when:**
- Two same-tier items in contact reliably merge.
- The new item appears at the midpoint with a soft scale-in.
- Top-tier items never disappear.
- Three or more simultaneous merges all resolve cleanly with no items lost or duplicated.

---

### Step 7 — Score system

Every merge awards points scaled by the tier it produced. The scoring formula lives in the data layer. A current-score value updates and is displayed prominently at the top of the screen as the most readable number on the playfield.

**Done when:**
- Score updates on every merge, scaling with tier.
- The scoring formula is editable from one place in the data layer.
- The current score is the most prominent number on screen.

---

### Step 8 — Score animations

The score never snaps. When it changes, it counts up smoothly over ~0.3s. On every merge, it pulses (brief scale up, ease back). At the location of each merge, a "+points" tag floats up and fades over ~0.7s.

**Done when:**
- Score visibly counts up on every increment.
- Score pulses on every merge.
- A floating "+points" tag appears at every merge location and fades cleanly.

---

### Step 9 — Game over detection

A `danger line` near the top of the container defines the loss condition. When any item rests above this line for longer than a tunable grace period (~2s), the run ends. Brief contact above the line during physics chaos does *not* trigger game over — only sustained presence. Both threshold values live in the data layer.

**Done when:**
- An item resting above the line for the grace period ends the run.
- An item briefly bouncing above the line and returning below does *not* end the run.
- Both danger-line position and grace-period duration are editable from the data layer.

---

### Step 10 — Game over screen and instant restart

On game over, the simulation freezes gracefully and a generous game-over screen appears showing final score and best score. A single prominent restart action returns the player to a fresh run in under one second. No dialogs, no confirmations, no menu detours.

**Done when:**
- Game over freezes the simulation cleanly with no glitching items.
- Final score and best score are clearly displayed.
- A single tap restarts; the next drop is ready in under one second.

---

### Step 11 — Persistent best score

Best score persists locally across app sessions. It is shown in a small secondary spot during play and prominently on the game-over screen. When the current run beats the best, the game-over screen plays a *distinctly* more celebratory variant — different particles, a different audio cue, a larger score treatment.

**Done when:**
- Best score persists across full app restart.
- Best score is visible during play (secondary) and on game over (prominent).
- A new-best ending visibly and audibly differs from a normal game over.

---

## Feel — the loop must feel alive

### Step 12 — Drop, merge, and game-over audio

Three sounds, all in the audio layer with descriptive filenames:
- **Drop** — soft thud on item landing, with subtle per-drop variation (pitch or sample) to avoid fatigue.
- **Merge** — short, satisfying pop on every merge.
- **Game over** — soft, descending tone, inviting another run rather than punishing.

Playback is reliable, never stuttering, never overlapping into noise.

**Done when:**
- Each event triggers its sound on every occurrence.
- Drop has audible per-event variation.
- All three audio assets are in one folder, named for the event they serve.

---

### Step 13 — Chain detection and rising-pitch merge audio

Track merge cascades: a merge happening within ~0.4s of a previous merge counts as the next link in a chain. The chain depth resets after the gap.

For each successive link, the merge sound's pitch rises. This single audio choice carries enormous game feel — make sure it lands. The pitch curve should feel musical, not arithmetic.

**Done when:**
- Isolated merges play the base merge sound.
- A merge within ~0.4s of the prior plays at a higher pitch.
- Pitch continues to rise on subsequent links and resets after the gap.
- Long chains feel musically satisfying, not noisy.

---

### Step 14 — Merge particles

Every merge spawns a particle burst keyed to the *new* item's color. Particles are soft and rounded, drift outward gently, and fade. They never fly violently and never linger long enough to clutter the screen.

**Done when:**
- Every merge produces a particle burst in the resulting tier's color.
- Particles are rounded and soft, not sharp.
- The screen never accumulates particle clutter even during long chains.

---

### Step 15 — Chain visual escalation

For chains of depth ≥ 2, the visual response intensifies link by link: more particles, a brighter radial flash on the spawned item, a slightly longer trail. The escalation is smooth — no jarring jumps — and the play area remains readable even during a 5+ chain.

**Done when:**
- A chain of 3+ visibly differs from three isolated merges.
- Intensity scales smoothly with depth.
- Items remain trackable throughout the chain.

---

### Step 16 — Squash and stretch

Items deform on impact (squash on landing in the container) and on merge (the spawned item briefly stretches then settles). Deformations are subtle and decay quickly — felt more than seen — but every collision and merge has them.

**Done when:**
- Items visibly squash on landing.
- Newly spawned merged items have a brief stretch-and-settle.
- No item ever stays visibly distorted after motion stops.

---

### Step 17 — Screen shake on big chains

Chains of depth ≥ 3 trigger a tiny, tasteful screen shake whose intensity scales mildly with depth. Single merges and 2-chains do not shake. The shake never makes the play area unreadable.

**Done when:**
- Chains of 3+ produce a brief, subtle shake.
- Single merges and 2-chains never shake.
- The shake is felt, not visually disruptive.

---

### Step 18 — Danger line warning shimmer

When any item rests above the danger line, a subtle warning shimmer appears in that region of the playfield. It builds tension without being aggressive — no flashing red, no alarm sounds. The shimmer fades smoothly when no items remain in the danger zone.

**Done when:**
- The shimmer appears whenever an item is in the danger zone.
- It fades smoothly when the threat is gone.
- The effect is calm, not alarming.

---

### Step 19 — Idle motion in the container

Items resting in the container are never frozen. They have a low-level passive motion — slight color breathing, tiny rotational drift, soft scale pulse, or similar. The motion is calm enough not to interfere with aiming.

**Done when:**
- Items in the container are visibly alive at rest.
- The motion does not distract during aiming.
- The effect is consistent across all tiers.

---

## Visual identity — the game must look like itself

### Step 20 — Centralized palette

Create a single palette file in the data layer listing every named color in the game: each tier's color, container color(s), background color(s), UI text and accents, danger zone tint. Wire every visual element to read from the palette. Placeholder colors are fine here — what matters is that they all live in one editable place.

**Done when:**
- A single palette file lists every color used in the game with descriptive names.
- Every visual reads its color from the palette, never from a hardcoded literal.
- Editing one color in the palette propagates everywhere it's referenced.

---

### Step 21 — Item art for the full ladder

Replace placeholder shapes with finished art for every tier. Generate the entire set together with a shared rendering style, line weight, and a single consistent light direction. Each tier must be distinguishable from its neighbors at thumbnail size. Each tier has a small bit of character — a face, a posture, a quirk — so players grow fond of them.

Each item lives as its own asset file in the visuals layer, named by tier identifier. No baked atlases.

After the art lands, briefly retune any feel parameter (squash amount, particle scale, etc.) that depends on item appearance — the values that felt right on placeholder circles may need adjusting on real art.

**Done when:**
- Every tier has finished art.
- All tiers share one rendering style and one light direction.
- Adjacent tiers are distinguishable at thumbnail size.
- Each tier's art is in its own asset file with an obvious name.
- Squash/particle/shimmer values have been re-checked against the new art and adjusted where needed.

---

### Step 22 — Container styling

Restyle the container into something with identity — a jar, tank, snowglobe, cauldron, terrarium, whatever fits the chosen theme. The silhouette is part of the game's identity. The container's rendering matches the items' style language.

**Done when:**
- The container has a distinct, recognizable silhouette.
- Its rendering matches the items' visual language.
- Items are clearly readable against it.

---

### Step 23 — Background

Build a calm, finished background environment behind the container. Subtle ambient motion is allowed — drifting clouds, soft gradient pulse, slow particles — but nothing that competes with the play area.

**Done when:**
- The background is finished, on-style art rather than a flat color.
- Any motion in it is slow, ambient, and non-distracting.
- The play area remains the unambiguous focus of attention.

---

### Step 24 — UI styling

Restyle every UI element — score, best, next-up, game-over screen, restart button, danger shimmer, particles — to live in the same world as the items. Use one rounded, friendly typography choice with weighted, highly-readable numbers. Buttons squish (brief scale-down) when tapped. No leftover engine-default chrome remains anywhere.

**Done when:**
- All UI uses one consistent typography family.
- Numbers are large, weighted, and readable at arm's length.
- Buttons visibly squish on press.
- Particles and FX have been restyled to match the visual identity.
- No default engine UI chrome is visible.

---

### Step 25 — App icon and splash

Produce an app icon and a brief launch splash that match the visual identity. The game must look like itself from the moment it launches.

**Done when:**
- An original, on-style app icon exists.
- A brief, on-style splash exists.
- Neither uses a default template.

---

## Shipping prep

### Step 26 — Minimal settings

Add an unobtrusive settings affordance with exactly two options: **audio toggle** (mutes all sound, persists across sessions) and **reset best score** (with one confirmation step). Nothing else. No menus, no tabs, no extras.

**Done when:**
- Audio can be muted; the setting persists across app restart.
- Best score can be reset, gated by one confirmation.
- No other settings exist.

---

### Step 27 — Edge cases

Confirm correct behavior in:
- App backgrounded mid-play → simulation pauses; resumes cleanly.
- Device rotated → game stays in portrait, ignores rotation.
- Notification or system interruption → simulation pauses, no state lost.
- App killed and relaunched → best score and settings preserved.

**Done when:**
- All four cases behave correctly.
- No state is lost in any of them.

---

### Step 28 — Performance pass

Stress-test with a fully populated container and trigger long chains. Verify the target frame rate holds under load. Profile and fix any stutter from physics, particles, audio, or rendering. Confirm no input lag at the moment of drop.

**Done when:**
- Frame rate is smooth on the target device with a full container during long chains.
- Particles and audio play cleanly under load.
- Input-to-drop latency is imperceptible.

---

### Step 29 — Remix kit and REMIX.md

Final structural pass. Audit and fix:
- Item art is in individual asset files, not a baked atlas.
- The merge ladder data file is human-readable.
- Physics, scoring, and timing constants live in a clearly-named tuning location, not scattered.
- Audio assets are in one folder, named for their events.
- The palette is in one file referenced everywhere.

Then write `REMIX.md` at the project root, written for a curious hobbyist, with concise sections explaining how to:
- Reskin the items (which folder, file naming, what the engine expects).
- Change the palette (which file).
- Add a new tier (which file, what fields are required).
- Tune physics, scoring, and timing (which file).
- Swap the soundtrack and merge sound (which folder, naming).
- Add a new mode or feature (the project's idiomatic extension point).

For each instruction in `REMIX.md`, follow it yourself once to confirm it works as written.

**Done when:**
- All five structural conditions above are true.
- `REMIX.md` exists at the project root.
- Every instruction in `REMIX.md` has been verified end-to-end.

---

## Stop condition

When Step 29 is complete and its `Done when` items all hold, the build is v1. No further steps. New ideas (modes, themes, daily seeds, leaderboards) are out of v1 scope by `PROJECT_SUMMARY.md` § 9.
