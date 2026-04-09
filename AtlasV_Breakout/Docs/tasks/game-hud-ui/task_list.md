# Game HUD UI System Task List

## Tasks

1. [x] **scripting** - Create the GameHUDViewModel script (`Scripts/GameHUD/GameHUDViewModel.ts`) that exposes reactive properties for score, level, lives, centerText, and showCenterText. Include methods to update these properties and follow the project's event-based communication pattern. Also create the Types.ts file with any necessary events/payloads for the HUD system.
   - *[suggested skills: ui-view-model, ui-overview]*

2. [x] **scripting** - Create the HUD UI layout with a top bar (score left, level center, lives right) and a center text area for game state messages. Use portrait-oriented, minimal styling. Bind all UI elements to the GameHUDViewModel's reactive properties.
   - *[suggested skills: ui-building, ui-binding, ui-layout]*

3. [x] **scripting_verification** - Verify the GameHUDViewModel and UI layout implementations are correct, following the project's architecture patterns (event-based communication, no direct component references, proper Types.ts structure).

4. [x] **Feedback Point** - Request feedback on the HUD system
