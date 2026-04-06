# Upgrade Dash Formatting Context Report

## Summary

The dash/hyphen prefix before upgrade names (like "-crit") in the tower upgrade panel **does NOT exist in the codebase**. The upgrade history is displayed using a **bullet point (•)** character, not a dash.

## Location of Formatting

### XAML UI Template
**File:** `UI/TowerUpgradeMenu.xaml`

The upgrade history is displayed in the Info Panel (Column 0) using three TextBlock elements with bullet point formatting:

```xaml
<!-- Upgrade History Line 1 -->
<TextBlock x:Name="UpgradeHistory1Text"
           Text="{Binding upgradeHistory1, StringFormat='&#x2022; {0}'}"
           Foreground="{StaticResource UpgradeHistoryBrush}"
           FontSize="42"
           HorizontalAlignment="Left"
           Margin="0,0,0,6"
           Visibility="{Binding showHistory1, Converter={StaticResource BoolToVisConverter}}"/>

<!-- Upgrade History Line 2 -->
<TextBlock x:Name="UpgradeHistory2Text"
           Text="{Binding upgradeHistory2, StringFormat='&#x2022; {0}'}"
           .../>

<!-- Upgrade History Line 3 -->
<TextBlock x:Name="UpgradeHistory3Text"
           Text="{Binding upgradeHistory3, StringFormat='&#x2022; {0}'}"
           .../>
```

**Key Detail:** `StringFormat='&#x2022; {0}'`
- `&#x2022;` is the HTML/XML entity code for the bullet point character (•)
- This prepends "• " before each upgrade name

## Data Flow

### 1. Upgrade Labels (Source Data)
**File:** `Scripts/Defs/UpgradeDefs.ts`

Upgrade labels are defined WITHOUT any prefix:
```typescript
export const Upg = {
  rate:         u('Rate',     s => ({ ...s, fireRate: s.fireRate * 2.0 })),
  damage:       u('Damage',   s => ({ ...s, damage: s.damage * 2.0 })),
  range:        u('Range',    s => ({ ...s, range: s.range + 2.0 })),
  splash:       u('Splash',   ...),
  slowFactor:   u('Slow',     ...),
  slowDuration: u('Duration', ...),
  crit:         u('Crit',     ...),
};
```

### 2. ViewModel Population
**File:** `Scripts/Components/TowerUpgradeMenuHud.ts`

The `_updateUpgradeHistory()` method walks the upgrade tree and collects labels:

```typescript
private _updateUpgradeHistory(def: ITowerDef, choices: number[]): void {
  if (!this.viewModel) return;

  const labels: string[] = [];
  if (choices.length > 0) {
    labels.push(def.upgrades[choices[0]].label);
    let node = def.upgrades[choices[0]];
    for (let i = 1; i < choices.length; i++) {
      if (node.next) {
        node = node.next[choices[i]];
        labels.push(node.label);  // ← Raw label, no prefix
      }
    }
  }

  // Assign to ViewModel properties (no prefix added here)
  this.viewModel.upgradeHistory1 = labels.length > 0 ? labels[0] : '';
  this.viewModel.upgradeHistory2 = labels.length > 1 ? labels[1] : '';
  this.viewModel.upgradeHistory3 = labels.length > 2 ? labels[2] : '';
  this.viewModel.showHistory1 = labels.length > 0;
  this.viewModel.showHistory2 = labels.length > 1;
  this.viewModel.showHistory3 = labels.length > 2;
}
```

### 3. XAML Binding with StringFormat
The XAML template binds to these ViewModel properties and applies the bullet point prefix via `StringFormat`:

```xaml
Text="{Binding upgradeHistory1, StringFormat='&#x2022; {0}'}"
```

This results in displayed text like:
- `• Rate`
- `• Crit`
- `• Damage`

## Conclusion

**If the user is seeing a dash (-) instead of a bullet (•):**

1. **Font rendering issue** — The font may not support the bullet character (U+2022) and is falling back to a dash
2. **User misidentification** — They may be describing the bullet as a "dash"
3. **Custom modification** — Someone may have changed `&#x2022;` to `&#x2013;` (en-dash) or `-` in the XAML

**To change the prefix character:**
Edit `UI/TowerUpgradeMenu.xaml` lines 79, 88, and 97:
- Current: `StringFormat='&#x2022; {0}'` (bullet point)
- For dash: `StringFormat='- {0}'` (hyphen-minus)
- For en-dash: `StringFormat='&#x2013; {0}'` (en-dash)
- For em-dash: `StringFormat='&#x2014; {0}'` (em-dash)
- For no prefix: Remove `StringFormat` attribute entirely

**No code changes needed** — this is purely a UI template formatting concern.
