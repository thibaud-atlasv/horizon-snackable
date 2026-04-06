---
name: debugging-horizon-studio-logs
description: Debugs issues using Horizon Studio logfiles from horizon_editor, asset_hub_app, and world_app directories. Use when investigating errors, crashes, or unexpected behavior in the editor, asset processing, or preview mode.
include: as_needed
---

# Debugging Horizon Studio Logs

## Investigating

If the issue is unclear, ask the user for more details about what they experienced.

## Logfile Layout

| Element | Description |
|---------|-------------|
| Date folders | `YYYYMMDD` format (default: today's date) |
| Session folders | Numeric subfolders that increment; use the largest number (most recent session) |

**Example structure:**

```text
horizon_editor/
├── 20260226/
├── 20260227/
│   ├── 331728/
│   └── 369484/
└── 20260228/
    ├── 363132/
    └── 384848/   ← Use this (largest = current session)
```

---

## Log Locations

| Log Type | Path | Contains |
|----------|------|----------|
| Horizon Studio | `%USERPROFILE%\AppData\Local\Temp\horizon_editor` | Editor errors |
| Asset Hub | `%USERPROFILE%\AppData\Local\Temp\asset_hub_app` | Asset processing errors |
| World App | `%USERPROFILE%\AppData\Local\Temp\world_app` | Preview mode errors |
