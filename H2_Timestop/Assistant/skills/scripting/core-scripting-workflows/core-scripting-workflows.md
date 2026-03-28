---
name: core-scripting-workflows
summary: Contains critical information on effective scripting workflows.
include: always
---

# Core Scripting Workflows

- When beginning any task, ALWAYS first check if there are any skills that can help you accomplish your task. Relevant skills drastically improve your success rate.

- wait_for_asset_build is not working correctly. The `filePaths` argument is ignored. You MUST use the `directoryPaths` argument to wait for build and check for status errors.

- Positions in MHS are generally continuous as they're interpolated over the network. Use `TransformComponent.teleportTo` to teleport discontinuously.

- NEVER use `PlayerComponent` for anything, it is deprecated and will break the project. You MUST use `BasePlayerComponent` instead.
