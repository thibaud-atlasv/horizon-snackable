# Task: Tap UI Animation Enhancement

## Tasks

- [ ] **Task 1: Enhance tap button animation** (scripting)
  - Improve the tap button press animation in `UI/TapButton.xaml` and `Components/TapButtonUIComponent`
  - Make the bounce animation more satisfying with improved scale/timing effects in XAML

- [ ] **Task 2: Create pure XAML 2D floating text system** (scripting)
  - Build a new XAML template and component that:
    - Listens to `Events.GainApplied`
    - Spawns "+N" text elements in XAML UI
    - Animates them floating up and fading out using XAML animations
  - Remove or disable the old `FloatingTextFeedbackComponent` and `FloatingTextBehaviorComponent` 3D system

- [ ] **Task 3: Verification** (scripting_verification)
  - Verify the tap button animation enhancement
  - Verify the new XAML floating text system works correctly
  - Confirm the old 3D floating text system is properly disabled/removed

- [ ] **Feedback Point** - User tests the enhanced animations
