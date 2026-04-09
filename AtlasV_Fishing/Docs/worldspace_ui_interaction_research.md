# WorldSpace UI Interaction Research Report

## Question
L'utilisateur demande s'il est possible de cliquer sur un bouton d'UI WorldSpace sans être "focused" sur cette UI.

## Résumé de la Réponse

**OUI, les boutons WorldSpace sont automatiquement cliquables sans nécessiter de focus explicite.**

Dans Meta Horizon Studio (MHS), les UI WorldSpace (CustomUiComponent) fonctionnent différemment des systèmes d'input personnalisés comme `FocusedInteractionService`.

---

## Fonctionnement des UI WorldSpace dans MHS

### 1. **Interaction Automatique**

Les `CustomUiComponent` en WorldSpace sont **automatiquement interactifs** par défaut :
- Les boutons XAML reçoivent les clics via raycast automatique
- Aucun focus explicite n'est requis
- Le moteur gère automatiquement la détection des clics sur les éléments UI 3D

### 2. **Système d'Événements UiEvent**

Les interactions avec les boutons WorldSpace utilisent le système `UiEvent` :

```typescript
import { UiEvent, UiViewModel, CustomUiComponent } from 'meta/worlds';

const buttonClickEvent = new UiEvent('ButtonClickEvent');

@uiViewModel()
class MyViewModel extends UiViewModel {
  override readonly events = { buttonClickEvent };
}

@component()
export class UIController extends Component {
  private viewModel = new MyViewModel();

  @subscribe(OnEntityStartEvent)
  onStart() {
    const ui = this.entity.getComponent(CustomUiComponent);
    if (ui) ui.dataContext = this.viewModel;
  }

  @subscribe(buttonClickEvent)
  onButtonClick() {
    console.log('Button clicked!'); // Fonctionne automatiquement
  }
}
```

### 3. **Pas de Propriété `isInteractable`**

D'après la documentation disponible, `CustomUiComponent` n'expose **pas** de propriété `isInteractable` ou similaire. Les seules propriétés documentées sont :
- `dataContext` : pour lier le ViewModel

L'interactivité est gérée au niveau XAML (propriétés `IsEnabled`, `Visibility` des contrôles).

---

## Différence avec FocusedInteractionService

### FocusedInteractionService (≠ UI WorldSpace)

`FocusedInteractionService` est un système **complètement différent** utilisé pour :
- Input de précision (aiming, puzzles, driving)
- Désactiver les contrôles par défaut
- Capturer les événements tactiles bruts (`screenPosition`, `worldRayOrigin`)

**Ce système N'EST PAS nécessaire pour les UI WorldSpace.**

```typescript
// ❌ PAS NÉCESSAIRE pour les boutons WorldSpace
FocusedInteractionService.get().enableFocusedInteraction({...});

// ✅ Les boutons WorldSpace fonctionnent directement via UiEvent
@subscribe(buttonClickEvent)
onButtonClick() { /* ... */ }
```

---

## Conditions pour qu'un Bouton WorldSpace soit Cliquable

### ✅ Conditions Nécessaires

1. **Entity avec `CustomUiComponent`** attaché
2. **ViewModel lié** via `uiComponent.dataContext = viewModel`
3. **UiEvent déclaré** et exposé dans `viewModel.events`
4. **Bouton XAML** avec `Command="{Binding events.buttonClick}"`
5. **Bouton XAML** avec `IsEnabled="True"` et `Visibility="Visible"`

### ❌ PAS Nécessaire

- ❌ Appeler `FocusedInteractionService.enableFocusedInteraction()`
- ❌ Propriété `isInteractable` sur `CustomUiComponent` (n'existe pas)
- ❌ Raycasts manuels
- ❌ Focus explicite

---

## Exemple Complet (H3_Fishing)

Dans le projet actuel, les UI WorldSpace sont utilisées dans :

### `FishingHUDViewModel.ts`
```typescript
@component()
export class FishingHUDViewModel extends Component {
  private _ui: Maybe<CustomUiComponent> = null;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart() {
    this._ui = this.entity.getComponent(CustomUiComponent);
    if (this._ui) {
      this._ui.dataContext = this._viewModel;
    }
  }
}
```

Les boutons dans le HUD sont automatiquement cliquables sans configuration supplémentaire.

---

## Recommandations

### Pour Rendre un Bouton WorldSpace Cliquable

1. **Créer l'événement** :
```typescript
const myButtonEvent = new UiEvent('MyButtonEvent');
```

2. **Exposer dans le ViewModel** :
```typescript
@uiViewModel()
class MyViewModel extends UiViewModel {
  override readonly events = { myButtonEvent };
}
```

3. **Lier dans XAML** :
```xml
<Button Command="{Binding events.myButtonEvent}" Content="Click Me" />
```

4. **Souscrire dans le Component** :
```typescript
@subscribe(myButtonEvent)
onMyButton() {
  console.log('Button clicked!');
}
```

### Pour Désactiver Temporairement un Bouton

Utiliser les propriétés XAML standard :
```xml
<Button IsEnabled="{Binding isButtonEnabled}" />
```

```typescript
@uiViewModel()
class MyViewModel extends UiViewModel {
  public isButtonEnabled: boolean = true; // Contrôle l'interactivité
}
```

---

## Conclusion

**Les boutons WorldSpace dans MHS sont cliquables par défaut sans nécessiter de focus.** Le système `UiEvent` + `CustomUiComponent` gère automatiquement l'interaction via raycast. Il n'y a pas de propriété `isInteractable` — l'interactivité est contrôlée via les propriétés XAML standard (`IsEnabled`, `Visibility`).

**`FocusedInteractionService` est un système séparé pour l'input de précision et n'est PAS utilisé pour les UI WorldSpace.**
