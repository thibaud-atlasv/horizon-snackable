# Idle Factory Tycoon

> **Language rule:** All code, comments, documentation, and files in this project must be written in **English**.

## Genre
Tycoon / Idle Factory — snackable mobile portrait single-player game.

## Core Gameplay Loop
The player upgrades modules of a production chain to earn money and continue improving the factory. Strategic decisions revolve around identifying and resolving bottlenecks through the order of upgrades.

## Modular Architecture
Modules are designed to be **isolated and flexible**, making it easy to create game variants with entirely different module sets.

---

## Game Modules

### 1. Conveyor Belt
- **Position:** Left side of screen, oriented upward
- **Function:** Transports products from production modules to the warehouse
- **Mechanics:**
  - Continuous float-based belt (`CONVEYOR_BELT_LENGTH = 15` world units)
  - Products advance at `speed` world-units/second
  - Minimum gap (`CONVEYOR_MIN_GAP = 1.5`) enforced between products
  - Automatically pauses when warehouse is full, resumes when space opens
- **Upgrade:** Increases belt speed (`conveyor`) — 6 levels, base 1.0 → max 3.5 units/s

### 2. Warehouse
- **Position:** Upper area, above the conveyor belt, below the truck road
- **Function:** Buffer storage between conveyor and trucks
- **Mechanics:**
  - Limited capacity (upgradeable): 6 → 12 → 18 → 24 items
  - Filled by the conveyor belt, emptied by trucks
  - 0.5s settle cooldown before a product is available for truck pickup
  - 8 platforms arranged in a 2×4 grid; inactive platforms slide off-screen on upgrade
  - Up to 3 products stacked per platform (vertical Y offset)
- **Upgrade:** Increases storage capacity (`warehouse`) — 4 levels

### 3. Trucks
- **Position:** Top of screen, traveling horizontally across full width
- **Function:** Pickup and delivery of products; generates revenue
- **Mechanics:**
  - Fleet queue: one truck at dock, others staged off-screen
  - Each truck carries `TRUCK_CAPACITY = 3` products (settled only)
  - Loading: 0.3s pause per product at dock, then departs right
  - On exit: fires `TruckDelivered` (+$15), truck returns via upper lane
  - Next truck approaches automatically once the current one completes loading
- **Upgrade:** Adds +1 truck (`trucks`) — 6 levels, base 1 → max 6 trucks

### 4. Production (3 modules)
- **Position:** Right of the conveyor belt, stacked vertically
- **Function:** Product generation
- **Mechanics:**
  - Each module starts **locked** (level 0 = Infinity interval)
  - First upgrade = unlock (Production 1 costs $0, others are paid)
  - Deposits product at its configured distance on the belt (3.75 / 7.5 / 11.25)
  - If no gap available: production blocked, retries each frame
  - Crane animation synced to production interval (pick-up → deposit arc)
- **Upgrade:** Reduces production interval (`production0/1/2`) — 7 levels, base 4.0s → min 1.0s

---

## Screen Layout

```
┌─────────────────────────────────────────────┐
│  [TRUCKS] ←→ travel horizontally            │
├─────────────────────────────────────────────┤
│  [WAREHOUSE]                                │
├──────────┬──────────────────────────────────┤
│          │  [PRODUCTION 1] (unlock: free)   │
│ CONVEYOR │  [PRODUCTION 2] (unlock: $100)   │
│   BELT   │  [PRODUCTION 3] (unlock: $100)   │
│    ↑     │                                  │
└──────────┴──────────────────────────────────┘
```

---

## Scripts Architecture

```
Scripts/
  Types.ts          ← Events (UpgradePurchased, ProductDelivered, WarehouseChanged…)
  Constants.ts      ← All tuning values (speeds, capacities, belt length, gaps)
  Assets.ts         ← TemplateAsset declarations

  Defs/
    UpgradeDefs.ts    ← IUpgradeDef table: getCost(level)/getEffect(level) per module
    ProductionDefs.ts ← IProductionModuleDef: maps each module to its belt depositDistance

  Services/
    EconomyService.ts          ← Money balance; tryUpgrade() fires UpgradePurchased
    WarehouseService.ts        ← Stock buffer with settle timers; capacity upgrades
    ConveyorService.ts         ← Continuous belt (float positions); speed upgrades
    TruckService.ts            ← Fleet state machines; truck count upgrades
    ProductionService.ts       ← Module timers; locked/unlocked state; interval upgrades
    ProductPoolService.ts      ← Shared pool of reusable Product entities
    UpgradeRegistryService.ts  ← Passive broker between services and upgrade UI

  Components/
    GameManager.ts                  ← Scene bootstrap; initializes pool and spawns layout
    ConveyorBeltController.ts       ← Pure renderer: syncs pool visuals with service state
    TruckController.ts              ← Truck movement, lane switching, cargo animation
    WarehouseController.ts          ← Platform management, stacking, add/remove animations
    ProductionModuleController.ts   ← Crane + cargo animation synced to production timer
    IdleFactoryCameraComponent.ts   ← Fixed top-down camera (60° FOV), 1.5s init delay
    UpgradePanelComponent.ts        ← Reads registry, populates panel, handles click→purchase
    PlayerStatsBarComponent.ts      ← Tracks elapsed time, package count, gold display

  UI/
    WarehouseGaugeViewModel.ts  ← World-space gauge (stock/capacity bar)
    UpgradePanelViewModel.ts    ← Upgrade list ViewModel + per-item color/style support
    PlayerStatsBarViewModel.ts  ← Time / packages / gold display ViewModel
    TitleScreenViewModel.ts     ← Play button event + visibility control
```

