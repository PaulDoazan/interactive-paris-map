# Responsive mobile + toggle nom de station — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre l'app utilisable sur mobile (panneau en bottom sheet) et permettre d'afficher/effacer le nom d'une station en cliquant dessus, sans sélectionner la ligne sous-jacente.

**Architecture:** Les stations sont identifiées par une clé pure dérivée de leurs coordonnées (`stationKey`). Un état de pins (`Set<string>`) dans `useMapState` porte les stations épinglées ; la fonction pure `computeVisibleLabelStations` fait l'union labels-filtrés ∪ pins. Le controller MapLibre remplace ses 3 handlers de clic par un dispatcher unique à priorité station → ligne → fond (avec zone de tap élargie). Le layout devient responsive via une media query et un composant `PanelSheet` (bottom sheet mobile / sidebar desktop).

**Tech Stack:** Vue 3 (`<script setup>` + TS), Vite, MapLibre GL JS, Vitest + @vue/test-utils.

## Global Constraints

- **TypeScript strict** partout ; `npm run build` (vue-tsc -b + vite build) doit passer sans erreur — c'est le gate dur avant chaque commit.
- **Offline** : aucune dépendance réseau ajoutée ; pas de couche `symbol`/glyphs (labels = overlay HTML).
- **Pas de régénération de données** : identité station dérivée des coordonnées, pas d'ajout d'`id` dans `StationProps`.
- **Clic station** : bascule uniquement le nom (n'affecte pas la sélection de ligne).
- **Pins persistants** : visibles quels que soient sélection/toggles ; `reset()` efface sélection **ET** pins.
- **Breakpoint responsive** : 768px (desktop ≥ 768, mobile < 768).
- **Logique pure testée** ; un commit par tâche, messages `type: description`.

---

## File Structure

```
src/
├── map/
│   ├── stationKey.ts          # NOUVEAU — identité station (pur)
│   ├── stationKey.test.ts     # NOUVEAU
│   └── labels.ts              # MODIF — union pins dans computeVisibleLabelStations
│   └── labels.test.ts         # MODIF — nouvelle signature + cas pins
├── composables/
│   ├── useMapState.ts         # MODIF — pinnedStations + toggleStation + reset
│   ├── useMapState.test.ts    # MODIF — cas pins
│   └── useMapController.ts    # MODIF — onMapClick dispatcher priorisé
├── components/
│   ├── StationLabels.vue      # MODIF — prop pinnedKeys + stationKey
│   ├── StationLabels.spec.ts  # MODIF — cas pin
│   ├── MetroMap.vue           # MODIF — onMapClick + prop/emit pins
│   ├── PanelSheet.vue         # NOUVEAU — chrome bottom sheet / sidebar
│   └── PanelSheet.spec.ts     # NOUVEAU
└── App.vue                    # MODIF — câblage pins + layout responsive
```

---

## Task 1: Identité de station (`stationKey`, pur)

**Files:**
- Create: `src/map/stationKey.ts`, `src/map/stationKey.test.ts`

**Interfaces:**
- Produces: `stationKey(f: Feature<Point, StationProps>): string` — retourne `"lng,lat"` depuis les coordonnées géométriques.

- [ ] **Step 1: Écrire le test `src/map/stationKey.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import type { Feature, Point } from 'geojson'
import type { StationProps } from '../types'
import { stationKey } from './stationKey'

function feat(lng: number, lat: number, name = 'X'): Feature<Point, StationProps> {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: { name, lineIds: ['1'] },
  }
}

describe('stationKey', () => {
  it('dérive une clé "lng,lat" depuis les coordonnées', () => {
    expect(stationKey(feat(2.35, 48.85))).toBe('2.35,48.85')
  })

  it('est déterministe et distingue des coordonnées différentes', () => {
    expect(stationKey(feat(2.3, 48.8))).toBe('2.3,48.8')
    expect(stationKey(feat(2.3, 48.8))).not.toBe(stationKey(feat(2.31, 48.8)))
  })
})
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npx vitest run src/map/stationKey.test.ts`
Expected: FAIL (module `./stationKey` introuvable).

- [ ] **Step 3: Créer `src/map/stationKey.ts`**

```ts
import type { Feature, Point } from 'geojson'
import type { StationProps } from '../types'

// Identité stable d'une station, dérivée de ses coordonnées géographiques.
export function stationKey(f: Feature<Point, StationProps>): string {
  const [lng, lat] = f.geometry.coordinates
  return `${lng},${lat}`
}
```

- [ ] **Step 4: Lancer pour vérifier le succès**

Run: `npx vitest run src/map/stationKey.test.ts`
Expected: PASS.

- [ ] **Step 5: Vérifier le build**

Run: `npm run build`
Expected: 0 erreur TS, build réussi.

- [ ] **Step 6: Commit**

```bash
git add src/map/stationKey.ts src/map/stationKey.test.ts
git commit -m "feat: identité de station dérivée des coordonnées"
```

---

## Task 2: État des pins (`useMapState`)

**Files:**
- Modify: `src/composables/useMapState.ts`, `src/composables/useMapState.test.ts`

**Interfaces:**
- Produces: `MapState` étendu avec `pinnedStations: Ref<Set<string>>`, `toggleStation(key: string): void`. `reset()` efface aussi les pins.

- [ ] **Step 1: Mettre à jour les tests `src/composables/useMapState.test.ts` (remplacer tout le fichier)**

```ts
import { describe, it, expect } from 'vitest'
import { useMapState } from './useMapState'

describe('useMapState', () => {
  it('sélectionne une ligne', () => {
    const s = useMapState()
    s.selectLine('4')
    expect(s.selectedLineId.value).toBe('4')
  })

  it('re-cliquer la ligne active la désélectionne', () => {
    const s = useMapState()
    s.selectLine('4')
    s.selectLine('4')
    expect(s.selectedLineId.value).toBeNull()
  })

  it('valeurs par défaut des toggles et des pins', () => {
    const s = useMapState()
    expect(s.showAllLabels.value).toBe(false)
    expect(s.showSelectedLineLabels.value).toBe(true)
    expect(s.pinnedStations.value.size).toBe(0)
  })

  it('toggleStation ajoute puis retire une clé', () => {
    const s = useMapState()
    s.toggleStation('2.35,48.85')
    expect(s.pinnedStations.value.has('2.35,48.85')).toBe(true)
    s.toggleStation('2.35,48.85')
    expect(s.pinnedStations.value.has('2.35,48.85')).toBe(false)
  })

  it('toggleStation gère plusieurs stations indépendamment', () => {
    const s = useMapState()
    s.toggleStation('a')
    s.toggleStation('b')
    expect(s.pinnedStations.value.size).toBe(2)
    s.toggleStation('a')
    expect([...s.pinnedStations.value]).toEqual(['b'])
  })

  it('reset efface la sélection ET les pins', () => {
    const s = useMapState()
    s.selectLine('4')
    s.toggleStation('a')
    s.reset()
    expect(s.selectedLineId.value).toBeNull()
    expect(s.pinnedStations.value.size).toBe(0)
  })
})
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npx vitest run src/composables/useMapState.test.ts`
Expected: FAIL (`pinnedStations`/`toggleStation` inexistants).

- [ ] **Step 3: Remplacer `src/composables/useMapState.ts`**

```ts
import { ref, type Ref } from 'vue'

export interface MapState {
  selectedLineId: Ref<string | null>
  showAllLabels: Ref<boolean>
  showSelectedLineLabels: Ref<boolean>
  pinnedStations: Ref<Set<string>>
  selectLine: (id: string) => void
  toggleStation: (key: string) => void
  reset: () => void
}

export function useMapState(): MapState {
  const selectedLineId = ref<string | null>(null)
  const showAllLabels = ref(false)
  const showSelectedLineLabels = ref(true)
  const pinnedStations = ref<Set<string>>(new Set())

  function selectLine(id: string): void {
    selectedLineId.value = selectedLineId.value === id ? null : id
  }

  function toggleStation(key: string): void {
    // Réassigne un nouveau Set pour déclencher la réactivité.
    const next = new Set(pinnedStations.value)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    pinnedStations.value = next
  }

  function reset(): void {
    selectedLineId.value = null
    pinnedStations.value = new Set()
  }

  return {
    selectedLineId,
    showAllLabels,
    showSelectedLineLabels,
    pinnedStations,
    selectLine,
    toggleStation,
    reset,
  }
}
```

- [ ] **Step 4: Lancer pour vérifier le succès**

Run: `npx vitest run src/composables/useMapState.test.ts`
Expected: PASS.

- [ ] **Step 5: Vérifier le build**

Run: `npm run build`
Expected: 0 erreur TS, build réussi.

- [ ] **Step 6: Commit**

```bash
git add src/composables/useMapState.ts src/composables/useMapState.test.ts
git commit -m "feat: état des stations épinglées (pins)"
```

---

## Task 3: Union des pins dans les labels (`computeVisibleLabelStations` + `StationLabels`)

**Files:**
- Modify: `src/map/labels.ts`, `src/map/labels.test.ts`, `src/components/StationLabels.vue`, `src/components/StationLabels.spec.ts`

**Interfaces:**
- Consumes: `stationKey` (Task 1).
- Produces: `computeVisibleLabelStations(stations, keyOf, opts)` où `opts` inclut `pinnedKeys: Set<string>` ; retourne l'union (dédupliquée, ordre source) des labels filtrés et des stations épinglées. `StationLabels.vue` accepte une prop optionnelle `pinnedKeys?: Set<string>` (défaut : Set vide).

- [ ] **Step 1: Remplacer les tests `src/map/labels.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { computeVisibleLabelStations } from './labels'

const stations = [
  { properties: { name: 'A', lineIds: ['1', '5'] } },
  { properties: { name: 'B', lineIds: ['4'] } },
  { properties: { name: 'C', lineIds: ['5'] } },
]
const keyOf = (s: { properties: { name: string } }) => s.properties.name
const noPins = new Set<string>()

describe('computeVisibleLabelStations', () => {
  it('rien par défaut (aucun toggle, aucune sélection, aucun pin)', () => {
    const out = computeVisibleLabelStations(stations, keyOf, {
      selectedLineId: null, showAllLabels: false, showSelectedLineLabels: true, pinnedKeys: noPins,
    })
    expect(out).toEqual([])
  })

  it('tout si showAllLabels', () => {
    const out = computeVisibleLabelStations(stations, keyOf, {
      selectedLineId: '4', showAllLabels: true, showSelectedLineLabels: true, pinnedKeys: noPins,
    })
    expect(out).toHaveLength(3)
  })

  it('seulement la ligne sélectionnée si showSelectedLineLabels', () => {
    const out = computeVisibleLabelStations(stations, keyOf, {
      selectedLineId: '5', showAllLabels: false, showSelectedLineLabels: true, pinnedKeys: noPins,
    })
    expect(out.map((s) => s.properties.name)).toEqual(['A', 'C'])
  })

  it('rien si sélection mais showSelectedLineLabels off', () => {
    const out = computeVisibleLabelStations(stations, keyOf, {
      selectedLineId: '5', showAllLabels: false, showSelectedLineLabels: false, pinnedKeys: noPins,
    })
    expect(out).toEqual([])
  })

  it('affiche une station épinglée sans sélection ni toggle', () => {
    const out = computeVisibleLabelStations(stations, keyOf, {
      selectedLineId: null, showAllLabels: false, showSelectedLineLabels: true,
      pinnedKeys: new Set(['B']),
    })
    expect(out.map((s) => s.properties.name)).toEqual(['B'])
  })

  it('union sélection + pins sans doublon et en ordre source stable', () => {
    // ligne 5 -> A, C ; pins A (déjà là) + B -> A, B, C
    const out = computeVisibleLabelStations(stations, keyOf, {
      selectedLineId: '5', showAllLabels: false, showSelectedLineLabels: true,
      pinnedKeys: new Set(['A', 'B']),
    })
    expect(out.map((s) => s.properties.name)).toEqual(['A', 'B', 'C'])
  })
})
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npx vitest run src/map/labels.test.ts`
Expected: FAIL (signature à 2 args / `pinnedKeys` manquant).

- [ ] **Step 3: Remplacer `src/map/labels.ts`**

```ts
import type { StationProps } from '../types'

export interface LabelOptions {
  selectedLineId: string | null
  showAllLabels: boolean
  showSelectedLineLabels: boolean
  pinnedKeys: Set<string>
}

// Union (sans doublon, ordre source) : labels décidés par les filtres ∪ stations épinglées.
export function computeVisibleLabelStations<T extends { properties: StationProps }>(
  stations: T[],
  keyOf: (s: T) => string,
  opts: LabelOptions,
): T[] {
  return stations.filter((s) => {
    if (opts.showAllLabels) return true
    if (opts.pinnedKeys.has(keyOf(s))) return true
    if (opts.showSelectedLineLabels && opts.selectedLineId !== null) {
      return s.properties.lineIds.includes(opts.selectedLineId)
    }
    return false
  })
}
```

- [ ] **Step 4: Lancer pour vérifier le succès**

Run: `npx vitest run src/map/labels.test.ts`
Expected: PASS.

- [ ] **Step 5: Remplacer `src/components/StationLabels.vue`**

```vue
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { Feature, Point } from 'geojson'
import type { StationProps } from '../types'
import { computeVisibleLabelStations } from '../map/labels'
import { stationKey } from '../map/stationKey'

const props = withDefaults(
  defineProps<{
    map: MapLibreMap | null
    stations: Feature<Point, StationProps>[]
    selectedLineId: string | null
    showAllLabels: boolean
    showSelectedLineLabels: boolean
    pinnedKeys?: Set<string>
  }>(),
  {
    pinnedKeys: () => new Set<string>(),
  },
)

// Compteur incrémenté à chaque frame pour forcer le recalcul des positions.
const tick = ref(0)

const visible = computed(() =>
  computeVisibleLabelStations(props.stations, stationKey, {
    selectedLineId: props.selectedLineId,
    showAllLabels: props.showAllLabels,
    showSelectedLineLabels: props.showSelectedLineLabels,
    pinnedKeys: props.pinnedKeys,
  }),
)

function positioned() {
  void tick.value // dépendance réactive
  const map = props.map
  if (!map) return []
  return visible.value.map((f) => {
    const [lng, lat] = f.geometry.coordinates
    const p = map.project([lng, lat])
    return {
      name: f.properties.name,
      x: p.x,
      y: p.y,
    }
  })
}

const labels = computed(() => positioned())

function onRender() {
  tick.value++
}

watch(
  () => props.map,
  (map, _old, onCleanup) => {
    if (!map) return
    map.on('render', onRender)
    onCleanup(() => map.off('render', onRender))
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  props.map?.off('render', onRender)
})
</script>

<template>
  <div class="labels-layer">
    <span
      v-for="l in labels"
      :key="l.name"
      class="station-label"
      :style="{ transform: `translate(${l.x}px, ${l.y}px)` }"
    >{{ l.name }}</span>
  </div>
</template>

<style scoped>
.labels-layer {
  position: absolute; inset: 0; pointer-events: none; overflow: hidden;
}
.station-label {
  position: absolute; top: 0; left: 0;
  margin: 4px 0 0 6px;
  font-size: 11px; line-height: 1;
  color: #1a1a1a; white-space: nowrap;
  text-shadow: 0 0 2px #fff, 0 0 2px #fff, 0 0 2px #fff;
}
</style>
```

- [ ] **Step 6: Remplacer les tests `src/components/StationLabels.spec.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StationLabels from './StationLabels.vue'

const stations = [
  { type: 'Feature', geometry: { type: 'Point', coordinates: [2.35, 48.85] },
    properties: { name: 'Bastille', lineIds: ['1', '5'] } },
  { type: 'Feature', geometry: { type: 'Point', coordinates: [2.33, 48.86] },
    properties: { name: 'Opéra', lineIds: ['3'] } },
]

// Fausse instance MapLibre : project renvoie une position fixe, on/off no-op.
const fakeMap = {
  project: () => ({ x: 10, y: 20 }),
  on: () => {},
  off: () => {},
} as any

describe('StationLabels', () => {
  it('n’affiche aucun label par défaut', () => {
    const w = mount(StationLabels, {
      props: { map: fakeMap, stations, selectedLineId: null,
        showAllLabels: false, showSelectedLineLabels: true },
    })
    expect(w.findAll('.station-label')).toHaveLength(0)
  })

  it('affiche les labels de la ligne sélectionnée', () => {
    const w = mount(StationLabels, {
      props: { map: fakeMap, stations, selectedLineId: '5',
        showAllLabels: false, showSelectedLineLabels: true },
    })
    const labels = w.findAll('.station-label')
    expect(labels).toHaveLength(1)
    expect(labels[0].text()).toBe('Bastille')
  })

  it('affiche tous les labels si showAllLabels', () => {
    const w = mount(StationLabels, {
      props: { map: fakeMap, stations, selectedLineId: null,
        showAllLabels: true, showSelectedLineLabels: false },
    })
    expect(w.findAll('.station-label')).toHaveLength(2)
  })

  it('affiche une station épinglée même sans sélection', () => {
    const w = mount(StationLabels, {
      props: { map: fakeMap, stations, selectedLineId: null,
        showAllLabels: false, showSelectedLineLabels: true,
        pinnedKeys: new Set(['2.33,48.86']) },
    })
    const labels = w.findAll('.station-label')
    expect(labels).toHaveLength(1)
    expect(labels[0].text()).toBe('Opéra')
  })
})
```

- [ ] **Step 7: Lancer les tests concernés**

Run: `npx vitest run src/map/labels.test.ts src/components/StationLabels.spec.ts`
Expected: PASS (tous).

- [ ] **Step 8: Vérifier le build (StationLabels est le seul appelant ; MetroMap ne passe pas encore `pinnedKeys`, le défaut s'applique)**

Run: `npm run build`
Expected: 0 erreur TS, build réussi.

- [ ] **Step 9: Commit**

```bash
git add src/map/labels.ts src/map/labels.test.ts src/components/StationLabels.vue src/components/StationLabels.spec.ts
git commit -m "feat: union des stations épinglées dans les labels"
```

---

## Task 4: Dispatcher de clic priorisé (`useMapController` + `MetroMap`)

**Files:**
- Modify: `src/composables/useMapController.ts`, `src/components/MetroMap.vue`

**Interfaces:**
- Consumes: `stationKey` (Task 1).
- Produces: `useMapController()` expose désormais `onMapClick(handlers: MapClickHandlers)` à la place de `onLineClick`/`onBackgroundClick`. `MapClickHandlers = { station: (key: string) => void; line: (lineId: string) => void; background: () => void }`. Priorité station → ligne → fond ; détection station via une boîte de ±8px. `MetroMap.vue` gagne une prop `pinnedKeys?: Set<string>` (défaut Set vide) transmise à `StationLabels`, et émet `toggleStation: [key: string]`.

> Note : `onLineClick`/`onBackgroundClick` sont supprimés ; `MetroMap` (seul appelant) est mis à jour dans la même tâche pour garder le build vert. Le controller n'a pas de test unitaire (pilote un vrai WebGL) — il est vérifié par le build.

- [ ] **Step 1: Remplacer `src/composables/useMapController.ts`**

```ts
import { Map as MapLibreMap, type MapGeoJSONFeature, type PointLike } from 'maplibre-gl'
import type { Feature, Point } from 'geojson'
import type { LineProps, StationProps } from '../types'
import { buildMapStyle, type StyleData } from '../map/style'
import { baseLineOpacity, highlightFilter, stationHighlightFilter } from '../map/expressions'
import { stationKey } from '../map/stationKey'

// Cadrage initial sur Paris.
const PARIS_CENTER: [number, number] = [2.3488, 48.8534]
// Tolérance de tap (px) pour cliquer une pastille de station sur tactile.
const STATION_TAP_TOLERANCE = 8

export interface MapClickHandlers {
  station: (key: string) => void
  line: (lineId: string) => void
  background: () => void
}

export function useMapController() {
  let map: MapLibreMap | null = null

  function mount(container: HTMLElement, data: StyleData): void {
    map = new MapLibreMap({
      container,
      style: buildMapStyle(data),
      center: PARIS_CENTER,
      zoom: 11,
      attributionControl: { compact: true },
    })
    for (const layer of ['metro-lines-base', 'metro-stations-base']) {
      map.on('mouseenter', layer, () => {
        if (map) map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', layer, () => {
        if (map) map.getCanvas().style.cursor = ''
      })
    }
  }

  function applySelection(selectedLineId: string | null): void {
    if (!map) return
    map.setPaintProperty('metro-lines-base', 'line-opacity', baseLineOpacity(selectedLineId))
    map.setPaintProperty(
      'metro-stations-base', 'circle-opacity', selectedLineId === null ? 1 : 0.25,
    )
    map.setPaintProperty(
      'metro-stations-base', 'circle-stroke-opacity', selectedLineId === null ? 1 : 0.25,
    )
    map.setFilter('metro-lines-highlight', highlightFilter(selectedLineId) as never)
    map.setFilter('metro-stations-highlight', stationHighlightFilter(selectedLineId) as never)
  }

  // Un seul handler de clic, priorité station → ligne → fond.
  function onMapClick(handlers: MapClickHandlers): void {
    if (!map) return
    map.on('click', (e) => {
      const m = map!
      const tol = STATION_TAP_TOLERANCE
      const box: [PointLike, PointLike] = [
        [e.point.x - tol, e.point.y - tol],
        [e.point.x + tol, e.point.y + tol],
      ]
      const stationHits = m.queryRenderedFeatures(box, { layers: ['metro-stations-base'] })
      if (stationHits.length > 0) {
        const f = stationHits[0] as unknown as Feature<Point, StationProps>
        handlers.station(stationKey(f))
        return
      }
      const lineHits = m.queryRenderedFeatures(e.point, { layers: ['metro-lines-base'] })
      if (lineHits.length > 0) {
        const lf = lineHits[0] as MapGeoJSONFeature
        handlers.line((lf.properties as unknown as LineProps).lineId)
        return
      }
      handlers.background()
    })
  }

  function getMap(): MapLibreMap | null {
    return map
  }

  function destroy(): void {
    map?.remove()
    map = null
  }

  return { mount, applySelection, onMapClick, getMap, destroy }
}
```

- [ ] **Step 2: Remplacer `src/components/MetroMap.vue`**

```vue
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { Feature, FeatureCollection, Point } from 'geojson'
import type { StationProps } from '../types'
import { useMapController } from '../composables/useMapController'
import StationLabels from './StationLabels.vue'

const props = withDefaults(
  defineProps<{
    lines: FeatureCollection
    stations: FeatureCollection
    arrondissements: FeatureCollection
    selectedLineId: string | null
    showAllLabels: boolean
    showSelectedLineLabels: boolean
    pinnedKeys?: Set<string>
  }>(),
  {
    pinnedKeys: () => new Set<string>(),
  },
)
const emit = defineEmits<{
  selectLine: [id: string]
  backgroundClick: []
  toggleStation: [key: string]
}>()

const container = ref<HTMLElement | null>(null)
const mapRef = shallowRef<MapLibreMap | null>(null)
const controller = useMapController()

onMounted(() => {
  if (!container.value) return
  controller.mount(container.value, {
    lines: props.lines,
    stations: props.stations,
    arrondissements: props.arrondissements,
  })
  const map = controller.getMap()
  map?.on('load', () => {
    controller.applySelection(props.selectedLineId)
    mapRef.value = map
  })
  controller.onMapClick({
    station: (key) => emit('toggleStation', key),
    line: (id) => emit('selectLine', id),
    background: () => emit('backgroundClick'),
  })
})

watch(
  () => props.selectedLineId,
  (id) => controller.applySelection(id),
)

onBeforeUnmount(() => controller.destroy())
</script>

<template>
  <div class="map-wrap">
    <div ref="container" class="map" />
    <StationLabels
      :map="mapRef"
      :stations="(props.stations.features as Feature<Point, StationProps>[])"
      :selected-line-id="selectedLineId"
      :show-all-labels="showAllLabels"
      :show-selected-line-labels="showSelectedLineLabels"
      :pinned-keys="pinnedKeys"
    />
  </div>
</template>

<style scoped>
.map-wrap { position: relative; width: 100%; height: 100%; }
.map { position: absolute; inset: 0; }
</style>
```

- [ ] **Step 3: Vérifier tests + build (App passe encore les anciens events ; `toggleStation` non écouté par App = sans effet, mais valide)**

Run: `npm test && npm run build`
Expected: tous les tests PASS (44), build réussi 0 erreur TS.

- [ ] **Step 4: Commit**

```bash
git add src/composables/useMapController.ts src/components/MetroMap.vue
git commit -m "feat: dispatcher de clic priorisé station puis ligne puis fond"
```

---

## Task 5: Câblage des pins dans `App.vue`

**Files:**
- Modify: `src/App.vue`

**Interfaces:**
- Consumes: `MetroMap` (Task 4, emit `toggleStation`, prop `pinnedKeys`), `useMapState` (Task 2, `toggleStation`, `pinnedStations`).
- Produces: clic station → pin/unpin effectif de bout en bout.

- [ ] **Step 1: Modifier le bloc `<MetroMap …>` dans `src/App.vue`**

Dans le `<template>`, remplacer la balise `<MetroMap … />` par la version qui ajoute la prop et l'event pins (les autres lignes sont inchangées) :

```vue
      <MetroMap
        v-else-if="data.lines.value && data.stations.value && data.arrondissements.value"
        :lines="data.lines.value"
        :stations="data.stations.value"
        :arrondissements="data.arrondissements.value"
        :selected-line-id="state.selectedLineId.value"
        :show-all-labels="state.showAllLabels.value"
        :show-selected-line-labels="state.showSelectedLineLabels.value"
        :pinned-keys="state.pinnedStations.value"
        @select-line="state.selectLine"
        @toggle-station="state.toggleStation"
        @background-click="state.reset"
      />
```

- [ ] **Step 2: Vérifier tests + build**

Run: `npm test && npm run build`
Expected: tous les tests PASS, build réussi.

- [ ] **Step 3: Smoke runtime manuel**

Run: `npm run dev` puis ouvrir l'URL affichée.
Expected :
1. Cliquer une pastille de station → son nom apparaît ; re-cliquer → il disparaît.
2. Le clic sur station ne sélectionne PAS la ligne dessous (la légende ne change pas).
3. Cliquer un tracé → sélectionne la ligne (comportement inchangé).
4. Épingler quelques stations puis « Réinitialiser » → sélection ET noms épinglés effacés.
Arrêter le serveur ensuite.

- [ ] **Step 4: Commit**

```bash
git add src/App.vue
git commit -m "feat: activation du toggle de nom de station au clic"
```

---

## Task 6: Layout responsive (`PanelSheet` + `App.vue`)

**Files:**
- Create: `src/components/PanelSheet.vue`, `src/components/PanelSheet.spec.ts`
- Modify: `src/App.vue`

**Interfaces:**
- Produces: `PanelSheet.vue` : prop `{ title: string }`, slot par défaut pour le contenu. Sur desktop (≥768px) : sidebar 280px. Sur mobile (<768px) : bottom sheet avec poignée, état interne `open` (défaut fermé) basculé au clic sur la poignée (classe `is-open`).

- [ ] **Step 1: Écrire le test `src/components/PanelSheet.spec.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PanelSheet from './PanelSheet.vue'

describe('PanelSheet', () => {
  it('rend le titre et le contenu du slot', () => {
    const w = mount(PanelSheet, {
      props: { title: 'Métro de Paris' },
      slots: { default: '<p class="slotted">contenu</p>' },
    })
    expect(w.text()).toContain('Métro de Paris')
    expect(w.find('.slotted').exists()).toBe(true)
  })

  it('est fermé par défaut et bascule is-open au clic sur la poignée', async () => {
    const w = mount(PanelSheet, { props: { title: 'T' } })
    expect(w.find('.panel').classes()).not.toContain('is-open')
    await w.find('.sheet-handle').trigger('click')
    expect(w.find('.panel').classes()).toContain('is-open')
    await w.find('.sheet-handle').trigger('click')
    expect(w.find('.panel').classes()).not.toContain('is-open')
  })
})
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npx vitest run src/components/PanelSheet.spec.ts`
Expected: FAIL (composant introuvable).

- [ ] **Step 3: Créer `src/components/PanelSheet.vue`**

```vue
<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ title: string }>()

const open = ref(false)
</script>

<template>
  <aside class="panel" :class="{ 'is-open': open }">
    <button
      type="button"
      class="sheet-handle"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="grip" aria-hidden="true" />
      <span class="sheet-title">{{ title }}</span>
    </button>
    <div class="panel-content">
      <h1 class="panel-h1">{{ title }}</h1>
      <slot />
    </div>
  </aside>
</template>

<style scoped>
/* Desktop : sidebar classique. */
.panel {
  width: 280px;
  flex: 0 0 auto;
  padding: 16px;
  overflow-y: auto;
  border-right: 1px solid #e5e3dc;
  background: #fafaf8;
}
.panel-h1 { font-size: 18px; margin: 0 0 16px; }
.sheet-handle { display: none; }

/* Mobile : bottom sheet coulissant. */
@media (max-width: 767px) {
  .panel {
    position: fixed;
    left: 0; right: 0; bottom: 0; top: auto;
    width: auto;
    max-height: 70vh;
    padding: 0;
    border-right: none;
    border-top: 1px solid #e5e3dc;
    border-radius: 12px 12px 0 0;
    box-shadow: 0 -2px 16px rgba(0, 0, 0, 0.12);
    transform: translateY(calc(100% - 52px));
    transition: transform 0.25s ease;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    z-index: 10;
  }
  .panel.is-open { transform: translateY(0); }

  .sheet-handle {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    height: 52px;
    padding: 0 16px;
    border: none;
    background: transparent;
    cursor: pointer;
    font: inherit;
    text-align: left;
    flex: 0 0 auto;
  }
  .grip {
    position: absolute;
    top: 8px; left: 50%;
    transform: translateX(-50%);
    width: 36px; height: 4px;
    border-radius: 2px;
    background: #c9c6bd;
  }
  .sheet-title { font-size: 16px; font-weight: 600; }
  .panel-h1 { display: none; }
  .panel-content {
    padding: 0 16px 16px;
    overflow-y: auto;
    flex: 1 1 auto;
  }
}
</style>
```

- [ ] **Step 4: Lancer pour vérifier le succès**

Run: `npx vitest run src/components/PanelSheet.spec.ts`
Expected: PASS.

- [ ] **Step 5: Remplacer `src/App.vue`**

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useMetroData } from './composables/useMetroData'
import { useMapState } from './composables/useMapState'
import MetroMap from './components/MetroMap.vue'
import LineLegend from './components/LineLegend.vue'
import MapControls from './components/MapControls.vue'
import PanelSheet from './components/PanelSheet.vue'

const data = useMetroData()
const state = useMapState()

function detectWebgl(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
  } catch {
    return false
  }
}

