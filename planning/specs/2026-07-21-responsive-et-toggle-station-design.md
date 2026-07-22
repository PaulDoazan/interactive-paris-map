# Responsive mobile + toggle du nom de station — Design

**Date:** 2026-07-21
**Base:** projet existant (carte interactive du métro parisien, Vue 3 + TS + MapLibre).

## Objectif

Deux fonctionnalités sur l'app existante :

1. **Responsive / mobile** — l'app doit être utilisable sur écran étroit. Aujourd'hui le
   panneau latéral fixe de 280px (titre + contrôles + légende) rend l'app inutilisable sur mobile.
2. **Toggle du nom d'une station au clic** — cliquer une station sur la carte affiche/efface
   son nom, indépendamment des filtres de ligne.

## Contexte du problème actuel

Le clic sur station **n'est pas implémenté**. Les pastilles de station (`metro-stations-base`)
sont rendues au‑dessus des tracés ; un clic sur une station retombe donc sur le handler de ligne
(`onLineClick`, lié à `metro-lines-base`) ou sur le handler de fond (`onBackgroundClick`).
Résultat observé : « cliquer une station » sélectionne la ligne. Le design ci‑dessous corrige
ça via un dispatcher de clic unique à priorité.

## Décisions validées

- **Layout mobile** : bottom sheet coulissant (carte plein écran, panneau en feuille glissante
  depuis le bas avec poignée).
- **Persistance des pins** : un nom épinglé reste affiché quels que soient la ligne sélectionnée
  et les toggles ; « Réinitialiser » efface la sélection **et** tous les pins.
- **Effet du clic station** : bascule **uniquement** le nom de la station (n'affecte pas la
  sélection de ligne).

## Contraintes globales (héritées du projet)

- TypeScript strict partout ; `npm run build` (vue-tsc -b + vite build) doit passer sans erreur.
- Offline au runtime : aucune dépendance réseau ajoutée ; pas de couche `symbol`/glyphs
  (les labels restent un overlay HTML).
- Aucune régénération de données nécessaire (identité de station dérivée des coordonnées).
- Logique métier en fonctions pures testées ; commits `type: description`, un commit par tâche.

---

## Architecture

### Feature 1 — Toggle du nom de station (pins)

**Identité de station.** Les stations runtime n'ont pas d'id stable
(`StationProps = { name, lineIds }`), mais leurs coordonnées géométriques le sont. On introduit
un helper pur :

```ts
// src/map/stationKey.ts
import type { Feature, Point } from 'geojson'
import type { StationProps } from '../types'

export function stationKey(f: Feature<Point, StationProps>): string {
  const [lng, lat] = f.geometry.coordinates
  return `${lng},${lat}`
}
```

