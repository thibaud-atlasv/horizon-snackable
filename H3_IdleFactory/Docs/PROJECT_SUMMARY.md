# Idle Factory Tycoon

## Genre
Tycoon - Idle Factory

## Core Gameplay Loop
Le joueur upgrade différents modules d'une chaîne de production pour gagner de l'argent et continuer à améliorer son usine. Les décisions stratégiques concernent principalement l'ordre des upgrades pour gérer les goulots d'étranglement.

## Architecture Modulaire
Les modules sont conçus pour être **isolés et souples**, permettant de créer facilement des variantes du jeu avec des sets de modules totalement différents.

---

## Modules du Jeu de Base

### 1. Conveyor Belt (Tapis Roulant)
- **Position:** Gauche de l'écran, orienté vers le haut
- **Fonction:** Transporte les produits vers l'entrepôt
- **Mécanique:**
  - Belt continue (positions float, pas de slots discrets)
  - Les produits avancent de `speed` world-units/seconde
  - Espacement minimum (`CONVEYOR_MIN_GAP`) entre produits
  - S'arrête si l'entrepôt est plein, reprend automatiquement
- **Upgrade:** Augmente la vitesse (`conveyor`)

### 2. Entrepôt (Warehouse)
- **Position:** En haut à gauche, au-dessus du conveyor belt, en dessous des camions
- **Fonction:** Stockage des produits
- **Mécanique:**
  - Capacité limitée (upgradable)
  - Rempli par le conveyor belt
  - Vidé par les camions
  - Settle time de 0.5s avant qu'un produit soit disponible pour les camions
- **Upgrade:** Augmente la capacité de stockage (`warehouse`)

### 3. Camions (Trucks)
- **Position:** Tout en haut de l'écran, traversant horizontalement toute la largeur
- **Fonction:** Transport et vente des produits
- **Mécanique:**
  - File d'attente : un camion au dock, les autres staged hors écran
  - Chaque passage à l'entrepôt : prend TRUCK_CAPACITY produits (settled uniquement)
  - Loading animation (1s) puis départ vers la droite
  - Arrivée à droite : gagne de l'argent, retour par la gauche
- **Upgrade:** Ajoute +1 camion (`trucks`)

### 4. Production (3 modules)
- **Position:** À droite du conveyor belt, empilés verticalement
- **Fonction:** Génération des produits
- **Mécanique:**
  - Chaque module démarre **verrouillé** (level 0 = Infinity interval)
  - Premier upgrade = déverrouillage (production0 coûte 0$, les autres payants)
  - Dépose le produit à sa distance configurée sur le conveyor belt
  - Si pas d'espace (minGap) : production bloquée, retry chaque frame
- **Upgrade:** Réduit l'intervalle de production (`production0/1/2`)

---

## Layout de l'Écran

```
┌─────────────────────────────────────────────┐
│  [CAMIONS] ←→ traversent horizontalement    │
├─────────────────────────────────────────────┤
│  [ENTREPÔT]                                 │
├──────────┬──────────────────────────────────┤
│          │  [PRODUCTION 1] (locked → 0$)    │
│ CONVEYOR │  [PRODUCTION 2] (locked → 150$)  │
│   BELT   │  [PRODUCTION 3] (locked → 150$)  │
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
    EconomyService.ts      ← Money balance; tryUpgrade() fires UpgradePurchased
    WarehouseService.ts    ← Stock buffer with settle timers; capacity upgrades
    ConveyorService.ts     ← Continuous belt (float positions); speed upgrades
    TruckService.ts        ← Fleet state machines; truck count upgrades
    ProductionService.ts   ← Module timers; locked/unlocked state; interval upgrades
    ProductPoolService.ts  ← Shared pool of reusable Product entities

  Components/
    GameManager.ts               ← Scene anchor; initializes all services
    ConveyorBeltController.ts    ← Pure renderer: syncs pool visuals with service state
    TruckController.ts           ← Truck movement, lane switching, cargo animation
    WarehouseController.ts       ← Platform management, stacking, add/remove animations
    IdleFactoryCameraComponent.ts ← Fixed top-down camera (60° FOV)

  UI/
    WarehouseGaugeViewModel.ts   ← World-space gauge (stock/capacity)
```

### Belt model
Continuous float-based belt (`CONVEYOR_BELT_LENGTH = 15` world units). Products advance at `speed` units/second. Minimum gap of `CONVEYOR_MIN_GAP = 1.5` between products. Belt pauses entirely when warehouse is full.

Production deposit distances: 3.75 / 7.5 / 11.25 (evenly spaced).

### Upgrade flow
UI → `EconomyService.tryUpgrade(moduleId, cost)` → deducts money → fires `Events.UpgradePurchased` → each service listens and updates its own operative value.