const webglSupported = detectWebgl()

onMounted(() => data.load())
</script>

<template>
  <div class="app">
    <PanelSheet title="Métro de Paris">
      <MapControls
        :show-all-labels="state.showAllLabels.value"
        :show-selected-line-labels="state.showSelectedLineLabels.value"
        :has-selection="state.selectedLineId.value !== null"
        @update:show-all-labels="state.showAllLabels.value = $event"
        @update:show-selected-line-labels="state.showSelectedLineLabels.value = $event"
        @reset="state.reset"
      />
      <LineLegend
        :lines="data.linesMeta.value"
        :selected-line-id="state.selectedLineId.value"
        @select="state.selectLine"
      />
    </PanelSheet>

    <section class="stage">
      <p v-if="!webglSupported" class="status error">
        Votre navigateur ne supporte pas WebGL, nécessaire à l'affichage de la carte.
      </p>
      <p v-else-if="data.loading.value" class="status">Chargement du réseau…</p>
      <p v-else-if="data.error.value" class="status error">
        Erreur : {{ data.error.value }}
      </p>
      <MetroMap
        v-else-if="data.lines.value && data.stations.value && data.arrondissements.value"
        :lines="data.lines.value"
        :stations="data.stations.value"
        :arrondissements="data.arrondissements.value"
        :selected-line-id="state.selectedLineId.value"
        :show-all-labels="state.showAllLabels.value"
        :show-selected-line-labels="state.showSelectedLineLabels.value"
        :pinned-keys="state.pinnedStations.value"
        @select-line="state.selectLine"
        @toggle-station="state.toggleStation"
        @background-click="state.reset"
      />
    </section>
  </div>
