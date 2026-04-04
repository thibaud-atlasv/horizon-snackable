# Tower Upgrade Menu - Task List

## Task 1: Create Tower Upgrade Menu UI
**Agent:** scripting
**Status:** done

Create the Tower Upgrade Menu UI panel:
- Create new XAML file: UI/TowerUpgradeMenu.xaml with 3-column layout (Sell, Upgrade 1, Upgrade 2)
- Match TowerShop dimensions exactly: 600px height, full width, docked to bottom
- Use same styling: background #1a1a2e, border #3a3a5a (2px top), typography 54px bold names, 48px costs
- Use gold icon from Textures/gold_icon.png (72px)
- Left column: Sell button with gold icon and sell value
- Center column: Upgrade 1 with name, cost, and state handling (affordable/too_expensive/maxed)
- Right column: Upgrade 2 with same format
- Apply greyed out styling for unaffordable upgrades, show "MAX" for maxed upgrades
- Create new controller: Scripts/Components/TowerUpgradeMenuHud.ts
- Implement TowerUpgradeMenuViewModel with: visible, towerName, sellValue, upgrade1Name, upgrade1Cost, upgrade1State, upgrade2Name, upgrade2Cost, upgrade2State
- Listen for TowerSelected event (towerId, entityId) to show panel
- Listen for TowerDeselected event to hide panel
- Coordinate with TowerShop visibility via events (hide shop when upgrade menu visible)
- Fire SellTower event (towerId) when sell button tapped
- Fire UpgradeTower event (towerId, upgradeIndex) when upgrade buttons tapped
- Use placeholder upgrade names for now
- Calculate sell value as 50% of tower cost
- Add the upgrade menu to space.hstf alongside existing TowerShopUI

## Task 2: Verify Implementation
**Agent:** scripting_verification
**Status:** done
**Notes:** Fixed missing visibility coordination between TowerShop and TowerUpgradeMenu

Verify the Tower Upgrade Menu implementation:
- Verify TowerUpgradeMenu.xaml has correct 3-column layout matching TowerShop styling
- Verify TowerUpgradeMenuHud.ts controller properly handles TowerSelected/TowerDeselected events
- Verify ViewModel bindings are correct for all properties
- Verify SellTower and UpgradeTower events are properly fired
- Verify upgrade state handling (affordable/too_expensive/maxed) works correctly
- Verify coordination with TowerShop visibility

## Task 3: Feedback Point
**Status:** done

Tower Upgrade Menu UI is ready for testing. The panel should appear when a placed tower is selected, showing sell option and two upgrade paths. Tapping elsewhere or selling should return to the shop view.
