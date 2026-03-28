# Art Direction — TIME STOP

## Vue d'ensemble

Les objets tombent dans un plan 2D vue de face. Le style visuel est libre, mais plusieurs contraintes techniques et lisibilité doivent guider la création d'assets.

L'objectif visuel : **lecture instantanée de la forme, de la rotation et de la proximité au sol**. Le joueur doit percevoir en une fraction de seconde où est le bord inférieur de l'objet pour décider quand tapper.

---

## Plan de jeu et caméra

Tout le gameplay se passe dans le **plan XY**, vu de face le long de l'axe **-Z**.

| Axe | Rôle | Valeur Z |
|---|---|---|
| X | horizontal (gauche/droite) | Z = 0 (fixe) |
| Y | vertical (haut/bas, Y-up) | Z = 0 (fixe) |
| Z | profondeur visuelle uniquement | jamais utilisé pour la physique |

La caméra est fixe, orthogonale ou légèrement perspective. Les objets sont des entités 3D mais **seule leur face avant est visible**. Profondeur et épaisseur (axe Z) sont libres — elles ne participent pas au gameplay.

### Zone de jeu

```
 9 wu large × 16 wu haute, centrée à l'origine

 Y =  8.0  ─────────────── bord haut de la zone
 Y =  6.68 ─ START_Y       ligne de spawn / ghost preview
 Y =  5.49 ─ PLAY_TOP      début de la zone de scoring
             [zone active]
 Y = -6.47 ─ FLOOR_Y       ligne game-over (ne pas franchir)
 Y = -8.0  ─────────────── bord bas de la zone
```

---

## Contraintes des objets tombants

### Echelle et bounding volume

Le composant `FallingObj` redimensionne chaque objet dynamiquement via `localScale` et gère sa propre collision par calcul des coins en 2D. Le template doit donc être conçu pour **remplir le cube unitaire (1 × 1 × 1)** par défaut — le code l'étirera à la bonne taille au runtime.

**Règle :** le mesh du template doit tenir dans un cube 1×1×1, centré à l'origine de l'entité.

### Objets rectangulaires (type Log — actuel)

Le type Log est un rectangle `logW × LOG_H` (env. 2–4 wu × 0.46 wu). Le code calcule les 4 coins en 2D en tenant compte de la rotation et du pivot.

- Template : **cube ou pavé plat**
- Dimensions template : 1 × 1 × Z_depth au choix (la profondeur est décorative)
- Le code applique `localScale = (logW, LOG_H, 0.1)` — profondeur finale = 0.1 wu
- La forme visuelle doit rester **reconnaissable à tout angle de rotation** (0–360°) puisque l'objet peut faire plusieurs tours complets

### Objets non-rectangulaires (types futurs)

Si un nouveau type a une forme non-rectangulaire (cercle, triangle, étoile…), le `FallingObj` doit implémenter un `getLowestY()` et un bounding volume adaptés à cette forme. Voici les recommandations par forme :

#### Cercle / Boule

- Template : sphère de diamètre 1 (rayon 0.5), centrée à l'origine
- Le code peut calculer `lowestY = cy - radius` (pas besoin de rotation des coins)
- `localScale = (diameter, diameter, diameter)` ou `(diameter, diameter, Z_depth)`
- Avantage : `lowestY` trivial, look indépendant de la rotation

#### Triangle / Forme pointue

- Template : mesh triangulaire inscrit dans le cube 1×1×1
- Le code calculera les coins du triangle transformé (3 points)
- `getLowestY` = minimum Y des 3 coins après rotation
- ⚠ La pointe vers le bas crée une lecture ambiguë au joueur — préférer pointe vers le haut ou côté

#### Losange / Diamant

- Template : quad ou mesh losange dans le cube 1×1×1
- 4 coins calculés comme le Log — suffit d'adapter `_getCorners()`
- Bonne lecture visuelle : le coin inférieur est clairement le point "danger"

