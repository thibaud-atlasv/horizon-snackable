# UI Feedback System - Task List

## Tasks

1. [ ] **scripting** - Ligne horizontale de feedback
   - Entité visuelle (cube fin) qui spawn à la position Y de FallingObjFrozen.lowestY
   - Largeur 9 wu, positionnée devant les objets (Z vers caméra)
   - Apparaît au freeze, reste visible, puis fade/disparaît
   - Subscribe à Events.FallingObjFrozen
   - Couleur selon le grade

2. [ ] **scripting** - Texte flottant animé score + grade
   - Sur FallingObjFrozen, spawn une entité TextComponent à la position du freeze
   - Affiche score et grade (Perfect, Great, Good, Early, Miss)
   - Animation de montée + fade out
   - Couleurs par grade : Perfect = doré, Great = vert, Good = bleu, Early = orange, Miss = gris
   - Cleanup après animation

3. [ ] **scripting** - Texte central d'annonces
   - Gros texte 3D centré pour les messages d'état
   - "Tap to Start" pendant phase Start
   - Countdown "3... 2... 1..." pendant phase Intro
   - "Game Over" pendant phase GameOver
   - Subscribe à Events.PhaseChanged
   - Position centrale, haute visibilité

4. [ ] **scripting_verification** - Vérification du système UI complet
   - Ligne horizontale spawn au bon Y et disparaît
   - Texte score/grade anime correctement avec bonnes couleurs
   - Texte central affiche les bons messages par phase
   - Communication LocalEvent et guards client-only
   - Pas de références directes entre composants

5. [ ] **Feedback Point** - Test du système complet
