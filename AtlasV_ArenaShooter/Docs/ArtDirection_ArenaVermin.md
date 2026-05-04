# ARENA VERMIN — Art Direction Reference
**For AI Agent Use | Version 1.1**
**Companion document to the Game Design Document. This document governs all visual output.**

> **v1.1 Change — Animation Philosophy:** Spritesheet-based frame animation is abolished. All character and enemy animation is produced by code-driven transforms on static single-frame sprites. Weapons are separate layered sprites. Read Section 3B and Section 12 in full before generating or evaluating any animated entity.

---

## HOW TO USE THIS DOCUMENT

This document is the single source of truth for every visual decision in Arena Vermin. When generating, evaluating, or critiquing any asset — sprite, UI element, particle effect, color choice, layout — resolve disputes by checking this document first. If a specific value is listed here, use it exactly. If a situation is not explicitly covered, apply the nearest analogous rule and flag the gap for human review.

Document structure: each section answers one question. Read the question header, then the answer. Do not infer intent from adjacent sections.

---

## SECTION 1 — CAMERA & PROJECTION

### What projection system does the game use?

**Dimetric isometric projection.** Specifically: the camera is positioned at a fixed 45-degree horizontal rotation and a fixed 30-degree vertical tilt above the ground plane. This is not true isometric (which uses a 35.26° vertical angle) — it is dimetric, which means horizontal distances are twice vertical distances in pixel space.

Pixel ratio rule: **2 horizontal pixels = 1 vertical pixel.** A tile that is 64px wide occupies 32px of vertical height. A tile that is 128px wide occupies 64px of vertical height. Apply this ratio to every ground-plane element.

### Is the camera static or dynamic?

Static angle. The camera never rotates, tilts, or zooms during gameplay. The projection angle never changes between levels, menus, or UI screens.

The camera does move in 2D screen space: it follows the hero character, keeping the hero always centered in the viewport. The world scrolls; the camera angle does not change.

### What is the camera shake behavior?

Camera shake is a 2D screen-space displacement only. It does not change the projection angle. Shake parameters: magnitude 4px, duration 0.2 seconds, frequency 30Hz, damped (magnitude reduces linearly to 0 over the duration). Shake is axis-aligned: equal displacement on X and Y. No rotational shake.

### What is the viewport reference size?

390×844 logical pixels (portrait). All art and layout coordinates reference this canvas. Assets must scale proportionally to other screen sizes. Do not design for a specific physical pixel density — design for the logical canvas.

---

## SECTION 2 — ART STYLE DEFINITION

### What is the art style in one sentence?

**Chibi cartoon sprites on a clean isometric tileset, rendered in a limited palette with black outlines, flat lighting, and no texture detail on characters.**

### What does "chibi" mean as a constraint?

Chibi is a visual proportion system, not a mood. It imposes the following hard rules:

- **Head-to-body ratio: 1:1.** The character's head occupies exactly half of the total sprite height. This applies to the hero and all enemy types.
- **Limb simplification.** Arms and legs are single-segment shapes. No elbows, no knees rendered separately. Limbs are rounded rectangles or cylinders.
- **Face dominance.** The face occupies 60% of the head area. Eyes are the dominant facial feature — they are large, round, and use 2–3 colors maximum (white, iris color, black pupil).
- **Foot size.** Feet are slightly oversized relative to the leg — approximately 1.3× the limb width. This gives characters a planted, grounded feel.
- **No necks.** The head connects directly to the body with no visible neck transition.

### What does "cartoon" mean as a constraint?

- **Outlines are mandatory.** Every sprite has a consistent black outline. Outline width: 2px at the 64px sprite scale. If a sprite is rendered at 2× (128px), the outline is still 2px (do not scale outlines).
- **No gradients on character sprites.** Shading is represented by a single darker flat tone, not a gradient. Each color area uses exactly two values: a base color and one shadow tone. The shadow tone is the base color darkened by 25% HSB value, no hue shift.
- **No ambient occlusion, no normal maps, no specular highlights** on sprite surfaces. Characters are fully flat-lit. The only exception is a single specular dot (1–2px white circle) on shiny surfaces like metal helmets or eyeballs.
- **No anti-aliasing on sprite edges.** Sprites are pixel art. Edges are hard. The only soft edges permitted are in particle effects and UI glows.

### What does "limited palette" mean as a constraint?

Each sprite uses a maximum of 8 colors (counting outline black and shadow tones separately from their base colors). Across all sprites, colors must come from the approved master palette defined in Section 4. Do not introduce new colors in a new sprite — map to the nearest master palette entry.

### What visual style is explicitly forbidden?

- Realistic proportions on characters.
- Gradients on sprite fill areas.
- Photographic textures anywhere.
- Drop shadows on sprites (drop shadows are permitted on UI elements only).
- Cel-shading ramp textures.
- Painterly brush strokes.
- Glow outlines on characters during normal gameplay (glows are reserved for pickups and elite enemy indicators).
- **Spritesheet frame animation on characters or enemies.** Do not generate multi-frame walk cycles, attack sequences, or death sequences as sprite sheets. All motion is produced by code-driven transforms on a single static sprite per entity layer. See Section 3B and Section 12 for the complete animation system.

---

## SECTION 3 — CHARACTER DESIGN RULES

### What are the hero design rules?

The default hero is a small armored knight. All hero designs must follow these constraints:

**Silhouette test:** The hero's silhouette at 48×48px must be distinguishable from all enemy silhouettes at the same resolution when both are displayed in solid black against white. Silhouettes must not require color to identify which is which.

**Armor color:** The hero's armor is blue-gray (#6B8BAF primary, #4A6080 shadow). This is the design reference. Alternative hero colorways must use different hue families — no two heroes may use the same hue family within 30° on the color wheel.