### Adding a game variant
- Swap `Defs/ProductionDefs.ts` entries to change module count / belt positions.
- Swap `Defs/UpgradeDefs.ts` entries to change upgrade effects and costs.
- Add/remove services and matching events as needed.

---

## Scene Layout (space.hstf)

| Zone | Color | Position (X, Y, Z) | Scale (W, H, D) |
|------|-------|-------------------|-----------------|
| Truck Road | Dark gray asphalt + yellow edge lines + white dashed center line | Z=-3.5, full width | 2-lane road |
| Warehouse | Gray floor + dark slate roof + walls with entrance gaps + 8 storage slots (2×4 grid) | Center (0, 0.1, -2.25) | Floor 4.5×0.1×1.5 |
| Conveyor Belt | Dark gray base + silver rails + light gray slot markers | X=-1.75, Z from -1.25 to 3.75 | 8 markers + 2 rails |
| Production 1 | Blue machine | (0.48, -0.10, -0.256) | ProductionModule template instance |
| Production 2 | Green machine | (0.48, -0.10, 1.244) | ProductionModule template instance |
| Production 3 | Red machine | (0.48, -0.10, 2.744) | ProductionModule template instance |

### Production Module Template (`Templates/ProductionModule.hstf`)
Reusable assembled-primitives template for each production zone. Composed of 12 cube primitives:
- **Body**: Main platform (dark gray, 3.5×0.2×1.5)
- **BodyBorder**: Thin raised border for depth (darker gray, 3.6×0.04×1.6)
- **Ramp**: Exit chute sloping toward conveyor belt (-X direction, -11° Z rotation)
- **RailLeft/RailRight**: Guide rails on ramp edges
- **MachineBase**: Central machine unit (color overridden per instance: blue/green/red)
- **MachineTop**: Detail cube on top of machine
- **Chimney**: Vertical pipe detail
- **Crane**: Mechanical arm (4 cubes) — yellow/orange arm and pillar with dark gray base and hook, extending toward the ramp (-X) to visually suggest package deposit

### Camera
Fixed top-down camera at (0, 8, 0) looking straight down with 60° FOV.

---

## UI Elements

### Warehouse Gauge (World-Space Custom UI)
- **Position:** Above warehouse at Y=0.7, rotated 90° on X to face camera
- **XAML:** `UI/WarehouseGauge.xaml` — green progress fill + "stock/capacity" text
- **ViewModel:** `WarehouseGaugeViewModel` — subscribes to `WarehouseChanged`

### Player Stats Bar (Screen-Space Custom UI)
- **Position:** Top of screen, horizontal banner
- **XAML:** `UI/PlayerStatsBar.xaml` — warehouse-themed banner with green border, dark semi-transparent background
- **ViewModel:** `Scripts/UI/PlayerStatsBarViewModel.ts` — display-only ViewModel
  - `TimePlayed`: string formatted as "MM:SS" or "HH:MM:SS"
  - `PackagesSent`: string showing total packages delivered
  - `Gold`: string showing current gold balance
- **Controller:** `Scripts/Components/PlayerStatsBarComponent.ts` — Tracks elapsed time, counts ProductDelivered events, reads gold from EconomyService
- **Features:** 3 stats with icons (Time, Packages placeholder, Gold), text shadows, gold-colored currency display

### Upgrade Panel (Screen-Space Custom UI)
- **Position:** Bottom of screen, dynamic height based on item count
- **XAML:** `UI/UpgradePanel.xaml` — warehouse-themed panel with green border, dark background; Canvas-based layout with per-item XY positioning via TranslateTransform bindings
- **ViewModel:** `Scripts/UI/UpgradePanelViewModel.ts` — ViewModel-only file
  - `UpgradeItemViewModel`: Individual upgrade item (UpgradeId, Title, Description, Price, IsEnabled, AnimationTrigger, PositionX, PositionY)
  - `UpgradePanelViewModel`: Collection of items with helper methods (addUpgrade with XY params, removeUpgrade, updateUpgrade, clearUpgrades)
  - `upgradeItemClickEvent`: UiEvent for button clicks with UpgradeId in CommandParameter
- **Controller:** `Scripts/Components/UpgradePanelComponent.ts` — Reads entries from UpgradeRegistryService, populates panel with positioned items, handles click→purchase flow, refreshes on registry changes
- **Features:** ScrollViewer for 5+ items, pulse animation on affordability change, disabled state styling, absolute XY positioning per button

---

## Économie & Progression
- **Monnaie de départ:** 50$ (`STARTING_MONEY`)
- **Revenu:** 10$ par produit livré (`MONEY_PER_PRODUCT`)
- **Démarrage:** Le joueur doit acheter explicitement le premier module de production (0$) pour lancer le jeu
- **Stratégie:** Gestion des goulots d'étranglement via l'ordre des upgrades
