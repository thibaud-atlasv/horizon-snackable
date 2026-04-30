# Suika Merge Game — Game Design Document

## Game Overview
A Suika (Watermelon) style 2D merge-drop puzzle game with a cute gummy blob creature theme. Players drop circular blob creatures into a candy jar container from the top. Same-tier blobs that touch each other merge into the next tier, growing larger. The goal is to reach the highest tier (Blob Royale) while preventing blobs from overflowing the container. Portrait orientation, 480×800 canvas.

## Controls
- **Drag horizontally** across the top of the screen to position the held blob left/right within the container bounds.
- **Release / lift finger** to drop the blob. It falls under gravity into the container.
- After dropping, a short cooldown (~0.5s) before the next blob appears.
- **Game Over screen**: Tap "Play Again" button to restart.

## Game Objects

### Blob Creatures (11 tiers, 0–10)
Each tier is a cute gummy blob creature with translucent candy-like appearance. Blobs bounce, spin, and tumble with physics-driven rotation. Tiers increase in size and score value:
- Tier 0: Bloblet (smallest, ~14px radius, pink)
- Tier 1: Blobby (~18px, red)
- Tier 2: Blobert (~22px, purple)
- Tier 3: Blorb (~28px, orange)
- Tier 4: Blobsworth (~34px, amber/gold)
- Tier 5: Blobzilla (~42px, green)
- Tier 6: Megablob (~50px, teal)
- Tier 7: Blobmaster (~60px, pastel pink)
- Tier 8: Blobtitan (~72px, yellow)
- Tier 9: Blobemoth (~86px, blue)
- Tier 10: Blob Royale (~100px, royal purple with crown) — final tier, does not merge further

### Container / Candy Jar
A dark interior container with rounded bottom corners and glass-effect walls. Semi-transparent white wall outlines with a subtle glass highlight on the left wall. Open at the top for dropping blobs.

### Held Blob (Preview)
The next blob to drop, shown at the top of the screen following the player's horizontal finger position. Has a subtle bob animation and translucent overlay.

### Next-Up Indicator
A small preview of the NEXT blob in a dark rounded box in the upper-right area.

## Game Flow / States
1. **Playing** — Default state. Player can drag and drop blobs. Physics runs with bouncy rotation, merges happen automatically.
2. **Game Over** — Triggered when any blob's top edge exceeds the danger line for a sustained period. Shows overlay with final score and "Play Again" button.

No title screen or pause menu — game starts immediately.

## Scoring & Progression
- Each merge awards points based on the resulting tier's score value.
- Higher-tier merges give exponentially more points.
- Score displayed at the top with pulse animation on merges.
- Floating "+points" tags appear at merge locations.
- Session-best score tracked and displayed.
- No formal levels — difficulty increases naturally as the jar fills.

## Visual Style
- **Warm candy/gummy theme** with peach-to-lavender gradient background.
- Dark purple (#2A1B3D) candy jar interior with glass-effect white walls.
- All 11 blob tiers are generated sprite images of cute gummy/vinyl blob creatures.
- Animated danger line with subtle alpha shimmer.
- Bangers font for UI text (score, best score, game over).
- Purple accent (#9B5DE5) for the Play Again button.
- Warm, cheerful, mobile-quality polish.

## Sprite Asset List
- `sprites/tier_00.png` through `sprites/tier_10.png` — 11 gummy blob creature sprites
- `sprites/logo_horizon.png`, `sprites/title_text.png`, `sprites/tagline_text.png` — UI sprites

## UI Layout
- **XAML**: Score (Bangers font, top-left), Best score (top-right), game over overlay with purple button.
- **DrawingSurface**: Background gradient, candy jar container, all blob items with rotation, held item, next-up preview, floating score tags, danger line shimmer.

## Sound / Music
None in this version.

## Canvas Dimensions
- **Portrait**: 480 × 800
