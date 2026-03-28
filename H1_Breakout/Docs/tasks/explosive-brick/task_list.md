# Explosive Brick Task List

## Tasks

1. [x] **scripting** - Create ExplosiveBrick.ts component
   - Implements ICollider interface like regular Brick
   - When destroyed by ball, triggers explosion that destroys all adjacent bricks (8 directions)
   - Supports chain reactions (if adjacent brick is also explosive, it explodes too)
   - Uses red/orange color to be visually distinct
   - Emits BrickDestroyed event for each brick destroyed
   - Register with CollisionManager like regular bricks

2. [x] **scripting** - Create ExplosiveBrick.hstf template based on existing Brick.hstf

3. [x] **scripting** - Update LevelLayout.ts to support 'E' character for explosive bricks and update grid pattern

4. [x] **scripting_verification** - Verify ExplosiveBrick implementation

5. [ ] **Feedback Point** - Test explosive brick mechanics

6. [ ] **scripting** - Add explosion VFX

7. [ ] **scripting_verification** - Verify explosion VFX

8. [ ] **Feedback Point** - Test with VFX, then add audio in later step
