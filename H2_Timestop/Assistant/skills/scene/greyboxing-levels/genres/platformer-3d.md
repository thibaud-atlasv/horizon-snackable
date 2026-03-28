# 3D Adventure Platformer Greyboxing

Priorities for 3D platformer blockouts (Super Mario 64, Banjo-Kazooie, A Hat in Time style).

## Camera Management
Camera is the invisible enemy of 3D platforming.
- Block camera zones/volumes during greybox
- Test jumps with worst-case camera angles
- Avoid geometry that causes camera collision
- Ensure landing targets visible before jump commitment

## Depth Perception Aids
Players struggle to judge distance in 3D. Compensate with:
- **Shadows**: Dynamic shadow shows landing position
- **Target markers**: Subtle geometry indicating landing zones
- **Audio cues**: Sound design supports spatial awareness
- **Generous collision**: Platforms slightly larger than visual

## Platform Sizing

| Platform Type | Size Guideline |
|---------------|----------------|
| Landing target | 1.5-2x player width minimum |
| Moving platform | 2x player width + movement buffer |
| Precision challenge | 1.2x player width (use sparingly) |
| Rest/checkpoint | 3x+ player width |

## Jump Forgiveness
3D jumps need more forgiveness than 2D:
- Coyote time: 6-10 frames typical
- Landing magnetism: Slight position correction
- Edge grab/ledge assist: Pull player up if close
- Fall recovery: Generous respawn, minimal punishment

## Hub World Design
Most 3D platformers use hub + level structure:
- Hub should teach core movement safely
- Level entrances read clearly from distance
- Progression gating is spatially intuitive
- Return to hub should feel like home base

## Collectible Placement
3D spaces need collectible breadcrumbing:
- Guide player attention with pickup trails
- Reward exploration of verticality
- Place collectibles where camera naturally looks
- Test if collectibles are visible from approach angles

## Verticality
Vertical traversal is a strength of 3D:
- Climbing/jumping routes should spiral, not stack directly
- Looking up should reveal goals
- Falls should have catch platforms or soft resets
- Height creates spectacle—use vista moments

## Movement Feel
Block spaces for full moveset testing:
- Long jump distance
- Triple jump height
- Dive/roll recovery
- Wall jump sequences
- Ground pound precision

## Validation Method
Test with controller in hand. Track:
- Camera frustration moments
- Missed jumps due to depth misjudgment
- "Where do I go?" confusion points
- Movement flow (does full moveset feel good here?)

## Checklist
- [ ] Camera zones blocked and tested
- [ ] Shadows/depth cues in place
- [ ] Platform sizes match guidelines
- [ ] Jump forgiveness tuned
- [ ] Hub teaches movement safely
- [ ] Collectibles visible from approach
- [ ] Verticality creates spectacle
- [ ] Full moveset tested in each area
- [ ] Worst-case camera angles validated
