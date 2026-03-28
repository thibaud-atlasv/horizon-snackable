# H2_Timestop — Project Summary

## Concept

**TIME STOP** est un jeu d'arcade mobile portrait (Meta Horizon Worlds) pour un joueur.

Des objets tombent du haut de l'écran avec rotation, dérive latérale et rebonds. Le joueur **tape l'écran** pour les figer en vol juste avant qu'ils touchent le sol. Plus l'objet est proche du sol au moment du tap, plus le score est élevé. Si un objet atteint le sol sans être figé, c'est **Game Over**.

| Attribut | Valeur |
|---|---|
| Feeling | Tension précision — timing sous pression, satisfaction du "perfect freeze" |
| Session | ~3–5 minutes (10 rounds) |
| Plateforme | Mobile portrait, solo, Meta Horizon Worlds |
| Exécution | Client-only (`isServerContext()` guard partout) |

---

## Boucle de jeu

```
[Start]
  → TAP → [Intro] (round banner + ghost preview)
         → objets activés un par un (1s d'intervalle)
         → [Falling] TAP → score l'objet le plus bas → [Clearing] (280ms)
                       └── tous figés ? → [RoundEnd] → prochain round
                                       sinon → [Falling]
  → dernier round terminé → [End] → TAP → restart
  → objet touche FLOOR_Y → [GameOver] → TAP → restart
```

### Phases (`GamePhase`)

| Phase | Description |
|---|---|
| `Start` | Écran titre, "Tap to start". Objets du round 0 déjà pré-spawnés en ghost. |
| `Intro` | Bannière "Round N", objets visibles mais inactifs (ghost). Durée : 1050 ms. |
| `Falling` | Objets actifs en chute. Tap accepté. Les objets sont activés un par un (1s entre chaque). |
| `Clearing` | Pause de 280 ms après un freeze (objets physiquement arrêtés). |
| `RoundEnd` | Transition entre rounds. |
| `GameOver` | Un objet a touché `FLOOR_Y`. Affiche le score final. |
| `End` | Les 10 rounds sont terminés. Affiche le score final. |

---

## Système de score

Le score d'un freeze est calculé sur la **précision** = fraction du trajet `PLAY_TOP → FLOOR_Y` parcouru (0 = au-dessus de la zone, 1 = au sol).

| Grade | Seuil (distance au parfait) | Points de base | Bonus max |
|---|---|---|---|
| Perfect | ≤ 3.5 % | 1000 | +250 |
| Great | ≤ 13 % | 650 | +250 |
| Good | ≤ 32 % | 350 | +250 |
| Early | ≤ 60 % | 150 | +250 |
| Miss | > 60 % | 30 | +250 |

Le bonus est `precision × 250` (arrondi), cumulé au score de base. Le score total s'accumule sur les 10 rounds.

---

## Zones de jeu (Y-up, world units)

```
 6.68  ──  START_Y   (spawn / ghost preview)
 5.49  ──  PLAY_TOP  (début de la zone de scoring)
  ...     [zone de jeu active]
-6.47  ──  FLOOR_Y   (game-over si un coin d'objet descend en-dessous)
```

Play area : **9 × 16 world units**, centrée à l'origine.

---

## Progression des rounds

10 rounds avec difficulté croissante. Trois mécaniques s'introduisent progressivement :

| Round | Objets | Rebond mur | Pivot excentré |
|---|---|---|---|
| 1 | 1 | — | — |
| 2 | 2 | — | — |
| 3 | 2 | ✓ (hard) | — |
| 4 | 3 | ✓ | — |
| 5 | 3 | ✓ | ✓ |
| 6–7 | 4 | ✓ | ✓ |
| 8–10 | 5 | ✓ | ✓ |

La vitesse de chute augmente de ~0.34 wu/s par round (base ~3.61 wu/s).

---

## Physique des objets (type Log)