Cette clé est l'**unique source de vérité** de l'identité station, utilisée par le handler de
clic (controller) et par le calcul des labels. (Vérifié : 0 nom de station dupliqué dans les
données ; les coordonnées sont d'autant plus uniques.)

**État réactif** (`src/composables/useMapState.ts`) :

- Ajout de `pinnedStations: Ref<Set<string>>` (clés de stations épinglées).
- Ajout de `toggleStation(key: string): void` — ajoute la clé si absente, la retire sinon.
  Réassigne un nouveau `Set` (`new Set(prev)`) pour déclencher la réactivité Vue.
- `reset()` : vide `selectedLineId` (=null) **et** `pinnedStations` (=Set vide).

**Logique pure des labels** (`src/map/labels.ts`) : `computeVisibleLabelStations` reçoit en plus
`pinnedKeys: Set<string>` et une fonction d'accès à la clé, et retourne l'**union** des labels
filtrés et des stations épinglées (sans doublon, ordre stable). Signature :

```ts
export interface LabelOptions {
  selectedLineId: string | null
  showAllLabels: boolean
  showSelectedLineLabels: boolean
  pinnedKeys: Set<string>
}

// Union : (labels décidés par les filtres) ∪ (stations dont la clé est épinglée).
export function computeVisibleLabelStations<T extends { properties: StationProps }>(
  stations: T[],
  keyOf: (s: T) => string,
  opts: LabelOptions,
): T[]
```

Règle : une station est visible si `showAllLabels`, OU (`showSelectedLineLabels` && elle est sur
la ligne sélectionnée), OU sa clé ∈ `pinnedKeys`. Un seul parcours de `stations` garantit
l'absence de doublon et un ordre déterministe (celui du tableau source).

**Controller** (`src/composables/useMapController.ts`) : refactor des handlers de clic en **un
seul dispatcher interne** à priorité, remplaçant `onLineClick`/`onBackgroundClick` :

```ts
onMapClick({ station, line, background }): void
// un seul map.on('click', ...) :
//   1. hits station = queryRenderedFeatures(bbox ±8px, layers:['metro-stations-base'])
//        → si hit : station(stationKeyDepuisFeature) ; STOP
//   2. hits ligne  = queryRenderedFeatures(point, layers:['metro-lines-base'])
//        → si hit : line(lineId) ; STOP
//   3. sinon : background()
```

- Priorité **station → ligne → fond** : un clic sur station bascule le nom sans sélectionner la
  ligne dessous ; corrige la collision actuelle.
- **Zone de tap élargie** : la détection station utilise une petite boîte `[±8px]` autour du
  point (les pastilles sont petites — indispensable au tactile). La détection ligne reste au
  point exact.
- Un seul listener enregistré (corrige aussi le point mineur Task 7 : listeners multiples).
- Le controller expose la clé de station calculée de la même façon que `stationKey` (réutilise
  le helper pur).

**MetroMap.vue** : câble `onMapClick` → `emit('selectLine', id)`, `emit('toggleStation', key)`,
`emit('backgroundClick')`. Reçoit une prop `pinnedKeys: Set<string>` transmise à `StationLabels`.

**StationLabels.vue** : passe `pinnedKeys` et `stationKey` à `computeVisibleLabelStations`.
Les labels épinglés sont rendus comme les autres (pas de style distinct — YAGNI).

### Feature 2 — Layout responsive (bottom sheet)

**App.vue** — deux régimes via media query (breakpoint **768px**) :

- **Desktop (≥ 768px)** : inchangé — `.app { display:flex }`, sidebar 280px + `.stage`.
- **Mobile (< 768px)** : la carte occupe tout l'écran ; `.panel` devient une **feuille en bas**
  superposée à la carte :
  - `position: fixed; left/right/bottom: 0; max-height: ~70vh;`
  - Poignée (`.sheet-handle`) toujours visible en haut de la feuille.
  - État `panelOpen: Ref<boolean>` (défaut : fermé sur mobile). Tap sur la poignée bascule
    `panelOpen`. Fermé → `transform: translateY(calc(100% - <hauteur poignée+titre>))` ;
    ouvert → `translateY(0)`. Transition CSS douce.
  - Le contenu (contrôles + légende) scrolle dans la feuille ouverte.

La bascule desktop/mobile est CSS (media query) ; seul `panelOpen` est du JS. MapLibre
auto‑resize (ResizeObserver v4) gère la rotation d'écran. `<meta viewport>` est déjà présent
dans `index.html`.

Si App.vue devient trop chargé, extraire un petit composant `PanelSheet.vue` (poignée + slot de
contenu + logique open/close) — décision laissée à l'implémentation selon la taille du fichier.

---

## Découpage des unités

| Unité | Rôle | Dépend de |
|---|---|---|
| `stationKey` (pur) | identité station depuis coordonnées | types |
| `computeVisibleLabelStations` (pur) | union filtres + pins | `StationProps`, `stationKey` |
| `useMapState` | état sélection + toggles + **pins** | vue |
| `useMapController` | dispatcher clic priorisé + carte | style, expressions, `stationKey` |
| `StationLabels.vue` | overlay noms (avec pins) | `computeVisibleLabelStations` |
| `MetroMap.vue` | câblage carte + events | controller, StationLabels |
| `App.vue` (+ `PanelSheet.vue` opt.) | layout responsive + bottom sheet | composants ci‑dessus |

## Flux de données

```
clic carte ─▶ useMapController (dispatcher priorisé)
                 ├─ station ─▶ emit toggleStation(key) ─▶ useMapState.toggleStation
                 ├─ ligne   ─▶ emit selectLine(id)      ─▶ useMapState.selectLine
                 └─ fond    ─▶ emit backgroundClick     ─▶ useMapState.reset

useMapState (selectedLineId, toggles, pinnedStations)
   ─▶ StationLabels : computeVisibleLabelStations(stations, stationKey, {..., pinnedKeys})
   ─▶ useMapController.applySelection(selectedLineId)  (inchangé)
```

## Gestion des erreurs / cas limites

- Clic sans hit station ni ligne → fond → `reset` (efface sélection + pins).
- Station sur une ligne : priorité station → seul le nom bascule, ligne non sélectionnée.
- `pinnedStations` réassigné en nouveau `Set` à chaque toggle (réactivité).
- Deux stations aux mêmes coordonnées (théorique) : partageraient une clé — accepté (non observé
  dans les données ; les zones dédupliquées par `id_ref_zdc` ont des coordonnées distinctes).

## Tests

- **Purs** :
  - `stationKey` : dérive `"lng,lat"` depuis un feature ; déterministe.
  - `computeVisibleLabelStations` : pin visible sans sélection ni toggle ; union dédupliquée
    (station à la fois filtrée et épinglée n'apparaît qu'une fois) ; `showAllLabels` domine ;
    aucun label si rien de filtré et aucun pin.
- **`useMapState`** : `toggleStation` ajoute puis retire ; `reset` vide sélection **et** pins.
- **`StationLabels.spec`** : une station épinglée s'affiche même `selectedLineId=null` et tous
  toggles off.
- **Panneau / bottom sheet** : le toggle `panelOpen` bascule la classe d'ouverture (spec
  composant, ou test sur App/PanelSheet).
- **Controller** : pas de test unitaire (pilote un vrai WebGL) — vérifié par `npm run build` +
  smoke runtime (dev/preview sert l'app).

## Hors périmètre (YAGNI)

- Pas de style distinct pour les labels épinglés.
- Pas de régénération des données ni d'ajout d'`id` dans `StationProps`.
- Pas de sélection de ligne déclenchée par le clic station.
- Pas de gestes tactiles avancés (drag de la feuille au pixel) — simple toggle ouvert/fermé.
