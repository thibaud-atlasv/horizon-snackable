# UI Feedback System - Task List

## Tasks

1. [x] **scripting** - Ligne horizontale de feedback
   - `scripts/GameplayObjects/FreezeLineVisual.ts` créé
   - `Templates/GameplayObjects/HorizontalLine.hstf` créé
   - Apparaît à `Events.FallingObjFrozen.lowestY`, couleur selon le grade
   - Fade out en 460 ms via `ColorComponent`, puis `entity.destroy()`
   - Référencé dans `Assets.ts`

2. [x] **scripting** - Texte flottant animé score + grade
   - `scripts/GameplayObjects/FloatingScoreText.ts` créé
   - `Templates/GameplayObjects/FloatingText.hstf` créé
   - Spawn sur `Events.FallingObjFrozen`, texte grade + score en couleur
   - Animation de montée ease-out + fade out sur `_animDuration` (1s)
   - Cleanup automatique après animation via `entity.destroy()`

3. [x] **scripting** - Texte central d'annonces
   - Intégré dans `scripts/GameHUD/GameHUDViewModel.ts` (binding XAML `centerText`)
   - Séquence intro : Round X → 3 → 2 → 1 → GO!
   - "TAP TO START" en phase `Start`
   - Masqué automatiquement sur les autres phases

4. [ ] **scripting_verification** - Vérification du système UI complet
   - Ligne horizontale spawn au bon Y avec bonne couleur et disparaît
   - Texte score/grade anime correctement
   - Texte central affiche la bonne séquence par phase

5. [ ] **Feedback Point** - Test du système complet en jeu
