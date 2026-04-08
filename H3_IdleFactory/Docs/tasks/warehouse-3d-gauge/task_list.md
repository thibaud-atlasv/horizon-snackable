# Warehouse 3D Gauge Task List

## Tasks

- [x] **Task 1: scripting** - Remove/disable the old screen-space warehouse gauge UI ✅
  - Disable or remove: `Scripts/Components/WarehouseGaugeHudComponent.ts`, `Scripts/UI/WarehouseGaugeHudViewModel.ts`, `UI/WarehouseGaugeHud.xaml`
  - Ensure the old gauge no longer appears in the game

- [x] **Task 2: scripting** - Create a new 3D world-space warehouse fill gauge ✅
  - Mobile style with thick border
  - Horizontal progress bar that fills based on stock/capacity ratio
  - Display ONLY the fill number inside (e.g., "3/5"), NO "Warehouse" text or other labels
  - Oriented facing UP (rotated to be visible from top-down camera at Y=8)
  - Positioned above the Warehouse template at approximately (0, 0.5, -2.25)
  - Connect to WarehouseService: listen to `WarehouseChanged` event from `Scripts/Types.ts`
  - Update the progress bar and text in real-time

- [x] **Task 3: scripting_verification** - Verify the implementation ✅
  - Old screen-space UI is removed/disabled
  - New 3D world-space gauge is correctly positioned and oriented
  - Progress bar fills correctly based on warehouse stock/capacity
  - Text displays only the fill ratio (e.g., "3/5")
  - Real-time updates work when WarehouseChanged event fires

- [ ] **Feedback Point** - User tests the new 3D gauge
