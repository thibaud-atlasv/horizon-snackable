# PROJECT_SUMMARY

> This document is the north star for the build. When in doubt about scope, feature direction, or trade-offs, refer back here. It describes **what** we are making and **why** — not how. The agent retains full authority over architecture, language, and tooling.

---

## 1. One-line concept

A **vertical, physics-driven merge game** for portrait-orientation mobile: drop items into a container, identical items collide and merge into the next tier up, the container slowly fills, and the game ends when items overflow the top. Beat your high score. One more run.

This is the Suika / Watermelon Game genre. We are not reinventing the loop — we are executing it with modern feel and a foundation that invites remixing.

---

## 2. Why this game

The Suika loop is one of the most powerful "just one more" loops on mobile because it combines four pleasures in a single drop:

- **Anticipation** — the player holds an item and chooses where to release it.
- **Cascade** — a single merge can chain into several, producing escalating payoff.
- **Mastery** — the player learns to plan, stack, and set up chains over runs.
- **Loss pressure** — the container fills visibly; every drop carries weight.

It is also a **highly remixable** template. The merge ladder, the container, the physics, the visuals, and the meta layer are all loosely coupled. A player or modder should be able to swap any one of them without rewriting the others.

---

## 3. Player target & context

- **Platform**: mobile, **portrait orientation only**.
- **Input**: single thumb. The game must be fully playable one-handed, on the bus, in line, in bed.
- **Session length**: 30 seconds to 5 minutes per run. The player should be able to start, lose, and restart in under two seconds.
- **Audience**: broad casual. No tutorial text walls. The game teaches itself in the first three drops.
- **Skill ceiling**: low floor, high ceiling. A first-time player gets a satisfying merge in their first run; a returning player chases setup chains and personal bests.

---

## 4. Core loop

In order, every run:

1. The player sees the **next item** to drop and a **preview/aim indicator** at the top of the container.
2. They move their finger horizontally to position the drop.
3. They release. The item falls under gravity into the container.
4. If it touches another identical item, the two **merge** into the next tier up, with juicy feedback.
5. Merges can chain. Chains award escalating score.
6. The container fills over time. When an item rests above the **danger line** for too long, the run ends.
7. Game-over screen shows score, best score, and a single tap to restart.

The loop must feel **continuous**. Restart should be instant — no menus, no confirmation dialogs, no ad breaks gating retries.

---

## 5. Pillars — non-negotiable qualities

These are the things we will not compromise on. Every feature, every asset, every line of code should serve at least one of these.

### Pillar 1 — Instant fun
A new player picks up the game with no instruction and is enjoying themselves within ten seconds. The first merge happens by accident and feels great. The interface explains itself through use.

### Pillar 2 — Juicy feedback
Every meaningful event has weight. Drops thud. Merges pop. Chains escalate visually and audibly. The screen, the items, the UI all react. The game should feel **alive in the hand**, not like a static simulation. A merge without juice is a bug.

### Pillar 3 — One more run
The game-over → restart path is friction-free and emotionally pulls the player back in. Best-score chasing is surfaced, immediate, and visible. Losing should feel like *I can do better* rather than *that was unfair*.

### Pillar 4 — Remix-ready
The game's content (items, sounds, palette, ladder, container shape, rules) lives in clearly-separated, easily-swappable layers. A curious player who opens the project should be able to identify within minutes how to: change the visual theme, add a new tier, tune the physics, swap the soundtrack, add a new mode. **This is a first-class design constraint, not a "later" concern.** See section 8.

---

## 6. What "good" feels like

When a player makes a triple-chain merge:

- The merging items squash and pop, not just disappear.
- A burst of particles erupts outward, color-keyed to the resulting item.
- A short, rising audio cue plays — pitched up for each link in the chain.
- The score number pulses and counts up, not snaps.
- The screen has a tiny, tasteful shake — felt, not seen.
- A floating "+score" tag drifts up and fades.
- The newly merged item lands with a soft bounce, not a hard stop.

If any of those are missing, the moment feels flat. The agent should treat the feel of a merge as the single most important deliverable in the project.

---

## 7. Success criteria (how we'll know it worked)

Soft signals — to be checked by playtesting at each milestone:

- A new player makes a successful merge within their first three drops, without being told what to do.
- A new player, on losing, taps to restart immediately rather than putting the phone down.
- Within five minutes, a player is *strategizing* — placing items deliberately to set up future merges.
- A player can describe the game to a friend in one sentence after one run.
- A player who sees the project files thinks "I could change X" within a minute of looking.