### Belt model
Continuous float-based belt (`CONVEYOR_BELT_LENGTH = 15` world units). Products advance at `speed` units/second. Minimum gap of `CONVEYOR_MIN_GAP = 1.5` between products. Belt pauses entirely when warehouse is full.

Production deposit distances: 3.75 / 7.5 / 11.25 (evenly spaced).

### Upgrade flow
`UpgradeRegistryService` → `UpgradePanelComponent` reads entries → player clicks button → `EconomyService.tryUpgrade(id, cost)` → deducts money → fires `Events.UpgradePurchased` → each service listens and updates its own operative value → `UpgradeRegistryService` re-registers updated def → `UpgradePanelComponent` refreshes list.

### Adding a game variant
- Swap `Defs/ProductionDefs.ts` entries to change module count / belt positions.
- Swap `Defs/UpgradeDefs.ts` entries to change upgrade effects and costs.
- Add/remove services and matching events as needed.

---

## Scene Layout (space.hstf)

| Zone | Description | Position (X, Y, Z) |
|------|-------------|---------------------|
| Truck Road | Dark gray asphalt, yellow edge lines, white dashed center line | Z=-3.5, full width |
| Warehouse | Gray floor, dark slate roof, walls with entrance gaps, 8 storage platforms | Center (0, 0.1, -2.25) |
| Conveyor Belt | Dark gray base, silver rails, light gray slot markers | X=-1.75, Z from -1.25 to 3.75 |
| Production 1 | Blue machine | (0.48, -0.10, -0.256) |
| Production 2 | Green machine | (0.48, -0.10, 1.244) |
| Production 3 | Red machine | (0.48, -0.10, 2.744) |

### Production Module Template (`Templates/ProductionModule.hstf`)
Reusable assembled-primitives template. Composed of 12 cube primitives:
- **Body**: Main platform (dark gray, 3.5×0.2×1.5)
- **BodyBorder**: Thin raised border for depth
- **Ramp**: Exit chute sloping toward conveyor belt (-X direction, -11° Z rotation)
- **RailLeft/RailRight**: Guide rails on ramp edges
- **MachineBase**: Central machine unit (color overridden per instance: blue/green/red)
- **MachineTop**: Detail cube on top of machine
- **Chimney**: Vertical pipe detail
- **Crane**: Mechanical arm — yellow/orange arm and pillar with dark gray base and hook, extends toward ramp to suggest package deposit

### Camera
Fixed top-down camera at (0, 8, 0) looking straight down with 60° FOV. Set after 1.5s delay via `IdleFactoryCameraComponent`.

---

## UI Elements

### Title Screen (Screen-Space)
- **XAML:** `UI/TitleScreen.xaml`
- **ViewModel:** `Scripts/UI/TitleScreenViewModel.ts`
- **Controller:** `Scripts/Components/TitleScreenComponent.ts`
- On start: hides UpgradePanel and PlayerStatsBar. On Play click: hides itself, shows game UI.
- Features: background image (`Textures/background.png`), logo (`Textures/Logo.png`), tagline cartouche "BUILD. AUTOMATE. PROFIT.", orange 3D relief "PLAY" button with metallic outline, and teasing text with yellow highlight.

### Warehouse Gauge (World-Space)
- **XAML:** `UI/WarehouseGauge.xaml`
- **ViewModel:** `Scripts/UI/WarehouseGaugeViewModel.ts`
- Green progress fill bar + "stock/capacity" text, positioned above warehouse at Y=0.7, rotated 90° on X to face camera.

### Player Stats Bar (Screen-Space, top)
- **XAML:** `UI/PlayerStatsBar.xaml`
- **ViewModel:** `Scripts/UI/PlayerStatsBarViewModel.ts`
- **Controller:** `Scripts/Components/PlayerStatsBarComponent.ts`
- Displays: `TimePlayed` (MM:SS / HH:MM:SS), `PackagesSent` (total deliveries), `Gold` (current balance with thousand separators).
- Updates every frame via `OnWorldUpdateEvent`.

### Upgrade Panel (Screen-Space, bottom)
- **XAML:** `UI/UpgradePanel.xaml`
- **ViewModel:** `Scripts/UI/UpgradePanelViewModel.ts`
- **Controller:** `Scripts/Components/UpgradePanelComponent.ts`
- Canvas-based layout; each button has absolute XY position defined in `BUTTON_POSITION`.
- Per-button 3D relief style (4-layer: outline → highlight border → shadow border → background fill), fully configurable via `UpgradeItemViewModel` color/visibility properties.
- **Outline color is dynamic:** green (`#FF4CAF50`) when affordable, dark gray (`#FF424242`) when too expensive — updates on every `TruckDelivered` event.
- Button color palette per upgrade:
  | Upgrade | Background | Text |
  |---------|------------|------|
  | Conveyor Belt | Blue `#FF148FD5` | White |
  | Warehouse | Brown `#FF4E342E` | White |
  | Trucks | Navy `#FF1A237E` | White |
  | Production 1 | Blue `#FF148FD5` | White |
  | Production 2 | Green `#FF58A31E` | White |
  | Production 3 | Red `#FFEB1B04` | White |

---

## Economy & Progression

| Parameter | Value | Constant |
|-----------|-------|----------|
| Starting money | $50 | `STARTING_MONEY` |
| Revenue per delivery | $15 | `MONEY_PER_PRODUCT` |
| Truck capacity | 3 products | `TRUCK_CAPACITY` |
| Products per truck load | 3 × $15 = $45 | — |

- The player must explicitly purchase the first production module ($0) to start the factory.
- Strategy: identify and resolve bottlenecks — conveyor too slow, warehouse full, not enough trucks, etc.