#### Forme irrégulière / asymétrique

- Approcher par un **bounding rectangle** ou un **bounding circle** au choix
- Documenter clairement le choix dans le `case` correspondant de `getLowestY()`
- La hitbox approximative est acceptable si elle est légèrement conservative (plus petite que le mesh)

---

## Lisibilité en mouvement

Les objets bougent, tournent et rebondissent rapidement. Critères de lisibilité prioritaires :

| Critère | Recommandation |
|---|---|
| **Silhouette distinctive** | La forme doit être reconnaissable par sa seule silhouette, même en rotation rapide |
| **Bord inférieur lisible** | L'arête ou le coin le plus bas doit être visuellement distinct (couleur, matière, highlight) |
| **Contraste avec le fond** | Outline ou rim light pour éviter que l'objet se fonde dans le background |
| **Pas de symétrie parfaite haut/bas** | Si l'objet est identique à 180°, le joueur ne sait pas quelle face est "en bas" |
| **Épaisseur Z minimale** | 0.1 wu par défaut — augmenter pour un effet 3D, mais ne jamais empiéter sur d'autres plans |

---

## Ghost (pré-visualisation)

Avant que les objets commencent à tomber, ils apparaissent en mode ghost à `START_Y ≈ 6.68 wu`. Le code applique actuellement un alpha réduit via `ColorComponent`.

Pour que le ghost soit lisible sans être trop présent :
- L'objet ghost doit rester **reconnaissable** (pas un bloc invisible)
- L'alpha ghost recommandé : ~30–40 % (actuel : géré dans `FallingObj`)
- Optionnel : matériau/shader distinct en mode ghost (outline seul, trame, etc.)

---

## Freeze et fade-out

À la freeze, l'objet joue un fondu :
- **240 ms** à pleine opacité (temps d'appréciation du score)
- **460 ms** de fondu de `alpha 1 → 0` via `ColorComponent`
- Puis `entity.destroy()`

Les effets de freeze (flash, particules, distorsion) peuvent être ajoutés en s'abonnant à `Events.FallingObjFrozen` dans un composant VFX dédié. Le payload fournit `lowestY` (position Y du bas de l'objet) pour positionner les effets.

---

## Enregistrement des assets

Tout template `.hstf` créé dans Horizon Studio **doit être enregistré dans `Scripts/Assets.ts`** dans `FallingObjTemplates` :

```typescript
// Scripts/Assets.ts
import { FallingObjType } from './Types';

export const FallingObjTemplates: Record<FallingObjType, TemplateAsset> = {
  [FallingObjType.Log]:  new TemplateAsset('../Templates/GameplayObjects/Log.hstf'),
  [FallingObjType.Ball]: new TemplateAsset('../Templates/GameplayObjects/Ball.hstf'), // exemple
};
```

**Règles :**
- Chemin relatif depuis `Assets.ts` : `../Templates/…`
- La clé est la valeur de l'enum `FallingObjType`
- Jamais de `TemplateAsset` hardcodé directement dans un composant

---

## Checklist pour un nouvel asset

Avant d'intégrer un nouveau template dans le jeu :

- [ ] Le mesh tient dans un cube **1 × 1 × 1** centré à l'origine
- [ ] La silhouette est **reconnaissable à tout angle** (0–360°)
- [ ] Le **bord inférieur** est visuellement distinct
- [ ] Le mesh a **bon contraste** sur le fond de jeu (outline ou rim)
- [ ] L'asset n'a **pas de symétrie parfaite haut/bas** (ou c'est intentionnel)
- [ ] Le template est enregistré dans `FallingObjTemplates`
- [ ] `FallingObjType` a une nouvelle valeur correspondante
- [ ] `FallingObj._initTypePhysics`, `_tickTypePhysics`, `_applyTypeTransform`, `getLowestY` ont un `case` pour ce type
- [ ] `SpawnManager._buildObjConfig` a un `case` pour ce type
