# Tower Shop Selection Indicator - Task List

## Task 1: Add Selection Indicator
**Agent:** scripting
**Status:** not_started

Add a visible selection indicator to the TowerShop UI:
- Add `selected` boolean and `towerColor` string properties to TowerShopItemViewModel
- Update TowerShopHud.ts to set selected=true on the currently selected tower
- Add DataTriggers in TowerShop.xaml for selected state:
  - BorderBrush → tower color (Arrow=#2ecc71, Cannon=#e67e22, Frost=#00bcd4, Laser=#9b59b6)
  - BorderThickness → 4px
  - Background → #2a2a4a
- Non-selected towers keep default border (#3a3a5a, 2px)

## Task 2: Verify Implementation
**Agent:** scripting_verification
**Status:** not_started

Verify the selection indicator works correctly.

## Task 3: Feedback Point
**Status:** not_started

Test the selection indicator in game.