Chaque objet Log est un rectangle plat (`logW × LOG_H × 0.1` world units), redimensionné dynamiquement via `TransformComponent.localScale`.

| Paramètre | Plage | Détail |
|---|---|---|
| Largeur | 2.06 – 3.89 wu | Aléatoire à chaque spawn |
| Vitesse de chute | 3.61 – 6.67 wu/s | Constante par objet, augmente par round |
| Dérive horizontale (vx) | 1.03 – 2.74 wu/s | Signe indépendant de l'angle |
| Angle initial | ±8 – 48 ° | Signe indépendant du torque |
| Torque | ±40 – 220 °/s | Donne la rotation pendant la chute |
| Pivot excentré | ±0 – 50 % de la demi-largeur | Rotation autour d'un point décalé (rounds 5+) |

**Rebond mur :** correction de position + inversion de `vx` avec damping + kick de torque.
- Hard bounce (rounds 3+) : `BOUNCE_KICK_FULL ≈ 1.03 wu/s`, `BOUNCE_TORQUE_ADD = 2.0 rad/s`
- Soft deflection (rounds 1–2) : `BOUNCE_KICK_SOFT ≈ 0.57 wu/s`, `BOUNCE_TORQUE_ADD_SOFT = 0.8 rad/s`

**Freeze → fade out :** 240 ms à pleine opacité, puis 460 ms de fondu via `ColorComponent` alpha → `entity.destroy()`.

---

## Système ghost (pré-visualisation)

Au début de chaque round, **tous les objets sont spawnés simultanément** en mode ghost :
- Visibles à `START_Y`, dans leur position/angle/échelle de départ
- Inactifs (pas enregistrés dans `FallingObjRegistry`, physique désactivée)
- Quand la phase `Falling` commence, `GameManager` envoie `FallingObjActivate` un par un toutes les 1 seconde

Le joueur peut donc **voir tous les objets à venir** avant que la chute ne démarre.

---

## Architecture

### Communication

Tous les composants communiquent exclusivement via `LocalEvent`. **Aucune référence directe entre composants.** L'état partagé passe par `FallingObjRegistry` (singleton) ou par les events.

### Fichiers clés

| Fichier | Classe | Rôle |
|---|---|---|
| `Scripts/Types.ts` | — | Enums, interfaces, tous les events et payloads |
| `Scripts/Constants.ts` | — | Toutes les constantes numériques de gameplay |
| `Scripts/LevelConfig.ts` | — | Définitions des rounds (`ROUND_DEFS`) |
| `Scripts/Assets.ts` | — | `FallingObjTemplates` : template par `FallingObjType` |
| `Scripts/GameManager.ts` | `GameManager` | Orchestration phases, score, restart, activation séquentielle |
| `Scripts/InputManager.ts` | `InputManager` | Tap → score → freeze → phase Clearing/RoundComplete |
| `Scripts/SpawnManager.ts` | `SpawnManager` | Spawn ghost + envoi `InitFallingObj` + `AllObjsSpawned` |
| `Scripts/LogRegistry.ts` | `FallingObjRegistry` | Singleton : suivi des objets actifs (non-waiting) |
| `Scripts/GameplayObjects/Log.ts` | `FallingObj` | Physique + lifecycle de chaque objet (dispatch par type) |
| `Scripts/ClientSetup.ts` | `ClientSetup` | Caméra fixe + `FocusedInteraction` → `Events.PlayerTap` |
| `Scripts/GameHUD/GameHUDViewModel.ts` | `GameHUDViewModel` | Gère le HUD 2D : score, annonces centrales (phases, countdown "3→2→1", "GAME OVER", "VICTORY!") |
| `assets/UI/GameHUD.xaml` | — | XAML arcade-style HUD mobile : score en haut avec animation pulse, texte central dynamique avec animations pop-in |
| `Scripts/CollisionManager.ts` | `CollisionManager` | AABB générique (disponible, non utilisé par la physique principale) |
| `Scripts/GameplayObjects/FreezeLineVisual.ts` | `FreezeLineVisual` | Feedback visuel : ligne horizontale colorée à la position Y du freeze |
| `Scripts/GameplayObjects/FloatingScoreText.ts` | `FloatingScoreText` | Feedback visuel : texte grade + score animé montant avec fade out |