**Weapon visibility:** The hero's weapon must be visible and legible at 32×32px. Weapons extend outside the main body silhouette. The weapon sprite must read as a recognizable object category (sword, staff, bow, etc.) at thumbnail scale.

**Cat-ear helmet:** The default knight has cat-eared protrusions on the helmet. These are design signature elements — they serve as the hero's signature silhouette identifier. Do not add cat ears to any enemy type. Do not add any other animal-ear variant to any hero unless it is their exclusive design element.

### What are the enemy design rules?

All enemies are vermin — rats, mice, moles, or related rodents. No other animal types permitted at launch.

**Required per enemy type:**

| Constraint | Rule |
|---|---|
| Silhouette uniqueness | Must be distinguishable from all other enemy types at 48px in black silhouette |
| Hue identity | Each enemy type owns one hue from the master palette. No two enemy types share a primary hue |
| Weapon presence | Every enemy must have at least one visible held or worn object that indicates its threat (gun, gas mask, body armor, mechanical parts) |
| Size hierarchy | Enemies scale by tier: Grunt = 32px, Standard = 48px, Elite = 64px (1.3× standard), Boss = 96px |
| Gas mask rule | Gas mask is worn only by Gas Rat enemy. No other enemy wears a gas mask. It is a functional identifier, not a decorative element |

**Color assignment per enemy type:**

| Enemy | Primary Hue | Hex |
|---|---|---|
| Grunt Rat | Warm brown | #8B6050 |
| Gunner Mouse | Steel gray | #6B7B8B |
| Drone Rat | Teal-green | #4B8B7B |
| Sewer Bruiser | Dark olive | #6B7B40 |
| Gas Rat | Sickly yellow-green | #8B9B40 |

Elite variants of each enemy use the same hue but add a glowing outline effect: 3px outline in saturated neon matching the enemy's primary hue, animated with a 1.5-second pulse (opacity 60%→100%→60%). The outline is a post-process effect, not part of the sprite.

### What are the boss design rules?

Bosses follow the same chibi proportion rules but are rendered at 96px base height. Bosses have three distinguishing elements that no normal enemy has:

