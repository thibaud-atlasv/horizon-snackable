# Art Direction — TIME STOP

## Vue d'ensemble

Le jeu se déroule dans une **forêt de bambous**, esprit nature/cartoon japonisant. Les objets qui tombent sont des **tronçons de bambou** — cylindriques, verts, avec des nœuds caractéristiques et des extrémités tranchées. L'ambiance est légère et colorée, contrastant avec la tension du gameplay.

L'objectif visuel : **lecture instantanée de la forme, de la rotation et de la proximité au sol**. Le joueur doit percevoir en une fraction de seconde où est le bord inférieur de l'objet pour décider quand tapper.

### Références visuelles

- Background : forêt de bambous verts, lumière diffuse, feuillage en arrière-plan
- Objets : tronçons de bambou cylindriques avec texture bois vert, nœuds annulaires, extrémités biseautées/tranchées
- Style général : cartoon 2D stylisé, couleurs saturées, ombres douces
- UI : panneaux bois façon arcade, typographie pixel/rétro, orangé/brun pour les accents

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

### Rendu — Sprite 3-planes

Les objets bambou sont rendus via **3 planes côte à côte** (Left, Center, Right) plutôt qu'un cube unique. Le plan Center est scalé horizontalement pour absorber la largeur variable ; les caps Left/Right ont une taille fixe et portent les extrémités du bambou (coupe biseautée).

```
[Left cap] [────── Center (scalable) ──────] [Right cap]
  capWidth        logW - 2 × capWidth          capWidth
```

- `capWidth` : réglable via `@property()` sur `LogObj` (défaut 0.2 wu)
- `planeDepth` : épaisseur Z des 3 planes, réglable via `@property()` (défaut 0.5 wu)
- Les 3 planes ont `Quaternion.identity` — toute rotation vient de la racine parente

### Echelle et bounding volume

La physique (`FallingObjService`) travaille en logique pure (cx, cy, logW, LOG_H). La collision est calculée sur les 4 coins du rectangle `logW × LOG_H` après rotation — indépendamment du rendu.

**Règle :** les sprites doivent être conçus pour une taille de référence de **1 × 1** en UV, centrés à l'origine de leur plane.

### Objets bambou (type Log — actuel)

- Sprite Center : texture bambou corps (répétable horizontalement)
- Sprite Left cap : extrémité gauche biseautée, largeur fixe
- Sprite Right cap : extrémité droite biseautée (miroir du left via UV ou asset séparé)
- La forme doit rester **reconnaissable à tout angle de rotation** (0–360°)

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
| **Silhouette bambou** | Le nœud annulaire et les extrémités biseautées identifient instantanément la forme |
| **Bord inférieur lisible** | L'extrémité coupée (cap) doit avoir une couleur légèrement plus sombre/saturée que le corps |
| **Contraste avec le fond** | Ombre portée légère ou outline sombre (1–2px) pour se détacher du fond forêt |
| **Asymétrie haut/bas** | Les caps gauche/droit sont identiques par symétrie — c'est intentionnel pour le bambou |
| **Épaisseur Z** | Réglée via `planeDepth` sur `LogObj` (défaut 0.5 wu) |

---

## Ghost (pré-visualisation)

Avant que les objets commencent à tomber, ils apparaissent en mode ghost à `START_Y ≈ 6.68 wu`. Le champ `launched = false` dans `FallingObjRenderState` indique au renderer que l'objet est en ghost.

Pour que le ghost soit lisible sans être trop présent :
- Alpha ghost recommandé : ~30–40 %
- Les sprites bambou ghost peuvent utiliser une teinte légèrement désaturée/bleutée
- Le renderer 2D (`ScreenSpaceOverlayViewModel`) peut appliquer l'alpha via `scaleX`/`scaleY` ou une propriété dédiée selon les capacités XAML

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
