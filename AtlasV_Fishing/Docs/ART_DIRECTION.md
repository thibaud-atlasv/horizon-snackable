# Art Direction — AtlasV Fishing

## Visual Style

**Cartoon 3D coloré, optimisé mobile.** Formes arrondies, couleurs vives et saturées, rendu unlit (pas d'ombres réalistes). Le jeu doit sembler léger, joyeux, et immédiatement lisible sur un petit écran en portrait.

Référence de feeling : bubbly, pop, tropical. Pas de réalisme — tout est amplifié et simplifié.

## Palette

| Zone | Ambiance | Couleurs dominantes |
|------|----------|---------------------|
| Surface (Zone 1) | Tropical ensoleillé | Bleu ciel, turquoise, corail, orange |
| Mid-depth (Zone 2) | Sous-marin profond | Bleu-vert foncé, teal, cyan |
| Abyss (Zone 3) | Abyssal mystérieux | Bleu nuit, violet, bioluminescent |

Le background scroll verticalement avec le hook — les trois zones doivent se différencier clairement par leur ambiance couleur.

## Fish

Silhouettes immédiatement reconnaissables. Chaque espèce a une couleur signature forte. Les légendaires sont plus grands, plus saturés, avec un contour plus marqué.

Rareté visuelle :
- **Common** — couleurs naturelles, taille modeste
- **Rare** — couleurs plus vives, légère brillance
- **Legendary** — couleurs saturées à l'extrême, taille imposante, effet de lumière

## Juice & VFX

Le ressenti d'impact est central au game feel. Chaque moment fort doit être senti :

- **Freeze frame** court sur les impacts (60–80 ms) — le joueur sent le choc
- **Camera shake** — directionnel et proportionnel à l'intensité de l'event
- **Flash** blanc/coloré — signal visuel instantané sur les captures
- **Stretch & Squash** — le hook et les poissons se déforment dans l'axe du mouvement
- **Trails** (à venir) — traînée sur le hook en vol et sur les poissons lancés

Les effets sont intentionnellement exagérés — c'est un jeu cartoon, pas une simulation.

## UI

Interface minimaliste. Pendant le gameplay seule la barre de progression espèces (X/18) est visible, en bas d'écran. Aucun bouton pendant la plongée.

La **CatchDisplay** est le moment le plus graphique : panel central avec animation élastique, étoiles par rareté, badge NEW! pour les premières captures.

Typographie : bold, arrondie, lisible d'un coup d'œil. Pas de texte informatif pendant l'action.

## Contraintes techniques

Projet léger — cible < 35 Mo total.
- Meshes low poly
- Textures compressées, résolution modeste
- Préférer les vertex colors et matériaux simples
- Pas d'effets post-process lourds