1. A crown or crown-like decorative element on the head.
2. A unique piece of equipment not shared with any normal enemy type.
3. A color that is outside the enemy hue assignments above (reserved boss hues: deep crimson #8B0020, royal purple #5B2080).

---

## SECTION 3B — SPRITE COMPOSITION & LAYERING

### What sprites does each character entity require?

Every character entity (hero or enemy) is composed of **exactly two sprite layers** rendered independently and combined at runtime. There are no multi-frame animation sheets. Each layer is a single static image.

**Layer 1 — Body Sprite:** The character's body, head, and any attached armor, clothing, or structural equipment (gas mask, body armor, helmet). The body sprite has a clearly defined **anchor point** at the base center of the sprite — this is the point that sits on the ground plane and the point all transforms rotate and scale around. The body sprite never includes a held weapon.

**Layer 2 — Weapon Sprite:** The character's held weapon or projectile-generating equipment (sword, minigun, mechanical arm, etc.). The weapon sprite is a separate file. It has its own anchor point at the grip position — the point where the character's hand would hold it. At runtime the grip anchor is pinned to the hand position on the body sprite.

**Layer ordering:** Body always renders below weapon. Weapon always renders above body. No exceptions.

### What must each sprite file contain?

**Body sprite file requirements:**
- Single frame. Static image. No animation data embedded.
- Transparent background (alpha channel).
- Sprite dimensions follow the size tier from Section 3: 32px / 48px / 64px / 96px height.
- The body sprite depicts the character in a **neutral pose**: standing upright, feet at base of sprite, arms slightly away from body (not clamped to sides), weapon hand positioned as if the weapon were held but weapon is absent from the image.
- The hand position for weapon attachment must be documented as a pixel coordinate offset from the sprite's anchor point. This offset is used at runtime to pin the weapon layer. Example: `hand_offset: { x: 14, y: -22 }` (14px right, 22px up from anchor).

**Weapon sprite file requirements:**
- Single frame. Static image. No animation data embedded.
- Transparent background.
- The weapon sprite depicts the weapon in a **rest orientation**: blade/barrel pointing to the right (3 o'clock direction) for all weapons. This is the canonical zero-rotation pose. All code-driven rotation is applied relative to this orientation.
- The grip anchor point must be documented as a pixel coordinate offset from the weapon sprite's top-left corner. Example: `grip_anchor: { x: 6, y: 18 }`.
- Weapon sprite has no minimum or maximum size — it should match the visual weight of the character it belongs to.

### What poses does the body sprite need to depict?

Each character entity requires **three body sprite variants**, not animation frames — these are three distinct static images representing three visual states:

| Variant | Description | When used |
|---|---|---|
| `_idle` | Neutral standing pose, slight forward lean, expressionless but alert | Default state, walking, any non-event moment |
| `_hurt` | Recoil pose: body tilts backward, head thrown back slightly, eyes squinting/closed | Applied by code on damage event, replaced by `_idle` after 0.15 seconds |
| `_dead` | Collapsed pose: body pitched forward, face-down or sideways, limbs loose | Applied permanently on death, fades out over 0.8 seconds |

**The `_idle` variant is the primary animation surface.** All walk, attack, and idle animations are applied as transforms on the `_idle` body sprite. The `_hurt` and `_dead` variants are substituted only for their specific events.

There is no `_attack` body variant. The attack animation is entirely code-driven on the `_idle` body + weapon layer. See Section 12 for the complete transform recipes.

### What poses does the weapon sprite need?

Each weapon requires **one sprite variant only**: the rest orientation (pointing right). All attack swings, idle bobs, and directional rotations are code-applied transforms on this single sprite. No separate "attacking" or "holstered" weapon sprite.

### How is facing direction handled?

Characters move in the isometric world. For simplicity, there are only **two horizontal facing directions: left and right**. The sprite is flipped horizontally (scaleX = -1) when the character faces left. No separate left-facing sprites are created. The isometric projection handles the rest — vertical movement does not change the facing sprite.

Facing direction updates when the character's horizontal velocity changes sign. Facing does not update from vertical-only movement.

---

## SECTION 4 — MASTER COLOR PALETTE

### What is the full master palette?

The master palette is divided into four groups: Environment, Character, UI, and Effect. Colors outside this palette require explicit approval.

#### ENVIRONMENT PALETTE

These colors appear on ground tiles, road tiles, and world geometry. They are deliberately desaturated to ensure characters and pickups stand out.

| Name | Hex | Usage |
|---|---|---|
| Road Dark | #3C3C44 | Main road tile, base |
| Road Mid | #4C4C55 | Road tile, lighter variant |
| Road Crack | #2C2C32 | Crack detail on pavement |
| Grass Light | #5A7A3A | Grass tile, bright area |
| Grass Dark | #3A5A20 | Grass tile, shadow area |
| Grass Edge | #2A4010 | Grass/road border |
| Pavement Light | #6A6A72 | Sidewalk / raised tile |
| Pavement Dark | #4A4A52 | Sidewalk shadow |
| Dirt | #6A5040 | Rubble / dirt patches |
| Rubble Light | #8A7A6A | Broken concrete, light face |
| Rubble Dark | #5A4A3A | Broken concrete, shadow face |
| Manhole | #545460 | Manhole cover base |
| Manhole Ring | #444450 | Manhole ring detail |

**Environment palette rule:** No environment tile may use a saturated color (HSB saturation > 30%). The environment is a stage, not a character.

#### CHARACTER PALETTE

These colors appear on the hero and all enemy sprites. They are fully saturated.

| Name | Hex | HSB | Usage |
|---|---|---|---|
| Knight Blue | #6B8BAF | H:210 S:39 B:69 | Hero primary armor |
| Knight Shadow | #4A6080 | H:210 S:42 B:50 | Hero armor shadow |
| Knight Accent | #F0A030 | H:38 S:80 B:94 | Hero trim, sword hilt |
| Skin Light | #F0C090 | H:30 S:40 B:94 | Character skin |
| Skin Shadow | #C09060 | H:30 S:50 B:75 | Character skin shadow |
| Rat Brown | #8B6050 | H:15 S:43 B:55 | Grunt Rat |
| Rat Shadow | #604030 | H:15 S:50 B:38 | Grunt Rat shadow |
| Steel Gray | #6B7B8B | H:210 S:24 B:55 | Gunner Mouse |
| Steel Shadow | #4A5A6A | H:210 S:30 B:42 | Gunner Mouse shadow |
| Teal Enemy | #4B8B7B | H:169 S:46 B:55 | Drone Rat |
| Teal Shadow | #2A6A5A | H:169 S:60 B:42 | Drone Rat shadow |
| Olive Enemy | #6B7B40 | H:75 S:48 B:48 | Sewer Bruiser |
| Olive Shadow | #4A5A20 | H:75 S:64 B:35 | Sewer Bruiser shadow |
| Bile Green | #8B9B40 | H:66 S:59 B:61 | Gas Rat |
| Bile Shadow | #6A7A20 | H:66 S:74 B:48 | Gas Rat shadow |
| Outline Black | #1A1A20 | — | All sprite outlines |
| Eye White | #FFFFFF | — | Character eyes |
| Eye Black | #1A1A20 | — | Character pupils |

#### UI PALETTE

These colors appear exclusively in HUD elements, menus, cards, and overlays. They must never appear on world sprites.

| Name | Hex | Usage |
|---|---|---|
| UI Dark BG | #12121A | Dark overlay backgrounds, pause screen |
| UI Panel | #1E2030 | Card backgrounds, HUD panels |
| UI Panel Light | #2A2E45 | Card hover state, secondary panels |
| UI Border | #3A3E55 | Panel borders, dividers |
| UI Text Primary | #F0F0F8 | All primary text |
| UI Text Secondary | #9090A8 | Secondary text, labels |
| UI Text Disabled | #505060 | Disabled state text |
| LevelBar Fill | #4080F0 | XP bar fill |
| LevelBar BG | #1A2A50 | XP bar background |
| LevelBar Glow | #80B0FF | XP bar glow at fill edge |
| WaveBar Early | #40B040 | Wave progress bar, waves 1–7 |
| WaveBar Mid | #C0A020 | Wave progress bar, waves 8–14 |
| WaveBar Late | #C04020 | Wave progress bar, waves 15–20 |
| Timer Green | #50D050 | Timer bar segments, full |
| Timer Yellow | #D0C030 | Timer bar segments, 50% |
| Timer Red | #D04030 | Timer bar segments, <20% |
| Coin Gold | #F0C030 | Coin icon |
| Coin Shadow | #C08020 | Coin icon shadow |
| Green Gem | #30D060 | XP gem pickup, also gem UI icon |
| Green Gem Dark | #20A040 | XP gem shadow face |
| Red Gem | #E03040 | Red gem pickup, also gem UI icon |
| Red Gem Dark | #A01020 | Red gem shadow face |
| Rarity Common | #909090 | Common card border |
| Rarity Uncommon | #4080D0 | Uncommon card border |
| Rarity Rare | #D0A020 | Rare card border |
| Crit Text | #FF8020 | CRIT! floating text |
| Splash Text | #A0A0A0 | Splash floating text |
| Normal Dmg Text | #FFFFFF | Normal damage number |
| HP Bar Fill | #40C040 | Enemy health bar fill, high HP |
| HP Bar Low | #C04020 | Enemy health bar fill, <25% HP |
| HP Bar BG | #201010 | Enemy health bar background |

#### EFFECT PALETTE

These colors appear only in particle effects and VFX. They are the most saturated colors in the game.

| Name | Hex | Usage |
|---|---|---|
| Hit Spark Yellow | #FFE040 | Impact spark particles |
| Hit Spark White | #FFFFFF | Brightest impact core |
| Hit Spark Orange | #FF8020 | Secondary spark trail |
| XP Gem Glow | #00FF80 | XP gem ambient glow, pulse |
| Coin Shimmer | #FFD700 | Coin pickup shimmer |
| Poison Green | #60FF40 | Venom/poison cloud |
| Attack Ring Blue | #4090FF | Inner edge of attack range ring |
| Attack Ring Gold | #FFA020 | Outer edge of attack range ring |
| Boss Warning Red | #FF2020 | Pre-boss warning flash |
| Chain Lightning | #80C0FF | Chain lightning effect |
| Shockwave Ring | #C0E0FF | Shockwave expanding ring |

---

## SECTION 5 — THE ATTACK RANGE RING

### What does the attack range ring look like?

The attack range ring is a permanent ground-plane indicator centered on the hero. It communicates the hero's current auto-attack radius to the player at all times.

**Visual composition:**
- Two concentric circles drawn on the ground plane (isometrically projected as ellipses).
- Inner circle: thin stroke, 2px width, color `#4090FF` (Attack Ring Blue) at 70% opacity.
- Outer circle: slightly thicker stroke, 3px width, color `#FFA020` (Attack Ring Gold) at 80% opacity.
- Gap between inner and outer circle: 4px at base radius.
- Fill: none. The ring is outline-only — no filled area.

**Animation:** The ring pulses. The pulse animates the outer circle's stroke width between 3px and 5px over a 2-second cycle (ease in-out sine). The inner circle does not animate. The ring does not rotate.

**Projection:** The ring is drawn on the ground plane — it appears as an ellipse with a 2:1 width-to-height ratio (matching the dimetric projection). The ring is never drawn as a perfect circle on screen.

**Scaling:** When the Attack Range stat increases, the ring's radius scales proportionally in real-time. The transition animates over 0.3 seconds (ease out). The player must always be able to see the ring change size when they acquire a range upgrade.

**Z-ordering:** The ring renders below all sprites but above the ground tiles. It is never occluded by characters or enemies.

---

## SECTION 6 — GROUND TILE DESIGN

### How are isometric tiles constructed?

Every ground tile is a diamond shape (a square rotated 45 degrees, projected dimetrically). At base scale, tiles are **64px wide × 32px tall** in screen space. This is the tile unit. All world geometry is made of this tile unit.

**Tile faces:** An isometric ground tile has one visible face (the top). In this game, tiles do not have visible side faces — the ground is flat. Elevated objects (rubble piles, walls) have a visible top face and one or two visible side faces.

**Side face rule for elevated objects:** The left-facing side is the lighter side. The right-facing side is the darker side. Specifically: left face = base color, right face = base color darkened 30% HSB value. This simulates a light source coming from the upper-left. This rule applies to every elevated object in the game without exception.

**Tile visual categories:**

| Category | Description | Palette Colors |
|---|---|---|
| Road | Flat, cracked asphalt with subtle line markings | Road Dark, Road Mid, Road Crack |
| Grass | Flat green area, occasional tuft detail | Grass Light, Grass Dark, Grass Edge |
| Sidewalk | Slightly elevated pavement blocks | Pavement Light, Pavement Dark |
| Rubble | Broken concrete chunks, not walkable visually | Rubble Light, Rubble Dark, Dirt |
| Manhole | Road tile variant with circular cover | Road Dark, Manhole, Manhole Ring |

**Tile seams:** Tiles connect seamlessly. No visible grid lines during gameplay. The grid only becomes visible in the level editor (not in-game).

### What decoration appears on tiles?

Tile decoration is sparse. The rule: no more than 20% of any tile's surface area is covered by decoration. Decoration includes cracks, grass tufts, dirt patches, and scuff marks. Decoration is baked into the tile sprite — it is not a separate prop layer.

Crack patterns on road tiles follow the direction of diagonal stress lines (consistent with the isometric view: cracks run at approximately 45° and 135° on screen).

---

## SECTION 7 — PROPS & ENVIRONMENT OBJECTS

### What props exist in the world?

Props are static world objects that are not tiles, not characters, and not pickups. They include: rubble piles, trash bags, dumpsters, streetlights, and manhole markers. All props are non-interactive — the player and enemies pass over or around them based on the collision system, but they do not animate or respond to events.

**Visual rules for props:**
- Props use the Environment Palette only. No Character or Effect colors.
- Props must read as urban / city objects. No rural, fantasy, or abstract props.
- Props never occlude the hero sprite. If a prop would overlap the hero's screen position, the prop's opacity drops to 40% while the overlap persists.
- All props have the same light-left, dark-right shadow rule as elevated tiles.

### How tall can props be?

Props may be up to 3 tile-heights tall. At 3 tile heights, a prop is approximately 96px tall in screen space. No prop may be taller than 3 tile-heights. Tall props must be designed so that they do not block the player's view of enemy spawn positions.

---

## SECTION 8 — PICKUPS

### What do pickups look like?

Pickups are the most visually distinct elements in the game. They use the highest saturation colors in the master palette and must be immediately readable against any tile type.

**Green XP Gem:**
- Shape: 4-pointed diamond facet gem, viewed from above (isometrically projected to a flatter shape).
- Size: 14px × 10px screen space.
- Colors: `#30D060` (light face), `#20A040` (shadow face), `#1A1A20` outline.
- Faces: 3 visible faces (top face, left face, right face) using standard light-left rule.
- Animation: Slow vertical float (±3px, 1.5 second cycle, ease in-out sine). The float is in screen space — it lifts the gem slightly above the ground plane.
- Glow: A 6px soft radial glow in `#00FF80` (XP Gem Glow) at 40% opacity centered on the gem. The glow pulses in sync with the float animation.

**Gold Coin:**
- Shape: Circle (projected isometrically to an ellipse, 2:1 ratio).
- Size: 12px × 6px screen space.
- Colors: `#F0C030` (face), `#C08020` (edge ring), `#1A1A20` outline.
- Animation: Slow Y-axis spin simulated by scaling horizontally (12px→2px→12px, 1.2 second cycle). At minimum width (2px), flip to show the other face (same color — single-face coin).
- Glow: None. Coins do not glow.

**Red Gem:**
- Shape: Octahedron top-half view — an 8-sided faceted gem, projected isometrically.
- Size: 16px × 12px screen space.
- Colors: `#E03040` (primary face), `#A01020` (shadow face), `#FFFFFF` (1px specular dot), `#1A1A20` outline.
- Animation: Same float as Green Gem but 2-second cycle.
- Glow: 10px soft radial glow in `#FF4060` at 50% opacity. Glow does not pulse — it is constant.

### What happens visually when a pickup is collected?

Collection is instant — the pickup sprite disappears in a single frame. A small burst of 4–6 particles in the pickup's primary color emits outward from the collection point and fades over 0.3 seconds. No collection animation on the hero sprite itself.

---

## SECTION 9 — FLOATING TEXT & DAMAGE NUMBERS

### What are the exact visual specifications for all floating text?

All floating text uses the same bitmap pixel font. No serif or rounded fonts in the game world — font is a 7px-tall uppercase bitmap font, rendered without anti-aliasing.

| Text Type | Color | Scale | Float Direction | Duration | Fade |
|---|---|---|---|---|---|
| Normal damage | `#FFFFFF` | 1.0× | Straight up | 0.5s | Linear, starts at 0.3s |
| Critical damage | `#FF8020` | 1.4× | Straight up, faster | 0.7s | Linear, starts at 0.4s |
| Splash label | `#A0A0A0` | 0.8× | Up-left diagonal | 0.4s | Linear, starts at 0.2s |
| "CRIT!" label | `#FF8020` | 1.6× | Up, then arc right | 0.7s | Linear, starts at 0.5s |
| Poison tick | `#60FF40` | 0.9× | Up, slight right drift | 0.4s | Linear, starts at 0.2s |
| Heal | `#40C040` | 1.0× | Straight up | 0.5s | Linear, starts at 0.3s |

**"CRIT!" and the damage number never overlap.** "CRIT!" always appears to the right of the damage number. When both appear, the damage number floats straight up and "CRIT!" floats up then arcs to the right of the number.

**Font outline:** All floating text has a 1px black outline (`#1A1A20`) on all 8 surrounding pixels. This ensures readability against any background color.

**Maximum simultaneous floating texts:** 12. When the cap is hit, the oldest text is immediately destroyed. No queue — excess texts are dropped, not deferred.

---

## SECTION 10 — PARTICLE EFFECTS

### What are the particle specifications per effect type?

**Hit spark (normal attack impact):**
- Count: 4–6 particles per hit.
- Shape: 2×2px filled squares.
- Colors: `#FFE040`, `#FF8020`, `#FFFFFF` (randomly assigned per particle).
- Velocity: Random directions, 40–80px/s initial speed, decelerate to 0 over lifetime.
- Lifetime: 0.2–0.35 seconds (randomized per particle).
- Fade: Linear from 100% to 0% over lifetime.
- Gravity: None.

**Critical hit spark:**
- Count: 8–12 particles.
- Shape: 3×3px filled squares.
- Colors: Same as normal hit spark but larger.
- Velocity: 80–140px/s initial speed.
- Lifetime: 0.35–0.5 seconds.
- Fade: Linear.
- Gravity: None.
- Additional: 1 ring emit — a single expanding ellipse (matching projection) that starts at 4px radius and expands to 24px, fading from 80% to 0% over 0.2 seconds, color `#FFE040`.

**XP Gem collect burst:**
- Count: 4 particles.
- Shape: 2×2px filled squares.
- Color: `#30D060`.
- Velocity: 4 cardinal + diagonal directions, equal spacing, 60px/s.
- Lifetime: 0.3 seconds.
- Fade: Linear.

**Level-up burst (at hero position):**
- Count: 16 particles.
- Shape: 3×3px filled squares.
- Colors: `#4080F0`, `#80B0FF`, `#FFFFFF`.
- Velocity: Outward radial, all directions equally distributed, 100px/s.
- Lifetime: 0.5 seconds.
- Fade: Stays at 100% for first 0.2 seconds, then linear to 0% over 0.3 seconds.
- Additional: 2 expanding rings — same as crit hit but larger. Ring 1: 0.3 second expand to 60px, color `#4080F0`. Ring 2: delayed 0.1s, same parameters, color `#FFFFFF` at 50% opacity.

**Death explosion (enemy):**
- Count: 6–8 particles.
- Shape: 3×3px filled squares.
- Color: Enemy primary hue (from master palette enemy section).
- Velocity: Random directions, 50–90px/s.
- Lifetime: 0.25–0.4 seconds.
- Fade: Linear.
- No rings.

**All particle effects are 2D screen-space effects.** They do not project onto the isometric ground plane. They emit from the screen-space position of the impact point and move in 2D screen space, not in 3D world space.

---

## SECTION 11 — UI VISUAL DESIGN

### What is the UI visual language?

The UI uses a **dark military HUD** aesthetic. Panels are dark, near-opaque, with thin bright borders. Text is light on dark. The UI never uses gradients as decorative elements — only as functional indicators (progress bars).

**The UI visual language is visually distinct from the game world.** The world is bright, colorful, and cartoonish. The UI is dark, compact, and functional. This contrast is intentional: the UI must not compete with the game world for attention.

### What are the exact specifications for HUD panels?

**Panel background:** `#1E2030` (UI Panel) at 85% opacity. Not fully opaque — the game world is slightly visible through panels, anchoring the UI to the world.

**Panel border:** 1px solid `#3A3E55` (UI Border). Straight corners — no border radius on gameplay HUD elements. The only rounded elements in the UI are buttons and level-up cards.

**Button border radius:** 6px. Used on: Pause button, Level-up cards, Menu buttons. No other UI element uses rounded corners.

**Panel padding (inner spacing):** 6px uniform on all sides for compact HUD elements. 12px uniform for cards and menus.

### What font is used in the UI?

Two fonts, purpose-specific:

**Damage numbers and in-world floating text:** 7px bitmap pixel font, uppercase only, no anti-aliasing, hard pixel edges.

**UI panels, cards, menus:** A condensed sans-serif. The font must be: bold weight available, condensed (width ratio approximately 0.65), no serifs, no humanist features. Fallback specification: use a system monospace only if the target font is unavailable. All UI text is rendered with anti-aliasing enabled (unlike sprite text).

Font sizes:

| Context | Size |
|---|---|
| HUD labels (CoinCount, EnemyCount) | 13px |
| LevelBar XP numbers | 11px |
| Wave number above TimerBoard | 13px bold |
| Card upgrade name | 15px bold |
| Card description | 11px regular |
| Menu button text | 16px bold |
| Death screen title | 28px bold |
| Results numbers | 18px bold |

### What are the level-up card specifications?

Cards are the most designed single element in the UI.

**Card dimensions:** 110px wide × 180px tall. 6px border radius.

**Card background:** `#1E2030` (UI Panel) at 98% opacity.

**Card border by rarity:**
- Common: 1px `#909090` (Rarity Common).
- Uncommon: 1px `#4080D0` (Rarity Uncommon) + outer glow: 4px `#4080D0` at 40% opacity.
- Rare: 1px `#D0A020` (Rarity Rare) + outer glow: 6px `#D0A020` at 60% opacity + inner glow: 4px `#D0A020` at 20% opacity.

**Card layout (top to bottom, with pixel positions from top of card):**
- 0–12px: Rarity indicator strip. Solid line, full card width, 3px tall, at y=8. Color matches border color.
- 16–80px: Icon area. 48×48px icon, centered horizontally.
- 84–100px: Upgrade name. Centered, 15px bold, `#F0F0F8`.
- 104–168px: Description text. Centered, 11px regular, `#9090A8`. Multi-line allowed, 8px line height.
- 170–178px: "TAP TO SELECT" in 9px, `#505060`, centered. This text disappears on press.

**Card press state:** Card scales to 1.05× over 0.08 seconds (ease out), then returns to 1.0× in 0.05 seconds (ease in) as the overlay dismisses. Non-selected cards animate to 0% opacity over 0.15 seconds simultaneously.

---

## SECTION 12 — CODE-DRIVEN ANIMATION SYSTEM

### What is the animation philosophy?

**No spritesheet frame animation exists in this game.** All character motion — walking, attacking, idling, dying — is produced entirely by applying mathematical transforms to static single-frame sprites at runtime. This approach produces consistent, controllable, and tunable animation that can be generated once and animated indefinitely.

The animation system has two layers:
1. **Continuous ambient transforms** — always running, produce the resting "alive" feel (idle bob, weapon sway).
2. **Event transforms** — triggered by a game event (attack, hit, death), play once or for a fixed duration, then return the sprite to its ambient state.

All transforms are additive on top of the sprite's base position/scale/rotation. They compose correctly — an idle bob and a hurt recoil can play simultaneously.

**Frame rate target:** All code animations run at 60fps. The lerp and sine values in this document assume a 60fps update loop. If the loop runs at a different rate, scale delta-time accordingly — do not use fixed frame increments.

---

### AMBIENT TRANSFORMS (always running)

#### Idle Body Bob

Applied to the body sprite at all times when the character is alive and not in a death state.

```
period      = 1.8 seconds
amplitude_y = 3px  (vertical displacement, screen space)
amplitude_x = 0px  (no horizontal sway in idle)
easing      = sin(time × (2π / period))

body.y += amplitude_y × sin(t)
```

The bob is in screen-space Y only. It creates a gentle breathing rise-and-fall. The weapon layer bobs identically — it inherits the body's Y displacement so body and weapon move as one unit during idle.

#### Walk Body Bob

When the character is moving (velocity magnitude > dead zone threshold), replace the idle bob with the walk bob. Transition between idle and walk bob over 0.1 seconds by lerping the amplitude.

```
period      = 0.45 seconds  (fast, footstep rhythm)
amplitude_y = 5px           (stronger than idle)
amplitude_x = 1.5px         (slight left-right sway)

body.y += amplitude_y × |sin(t × (2π / period))|   ← absolute value = double-bounce per cycle
body.x += amplitude_x × sin(t × (2π / period))
```

Using `|sin|` (absolute value) creates a double-dip per cycle — the character bounces twice per full oscillation, simulating two footsteps. The weapon layer inherits both X and Y displacement from the walk bob.

#### Weapon Layer Idle Sway

In addition to inheriting the body's bob, the weapon sprite has its own independent idle rotation:

```
period        = 2.6 seconds   (slower than body bob, feels organic)
amplitude_rot = 4 degrees     (rotation around grip anchor)

weapon.rotation += amplitude_rot × sin(t × (2π / period))
```

The rotation is applied around the weapon's grip anchor point. This creates a slow pendulum micro-motion. The weapon sway phase is offset from the body bob by π/2 radians (quarter cycle) so they peak at different moments, preventing a "locked together" robotic feel.

---

### EVENT TRANSFORMS (triggered, play once)

All event transforms use the following structure: an **in** phase (rapid change), a **hold** phase (peak value), and an **out** phase (return to ambient). The sprite returns to its ambient transform state after the **out** phase completes. Event transforms stack additively with ambient transforms.

#### Attack Swing

Triggered when the hero or an enemy fires an attack. Applied to the **weapon layer only**. The body layer is unaffected.

```
ANTICIPATION (in):
  duration    = 0.06s
  rotation    = -35 degrees  (weapon pulls back from rest orientation)
  easing      = ease-in quad

STRIKE (out from anticipation to overshoot):
  duration    = 0.08s
  rotation    = +55 degrees  (weapon swings past center to overshoot)
  easing      = ease-out expo  ← fast snap, key to feeling punchy

SETTLE (return to rest):
  duration    = 0.12s
  rotation    = 0 degrees
  easing      = ease-out cubic

BODY LEAN (applied to body sprite simultaneously with strike phase):
  duration    = 0.08s
  scaleX      = 1.08  (slight horizontal squash in strike direction)
  scaleY      = 0.94
  easing      = ease-out expo, returns to 1.0 over 0.1s ease-out cubic
```

Total attack animation duration: 0.26 seconds. The next attack can begin at 0.20 seconds (during the settle phase) — the settle is interruptible.

#### Hit Pause

Triggered on the frame a successful hit connects with an enemy. This is the single most important "juice" event in the game. It must never be skipped or optimized away.

```
GAME PAUSE:
  duration  = 0.05s   (3 frames at 60fps)
  effect    = freeze all game simulation (positions, velocities, AI)
              UI continues to render normally
              particles that are already in flight continue moving

PURPOSE: The freeze makes the hit feel weighty. Without it, hits feel like they pass through enemies.
```

After the 0.05s freeze, simulation resumes normally. The hit spark particles emit on the frame simulation resumes, not on the frame the hit is detected.

#### Enemy Hurt

Triggered on the enemy that was hit. Applied to the body sprite.

```
FLASH (immediate):
  duration   = 0.05s
  effect     = replace sprite color with solid white (#FFFFFF), full opacity
               achieved by rendering a white-tinted copy of the sprite on top
  
RECOIL (simultaneous with flash):
  duration   = 0.08s
  sprite     = swap body_idle → body_hurt
  displacement_x = 8px in the direction away from the attacker
  easing     = ease-out expo (snap away fast, stay there briefly)

RETURN:
  duration   = 0.10s
  sprite     = swap body_hurt → body_idle
  displacement_x = lerp back to 0px
  easing     = ease-out cubic
```

The body_hurt sprite variant + white flash + displacement all resolve within 0.18 seconds total. The enemy then resumes ambient bob from its returned position.

#### Hero Hurt

Same as Enemy Hurt but with two additions:

```
SCREEN FLASH:
  duration  = 0.08s
  effect    = full-screen red vignette overlay, #FF0000 at 20% opacity
              fades from 20% → 0% linearly over duration

CAMERA SHAKE:
  (see Section 1 camera shake spec — triggers simultaneously with hit)
```

#### Squash & Stretch on Landing

Triggered when a character's Y velocity transitions from downward to zero (landing). Used primarily for enemies that are spawned with a drop-in effect and for the hero after certain abilities.

```
SQUASH (on contact frame):
  duration  = 0.05s
  scaleX    = 1.20
  scaleY    = 0.82
  easing    = instant (apply on exact frame of landing)

STRETCH (rebound):
  duration  = 0.12s
  scaleX    = 0.92
  scaleY    = 1.15
  easing    = ease-out cubic

SETTLE:
  duration  = 0.10s
  scaleX    = 1.0
  scaleY    = 1.0
  easing    = ease-out cubic
```

All scale transforms use the sprite's anchor point as the pivot — squash compresses downward, stretch extends upward. The sprite never leaves its ground-plane contact position.

#### Death

Triggered when an entity's HP reaches 0. Applied to the body sprite. The weapon layer is dismissed (faded to 0% opacity over 0.1s) on the death frame.

```
FRAME 0 (death detected):
  swap body_idle → body_dead
  begin death transform sequence

PHASE 1 — Fall (0.0s → 0.3s):
  rotation   = 0 → 90 degrees (character tips forward and falls flat)
  easing     = ease-in cubic
  pivot      = base anchor (falls forward from feet)

PHASE 2 — Bounce (0.3s → 0.38s):
  scaleY     = 1.0 → 0.6 → 0.8  (hits ground, slight bounce)
  scaleX     = 1.0 → 1.4 → 1.1  (squash and partial recovery)
  easing     = ease-out bounce

PHASE 3 — Fade (0.38s → 0.80s):
  opacity    = 100% → 0%
  easing     = linear

At 0.80s: sprite is fully transparent and removed from the render list.
```

The enemy's health bar and offscreen arrow indicator are removed on FRAME 0, not at the end of the death sequence.

#### Spawn Drop-In

Triggered when a new enemy enters the arena. Enemies do not simply appear — they fall in from above.

```
START STATE (frame of spawn):
  position_y_offset = -80px (above their target position)
  opacity           = 0%

FALL (0.0s → 0.2s):
  position_y_offset = -80px → 0px
  opacity           = 0% → 100%  (fade in during fall, fully visible at landing)
  easing            = ease-in cubic

LANDING (0.2s):
  trigger Squash & Stretch on Landing sequence (see above)

Total spawn animation: 0.2s fall + 0.27s squash-stretch = 0.47s before enemy enters normal AI state.
```

Enemies do not deal contact damage until their spawn animation completes (0.47s). They are rendered during spawn but treated as non-collidable.

#### Level-Up Pop (Hero)

Triggered when the hero gains a level. Plays simultaneously with the level-up screen opening.

```
SCALE POP:
  duration  = 0.12s
  scaleX    = 1.0 → 1.3 → 1.0
  scaleY    = 1.0 → 1.3 → 1.0
  easing    = ease-out elastic (overshoot and settle)

ROTATION WIGGLE:
  duration  = 0.4s
  rotation  = 0 → +8° → -8° → +4° → -4° → 0°  (5-step damped oscillation)
  easing    = linear between each step (no easing — hard oscillation)

GLOW RING:
  expanding ring from hero position, same spec as level-up particle ring (Section 10)
  plays simultaneously with scale pop
```

---

### WEAPON LAYER — SPECIFIC BEHAVIORS

#### Projectile Weapons (Gunner Mouse, Drone Rat)

Enemies that fire projectiles do not swing a weapon. Their weapon layer uses a different event transform:

```
CHARGE (anticipation):
  duration    = 0.15s
  weapon.scaleX = 1.0 → 0.85  (weapon compresses before firing)
  easing      = ease-in cubic

FIRE RECOIL:
  duration    = 0.06s
  weapon displacement_x = 0 → -12px  (kicks back in direction opposite to fire)
  easing      = ease-out expo

RETURN:
  duration    = 0.18s
  weapon displacement_x = -12px → 0px
  easing      = ease-out cubic
```

The projectile sprite is spawned at the barrel tip position (documented as a pixel offset on the weapon sprite: `barrel_tip: { x: N, y: N }`) on the first frame of the FIRE RECOIL phase.

#### Elite Weapon Glow

Elite variants of enemies have a glowing weapon in addition to the body glow outline:

```
weapon layer gets an additive glow layer:
  color        = enemy's primary hue at full saturation, +30% lightness
  blur radius  = 8px (soft glow, not hard outline)
  opacity      = 50% → 90% → 50%  (pulse, 1.5s cycle, ease in-out sine)
```

---

### COMPOSITE ANIMATION TABLE

This table shows which transforms are active simultaneously for each game state. All listed transforms compose additively.

| State | Body transforms | Weapon transforms |
|---|---|---|
| Alive, stationary | Idle bob | Idle sway + Idle bob (inherited) |
| Alive, moving | Walk bob | Walk bob (inherited) |
| Attacking | Walk or Idle bob | Attack swing + Walk or Idle bob |
| Taking hit | Hurt flash + Hurt recoil + bob | bob continues |
| Dying | Death fall sequence | Dismissed at frame 0 |
| Spawning | Spawn drop-in | Spawns after drop-in completes |
| Level up (hero only) | Scale pop + Rotation wiggle + bobs | Inherits scale pop |

---

### CANONICAL TIMING TABLE

| Event | Total Duration | Interruptible? |
|---|---|---|
| Attack swing (full) | 0.26s | Yes, at 0.20s |
| Hit pause (freeze) | 0.05s | No |
| Enemy hurt sequence | 0.18s | Yes, new hit restarts it |
| Hero hurt sequence | 0.18s | No |
| Squash & stretch | 0.27s | No |
| Death animation | 0.80s | No |
| Spawn drop-in | 0.47s | No |
| Level-up pop | 0.40s | No |
| Card press response | 0.08s + 0.05s | No |
| Overlay dismiss | 0.20s | No |
| Attack ring scale | 0.30s | Yes |
| Enemy death dissolve | 0.30s (part of death seq) | No |
| Pickup float cycle | 1.5s / 1.2s (looping) | N/A |
| Pickup magnet pull | 0.25s | No |
| Boss health bar fade in | 0.50s | No |
| Elite glow pulse | 1.5s (looping) | N/A |
| TimerBoard depletion | Continuous | N/A |

---

## SECTION 13 — VISUAL HIERARCHY RULES

### What renders in front of what?

Z-ordering from back (bottom) to front (top):

1. Ground tiles (base layer).
2. Ground decorations baked into tiles.
3. Tile props that are ground-level (manhole covers, tire tracks).
4. Attack range ring (above ground, below all characters).
5. Ground pickups.
6. Enemy sprites.
7. Hero sprite.
8. Tile props that are elevated (rubble piles, dumpsters — sorted by Y position).
9. Particle effects (always above all sprites).
10. Damage numbers and floating text (always above particles).
11. Enemy health bars (above enemy sprites, below damage numbers).
12. HUD layer (always topmost, never occluded by any world element).

**Y-sorting:** Within layer 6 (enemy sprites) and layer 8 (elevated props), elements are sorted by their screen-space Y position — lower Y (higher on screen) renders behind higher Y (lower on screen). This creates the correct isometric depth illusion. The hero sprite always renders above enemy sprites regardless of Y position (hero is always layer 7, enemies are always layer 6).

### When should an element dim or hide?

**Props occluding hero:** Any prop at layer 8 whose screen-space bounding box overlaps the hero sprite's bounding box dims to 40% opacity. Transition: 0.1 seconds linear. Returns to 100% opacity when overlap ends.

**Off-screen enemies:** Enemies that are within 1 tile of the screen edge but still technically off-screen show a directional arrow indicator on the screen edge. Arrow color matches the enemy's primary hue. Arrow size: 16×16px. Arrows do not appear for enemies more than 4 tiles off-screen.

---

## SECTION 14 — WHAT THIS DOCUMENT DOES NOT COVER

The following areas are outside this document's scope and require separate dedicated documents:

- Sound design and audio specifications (see Audio Direction document).
- Shader code and render pipeline (see Technical Graphics Spec).
- Level/arena layout design (see Level Design document).
- UI flow and screen transitions (see UX Flow document).

**Note on animation:** This document covers the complete code-driven animation system in Section 12. There is no separate animation technical spec — Section 12 is the spec. Any agent implementing character animation should treat Section 12 as fully authoritative.

When generating assets that touch any of the out-of-scope areas above, apply the visual rules in this document and flag the gap for resolution in the relevant document.

---

*This document is the canonical art direction reference for Arena Vermin v1.1 scope. Any deviation requires explicit human design lead approval and a version bump to this document.*
