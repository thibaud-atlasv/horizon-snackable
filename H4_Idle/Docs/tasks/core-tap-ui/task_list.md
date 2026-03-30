# Core Tap UI - Task List

## Tasks

1. [x] **scripting** - Create the tap button UI component with a large clickable button centered on screen. Implement the bounce animation (scale up then back to normal) when tapped. The button should fire Events.PlayerTap when clicked. Use the play area dimensions (9×16 world units, centered at origin) for positioning.
   - *suggested skills: ui, animation*

2. [ ] **scripting** - Create the floating text feedback system. Listen to Events.GainApplied and spawn floating text showing the amount (e.g., "+5") near the tap button. The text should animate upward and fade out over ~1 second, then be cleaned up.
   - *suggested skills: ui, animation*

3. [ ] **scripting** - Create the gold counter display at the top of the screen. Listen to Events.ResourceChanged to update the display in real-time. Format the gold amount with a coin emoji prefix (e.g., "💰 1,234"). Position at the top of the 9×16 play area.
   - *suggested skills: ui*

4. [ ] **scripting_verification** - Verify all three UI implementations are correct: tap button with bounce animation firing Events.PlayerTap, floating text spawning on Events.GainApplied with upward fade animation, and gold counter updating on Events.ResourceChanged.

5. [ ] **Feedback Point** - Request feedback on the core tap UI.

## Context
- Play area: 9×16 world units, portrait mobile, centered at origin
- TapService handles PlayerTap events and calls ResourceService.addGain()
- ResourceService fires Events.GainApplied { amount, source } and Events.ResourceChanged { amount }
- ClientSetup already handles touch input and fires Events.PlayerTap
