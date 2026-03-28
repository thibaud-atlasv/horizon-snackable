# Side-Scrolling Platformer Greyboxing

Priorities for 2D perspective platformer blockouts (Mario, Celeste, Hollow Knight style).

## Screen Composition
- Design in screen-sized chunks
- Each screen should have clear entry/exit points
- Vertical sections need distinct visual rhythm
- Test at target resolution—edge visibility matters

## Jump Arc Visualization
- Block jump arcs as visible reference geometry during design
- Player sees entire arc on screen—precision is expected
- Account for:
  - Variable jump height (tap vs. hold)
  - Coyote time (frames after leaving platform)
  - Jump buffering (input before landing)

## Platform Spacing

| Jump Type | Typical Gap | Notes |
|-----------|-------------|-------|
| Safe/teaching | 70-80% max range | Room for error |
| Standard | 85-90% max range | Comfortable |
| Challenge | 95-100% max range | Requires precision |
| Pixel-perfect | 100%+ with tech | Speedrun/mastery |

## Hazard Placement
- Hazards visible before commitment point
- Reaction windows match skill expectations
- First hazard encounter should be survivable mistake
- Combine hazards only after individual mastery

## Momentum & Flow
- Running sections need runway space
- Stop-and-go vs. flow sections are distinct design choices
- Speedrun lines should exist even if not required
- Test backtracking feel if exploration exists

## Tile-Based Considerations
- Snap geometry to grid during blockout
- Slopes need consistent angle rules
- One-way platforms must read clearly
- Collision edges match visual edges exactly

## Difficulty Ramping
Structure by screen/section:
1. **Introduce** — Mechanic in isolation, safe failure
2. **Develop** — Add timing or positioning challenge
3. **Twist** — Combine with previous mechanic
4. **Master** — Full execution required

## Validation Method
Record playtests. Track per section:
- Deaths before first success
- Time to complete (first vs. optimal)
- Rage-quit moments
- Flow state indicators

## Checklist
- [ ] Jump arcs tested against actual physics
- [ ] Platform gaps categorized by difficulty intent
- [ ] Hazards visible before commitment
- [ ] Difficulty ramp follows introduce→master
- [ ] Coyote time / buffering accounted for
- [ ] Screen composition readable at target resolution
- [ ] Fresh player tested on teaching sections
