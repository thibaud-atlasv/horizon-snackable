# Big Paddle Power-Up Task List

## Tasks

1. [x] **Create Power-Up Entity** - Created BreakoutPowerUp template with sphere mesh, cyan color, trigger physics, pulsing glow VFX.

2. [x] **Implement Spawning System** - PowerUpManager listens to BrickDestroyed, 20% spawn chance, power-up falls at 3 units/sec.

3. [x] **Implement Catch & Size Change** - Paddle catches via CollisionManager AABB, doubles width for 10 seconds, pulsing cyan glow while active.

4. [x] **Verification** - Fixed fallSpeed (was 0, now 3). All systems verified working.

5. [ ] **Feedback Point** - User tests the mechanic before adding audio.

## Notes
- Play area: 9 units wide × 16 units tall, bounds -4.5 to +4.5 (X), -8 to +8 (Y)
- Scripts location: scripts/
- Existing events: BrickDestroyed, Restart, ResetRound, BallLost
