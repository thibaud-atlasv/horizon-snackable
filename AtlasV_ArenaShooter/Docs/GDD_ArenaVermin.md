# ARENA VERMIN — Game Design Document
**Version 1.0 | Internal Working Title**

---

## TABLE OF CONTENTS

1. [Vision Statement](#1-vision-statement)
2. [Core Pillars](#2-core-pillars)
3. [Game Loop](#3-game-loop)
4. [Input System](#4-input-system)
5. [Player Character System](#5-player-character-system)
6. [Combat System](#6-combat-system)
7. [Enemy System](#7-enemy-system)
8. [Wave System](#8-wave-system)
9. [Pickup & Currency System](#9-pickup--currency-system)
10. [Progression System](#10-progression-system)
11. [UI & HUD Design](#11-ui--hud-design)
12. [Art Direction](#12-art-direction)
13. [Audio Direction](#13-audio-direction)
14. [Meta-Game & Retention Systems](#14-meta-game--retention-systems)
15. [Balancing Philosophy](#15-balancing-philosophy)

---

## 1. VISION STATEMENT

**Arena Vermin** is a portrait-format, auto-combat arena survivor for mobile. The player controls a single hero character who fights endless waves of mutant vermin across urban isometric arenas. Combat is entirely automatic — the player's only job is movement. Every 30 seconds a wave ends, the player gains a power-up choice, and the next wave begins harder than the last. A run lasts between 10 and 20 minutes. Death ends the run permanently. The loop is: move, survive, grow stronger, die, upgrade your roster, try again.

The game targets the same audience as Vampire Survivors and Survivor.io but differentiates through:
- A tighter, more readable isometric art style with clear enemy silhouettes.
- A wave structure that creates deliberate pacing peaks and troughs (not endless escalation).
- Three distinct currencies that separate moment-to-moment rewards from long-term investment, removing pay-to-win tension from the run itself.

**Tone:** Chaotic but readable. Cute but crunchy. Fast but fair.

---

## 2. CORE PILLARS

### Pillar 1 — Movement is Skill
Auto-combat means the player cannot directly control when or what they attack. Positioning is therefore the primary skill expression. Good players live longer not because they have better reactions but because they read enemy patterns, stay mobile, and funnel enemies into their attack cone. Bad positioning punishes even maxed-out builds.

Design rule: No upgrade ever removes the need to move. No upgrade should make standing still optimal.

### Pillar 2 — Build Legibility
Every upgrade must be immediately readable in the HUD and visibly expressed in the game world. If the player picks "Splash radius +30%," the attack ring on the ground around the hero must grow. If they pick "Attack speed +20%," the swing animation must be visually faster. The player must always be able to look at their hero and understand their current power state.

Design rule: Every stat has a visual representation. No invisible buffs.

### Pillar 3 — Predictable Wave Structure
Players must always know roughly how much time remains in a wave and roughly how strong the next wave will be. Surprise spikes feel unfair. Anticipated escalation feels earned. The timer board and wave bar exist to communicate this contract with the player at all times.

Design rule: No off-screen spawns. No unannounced elite waves. Warn 3 seconds before every elite or boss event.

### Pillar 4 — Short Session Respect
A failed run should feel instructive, not punishing. The meta-progression system (permanent upgrades) ensures every run, even a failed one, moves the player forward. Sessions can be played in 5-minute bursts (a single run) or 30-minute sessions (multiple runs + meta upgrades). The game never forces the player to watch long animations or unskippable sequences between runs.

Design rule: From death screen back to gameplay in under 15 seconds.

---

## 3. GAME LOOP

### 3.1 Single Run Loop

```
START RUN
    │
    ▼
[Wave begins — enemies spawn from edges]
    │
    ├─ Player moves, attacks auto-fire
    ├─ Enemies drop Coins and Green Gems on death
    ├─ Wave Timer counts down (visible TimerBoard)
    │
    ▼
[Wave Timer reaches zero OR all enemies defeated]
    │
    ▼
[3-second breather — no spawns, pickups linger]
    │
    ▼
[LEVEL-UP SCREEN if LevelBar is full]
    └─ Player chooses 1 of 3 upgrade cards
    OR
[WAVE CLEAR if LevelBar not full]
    └─ Next wave begins immediately after breather
    │
    ▼
[Repeat for up to 20 waves]
    │
    ▼
[BOSS WAVE at wave 10 and wave 20]
    │
    ▼
[Run ends: player survives wave 20 = VICTORY / player dies = DEFEAT]
    │
    ▼
[Results screen — coins and gems tallied]
    │
    ▼
[META screen — permanent upgrades purchased]
    │
    ▼
[Start next run]
```

### 3.2 Pacing Curve Per Run

| Wave | Difficulty | Duration | Special Event |
|------|------------|----------|---------------|
| 1–3 | Tutorial ramp | 30s each | None |
| 4–6 | Moderate | 35s each | First Elite enemy at wave 5 |
| 7–9 | Hard | 35s each | Swarm event at wave 8 |
| 10 | Boss wave | Until boss killed | Mini-boss |
| 11–14 | Hard | 40s each | Two enemy types active |
| 15–19 | Very Hard | 40s each | Elites spawn every 60s |
| 20 | Final Boss | Until boss killed | Full boss fight |

There are no random difficulty spikes between defined waves. Elites within a wave are announced by a 3-second "!" indicator before they spawn.

### 3.3 Session Loop (Multiple Runs)

The player is expected to play 2–5 runs per session. After each run, the meta-screen opens automatically. The player spends permanent currency (Red Gems) to upgrade their roster stats. This gate is soft — a player can always start a new run immediately without upgrading.

---

## 4. INPUT SYSTEM

### 4.1 Movement

The game uses a **floating virtual joystick**. There is no fixed joystick position. The joystick appears wherever the player places their thumb and remains active for the duration of that touch. Lifting and re-placing the thumb repositions the joystick origin.

- Dead zone: 8% of joystick radius. Below this threshold, the player is considered stationary.
- Maximum speed is reached at 80% of joystick radius. The outer 20% provides no additional speed (prevents accidental max-speed sprints from edge-placement).
- The joystick visual is a subtle translucent ring — not a dominant UI element. It fades to 40% opacity after 0.5 seconds of no direction change.

### 4.2 What the Player Never Controls

- Attack direction: The hero always attacks the nearest enemy within range. The range is visualized by the attack ring on the ground around the hero.
- Ability timing: All abilities and attacks fire automatically when their cooldown expires.
- Pickup collection: All ground pickups are collected automatically when the hero walks near them. Collection radius is 1.5x the hero's visual sprite width.

### 4.3 Touch Interactions Outside of Gameplay

- Pause: Tap the pause button (top-left). No accidental pause — the button requires a deliberate tap within its bounds.
- Level-up screen: Tap one of three cards. The card scales up on press (immediate tactile feedback) and applies the upgrade. No drag, no swipe.
- All menus: Single tap to confirm. No double-tap required anywhere.

### 4.4 No Gyroscope, No Multi-Touch Gameplay

The game uses single-touch input only. The second touch is ignored during gameplay. Gyroscope is not used. The game must be fully playable with one thumb.

---

## 5. PLAYER CHARACTER SYSTEM

### 5.1 The Hero

The default hero is a chibi knight — small, armored, cat-eared helmet. This is the starting character and the design reference point for all other characters. Every hero has the same base stat template:

| Stat | Value | Meaning |
|------|-------|---------|
| Max HP | 100 | Starting health |
| Move Speed | 3.2 units/s | Base movement |
| Attack Range | 2.5 units | Radius of attack ring |
| Attack Damage | 12 | Per hit |
| Attack Speed | 1.2 hits/s | Auto-attack rate |
| Crit Chance | 8% | Chance to deal 2x damage |
| Crit Multiplier | 2.0x | Damage on crit |
| Armor | 0 | Flat damage reduction |

Units are abstract grid units. All design values refer to grid units. No real-world measurement is implied.

### 5.2 Hero Roster

Additional heroes unlock through meta-progression. Each hero uses the same base stat template but starts with different values and has one unique Signature Ability that cannot be acquired by other heroes.

Roster is designed to have 6 heroes at launch. Only the knight is available at first.

**Hero roster design constraints:**
- Each hero must have a visually distinct silhouette at 64x64px.
- Each hero's Signature Ability must be expressible in one line of text.
- No hero starts with a stat more than 40% above or below the base stat template.

### 5.3 Hero Leveling (In-Run)

The LevelBar fills as the player collects Green Gems (XP gems). When the bar fills, the player immediately levels up and is presented with the Level-Up screen (see Section 10). There is no cap on level within a run — the player can level as many times as they collect XP to fill the bar. XP required per level scales with a smooth curve:

`XP_required(level) = 20 × level^1.4`

This curve ensures early levels feel fast (power comes quickly) and later levels feel earned (the player has to work for later upgrades). The LevelBar UI always shows current XP vs. XP to next level.

### 5.4 Hero Death

When HP reaches 0, the hero plays a death animation (0.8 seconds), the screen darkens, and the death screen appears. There is no revival mechanic in the base game. Death ends the run immediately and permanently. Permadeath is non-negotiable to the design — it is what gives upgrades meaning.

---

## 6. COMBAT SYSTEM

### 6.1 Auto-Attack

The hero continuously attacks the nearest enemy within their attack range at the hero's current Attack Speed. The attack range is visualized by a persistent ring on the ground (the orange/blue circle seen in the concept). This ring scales visually with the Attack Range stat — if range increases, the ring grows.

Target priority order:
1. Nearest enemy to hero.
2. If tied: lowest remaining HP.
3. If still tied: random selection.

Target is re-evaluated every 0.25 seconds. If the current target moves out of range, the hero immediately re-targets.

### 6.2 Critical Hits

Every attack rolls against the hero's Crit Chance. A critical hit deals damage equal to `base_damage × crit_multiplier`. Critical hits display the "CRIT!" floating text in orange, scaled 1.4x larger than normal damage numbers. Critical hit sound is a distinct audio layer on top of the normal hit sound.

### 6.3 Splash Damage

Splash is a damage type that affects all enemies within a radius around the primary target. Splash damage is expressed as a percentage of the primary hit's damage. Splash radius is shown briefly as an expanding ring on the ground at impact.

Base heroes start with 0 splash. Splash is unlocked through the upgrade system (see Section 10). When splash is active, the word "Splash" appears as a secondary floating text below the primary damage number.

### 6.4 Damage Number Rules

Floating damage numbers follow strict rules to maintain readability:

- Normal hit: white text, small size, floats upward 0.4 seconds, fades out.
- Crit hit: orange text, 1.4x scale, floats upward 0.6 seconds.
- Splash hit: gray text, slightly smaller than normal, appears offset from the primary target.
- No more than 12 simultaneous damage numbers on screen. When the cap is hit, the oldest number is immediately removed.
- Damage numbers never appear behind the hero sprite.

### 6.5 Enemy Collision with Player

Enemies deal damage by contact with the hero sprite. Contact damage fires once per 0.5 seconds per enemy — an enemy pressing against the hero deals one damage tick every 0.5 seconds. Projectile enemies (see Section 7) fire at the player; projectiles deal damage on impact and are then destroyed.

There is no knockback on the hero from contact. The hero's movement is never interrupted by taking damage. Taking damage triggers a brief visual flash (red tint on hero sprite, 0.15 seconds) and a camera shake (magnitude 4, duration 0.2 seconds).

---

## 7. ENEMY SYSTEM

### 7.1 Enemy Design Principles

All enemies are mutant vermin — rats, mice, and related pest variants equipped with improvised weapons. This theme provides:
- A clear "us vs. them" framing without human violence.
- A wide design space for visual variety (size, color, weapon type).
- A tone that reads cute-threatening — dangerous but not grim.

Every enemy must be readable at a glance from its silhouette alone. No two enemy types may have the same silhouette at the gameplay scale. Enemy silhouettes are designed at 48x48px and must be distinguishable in a crowd.

### 7.2 Enemy Stat Template

| Stat | Description |
|------|-------------|
| HP | Total health points |
| Move Speed | Units per second |
| Contact Damage | Damage dealt per 0.5s of contact |
| Damage Type | Contact, Projectile, or Area |
| Point Value | Green Gems dropped on death |
| Coin Value | Gold Coins dropped on death (not guaranteed) |
| Aggro Range | Distance at which enemy begins chasing the hero |

### 7.3 Enemy Roster (Launch)

**Grunt Rat** — The baseline enemy. Runs directly at the hero. No weapons, pure contact damage. Small, fast, low HP. Appears in all waves. Teaches the player that movement avoids damage.

Stats: HP 18, Speed 2.8, Contact Damage 6/tick, Drops: 1 Green Gem, 15% chance 1 Coin.

**Gunner Mouse** — Medium-sized mouse with a minigun. Keeps distance from the hero (preferred range: 4–6 units). Fires a burst of 3 projectiles at the hero every 2 seconds. Projectiles are slow and telegraphed. Teaches the player that not all enemies want to close range.

Stats: HP 35, Speed 1.8, Projectile Damage 8/hit, Drops: 2 Green Gems, 30% chance 1 Coin.

**Drone Rat** — A flying rat with a mechanical body. Moves in arcs rather than straight lines. Immune to splash damage (flies above the ground ring). Must be targeted directly. Teaches the player that not all enemies are on the ground plane.

Stats: HP 28, Speed 3.4, Contact Damage 10/tick, Drops: 2 Green Gems, 20% chance 1 Coin.

**Sewer Bruiser** — A large, slow rat with heavy armor. Takes 50% reduced damage from the front, full damage from the sides and rear. Moves slowly but hits hard. Teaches the player that positioning relative to enemy facing matters.

Stats: HP 120, Speed 1.2, Contact Damage 20/tick, Drops: 5 Green Gems, 60% chance 2 Coins.

**Gas Rat** — A rat in a gas mask that periodically releases a toxic cloud at its current position. The cloud lingers for 4 seconds and deals damage to the hero if they enter it. The rat itself still chases the player. Teaches the player to avoid standing still.

Stats: HP 45, Speed 2.2, Cloud Damage 5/tick (in cloud), Cloud Radius 2 units, Drops: 3 Green Gems, 40% chance 1 Coin.

**Elite variants** exist for all 5 base enemy types. Elites have 2.5x HP, 1.3x speed, and deal 1.5x damage. They are visually distinguished by a glowing outline and a larger size (1.3x sprite scale). Elites are rare within waves and always announced before spawning.

### 7.4 Enemy AI State Machine

All enemies use a three-state AI:

**IDLE** — Enemy has spawned but hero is outside Aggro Range. Enemy wanders slowly in random directions. Transition to CHASE when hero enters Aggro Range.

**CHASE** — Enemy moves directly toward hero's current position. No pathfinding prediction — enemies aim at where the hero is, not where they will be. This is intentional: it keeps the AI readable and rewards player movement. Transition to ATTACK when within attack range.

**ATTACK** — Enemy deals damage (contact or fires projectile). Continues to close range if contact type. Transition back to CHASE if hero moves out of attack range.

Enemies do not communicate with each other. There is no coordinated flanking, no formations, no swarm intelligence. The threat comes from numbers and variety, not AI sophistication. This is a deliberate design choice that keeps the game readable and the CPU cost low.

### 7.5 Boss Design

Two bosses exist at launch (wave 10 and wave 20). Bosses follow the same three-state AI but have multiple attack phases triggered at HP thresholds (75%, 50%, 25%). Each phase adds a new attack pattern. Bosses are announced with a full-screen title card (1.5 seconds, skippable after 0.5s by tapping).

Boss HP is shown by a dedicated health bar at the top of the screen, replacing the WaveBarContour and WaveBarIn during boss waves. The LevelBar remains visible during boss waves.

---

## 8. WAVE SYSTEM

### 8.1 Wave Timer

Each non-boss wave has a fixed duration shown by the TimerBoard at the bottom of the screen. The TimerBoard is a segmented bar — each segment represents approximately 3 seconds. Segments deplete left to right. Color shifts from green (safe) to yellow (halfway) to red (final 20%). The current wave number is displayed above the TimerBoard.

When the TimerBoard reaches zero, all remaining enemies on screen drop a reduced loot payload (50% normal drops) and despawn with a brief visual effect (dissolve, 0.3 seconds). The wave is then scored.

### 8.2 Spawning

Enemies spawn at the edges of the visible arena, always off-screen. Spawn positions are randomized along the arena perimeter but weighted away from the player's current position — enemies never spawn directly behind the player. Spawn events happen in bursts: a group of 3–8 enemies spawns simultaneously, followed by a 2–5 second pause before the next burst. This burst-pause rhythm creates breathing room within a wave.

The number of simultaneous spawns, burst frequency, and enemy mix are defined per wave in a wave data table. This table is authored explicitly — no procedural enemy generation during runs. This ensures every wave 7 feels like wave 7, not a random roll.

### 8.3 Enemy Count Display

The EnemyCount indicator (top-right) shows the number of enemies currently alive on screen. This is a count display, not a progress bar — it tells the player exactly how many enemies remain. The number decreases as enemies are killed. It does not include enemies that have not yet spawned in the current burst.

---

## 9. PICKUP & CURRENCY SYSTEM

### 9.1 Three-Currency Model

**Green Gems (XP)** — Earned exclusively in-run by killing enemies. Cannot be spent. Filling the LevelBar with Green Gems triggers level-up upgrade choices. Green Gems have no value outside of the current run. They are the primary moment-to-moment reward for killing enemies.

**Gold Coins** — Earned in-run by killing enemies (random drop). Persist at end of run and are added to the player's coin wallet. Spent in the meta-shop for cosmetics and roster unlocks. Coins are not used for power upgrades — they are entirely cosmetic currency. This separates skill (XP progression in-run) from aesthetics (coin spending post-run).

**Red Gems** — Rare currency. Earned at end of run (bonus based on performance: waves survived, total damage dealt). A small number of Red Gems can also be earned through daily quests. Spent in the meta-upgrade screen for permanent stat improvements. Red Gems are never sold for real money in the base design — they are earned only through play.

### 9.2 Pickup Behavior

Ground pickups appear where an enemy died. They persist on the ground for 12 seconds before auto-despawning with a brief flash warning at 9 seconds. Pickups are collected automatically when the hero's collection radius overlaps the pickup. There is no manual pickup button.

- Green Gems pulse with a gentle glow to attract the eye.
- Gold Coins spin slowly.
- Red Gems are rare enough that they emit a short sparkle particle on spawn.

Multiple pickups from the same enemy death stack visually — they spawn at slightly randomized offsets from the death position, not all on the same pixel.

### 9.3 Pickup Magnetism (Late-Run Upgrade)

An optional upgrade available after level 10 increases collection radius by 100%. A second stack (available after level 15) doubles it again. At maximum, the player's collection radius covers roughly 1/4 of the screen. This is a "quality of life feels powerful" upgrade — it dramatically reduces missed pickups without changing combat balance.

---

## 10. PROGRESSION SYSTEM

### 10.1 In-Run Upgrades (Level-Up Cards)

On level-up, play pauses and the player is presented with 3 upgrade cards drawn from the available upgrade pool. The player taps one card to select it, and play resumes immediately.

Card draw rules:
- Cards are drawn without replacement from the current pool. The same upgrade can only appear twice in a run if it has a second tier.
- Each upgrade has a rarity: Common, Uncommon, Rare. The draw weights are 60/30/10.
- On level-up, the draw pool is seeded by the player's current build — upgrades that synergize with already-selected upgrades have their draw weight multiplied by 1.5. This is not visible to the player but creates natural build coherence.

Cards show:
- Upgrade name (large)
- One-line description of the effect
- Visual icon (64x64px)
- Rarity indicator (colored border: gray/blue/gold)

### 10.2 Upgrade List (Launch — 24 Upgrades)

**COMMON (12 upgrades)**

| Name | Effect |
|------|--------|
| Sharp Edge | +15% Attack Damage |
| Quick Hands | +10% Attack Speed |
| Iron Skin | +20 Max HP |
| Fleet Foot | +8% Move Speed |
| Lucky Strike | +4% Crit Chance |
| Hunter's Eye | +15% Attack Range |
| Coin Magnet | +50% Pickup Radius |
| Resilience | +5 Armor (flat damage reduction) |
| Bloodthirst | Killing an enemy heals 1 HP |
| Momentum | After 3 kills in 2 seconds: +20% Speed for 3s |
| Venom Edge | Attacks apply Poison (3 dmg/s for 4s) |
| Glass Cannon | +30% Attack Damage, -15 Max HP |

**UNCOMMON (8 upgrades)**

| Name | Effect |
|------|--------|
| Whirlwind | Attacks hit all enemies in range simultaneously (replaces single-target) |
| Shockwave | Every 5th attack sends a shockwave (AoE at 60% dmg) |
| Berserker | Below 30% HP: +40% Attack Speed |
| Colossus Step | Max HP +50, Move Speed -5% |
| Chain Lightning | Attacks chain to 1 nearby enemy at 40% damage |
| Warlord's Cry | Every 20 kills: all stats +5% for 10s (stackable) |
| Spectral Blade | 20% of attacks become a second ghost hit (no visual) |
| Magnet Pulse | Every 8s: pulls all pickups on screen to the hero |

**RARE (4 upgrades)**

| Name | Effect |
|------|--------|
| Deathmark | First hit on any enemy deals 3x damage |
| Phoenix Heart | Once per run: revive at 30% HP on death |
| Void Splash | All attacks deal splash damage equal to 40% of primary |
| Overclock | +40% Attack Speed, +40% Crit Chance, -20% Attack Damage |

### 10.3 Upgrade Tiers

Some Common upgrades have a Tier 2 version that appears only after the Tier 1 has been selected. Tier 2 upgrades are stronger and have a rarity upgrade (e.g., Tier 2 of a Common becomes Uncommon rarity in the draw pool, increasing its weight relative to other Uncommons). Tier 2 upgrades are not a separate entry in the pool until the prerequisite is owned.

Tier 2 upgrades are intentionally limited to stats only (damage, speed, range, etc.) — ability upgrades do not have tiers. This prevents ability stacking from becoming an optimization puzzle and keeps the run-loop pick choices feeling fresh.

### 10.4 Meta-Progression (Permanent Upgrades)

Purchased with Red Gems at the meta-screen between runs. Permanent upgrades raise the floor of every run — they do not cap or replace in-run upgrades. They are never strong enough to make a run trivially easy.

| Upgrade | Max Level | Cost per Level | Effect per Level |
|---------|-----------|----------------|-----------------|
| Starting HP | 5 | 3 Red Gems | +10 Max HP at run start |
| Starting Damage | 5 | 3 Red Gems | +5% Base Damage at run start |
| Starting Speed | 3 | 5 Red Gems | +3% Base Speed at run start |
| XP Bonus | 5 | 4 Red Gems | +5% Green Gem value |
| Coin Bonus | 5 | 2 Red Gems | +10% Coin drop rate |
| Starting Armor | 3 | 6 Red Gems | +2 Armor at run start |

Maximum investment: 130 Red Gems for full unlock. A player earning 5–10 Red Gems per run reaches full meta-unlock in 15–25 sessions. This is the intended progression ceiling, not an infinite treadmill.

---

## 11. UI & HUD DESIGN

All UI coordinates are expressed in a reference portrait resolution of 390×844 logical pixels. All HUD elements scale proportionally with screen size.

### 11.1 HUD Element Map

```
┌──────────────────────────────────┐
│ [PAUSE]   [LEVELBAR progress]  [💎][💎] │
│ [CoinCount 🪙]                         │
│                                        │
│                                        │
│                        [EnemyCount 🐭] │
│                        [WaveBarContour]│
│                        [WaveBarIn    ] │
│                                        │
│         [GAME WORLD]                   │
│                                        │
│                                        │
│                                        │
│                                        │
│                                        │
│      [TimerBoard ████████████░░]       │
└──────────────────────────────────┘
```

### 11.2 Element Specifications

**Pause Button** — Top-left. 44×44px touch target. Displays a standard II icon. Tapping opens the Pause Menu overlay (see Section 11.3).

**LevelBar** — Top-center, full width minus 100px on each side. 12px tall, rounded ends. Fill color: blue gradient (left to right). Background: dark translucent. Current XP and required XP shown as text below the bar in 11px font. On level-up: bar flashes white, emits a particle burst, then fills to zero for the next level.

**Green Gem Display** — Top-right, first icon. Shows a green diamond gem icon with no number (total XP is not displayed — only the LevelBar matters). Reserved for future "active ability charge" display.

**Red Gem Display** — Top-right, second icon. Shows current Red Gem count in the player's wallet. Updated after each run.

**CoinCount** — Top-left, below pause button. Gold coin icon + current coin count. Updates in real-time as coins are collected.

**EnemyCount** — Right side, upper third. Shows the current alive enemy count as `[rat icon] [number]`. Text is white. No animation on number change.

**WaveBarContour** — Right side, below EnemyCount. A thin dark rectangle, 80px wide × 14px tall. This is the background/border of the wave bar.

**WaveBarIn** — Inside WaveBarContour. A fill that represents progress through the current wave sequence (wave 1/20 = 5% fill, wave 10/20 = 50% fill). Fill color shifts from green to orange to red as waves progress. Serves as a long-arc context bar — not the same as the TimerBoard which shows within-wave progress.

**TimerBoard** — Bottom-center. 220px wide × 32px tall. Segmented into 10 equal cells. Each cell fills with a gradient color (green→yellow→red based on remaining time). Cells deplete left to right as time passes. Wave number displayed above the bar in 13px bold font.

### 11.3 Pause Menu

A dark overlay with:
- **Resume** (large button)
- **Restart** (medium button, requires confirmation tap)
- **Settings** (medium button — audio toggles only, no gameplay settings mid-run)
- **Quit to Menu** (small button, requires confirmation tap)

No advertisements in the pause menu. Pausing does not reward the player in any way.

### 11.4 Level-Up Screen

Full-screen darkened overlay. Three cards laid horizontally, each approximately 110px wide × 180px tall. Cards have:
- Rarity border glow (gray/blue/gold)
- Icon (48×48px)
- Name in 15px bold
- Description in 11px regular
- "TAP TO SELECT" prompt in small italic below each card

When a card is tapped: it scales up to 120% over 0.1 seconds, then the overlay dismisses in 0.2 seconds as play resumes. The other two cards fade to 0% opacity simultaneously.

A "SKIP" text button appears in small font below the three cards. Tapping it dismisses the screen with no upgrade selected. Skip is intentional — it allows experienced players to avoid taking an upgrade that might hurt their current build.

### 11.5 Death Screen

Black background. Hero sprite in death pose (grayscale). Large text: "DEFEATED". Below: "Waves survived: [n] / 20". Below: coin and gem earnings from the run. Two buttons: "RETRY" (large, prominent) and "RETURN TO MENU" (smaller, below). No forced delay, no unskippable animation. Retry begins a new run in under 15 seconds total.

---

## 12. ART DIRECTION

### 12.1 Visual Style

The game uses a **chibi isometric** art style. "Chibi" means characters have oversized heads relative to bodies (approximately 1:1 head-to-body ratio). "Isometric" means the world is rendered from a fixed 45-degree angle with consistent dimetric projection (2:1 pixel ratio for horizontal:vertical movement).

The art style is intentionally cartoonish and colorful. It is not realistic. Edges are clean. Outlines are 2px black. Shadows are flat and stylized, not simulated. This choice is made for:
- Readability at small sizes on mobile screens.
- Lower art production cost than realistic styles.
- Timeless appeal — the game should not look dated in 3 years.

### 12.2 Color Palette

The world palette is desaturated urban grays and greens (roads, cracked pavement, grass patches). Character and enemy colors are fully saturated to stand out from the environment. Pickups use the highest-saturation colors in the game (bright green for XP gems, shining gold for coins, vivid red for Red Gems).

This creates a natural visual hierarchy:
1. The hero (always visible, brightly colored)
2. Pickups (saturated, must be collected)
3. Enemies (saturated but darker)
4. Environment (desaturated, never confusing for a character)

### 12.3 Arena Design

Arenas are isometric urban environments composed of tiled assets: road tiles, grass tiles, cracked pavement tiles, manhole covers, rubble piles. All arenas at launch use the same tile set (urban city). A second tile set (sewer) is planned for post-launch.

Arena size: 16x16 grid units visible on screen at any time. The hero is always centered in the viewport. The arena wraps — if the hero walks off the right edge, they emerge from the left. Wrap is instantaneous with no transition. Enemies that are chasing the hero path toward the hero through the wrap boundary.

The arena is not procedurally generated. A small number (4–6) of hand-authored arena layouts are assigned to runs in rotation. Each layout places rubble and grass tiles differently, creating visual variety while maintaining consistent gameplay geometry.

### 12.4 Animation Standards

Characters use sprite sheet animation. Minimum frame counts per character:

- Idle: 4 frames
- Walk: 6 frames
- Attack: 5 frames (anticipation, strike, follow-through, recovery × 2)
- Hurt: 2 frames
- Death: 6 frames

Enemy animations follow the same minimums. All animations loop seamlessly. Attack animations must clearly communicate their hitbox timing — the visual impact frame and the mechanical damage frame must be the same frame.

### 12.5 Particle Effects

Particle effects are used for: hit sparks, gem drop sparkle, critical hit burst, coin spawn, attack ring pulse. All particle effects have a hard cap of 60 simultaneous particles on screen. Effects above this cap are simply not spawned — the game never sacrifices frame rate for particles.

---

## 13. AUDIO DIRECTION

### 13.1 Music

Two music tracks at launch:

**Run Track** — Upbeat, looping, approximately 2 minutes before loop point. Tempo: 140–160 BPM. Genre: Electronic with light orchestral elements. The track must feel energetic but not exhausting — it will play on loop for up to 20 minutes. The track has a "low intensity" layer (first 10 waves) and a "high intensity" layer (waves 11–20) achieved through dynamic mixing (the same track, additional instrument layers fade in). The shift happens gradually over 8 seconds, not as a cut.

**Boss Track** — Distinct from the run track. Darker, more percussive. Fades in over 3 seconds at boss wave start. Fades back to run track on boss defeat.

**Menu Track** — Calm, ambient, shorter loop. Not present during gameplay.

### 13.2 Sound Effects

Every mechanical event has a unique sound effect. Critical design sounds that must be immediately recognizable and distinct from each other:

- Normal hit
- Critical hit (distinct from normal — should feel "punchier")
- Enemy death
- Player hurt
- Player death (distinct from all others — must feel "final")
- XP gem collected
- Coin collected
- Level up (positive, brief — cannot be long since the level-up screen opens immediately)
- Wave clear
- Boss spawn warning

Sound effects must not fatigue the player. Attack sounds (repeated rapidly during combat) should be short (under 0.3 seconds) and dynamically pitched ±5% per hit to prevent exact repetition fatigue.

### 13.3 Accessibility

All music and sound effects are independently toggleable in Settings. Default: both on. The game must be fully playable with all audio off (no audio-only cues for gameplay critical information).

---

## 14. META-GAME & RETENTION SYSTEMS

### 14.1 Daily Quests

Three quests refresh every 24 hours. Each quest awards Red Gems on completion. Examples:

- "Deal 5,000 total damage in a single run" → 2 Red Gems
- "Survive to wave 10 or beyond" → 3 Red Gems
- "Collect 50 Gold Coins in a single run" → 1 Red Gem

Quests track automatically. Progress is visible on the meta-screen. Completing all 3 quests in a day awards a bonus (1 additional Red Gem). Quests are not time-gated within the day — they persist until completed or the 24-hour reset.

### 14.2 Achievement System

One-time achievements reward the player for milestones: first boss kill, first run surviving to wave 20, first time selecting a Rare upgrade, etc. Achievements award Red Gems and unlock cosmetic items (hero skins, pickup effect colors). There are 30 achievements at launch.

Achievements are displayed in a dedicated screen on the main menu. The player can see locked achievements and their unlock conditions — no mystery achievements.

### 14.3 Hero Unlock

Heroes beyond the default knight are unlocked by spending Coins at the roster screen. Each hero has a fixed Coin price. No hero requires Red Gems — Red Gems are exclusively for power upgrades. No hero requires real money. This ensures the hero roster is a cosmetic/playstyle choice, not a power-gated purchase.

---

## 15. BALANCING PHILOSOPHY

### 15.1 The Baseline Run

A player with zero meta-upgrades, playing the default knight, selecting upgrades semi-randomly, should be able to reach wave 10 (first boss) on approximately their 5th attempt. They should reach wave 20 (final boss) on approximately their 20th total attempt. This is the intended difficulty without mastery.

A player with full meta-upgrades and high skill should routinely clear wave 20 and should be able to do so within their first 3 attempts of a new session. The gap between new and expert player should feel like 3–5 waves of longevity difference, not an unbridgeable skill wall.

### 15.2 Upgrade Balance Target

No single upgrade combination should reduce the game to a passive experience where the player can stand still and win. If a combination is discovered that allows this, it is a balance bug, not an intended "op build" to be celebrated. The damage model should ensure that standing still with any build results in the hero taking lethal damage within approximately 15 seconds.

### 15.3 Enemy HP Scaling Per Wave

Enemy HP scales by a multiplier per wave: `HP(wave) = base_HP × (1 + 0.12 × wave_number)`. At wave 20, enemies have 3.4x their base HP. This scaling applies to all enemies, including elites (which already have a 2.5x multiplier applied on top).

The player's expected damage per second from upgrades should outpace this HP curve in a well-constructed build. A run with poor upgrades will begin to struggle at waves 14–16. A run with good upgrades will handle wave 20 with visible but manageable difficulty.

### 15.4 Tuning Philosophy

All balance numbers in this document are initial targets for first internal playtest. They are expected to change. The following must remain constant regardless of tuning:

- Three currencies with distinct roles.
- Permadeath.
- Auto-combat, manual movement.
- 20-wave structure with bosses at 10 and 20.
- Wave timer visible at all times.
- No real-money purchases for power (only cosmetics).

These are not balance decisions — they are design commitments. All other numbers are tunable.

---

*Document maintained by the core design team. All section headings are final for v1.0 scope. Expansion of any section requires a revision to the version number and a changelog entry.*
