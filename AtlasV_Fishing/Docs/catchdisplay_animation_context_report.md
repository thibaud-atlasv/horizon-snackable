# CatchDisplay Animation Context Report

## Question
L'utilisateur demande s'il doit appeler une fonction pour jouer l'animation du CatchDisplayHUD.

## Réponse: NON - Les animations se jouent automatiquement

### Comment ça fonctionne

Les animations du CatchDisplay sont **déclenchées automatiquement** via des **EventTriggers XAML** qui réagissent à l'événement `Loaded` de chaque élément UI.

## Architecture de l'animation

### 1. Déclenchement automatique (XAML)

Chaque élément animé dans `UI/CatchDisplay.xaml` utilise ce pattern:

```xaml
<Border x:Name="MainPanel" Opacity="0">
    <b:Interaction.Triggers>
        <b:EventTrigger EventName="Loaded">
            <b:ControlStoryboardAction Storyboard="{DynamicResource PanelPopInAnimation}"/>
        </b:EventTrigger>
    </b:Interaction.Triggers>
</Border>
```

**Signification**: Quand l'élément devient visible (événement `Loaded`), le Storyboard correspondant démarre automatiquement.

### 2. Séquence d'animation en cascade

Les animations sont définies dans `<Page.Resources>` avec des délais échelonnés pour créer un effet de cascade satisfaisant:

| Animation | Élément | Délai | Durée | Effet |
|-----------|---------|-------|-------|-------|
| `PanelPopInAnimation` | MainPanel | 0.0s | 0.55s | Pop élastique avec overshoot |
| `Star1Animation` | Star1 | 0.3s | 0.25s | Pop avec bounce |
| `Star2Animation` | Star2 | 0.4s | 0.25s | Pop avec bounce |
| `Star3Animation` | Star3 | 0.5s | 0.25s | Pop avec bounce |
| `NewBadgeAnimation` | NewBadge | 0.6s | 0.25s | Pop avec bounce |
| `FishIdAnimation` | FishIdContainer | 0.7s | 0.2s | Slide-in depuis la gauche |
| `FishNameAnimation` | FishNameText | 0.75s | 0.2s | Slide-up depuis le bas |
| `CatchCountAnimation` | CatchCountContainer | 0.85s | 0.25s | Pop avec bounce |
| `TapToContinueDelayedFadeIn` | TapToContinueText | 1.2s | 0.3s | Fade-in |
| `TapToContinuePulse` | TapToContinueText | Continu | 1.6s | Pulse infini |

### 3. Flux de données (TypeScript)

#### GameManager.ts
```typescript
// Quand un poisson est attrapé et remonte à la surface
private _triggerCatch(): void {
  // ...
  EventService.sendLocally(HUDEvents.ShowCatch, {
    defId: this._hookedDefId,
    isNew,
    catchCount,
  });
  this._setPhase(GamePhase.CatchDisplay);
}
```

#### CatchDisplayViewModel.ts
```typescript
@subscribe(HUDEvents.ShowCatch)
private _onShowCatch(p: HUDEvents.ShowCatchPayload): void {
  // Met à jour les données du ViewModel
  this._showFish(p.defId, p.isNew, p.catchCount);
  
  // Rend le panel visible → déclenche l'événement Loaded → lance les animations
  this._vm.visibility = 'Visible';
}
```

#### UI/CatchDisplay.xaml
```xaml
<Grid x:Name="RootContainer" Visibility="{Binding Path=visibility}">
  <!-- Quand visibility passe de 'Collapsed' à 'Visible', 
       tous les enfants reçoivent l'événement Loaded 
       et leurs animations démarrent automatiquement -->
</Grid>
```

## Réponse finale

**NON, vous n'avez PAS besoin d'appeler une fonction pour jouer l'animation.**

### Ce qui se passe automatiquement:

1. `GameManager` envoie `HUDEvents.ShowCatch`
2. `CatchDisplayViewModel` met à jour `_vm.visibility = 'Visible'`
3. Le binding XAML `Visibility="{Binding Path=visibility}"` rend le Grid visible
4. Tous les éléments enfants reçoivent l'événement `Loaded`
5. Les `EventTrigger` XAML démarrent automatiquement leurs Storyboards respectifs
6. Les animations se jouent en cascade avec leurs délais prédéfinis

### Ce que vous DEVEZ faire:

- ✅ Mettre à jour les propriétés du ViewModel (`fishName`, `fishId`, `rarityStars`, etc.)
- ✅ Changer `visibility` de `'Collapsed'` à `'Visible'`
- ❌ **NE PAS** appeler de méthode pour démarrer les animations
- ❌ **NE PAS** gérer manuellement les Storyboards en TypeScript

## Code actuel (correct)

Le code actuel dans `CatchDisplayViewModel.ts` est **déjà correct**:

```typescript
@subscribe(HUDEvents.ShowCatch)
private _onShowCatch(p: HUDEvents.ShowCatchPayload): void {
  if (NetworkingService.get().isServerContext()) return;
  this._refreshJournal();
  this._journalIndex = this._journalIds.indexOf(p.defId);
  if (this._journalIndex < 0) this._journalIndex = this._journalIds.length - 1;
  
  // Met à jour toutes les propriétés du ViewModel
  this._showFish(p.defId, p.isNew, p.catchCount);
  
  // Rend visible → déclenche automatiquement les animations
  this._vm.visibility = 'Visible';
}
```

## Problème potentiel: Animations ne se rejouent pas

Si les animations ne se rejouent pas lors de captures successives, c'est parce que les éléments restent chargés en mémoire. Solutions possibles:

### Option 1: Forcer le rechargement (recommandé)
Ajouter une propriété `key` qui change à chaque affichage pour forcer le rechargement des éléments:

```typescript
// Dans CatchDisplayData
animationKey: number = 0;

// Dans _onShowCatch
this._vm.animationKey = Date.now(); // Force un nouveau cycle d'animation
this._vm.visibility = 'Visible';
```

```xaml
<!-- Dans le XAML -->
<Border x:Name="MainPanel" Tag="{Binding animationKey}">
```

### Option 2: Reset manuel des propriétés
Avant de rendre visible, réinitialiser les propriétés animées:

```typescript
private _resetAnimationState(): void {
  // Forcer un re-render en basculant visibility
  this._vm.visibility = 'Collapsed';
  // Attendre un frame avant de réafficher
  setTimeout(() => {
    this._vm.visibility = 'Visible';
  }, 50);
}
```

## Résumé

| Question | Réponse |
|----------|---------|
| Faut-il appeler une fonction pour jouer l'animation? | **NON** |
| Comment l'animation démarre-t-elle? | Automatiquement via `EventTrigger` XAML sur `Loaded` |
| Que faire en TypeScript? | Seulement changer `visibility` à `'Visible'` |
| Les animations se rejouent-elles automatiquement? | Oui, si les éléments sont rechargés (visibility toggle) |
| Faut-il gérer les Storyboards en code? | **NON**, tout est déclaratif en XAML |