### Flow d'événements principal

```
ClientSetup.onTouchStarted → Events.PlayerTap
  → GameManager.onPlayerTap  (Start/GameOver/End : transition de phase)
  → InputManager.onPlayerTap (Falling : score + freeze)

SpawnManager.onPrepareRound → spawnTemplate × N → Events.InitFallingObj (ghost)
  → Events.AllObjsSpawned → GameManager.onAllObjsSpawned → startRound()

GameManager._setPhase(Falling) → Events.PhaseChanged
  → FallingObj.onPhaseChanged (unlocks physics)
  → GameManager._scheduleNextActivation → Events.FallingObjActivate (×N, 1s apart)
  → FallingObj.onActivate (sets _launched = true)

InputManager._handleTap → Events.FallingObjFreeze → FallingObj.onFreeze
  → Events.FallingObjFrozen → GameManager.onFallingObjFrozen (score)
                            → FreezeLineVisual.onFallingObjFrozen (spawn line)
  → (after RESUME_DELAY) → Events.PhaseChanged(Falling) or RoundComplete
```

---

## Système de types d'objets (extensible)

`FallingObjType` (enum dans `Types.ts`) identifie chaque variante d'objet. Ajouter un nouveau type nécessite des modifications dans **5 endroits uniquement** :

1. **`Types.ts`** — nouvelle valeur dans `FallingObjType`
2. **`Assets.ts`** — entrée dans `FallingObjTemplates`
3. **`LevelConfig.ts`** — utiliser le nouveau type dans une `WaveObjDef`
4. **`SpawnManager._buildObjConfig()`** — nouveau `case` de génération des paramètres
5. **`FallingObj` (Log.ts)** — nouveaux `case` dans `_initTypePhysics`, `_tickTypePhysics`, `_applyTypeTransform`, et `getLowestY()` si le bounding volume diffère

---

## Templates

| Template | Asset | Type | Description |
|---|---|---|---|
| `Templates/GameplayObjects/Log.hstf` | `FallingObjTemplates[FallingObjType.Log]` | Log | Cube scale 1 — redimensionné dynamiquement par `FallingObj` |
| `Templates/GameplayObjects/FloatingText.hstf` | `FloatingScoreText._textTemplate` | Text | WorldTextComponent pour le texte flottant animé |

---

## Points d'extension prioritaires

| Fonctionnalité | Où intervenir |
|---|---|
| Nouvel objet tombant (ex: boule, pic) | `FallingObjType` + `Assets` + `LevelConfig` + `SpawnManager` + `FallingObj` |
| Nouveau round / configuration wave | `LevelConfig.ts → ROUND_DEFS` |
| Feedback visuel grade (texte flottant) | `FloatingScoreText` abonné à `Events.FallingObjFrozen` — affiche grade + score animé montant avec fade out |
| Ligne de freeze (actif) | `FreezeLineVisual` abonné à `Events.FallingObjFrozen` — affiche une ligne colorée selon le grade pendant 240ms puis fade out 460ms |
| Sons / audio | Nouveau composant abonné aux events `FallingObjFrozen`, `FallingObjHitFloor`, etc. |
| Couleurs par type d'objet | `colorIdx` dans `InitFallingObjPayload` → appliquer dans `FallingObj._initTypePhysics` |
| Effets spéciaux au freeze | Abonner un composant VFX à `Events.FallingObjFrozen` (le payload contient `lowestY`) |
| HUD étendu (combo, timer) | Nouveau payload dans `HUDEvents` + handler dans `GameHUDViewModel` |
| Obstacles statiques | Nouveau composant + `ICollider` + `CollisionManager` |