If any of these fail at a milestone, that's a higher priority than adding features.

---

## 8. Remixability — what this means concretely

The project should be structured so that a player or hobbyist can pursue at least the following customization paths **without needing to understand the whole codebase**:

- **Reskin** — change every sprite, color, and sound to give the game a new theme (e.g., fruits → planets, emojis, animals, monsters, food).
- **Reladder** — change the number of tiers, the visual progression, or the merge graph itself.
- **Retune** — adjust gravity, restitution, drop cooldown, danger line height, scoring curve.
- **Add a feature** — drop in a new item type, a power-up, a hazard, a special move.
- **Add a mode** — daily challenge, time attack, zen (no game over), puzzle.
- **Add levels** — hand-crafted starting configurations or themed runs.

The agent should make implementation choices that **keep these paths shallow**. Content data should not be entangled with engine logic. Visual assets should not be entangled with gameplay rules. New tiers, items, modes should be addable without hunting through unrelated code.

This pillar is as load-bearing as the gameplay itself. The game's life beyond launch lives here.

---

## 9. Current implementation status

The core playable loop is fully implemented and playable with visual polish:

- **Rendering**: Portrait 480×800 canvas using DrawingSurface for game graphics with XAML UI overlays for HUD and menus. All 11 tiers use generated sprite images of cute gummy blob creatures rendered via ImageBrush with rotation, squash/stretch, and idle motion support
- **Theme**: Cute gummy blob creatures that evolve through 11 tiers (Bloblet → Blob Royale), replacing the original fruit theme
- **Background**: Generated candy confectionery sprite background with warm peach-to-lavender tones and decorative candy elements
- **Container**: Dark candy jar interior with subtle programmatic glass effects — layered semi-transparent glow strips along walls, bottom edge highlights, and thin wall outlines suggesting glass containment without an opaque frame overlay
- **Merge ladder**: 11 tiers defined in a data-driven tier system with sizes (15% larger than base for better visibility), colors, and score values
- **Physics**: Custom 2D circle-based physics with gravity, circle-to-circle collision response with angular velocity transfer, wall collision with spin, velocity damping, angular damping, and configurable bounciness — items bounce, spin, and tumble naturally
- **Drop mechanic**: Touch-based horizontal drag to aim, release to drop; items fall under gravity into the container
- **Spawning**: Weighted random tier selection (tiers 0–4 are spawnable) with a next-up preview indicator
- **Merging**: Same-tier collision triggers a cinematic multi-phase merge animation — items compress toward each other, a bright flash appears at the merge point, and the new item pops in with spring-based overshoot before settling. Score and floating tags appear immediately for responsive feel
- **Visual juice**: Six visual effect systems — merge particles (color-keyed, chain-escalating), screen shake (on chain depth ≥3), spring-based squash-and-stretch on landing, merge, and collision (with overshoot bounce-back), danger zone shimmer overlay, idle scale breathing for settled items, chain merge tracking with time-based window
- **Game over**: Detected when items rest above the danger line for 2 seconds; game-over screen with score display and instant restart
- **Score tracking**: Points awarded on each merge, displayed via XAML HUD with smooth count-up animation and pulse effect
- **Floating score tags**: "+points" text tags appear at merge locations and float upward while fading
- **Best score**: Session-best score tracked with "NEW BEST!" celebration
- **UI polish**: Themed XAML containers with warm candy colors — soft pink (#FFE4EC) score panel and peach (#FFF0E6) best-score panel as semi-transparent rounded pills, warm coral/pink game-over overlay with large rounded restart button, Bangers font throughout, fake text shadows
- **Gameplan**: Full gameplan system with interactive tuning controls across 6 categories

Not yet implemented: sound, persistent high score across sessions, advanced features (power-ups, modes).

## 10. Out of scope for v1

Listed so the agent doesn't drift:

- Multiplayer, social features, friend leaderboards.
- Accounts, login, cloud save (local persistence is enough).
- Monetization, ads, IAP.
- Landscape orientation, tablet-specific layouts.
- Tutorials with text overlays — the game must teach itself.
- Settings menus beyond audio toggle and reset score.
- Localization beyond the launch language.

These are not bad ideas. They are simply not v1. The roadmap covers what v1 means.

---

## 10. The brief, in one sentence

**Make a Suika-style merge game that feels alive in your hand, plays one-handed in portrait, makes you want one more run, and reads like a kit a curious player would want to take apart and rebuild.**