</template>

<style>
html, body, #app { height: 100%; margin: 0; }
body { font-family: system-ui, -apple-system, sans-serif; }
</style>

<style scoped>
.app { display: flex; height: 100%; }
.stage { position: relative; flex: 1 1 auto; }
.status { padding: 24px; font-size: 15px; }
.status.error { color: #b00020; }

/* Mobile : carte plein écran, la feuille (PanelSheet) se superpose. */
@media (max-width: 767px) {
  .app { display: block; position: relative; }
  .stage { position: absolute; inset: 0; }
}
</style>
```

- [ ] **Step 6: Vérifier tests + build**

Run: `npm test && npm run build`
Expected: tous les tests PASS, build réussi 0 erreur TS.

- [ ] **Step 7: Smoke runtime manuel (desktop + mobile)**

Run: `npm run dev` puis ouvrir l'URL.
Expected :
1. Desktop large : sidebar 280px à gauche, carte à droite (inchangé).
2. Réduire la fenêtre < 768px (ou devtools mode mobile) : carte plein écran, poignée « Métro de Paris » en bas.
3. Taper la poignée → la feuille s'ouvre (contrôles + légende scrollables) ; re-taper → se referme.
4. Les fonctionnalités (sélection ligne, pins de station) marchent en mode mobile.
Arrêter le serveur ensuite.

- [ ] **Step 8: Commit**

```bash
git add src/components/PanelSheet.vue src/components/PanelSheet.spec.ts src/App.vue
git commit -m "feat: layout responsive avec bottom sheet mobile"
```

---

## Notes de mise en œuvre

- **Cohérence des clés de station** : le controller lit les coordonnées du feature *rendu* par `queryRenderedFeatures`, `StationLabels` lit les coordonnées du feature *source* — pour un point, les deux valeurs numériques sont identiques (mêmes données source), donc `stationKey` produit la même chaîne des deux côtés. Si un jour une divergence de précision apparaissait, normaliser les coordonnées (ex. `toFixed(6)`) dans `stationKey`.
- **Dimming vs pins** : quand une ligne est sélectionnée, les pastilles des autres lignes sont estompées (opacité 0.25) mais restent cliquables (`queryRenderedFeatures` ignore l'opacité) et un nom épinglé reste lisible (overlay HTML indépendant).
- **Resize MapLibre** : MapLibre v4 observe la taille du conteneur (ResizeObserver) — la rotation d'écran est gérée automatiquement, aucun `map.resize()` manuel nécessaire.
