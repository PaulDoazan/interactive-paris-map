# Carte interactive du métro parisien — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire une SPA Vue 3 + TypeScript affichant les tracés géographiques réels des 16 lignes du métro parisien sur un fond minimaliste, avec surbrillance d'une ligne au clic et affichage/masquage des noms de stations, pour l'apprentissage du réseau.

**Architecture:** Un script Node de préparation télécharge et filtre les données open data IDFM/Paris en GeoJSON bundlés dans `public/data/`. Au runtime, un composable charge ces données, un composable d'état réactif porte la sélection et les toggles, et un composable "controller" pilote une instance MapLibre GL (fond + tracés + stations). La surbrillance et l'estompage sont produits par des fonctions pures (expressions MapLibre) ; les noms de stations sont des overlays HTML positionnés via `map.project()`. Les composants Vue (légende cliquable, contrôles, labels) branchent l'état sur le controller.

**Tech Stack:** Vue 3 (`<script setup>` + TS), Vite, TypeScript, MapLibre GL JS, Vitest + @vue/test-utils + jsdom, tsx (exécution du script de prep).

## Global Constraints

- **Langage** : TypeScript strict partout (`"strict": true`).
- **Périmètre données** : métro uniquement — lignes `1`..`14`, `3bis`, `7bis` (16 lignes). Filtre source `mode="METRO"`.
- **Identifiants de ligne canoniques** (`lineId`) : `"1"`,`"2"`,`"3"`,`"3bis"`,`"4"`,`"5"`,`"6"`,`"7"`,`"7bis"`,`"8"`,`"9"`,`"10"`,`"11"`,`"12"`,`"13"`,`"14"`. Toute valeur source (`"3B"`, `"7B"`, casse variable) est normalisée vers cette forme.
- **Offline** : aucune dépendance réseau au runtime. Toutes les données sont bundlées dans `public/data/`. Pas de serveur de tuiles ni de glyphs (labels = overlay HTML, pas de couche `symbol`).
- **Couleurs** : couleur de ligne issue de la donnée (`colourweb_hexa`) si présente, sinon fallback du mapping RATP en dur ; toujours stockée en hex avec `#`.
- **Sources open data (API Opendatasoft Explore v2.1, export GeoJSON)** :
  - Tracés : `https://data.iledefrance-mobilites.fr/api/explore/v2.1/catalog/datasets/traces-du-reseau-ferre-idf/exports/geojson?where=mode%3D%22METRO%22`
  - Stations : `https://data.iledefrance-mobilites.fr/api/explore/v2.1/catalog/datasets/emplacement-des-gares-idf/exports/geojson?where=mode%3D%22METRO%22`
  - Fond Paris : `https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/arrondissements/exports/geojson`
- **Commits** : un commit par tâche (fin de tâche), messages en `type: description`.

---

## File Structure

```
paris-metro-interactive/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
├── .gitignore
├── README.md
├── scripts/
│   ├── prepare-data.ts          # orchestration fetch + write
│   └── lib/
│       ├── normalize.ts         # normalizeLineId (pur)
│       └── transform.ts         # filtrage/dédup/meta (pur)
├── public/
│   └── data/                    # généré par le script (commité)
│       ├── metro-lines.geojson
│       ├── metro-stations.geojson
│       ├── paris-arrondissements.geojson
│       └── lines.json
└── src/
    ├── main.ts
    ├── App.vue
    ├── types.ts                 # types partagés (LineMeta, StationFeature, …)
    ├── data/
    │   └── lineColors.ts        # mapping RATP + getLineColor (pur)
    ├── map/
    │   ├── expressions.ts       # builders d'expressions MapLibre (purs)
    │   ├── labels.ts            # computeVisibleLabelStations (pur)
    │   └── style.ts             # buildMapStyle (pur)
    ├── composables/
    │   ├── useMetroData.ts      # chargement runtime des données
    │   ├── useMapState.ts       # état réactif (sélection + toggles)
    │   └── useMapController.ts  # instance MapLibre + wiring
    └── components/
        ├── MetroMap.vue         # conteneur carte
        ├── LineLegend.vue       # légende cliquable
        ├── MapControls.vue      # toggles labels + reset
        └── StationLabels.vue    # overlay HTML des noms
```

Tests colocalisés en `*.test.ts` à côté des fichiers testés (pur) et `*.spec.ts` pour les composants.

---

## Task 1: Scaffold projet (Vue 3 + Vite + TS + Vitest)

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `src/main.ts`, `src/App.vue`, `.gitignore` (déjà présent, à compléter)
- Test: `src/sanity.test.ts`

**Interfaces:**
- Produces: un projet buildable, `npm run dev`, `npm test`, `npm run build` fonctionnels.

- [ ] **Step 1: Créer `package.json`**

```json
{
  "name": "paris-metro-interactive",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "data:prep": "tsx scripts/prepare-data.ts"
  },
  "dependencies": {
    "maplibre-gl": "^4.7.1",
    "vue": "^3.5.13"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.2.1",
    "@vue/test-utils": "^2.4.6",
    "jsdom": "^25.0.1",
    "tsx": "^4.19.2",
    "typescript": "^5.6.3",
    "vite": "^6.0.5",
    "vitest": "^2.1.8",
    "vue-tsc": "^2.1.10"
  }
}
```

- [ ] **Step 2: Créer `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "types": ["vitest/globals"]
  },
  "include": ["src", "scripts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Créer `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 4: Créer `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
})
```

- [ ] **Step 5: Créer `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
```

- [ ] **Step 6: Créer `index.html`**

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Métro de Paris — carte interactive</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 7: Créer `src/main.ts`**

```ts
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

- [ ] **Step 8: Créer `src/App.vue` (placeholder minimal)**

```vue
<script setup lang="ts">
</script>

<template>
  <main>Carte du métro de Paris — à venir</main>
</template>
```

- [ ] **Step 9: Compléter `.gitignore`**

Vérifier qu'il contient au minimum :

```
node_modules/
dist/
.DS_Store
```

- [ ] **Step 10: Écrire le test sanity `src/sanity.test.ts`**

```ts
import { describe, it, expect } from 'vitest'

describe('toolchain', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 11: Installer et vérifier que le test échoue puis passe**

Run: `npm install && npm test`
Expected: 1 test passé (`toolchain > runs vitest`).

- [ ] **Step 12: Vérifier le dev server et le build**

Run: `npm run build`
Expected: build réussi, dossier `dist/` créé, aucune erreur TypeScript.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "chore: scaffold vue 3 + vite + ts + vitest"
```

---

## Task 2: Types partagés + couleurs RATP (pur)

**Files:**
- Create: `src/types.ts`, `src/data/lineColors.ts`, `src/data/lineColors.test.ts`

**Interfaces:**
- Produces:
  - `src/types.ts` : `LineMeta = { id: string; name: string; color: string; order: number }` ; `StationProps = { name: string; lineIds: string[] }` ; `LineProps = { lineId: string; color: string }`.
  - `src/data/lineColors.ts` : `RATP_LINE_COLORS: Record<string, string>` (clés = lineId canoniques, valeurs hex `#RRGGBB`) ; `getLineColor(lineId: string, sourceHex?: string): string`.

- [ ] **Step 1: Écrire les tests `src/data/lineColors.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { RATP_LINE_COLORS, getLineColor } from './lineColors'

describe('RATP_LINE_COLORS', () => {
  it('couvre les 16 lignes canoniques', () => {
    const ids = ['1','2','3','3bis','4','5','6','7','7bis','8','9','10','11','12','13','14']
    for (const id of ids) {
      expect(RATP_LINE_COLORS[id]).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })
})

describe('getLineColor', () => {
  it('préfixe # à une couleur source sans dièse', () => {
    expect(getLineColor('1', 'FFCD00')).toBe('#FFCD00')
  })

  it('conserve une couleur source avec dièse', () => {
    expect(getLineColor('1', '#abcabc')).toBe('#abcabc')
  })

  it('retombe sur le mapping RATP si pas de couleur source', () => {
    expect(getLineColor('2')).toBe(RATP_LINE_COLORS['2'])
  })

  it('retombe sur gris pour une ligne inconnue sans source', () => {
    expect(getLineColor('99')).toBe('#8c8c8c')
  })

  it('ignore une source vide', () => {
    expect(getLineColor('2', '')).toBe(RATP_LINE_COLORS['2'])
  })
})
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `npx vitest run src/data/lineColors.test.ts`
Expected: FAIL (module `./lineColors` introuvable).

- [ ] **Step 3: Créer `src/types.ts`**

```ts
export interface LineMeta {
  id: string
  name: string
  color: string
  order: number
}

export interface LineProps {
  lineId: string
  color: string
}

export interface StationProps {
  name: string
  lineIds: string[]
}
```

- [ ] **Step 4: Créer `src/data/lineColors.ts`**

```ts
const FALLBACK_GREY = '#8c8c8c'

// Couleurs officielles RATP (fallback si absentes de la donnée source).
export const RATP_LINE_COLORS: Record<string, string> = {
  '1': '#FFCD00',
  '2': '#003CA6',
  '3': '#837902',
  '3bis': '#6EC4E8',
  '4': '#CF009E',
  '5': '#FF7E2E',
  '6': '#6ECA97',
  '7': '#FA9ABA',
  '7bis': '#6ECA97',
  '8': '#E19BDF',
  '9': '#B6BD00',
  '10': '#C9910D',
  '11': '#704B1C',
  '12': '#007852',
  '13': '#6EC4E8',
  '14': '#62259D',
}

export function getLineColor(lineId: string, sourceHex?: string): string {
  const src = sourceHex?.trim()
  if (src) return src.startsWith('#') ? src : `#${src}`
  return RATP_LINE_COLORS[lineId] ?? FALLBACK_GREY
}
```

- [ ] **Step 5: Lancer les tests pour vérifier le succès**

Run: `npx vitest run src/data/lineColors.test.ts`
Expected: PASS (tous les tests).

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/data/lineColors.ts src/data/lineColors.test.ts
git commit -m "feat: types partagés et couleurs de lignes RATP"
```

---

## Task 3: Normalisation + transformations de données (pur)

**Files:**
- Create: `scripts/lib/normalize.ts`, `scripts/lib/normalize.test.ts`, `scripts/lib/transform.ts`, `scripts/lib/transform.test.ts`

**Interfaces:**
- Consumes: `getLineColor` (Task 2), types GeoJSON.
- Produces:
  - `normalizeLineId(indiceLig: string): string` — mappe `"3B"`/`"3bis"`/`"3BIS"` → `"3bis"`, `"7B"` → `"7bis"`, sinon `trim()`.
  - `filterMetroLineFeatures(fc): Feature[]` — garde les features `mode==="METRO"`, réécrit `properties` en `{ lineId, color }`.
  - `buildStationsCollection(fc): FeatureCollection` — features stations dédupliquées par `id_ref_zdc`, `properties` = `{ name, lineIds }` (triées), géométrie = premier point rencontré.
  - `buildLinesMeta(lineFeatures): LineMeta[]` — une entrée par `lineId`, triée par ordre métro, `color` = couleur de la ligne.

- [ ] **Step 1: Écrire `scripts/lib/normalize.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { normalizeLineId } from './normalize'

describe('normalizeLineId', () => {
  it('laisse les lignes numériques intactes', () => {
    expect(normalizeLineId('1')).toBe('1')
    expect(normalizeLineId('14')).toBe('14')
  })

  it('normalise les variantes bis', () => {
    expect(normalizeLineId('3B')).toBe('3bis')
    expect(normalizeLineId('3bis')).toBe('3bis')
    expect(normalizeLineId('3BIS')).toBe('3bis')
    expect(normalizeLineId('7B')).toBe('7bis')
  })

  it('trim les espaces', () => {
    expect(normalizeLineId(' 4 ')).toBe('4')
  })
})
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npx vitest run scripts/lib/normalize.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Créer `scripts/lib/normalize.ts`**

```ts
export function normalizeLineId(indiceLig: string): string {
  const v = indiceLig.trim()
  const m = /^(\d+)\s*(b|bis)$/i.exec(v)
  if (m) return `${m[1]}bis`
  return v
}
```

- [ ] **Step 4: Lancer pour vérifier le succès**

Run: `npx vitest run scripts/lib/normalize.test.ts`
Expected: PASS.

- [ ] **Step 5: Écrire `scripts/lib/transform.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import {
  filterMetroLineFeatures,
  buildStationsCollection,
  buildLinesMeta,
} from './transform'

const lineFC = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[2.35, 48.85], [2.36, 48.86]] },
      properties: { mode: 'METRO', indice_lig: '1', colourweb_hexa: 'FFCD00' },
    },
    {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[2.30, 48.80], [2.31, 48.81]] },
      properties: { mode: 'METRO', indice_lig: '7B', colourweb_hexa: '' },
    },
    {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[2.10, 48.70], [2.11, 48.71]] },
      properties: { mode: 'TRAMWAY', indice_lig: '4', colourweb_hexa: 'dc9600' },
    },
  ],
}

const stationFC = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [2.35, 48.85] },
      properties: { mode: 'METRO', indice_lig: '1', nom_gares: 'Bastille', id_ref_zdc: 'Z1' },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [2.35, 48.85] },
      properties: { mode: 'METRO', indice_lig: '5', nom_gares: 'Bastille', id_ref_zdc: 'Z1' },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [2.33, 48.86] },
      properties: { mode: 'METRO', indice_lig: '7B', nom_gares: 'Louis Blanc', id_ref_zdc: 'Z2' },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [2.10, 48.70] },
      properties: { mode: 'TRAMWAY', indice_lig: '4', nom_gares: 'Ailleurs', id_ref_zdc: 'Z9' },
    },
  ],
}

describe('filterMetroLineFeatures', () => {
  it('ne garde que le métro et réécrit properties', () => {
    const out = filterMetroLineFeatures(lineFC as any)
    expect(out).toHaveLength(2)
    expect(out[0].properties).toEqual({ lineId: '1', color: '#FFCD00' })
    // couleur source vide -> fallback RATP 7bis
    expect(out[1].properties.lineId).toBe('7bis')
    expect(out[1].properties.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })
})

describe('buildStationsCollection', () => {
  it('dédup par id_ref_zdc et agrège les lineIds triés', () => {
    const out = buildStationsCollection(stationFC as any)
    expect(out.type).toBe('FeatureCollection')
    expect(out.features).toHaveLength(2) // Bastille + Louis Blanc (tram exclu)
    const bastille = out.features.find((f) => f.properties.name === 'Bastille')!
    expect(bastille.properties.lineIds).toEqual(['1', '5'])
    const lb = out.features.find((f) => f.properties.name === 'Louis Blanc')!
    expect(lb.properties.lineIds).toEqual(['7bis'])
  })
})

describe('buildLinesMeta', () => {
  it('produit une meta par ligne, triée par ordre métro', () => {
    const lines = filterMetroLineFeatures(lineFC as any)
    const meta = buildLinesMeta(lines)
    expect(meta.map((m) => m.id)).toEqual(['1', '7bis'])
    expect(meta[0]).toMatchObject({ id: '1', name: 'Ligne 1', color: '#FFCD00', order: 0 })
  })
})
```

- [ ] **Step 6: Lancer pour vérifier l'échec**

Run: `npx vitest run scripts/lib/transform.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 7: Créer `scripts/lib/transform.ts`**

```ts
import type { Feature, FeatureCollection, Point } from 'geojson'
import { getLineColor } from '../../src/data/lineColors'
import type { LineMeta, LineProps, StationProps } from '../../src/types'
import { normalizeLineId } from './normalize'

// Ordre d'affichage canonique des lignes de métro.
const LINE_ORDER = ['1','2','3','3bis','4','5','6','7','7bis','8','9','10','11','12','13','14']

function orderIndex(lineId: string): number {
  const i = LINE_ORDER.indexOf(lineId)
  return i === -1 ? LINE_ORDER.length : i
}

export function filterMetroLineFeatures(fc: FeatureCollection): Feature[] {
  return fc.features
    .filter((f) => f.properties?.mode === 'METRO')
    .map((f) => {
      const lineId = normalizeLineId(String(f.properties!.indice_lig))
      const color = getLineColor(lineId, f.properties!.colourweb_hexa as string | undefined)
      const props: LineProps = { lineId, color }
      return { type: 'Feature', geometry: f.geometry, properties: props } as Feature
    })
}

export function buildStationsCollection(fc: FeatureCollection): FeatureCollection {
  const byZone = new Map<string, { geometry: Point; name: string; lineIds: Set<string> }>()
  for (const f of fc.features) {
    if (f.properties?.mode !== 'METRO') continue
    const key = String(f.properties.id_ref_zdc)
    const lineId = normalizeLineId(String(f.properties.indice_lig))
    const existing = byZone.get(key)
    if (existing) {
      existing.lineIds.add(lineId)
    } else {
      byZone.set(key, {
        geometry: f.geometry as Point,
        name: String(f.properties.nom_gares),
        lineIds: new Set([lineId]),
      })
    }
  }
  const features: Feature[] = [...byZone.values()].map((s) => {
    const props: StationProps = {
      name: s.name,
      lineIds: [...s.lineIds].sort((a, b) => orderIndex(a) - orderIndex(b)),
    }
    return { type: 'Feature', geometry: s.geometry, properties: props } as Feature
  })
  return { type: 'FeatureCollection', features }
}

export function buildLinesMeta(lineFeatures: Feature[]): LineMeta[] {
  const byId = new Map<string, string>() // lineId -> color
  for (const f of lineFeatures) {
    const p = f.properties as unknown as LineProps
    if (!byId.has(p.lineId)) byId.set(p.lineId, p.color)
  }
  return [...byId.entries()]
    .sort(([a], [b]) => orderIndex(a) - orderIndex(b))
    .map(([id, color], order) => ({ id, name: `Ligne ${id}`, color, order }))
}
```

- [ ] **Step 8: Ajouter `@types/geojson` en devDependency et l'installer**

Run: `npm install -D @types/geojson`
Expected: installé sans erreur.

- [ ] **Step 9: Lancer pour vérifier le succès**

Run: `npx vitest run scripts/lib/transform.test.ts`
Expected: PASS (tous les tests).

- [ ] **Step 10: Commit**

```bash
git add scripts/lib package.json package-lock.json
git commit -m "feat: normalisation et transformations des données métro"
```

---

## Task 4: Script de préparation des données (fetch + write)

**Files:**
- Create: `scripts/prepare-data.ts`
- Génère (et commite) : `public/data/metro-lines.geojson`, `public/data/metro-stations.geojson`, `public/data/paris-arrondissements.geojson`, `public/data/lines.json`

**Interfaces:**
- Consumes: `filterMetroLineFeatures`, `buildStationsCollection`, `buildLinesMeta` (Task 3).
- Produces: les 4 fichiers de `public/data/`. Format `metro-lines.geojson` = `FeatureCollection` de features `{ properties: LineProps }` ; `metro-stations.geojson` = `FeatureCollection` de features `{ properties: StationProps }` ; `lines.json` = `LineMeta[]`.

- [ ] **Step 1: Créer `scripts/prepare-data.ts`**

```ts
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { FeatureCollection } from 'geojson'
import {
  filterMetroLineFeatures,
  buildStationsCollection,
  buildLinesMeta,
} from './lib/transform'

const OUT_DIR = resolve(process.cwd(), 'public/data')

const URLS = {
  lines:
    'https://data.iledefrance-mobilites.fr/api/explore/v2.1/catalog/datasets/traces-du-reseau-ferre-idf/exports/geojson?where=mode%3D%22METRO%22',
  stations:
    'https://data.iledefrance-mobilites.fr/api/explore/v2.1/catalog/datasets/emplacement-des-gares-idf/exports/geojson?where=mode%3D%22METRO%22',
  arrondissements:
    'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/arrondissements/exports/geojson',
}

async function fetchGeoJSON(url: string): Promise<FeatureCollection> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Échec du téléchargement (${res.status}) : ${url}`)
  return (await res.json()) as FeatureCollection
}

async function write(name: string, data: unknown): Promise<void> {
  await writeFile(resolve(OUT_DIR, name), JSON.stringify(data), 'utf8')
  console.log(`écrit ${name}`)
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true })

  console.log('téléchargement des tracés…')
  const rawLines = await fetchGeoJSON(URLS.lines)
  const lineFeatures = filterMetroLineFeatures(rawLines)
  console.log(`  ${lineFeatures.length} segments métro`)

  console.log('téléchargement des stations…')
  const rawStations = await fetchGeoJSON(URLS.stations)
  const stations = buildStationsCollection(rawStations)
  console.log(`  ${stations.features.length} stations dédupliquées`)

  console.log('téléchargement du fond de plan (arrondissements)…')
  const arr = await fetchGeoJSON(URLS.arrondissements)

  const linesMeta = buildLinesMeta(lineFeatures)
  console.log(`  ${linesMeta.length} lignes : ${linesMeta.map((l) => l.id).join(', ')}`)

  await write('metro-lines.geojson', { type: 'FeatureCollection', features: lineFeatures })
  await write('metro-stations.geojson', stations)
  await write('paris-arrondissements.geojson', arr)
  await write('lines.json', linesMeta)

  if (linesMeta.length !== 16) {
    console.warn(`⚠️  attendu 16 lignes, obtenu ${linesMeta.length} — vérifier la source.`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Exécuter le script**

Run: `npm run data:prep`
Expected: logs de progression, puis `16 lignes : 1, 2, 3, 3bis, 4, 5, 6, 7, 7bis, 8, 9, 10, 11, 12, 13, 14` et 4 fichiers écrits dans `public/data/`. (Si le compte ≠ 16, investiguer les valeurs `indice_lig` réelles avant de continuer.)

- [ ] **Step 3: Vérifier le contenu généré**

Run: `node -e "const l=require('./public/data/lines.json'); console.log(l.length, l[0]); const s=require('./public/data/metro-stations.geojson'); console.log('stations', s.features.length, s.features[0].properties)"`
Expected: 16 lignes, une station exemple avec `name` (string) et `lineIds` (array non vide). Le nombre de stations doit être dans un ordre de grandeur plausible (~300).

- [ ] **Step 4: Commit (données incluses)**

```bash
git add scripts/prepare-data.ts public/data
git commit -m "feat: script de préparation et données métro bundlées"
```

---

## Task 5: Composable de chargement des données runtime

**Files:**
- Create: `src/composables/useMetroData.ts`, `src/composables/useMetroData.test.ts`

**Interfaces:**
- Consumes: types `LineMeta` (Task 2), fichiers `public/data/*` (Task 4).
- Produces: `useMetroData()` retourne `{ lines: Ref<FeatureCollection|null>, stations: Ref<FeatureCollection|null>, arrondissements: Ref<FeatureCollection|null>, linesMeta: Ref<LineMeta[]>, loading: Ref<boolean>, error: Ref<string|null>, load: () => Promise<void> }`.

- [ ] **Step 1: Écrire `src/composables/useMetroData.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useMetroData } from './useMetroData'

const fc = { type: 'FeatureCollection', features: [] }
const meta = [{ id: '1', name: 'Ligne 1', color: '#FFCD00', order: 0 }]

function mockFetchOk() {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    ok: true,
    json: async () => (url.endsWith('lines.json') ? meta : fc),
  })))
}

describe('useMetroData', () => {
  beforeEach(() => vi.unstubAllGlobals())

  it('charge les données et bascule loading', async () => {
    mockFetchOk()
    const d = useMetroData()
    expect(d.loading.value).toBe(false)
    const p = d.load()
    expect(d.loading.value).toBe(true)
    await p
    expect(d.loading.value).toBe(false)
    expect(d.error.value).toBeNull()
    expect(d.linesMeta.value).toEqual(meta)
    expect(d.lines.value).toEqual(fc)
  })

  it('remonte une erreur si un fetch échoue', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })))
    const d = useMetroData()
    await d.load()
    expect(d.error.value).toMatch(/500|données/i)
    expect(d.loading.value).toBe(false)
  })
})
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npx vitest run src/composables/useMetroData.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Créer `src/composables/useMetroData.ts`**

```ts
import { ref, type Ref } from 'vue'
import type { FeatureCollection } from 'geojson'
import type { LineMeta } from '../types'

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Échec du chargement des données (${res.status})`)
  return (await res.json()) as T
}

export interface MetroData {
  lines: Ref<FeatureCollection | null>
  stations: Ref<FeatureCollection | null>
  arrondissements: Ref<FeatureCollection | null>
  linesMeta: Ref<LineMeta[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  load: () => Promise<void>
}

export function useMetroData(): MetroData {
  const lines = ref<FeatureCollection | null>(null)
  const stations = ref<FeatureCollection | null>(null)
  const arrondissements = ref<FeatureCollection | null>(null)
  const linesMeta = ref<LineMeta[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const base = import.meta.env.BASE_URL
      const [l, s, a, m] = await Promise.all([
        fetchJSON<FeatureCollection>(`${base}data/metro-lines.geojson`),
        fetchJSON<FeatureCollection>(`${base}data/metro-stations.geojson`),
        fetchJSON<FeatureCollection>(`${base}data/paris-arrondissements.geojson`),
        fetchJSON<LineMeta[]>(`${base}data/lines.json`),
      ])
      lines.value = l
      stations.value = s
      arrondissements.value = a
      linesMeta.value = m
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur de chargement des données'
    } finally {
      loading.value = false
    }
  }

  return { lines, stations, arrondissements, linesMeta, loading, error, load }
}
```

- [ ] **Step 4: Lancer pour vérifier le succès**

Run: `npx vitest run src/composables/useMetroData.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useMetroData.ts src/composables/useMetroData.test.ts
git commit -m "feat: composable de chargement des données runtime"
```

---

## Task 6: État réactif + logique pure (expressions, labels)

**Files:**
- Create: `src/composables/useMapState.ts`, `src/composables/useMapState.test.ts`, `src/map/expressions.ts`, `src/map/expressions.test.ts`, `src/map/labels.ts`, `src/map/labels.test.ts`

**Interfaces:**
- Consumes: types `StationProps` (Task 2).
- Produces:
  - `useMapState()` → `{ selectedLineId: Ref<string|null>, showAllLabels: Ref<boolean>, showSelectedLineLabels: Ref<boolean>, selectLine(id: string): void, reset(): void }`. `selectLine(id)` bascule (re-cliquer la ligne active la désélectionne). `reset()` remet sélection à `null`.
  - `src/map/expressions.ts` :
    - `baseLineOpacity(selectedLineId: string|null): number` — `1` si aucune sélection, `0.15` sinon.
    - `highlightFilter(selectedLineId: string|null): unknown[]` — filtre MapLibre gardant les features dont `lineId === selectedLineId` (ou filtre "rien" si `null`).
    - `stationHighlightFilter(selectedLineId: string|null): unknown[]` — filtre MapLibre gardant les stations dont `lineIds` contient `selectedLineId`.
  - `src/map/labels.ts` : `computeVisibleLabelStations(features, opts): T[]` où `opts = { selectedLineId, showAllLabels, showSelectedLineLabels }`.

- [ ] **Step 1: Écrire `src/map/expressions.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { baseLineOpacity, highlightFilter, stationHighlightFilter } from './expressions'

describe('baseLineOpacity', () => {
  it('pleine opacité sans sélection', () => {
    expect(baseLineOpacity(null)).toBe(1)
  })
  it('estompe quand une ligne est sélectionnée', () => {
    expect(baseLineOpacity('4')).toBe(0.15)
  })
})

describe('highlightFilter', () => {
  it('ne garde rien sans sélection', () => {
    expect(highlightFilter(null)).toEqual(['==', ['get', 'lineId'], '__none__'])
  })
  it('filtre sur la ligne sélectionnée', () => {
    expect(highlightFilter('7bis')).toEqual(['==', ['get', 'lineId'], '7bis'])
  })
})

describe('stationHighlightFilter', () => {
  it('ne garde rien sans sélection', () => {
    expect(stationHighlightFilter(null)).toEqual(['in', '__none__', ['get', 'lineIds']])
  })
  it('filtre les stations contenant la ligne', () => {
    expect(stationHighlightFilter('5')).toEqual(['in', '5', ['get', 'lineIds']])
  })
})
```

- [ ] **Step 2: Écrire `src/map/labels.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { computeVisibleLabelStations } from './labels'

const stations = [
  { properties: { name: 'A', lineIds: ['1', '5'] } },
  { properties: { name: 'B', lineIds: ['4'] } },
  { properties: { name: 'C', lineIds: ['5'] } },
]

describe('computeVisibleLabelStations', () => {
  it('rien par défaut (aucun toggle, aucune sélection)', () => {
    const out = computeVisibleLabelStations(stations, {
      selectedLineId: null, showAllLabels: false, showSelectedLineLabels: true,
    })
    expect(out).toEqual([])
  })

  it('tout si showAllLabels', () => {
    const out = computeVisibleLabelStations(stations, {
      selectedLineId: '4', showAllLabels: true, showSelectedLineLabels: true,
    })
    expect(out).toHaveLength(3)
  })

  it('seulement la ligne sélectionnée si showSelectedLineLabels', () => {
    const out = computeVisibleLabelStations(stations, {
      selectedLineId: '5', showAllLabels: false, showSelectedLineLabels: true,
    })
    expect(out.map((s) => s.properties.name)).toEqual(['A', 'C'])
  })

  it('rien si sélection mais showSelectedLineLabels off', () => {
    const out = computeVisibleLabelStations(stations, {
      selectedLineId: '5', showAllLabels: false, showSelectedLineLabels: false,
    })
    expect(out).toEqual([])
  })
})
```

- [ ] **Step 3: Écrire `src/composables/useMapState.test.ts`**

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

  it('reset efface la sélection', () => {
    const s = useMapState()
    s.selectLine('4')
    s.reset()
    expect(s.selectedLineId.value).toBeNull()
  })

  it('valeurs par défaut des toggles', () => {
    const s = useMapState()
    expect(s.showAllLabels.value).toBe(false)
    expect(s.showSelectedLineLabels.value).toBe(true)
  })
})
```

- [ ] **Step 4: Lancer les trois fichiers de test pour vérifier l'échec**

Run: `npx vitest run src/map/expressions.test.ts src/map/labels.test.ts src/composables/useMapState.test.ts`
Expected: FAIL (modules introuvables).

- [ ] **Step 5: Créer `src/map/expressions.ts`**

```ts
export function baseLineOpacity(selectedLineId: string | null): number {
  return selectedLineId === null ? 1 : 0.15
}

export function highlightFilter(selectedLineId: string | null): unknown[] {
  return ['==', ['get', 'lineId'], selectedLineId ?? '__none__']
}

export function stationHighlightFilter(selectedLineId: string | null): unknown[] {
  return ['in', selectedLineId ?? '__none__', ['get', 'lineIds']]
}
```

- [ ] **Step 6: Créer `src/map/labels.ts`**

```ts
import type { StationProps } from '../types'

export interface LabelOptions {
  selectedLineId: string | null
  showAllLabels: boolean
  showSelectedLineLabels: boolean
}

export function computeVisibleLabelStations<T extends { properties: StationProps }>(
  stations: T[],
  opts: LabelOptions,
): T[] {
  if (opts.showAllLabels) return stations
  if (opts.showSelectedLineLabels && opts.selectedLineId !== null) {
    const id = opts.selectedLineId
    return stations.filter((s) => s.properties.lineIds.includes(id))
  }
  return []
}
```

- [ ] **Step 7: Créer `src/composables/useMapState.ts`**

```ts
import { ref, type Ref } from 'vue'

export interface MapState {
  selectedLineId: Ref<string | null>
  showAllLabels: Ref<boolean>
  showSelectedLineLabels: Ref<boolean>
  selectLine: (id: string) => void
  reset: () => void
}

export function useMapState(): MapState {
  const selectedLineId = ref<string | null>(null)
  const showAllLabels = ref(false)
  const showSelectedLineLabels = ref(true)

  function selectLine(id: string): void {
    selectedLineId.value = selectedLineId.value === id ? null : id
  }

  function reset(): void {
    selectedLineId.value = null
  }

  return { selectedLineId, showAllLabels, showSelectedLineLabels, selectLine, reset }
}
```

- [ ] **Step 8: Lancer les trois fichiers de test pour vérifier le succès**

Run: `npx vitest run src/map/expressions.test.ts src/map/labels.test.ts src/composables/useMapState.test.ts`
Expected: PASS (tous).

- [ ] **Step 9: Commit**

```bash
git add src/map/expressions.ts src/map/expressions.test.ts src/map/labels.ts src/map/labels.test.ts src/composables/useMapState.ts src/composables/useMapState.test.ts
git commit -m "feat: état réactif et logique pure (expressions, labels)"
```

---

## Task 7: Construction du style MapLibre (pur) + controller

**Files:**
- Create: `src/map/style.ts`, `src/map/style.test.ts`, `src/composables/useMapController.ts`

**Interfaces:**
- Consumes: `baseLineOpacity`, `highlightFilter`, `stationHighlightFilter` (Task 6), `FeatureCollection`.
- Produces:
  - `src/map/style.ts` : `buildMapStyle(data: { lines, stations, arrondissements }): StyleSpecification` — style MapLibre inline, sources `arrondissements`/`metro-lines`/`metro-stations`, layers `bg`, `arr-fill`, `arr-line`, `metro-lines-base`, `metro-lines-highlight`, `metro-stations-base`, `metro-stations-highlight`. Pas de `glyphs`.
  - `src/composables/useMapController.ts` : `useMapController()` → `{ mount(container, data): void, applySelection(selectedLineId): void, onLineClick(cb): void, onBackgroundClick(cb): void, getMap(): Map|null, destroy(): void }`.

- [ ] **Step 1: Écrire `src/map/style.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { buildMapStyle } from './style'

const empty = { type: 'FeatureCollection', features: [] } as any

describe('buildMapStyle', () => {
  const style = buildMapStyle({ lines: empty, stations: empty, arrondissements: empty })

  it('déclare les 3 sources geojson', () => {
    expect(Object.keys(style.sources)).toEqual(
      expect.arrayContaining(['arrondissements', 'metro-lines', 'metro-stations']),
    )
  })

  it('ne requiert aucun serveur de glyphs', () => {
    expect(style.glyphs).toBeUndefined()
  })

  it('ordonne les layers avec la surbrillance au-dessus de la base', () => {
    const ids = style.layers.map((l: any) => l.id)
    expect(ids.indexOf('metro-lines-highlight')).toBeGreaterThan(ids.indexOf('metro-lines-base'))
    expect(ids.indexOf('metro-stations-highlight')).toBeGreaterThan(ids.indexOf('metro-stations-base'))
  })

  it('colore les tracés depuis la propriété color', () => {
    const base = style.layers.find((l: any) => l.id === 'metro-lines-base') as any
    expect(base.paint['line-color']).toEqual(['get', 'color'])
  })
})
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npx vitest run src/map/style.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Créer `src/map/style.ts`**

```ts
import type { StyleSpecification } from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'

export interface StyleData {
  lines: FeatureCollection
  stations: FeatureCollection
  arrondissements: FeatureCollection
}

export function buildMapStyle(data: StyleData): StyleSpecification {
  return {
    version: 8,
    sources: {
      arrondissements: { type: 'geojson', data: data.arrondissements },
      'metro-lines': { type: 'geojson', data: data.lines },
      'metro-stations': { type: 'geojson', data: data.stations },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#f6f5f1' } },
      {
        id: 'arr-fill', type: 'fill', source: 'arrondissements',
        paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.55 },
      },
      {
        id: 'arr-line', type: 'line', source: 'arrondissements',
        paint: { 'line-color': '#dcdad3', 'line-width': 1 },
      },
      {
        id: 'metro-lines-base', type: 'line', source: 'metro-lines',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 14, 4],
          'line-opacity': 1,
        },
      },
      {
        id: 'metro-lines-highlight', type: 'line', source: 'metro-lines',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        filter: ['==', ['get', 'lineId'], '__none__'],
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 4, 14, 7],
          'line-opacity': 1,
        },
      },
      {
        id: 'metro-stations-base', type: 'circle', source: 'metro-stations',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 1.5, 14, 3.5],
          'circle-color': '#ffffff',
          'circle-stroke-color': '#555',
          'circle-stroke-width': 1,
          'circle-opacity': 1,
          'circle-stroke-opacity': 1,
        },
      },
      {
        id: 'metro-stations-highlight', type: 'circle', source: 'metro-stations',
        filter: ['in', '__none__', ['get', 'lineIds']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 2.5, 14, 5],
          'circle-color': '#ffffff',
          'circle-stroke-color': '#111',
          'circle-stroke-width': 2,
        },
      },
    ],
  }
}
```

- [ ] **Step 4: Lancer pour vérifier le succès**

Run: `npx vitest run src/map/style.test.ts`
Expected: PASS.

- [ ] **Step 5: Créer `src/composables/useMapController.ts`**

```ts
import { Map as MapLibreMap, type MapGeoJSONFeature } from 'maplibre-gl'
import type { LineProps } from '../types'
import { buildMapStyle, type StyleData } from '../map/style'
import { baseLineOpacity, highlightFilter, stationHighlightFilter } from '../map/expressions'

// Cadrage initial sur Paris.
const PARIS_CENTER: [number, number] = [2.3488, 48.8534]

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
    map.on('mouseenter', 'metro-lines-base', () => {
      if (map) map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', 'metro-lines-base', () => {
      if (map) map.getCanvas().style.cursor = ''
    })
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

  function onLineClick(cb: (lineId: string) => void): void {
    if (!map) return
    map.on('click', 'metro-lines-base', (e) => {
      const f = e.features?.[0] as MapGeoJSONFeature | undefined
      if (f) cb((f.properties as unknown as LineProps).lineId)
    })
  }

  function onBackgroundClick(cb: () => void): void {
    if (!map) return
    map.on('click', (e) => {
      const hits = map!.queryRenderedFeatures(e.point, { layers: ['metro-lines-base'] })
      if (hits.length === 0) cb()
    })
  }

  function getMap(): MapLibreMap | null {
    return map
  }

  function destroy(): void {
    map?.remove()
    map = null
  }

  return { mount, applySelection, onLineClick, onBackgroundClick, getMap, destroy }
}
```

- [ ] **Step 6: Vérifier la compilation TypeScript**

Run: `npx vue-tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 7: Commit**

```bash
git add src/map/style.ts src/map/style.test.ts src/composables/useMapController.ts
git commit -m "feat: style maplibre et controller de carte"
```

---

## Task 8: Composants légende et contrôles

**Files:**
- Create: `src/components/LineLegend.vue`, `src/components/LineLegend.spec.ts`, `src/components/MapControls.vue`, `src/components/MapControls.spec.ts`

**Interfaces:**
- Consumes: `LineMeta` (Task 2).
- Produces:
  - `LineLegend.vue` : props `{ lines: LineMeta[]; selectedLineId: string | null }`, émet `select` (payload `string`). Rend un bouton par ligne (pastille couleur + nom), classe `is-selected` sur la ligne active.
  - `MapControls.vue` : props `{ showAllLabels: boolean; showSelectedLineLabels: boolean; hasSelection: boolean }`, émet `update:showAllLabels` (boolean), `update:showSelectedLineLabels` (boolean), `reset` (void).

- [ ] **Step 1: Écrire `src/components/LineLegend.spec.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LineLegend from './LineLegend.vue'

const lines = [
  { id: '1', name: 'Ligne 1', color: '#FFCD00', order: 0 },
  { id: '2', name: 'Ligne 2', color: '#003CA6', order: 1 },
]

describe('LineLegend', () => {
  it('rend un bouton par ligne', () => {
    const w = mount(LineLegend, { props: { lines, selectedLineId: null } })
    expect(w.findAll('button.line-item')).toHaveLength(2)
  })

  it('émet select au clic', async () => {
    const w = mount(LineLegend, { props: { lines, selectedLineId: null } })
    await w.findAll('button.line-item')[1].trigger('click')
    expect(w.emitted('select')?.[0]).toEqual(['2'])
  })

  it('marque la ligne sélectionnée', () => {
    const w = mount(LineLegend, { props: { lines, selectedLineId: '2' } })
    const items = w.findAll('button.line-item')
    expect(items[1].classes()).toContain('is-selected')
    expect(items[0].classes()).not.toContain('is-selected')
  })
})
```

- [ ] **Step 2: Écrire `src/components/MapControls.spec.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MapControls from './MapControls.vue'

const base = { showAllLabels: false, showSelectedLineLabels: true, hasSelection: false }

describe('MapControls', () => {
  it('émet update:showAllLabels au toggle', async () => {
    const w = mount(MapControls, { props: base })
    await w.get('[data-test=toggle-all]').setValue(true)
    expect(w.emitted('update:showAllLabels')?.[0]).toEqual([true])
  })

  it('émet reset au clic du bouton', async () => {
    const w = mount(MapControls, { props: { ...base, hasSelection: true } })
    await w.get('[data-test=reset]').trigger('click')
    expect(w.emitted('reset')).toHaveLength(1)
  })
})
```

- [ ] **Step 3: Lancer pour vérifier l'échec**

Run: `npx vitest run src/components/LineLegend.spec.ts src/components/MapControls.spec.ts`
Expected: FAIL (composants introuvables).

- [ ] **Step 4: Créer `src/components/LineLegend.vue`**

```vue
<script setup lang="ts">
import type { LineMeta } from '../types'

defineProps<{ lines: LineMeta[]; selectedLineId: string | null }>()
const emit = defineEmits<{ select: [id: string] }>()
</script>

<template>
  <nav class="legend" aria-label="Lignes de métro">
    <button
      v-for="line in lines"
      :key="line.id"
      type="button"
      class="line-item"
      :class="{ 'is-selected': line.id === selectedLineId }"
      @click="emit('select', line.id)"
    >
      <span class="dot" :style="{ backgroundColor: line.color }" aria-hidden="true" />
      <span class="label">{{ line.name }}</span>
    </button>
  </nav>
</template>

<style scoped>
.legend { display: flex; flex-direction: column; gap: 2px; }
.line-item {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 8px; border: none; background: transparent;
  cursor: pointer; border-radius: 6px; font: inherit; text-align: left;
  opacity: 0.55; transition: opacity 0.15s, background 0.15s;
}
.line-item:hover { background: rgba(0, 0, 0, 0.05); opacity: 0.85; }
.line-item.is-selected { opacity: 1; background: rgba(0, 0, 0, 0.08); font-weight: 600; }
.dot { width: 16px; height: 16px; border-radius: 50%; flex: 0 0 auto; }
</style>
```

- [ ] **Step 5: Créer `src/components/MapControls.vue`**

```vue
<script setup lang="ts">
defineProps<{
  showAllLabels: boolean
  showSelectedLineLabels: boolean
  hasSelection: boolean
}>()
const emit = defineEmits<{
  'update:showAllLabels': [v: boolean]
  'update:showSelectedLineLabels': [v: boolean]
  reset: []
}>()
</script>

<template>
  <div class="controls">
    <label>
      <input
        type="checkbox" data-test="toggle-all"
        :checked="showAllLabels"
        @change="emit('update:showAllLabels', ($event.target as HTMLInputElement).checked)"
      />
      Afficher tous les noms de stations
    </label>
    <label>
      <input
        type="checkbox" data-test="toggle-selected"
        :checked="showSelectedLineLabels"
        @change="emit('update:showSelectedLineLabels', ($event.target as HTMLInputElement).checked)"
      />
      Noms de la ligne sélectionnée
    </label>
    <button
      type="button" data-test="reset"
      :disabled="!hasSelection"
      @click="emit('reset')"
    >
      Réinitialiser la sélection
    </button>
  </div>
</template>

<style scoped>
.controls { display: flex; flex-direction: column; gap: 8px; }
label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
button { padding: 6px 10px; cursor: pointer; }
button:disabled { opacity: 0.4; cursor: default; }
</style>
```

- [ ] **Step 6: Lancer pour vérifier le succès**

Run: `npx vitest run src/components/LineLegend.spec.ts src/components/MapControls.spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/LineLegend.vue src/components/LineLegend.spec.ts src/components/MapControls.vue src/components/MapControls.spec.ts
git commit -m "feat: composants légende et contrôles"
```

---

## Task 9: Overlay HTML des noms de stations

**Files:**
- Create: `src/components/StationLabels.vue`, `src/components/StationLabels.spec.ts`

**Interfaces:**
- Consumes: `computeVisibleLabelStations` (Task 6), `StationProps` (Task 2), instance MapLibre `Map` (via prop).
- Produces: `StationLabels.vue` : props `{ map: Map | null; stations: Feature[]; selectedLineId: string | null; showAllLabels: boolean; showSelectedLineLabels: boolean }`. Rend un `<span class="station-label">` par station visible, positionné en pixels via `map.project()`. Recalcule les positions sur `move`/`zoom` (via `render`) et lors du changement des props.

- [ ] **Step 1: Écrire `src/components/StationLabels.spec.ts`**

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

  it('affiche les labels de la ligne sélectionnée', async () => {
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
})
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npx vitest run src/components/StationLabels.spec.ts`
Expected: FAIL (composant introuvable).

- [ ] **Step 3: Créer `src/components/StationLabels.vue`**

```vue
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { Feature, Point } from 'geojson'
import type { StationProps } from '../types'
import { computeVisibleLabelStations } from '../map/labels'

const props = defineProps<{
  map: MapLibreMap | null
  stations: Feature[]
  selectedLineId: string | null
  showAllLabels: boolean
  showSelectedLineLabels: boolean
}>()

// Compteur incrémenté à chaque frame pour forcer le recalcul des positions.
const tick = ref(0)

const visible = computed(() =>
  computeVisibleLabelStations(props.stations as { properties: StationProps }[], {
    selectedLineId: props.selectedLineId,
    showAllLabels: props.showAllLabels,
    showSelectedLineLabels: props.showSelectedLineLabels,
  }) as Feature[],
)

function positioned() {
  void tick.value // dépendance réactive
  const map = props.map
  if (!map) return []
  return visible.value.map((f) => {
    const [lng, lat] = (f.geometry as Point).coordinates
    const p = map.project([lng, lat])
    return {
      name: (f.properties as unknown as StationProps).name,
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

- [ ] **Step 4: Lancer pour vérifier le succès**

Run: `npx vitest run src/components/StationLabels.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/StationLabels.vue src/components/StationLabels.spec.ts
git commit -m "feat: overlay HTML des noms de stations"
```

---

## Task 10: Assemblage `MetroMap.vue` + `App.vue` + états chargement/erreur

**Files:**
- Create: `src/components/MetroMap.vue`
- Modify: `src/App.vue`
- Import CSS MapLibre dans `src/main.ts`

**Interfaces:**
- Consumes: tout le reste (composables Task 5/6/7, composants Task 8/9).
- Produces: application fonctionnelle de bout en bout.

- [ ] **Step 1: Importer le CSS MapLibre dans `src/main.ts`**

```ts
import { createApp } from 'vue'
import 'maplibre-gl/dist/maplibre-gl.css'
import App from './App.vue'

createApp(App).mount('#app')
```

- [ ] **Step 2: Créer `src/components/MetroMap.vue`**

```vue
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { Feature, FeatureCollection } from 'geojson'
import { useMapController } from '../composables/useMapController'
import StationLabels from './StationLabels.vue'

const props = defineProps<{
  lines: FeatureCollection
  stations: FeatureCollection
  arrondissements: FeatureCollection
  selectedLineId: string | null
  showAllLabels: boolean
  showSelectedLineLabels: boolean
}>()
const emit = defineEmits<{ selectLine: [id: string]; backgroundClick: [] }>()

const container = ref<HTMLElement | null>(null)
const mapRef = ref<MapLibreMap | null>(null)
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
  controller.onLineClick((id) => emit('selectLine', id))
  controller.onBackgroundClick(() => emit('backgroundClick'))
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
      :stations="(props.stations.features as Feature[])"
      :selected-line-id="selectedLineId"
      :show-all-labels="showAllLabels"
      :show-selected-line-labels="showSelectedLineLabels"
    />
  </div>
</template>

<style scoped>
.map-wrap { position: relative; width: 100%; height: 100%; }
.map { position: absolute; inset: 0; }
</style>
```

- [ ] **Step 3: Remplacer `src/App.vue`**

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useMetroData } from './composables/useMetroData'
import { useMapState } from './composables/useMapState'
import MetroMap from './components/MetroMap.vue'
import LineLegend from './components/LineLegend.vue'
import MapControls from './components/MapControls.vue'

const data = useMetroData()
const state = useMapState()

onMounted(() => data.load())
</script>

<template>
  <div class="app">
    <aside class="panel">
      <h1>Métro de Paris</h1>
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
    </aside>

    <section class="stage">
      <p v-if="data.loading.value" class="status">Chargement du réseau…</p>
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
        @select-line="state.selectLine"
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
.panel {
  width: 280px; flex: 0 0 auto; padding: 16px;
  overflow-y: auto; border-right: 1px solid #e5e3dc; background: #fafaf8;
}
.panel h1 { font-size: 18px; margin: 0 0 16px; }
.stage { position: relative; flex: 1 1 auto; }
.status { padding: 24px; font-size: 15px; }
.status.error { color: #b00020; }
</style>
```

- [ ] **Step 4: Vérifier compilation, tests, build**

Run: `npx vue-tsc --noEmit && npm test && npm run build`
Expected: 0 erreur TS, tous les tests PASS, build réussi.

- [ ] **Step 5: Vérification manuelle dans le navigateur**

Run: `npm run dev` puis ouvrir l'URL affichée.
Expected (vérifier chaque point) :
1. La carte s'affiche centrée sur Paris avec les tracés colorés des 16 lignes sur fond clair.
2. Cliquer une ligne dans la légende → cette ligne ressort, les autres s'estompent ; ses noms de stations apparaissent.
3. Cliquer un tracé sur la carte → même surbrillance ; la légende reflète la sélection.
4. Cocher « Afficher tous les noms » → tous les noms de stations s'affichent.
5. « Réinitialiser » (ou clic sur le fond) → retour à l'état neutre.
6. Zoom/déplacement → les noms suivent leurs stations.

- [ ] **Step 6: Commit**

```bash
git add src/main.ts src/components/MetroMap.vue src/App.vue
git commit -m "feat: assemblage carte, panneau, états chargement/erreur"
```

---

## Task 11: Message WebGL non supporté + README

**Files:**
- Modify: `src/App.vue` (garde WebGL)
- Create: `README.md`

**Interfaces:**
- Consumes: MapLibre `supported()`.
- Produces: message clair si WebGL indisponible ; documentation d'installation et de mise à jour des données.

- [ ] **Step 1: Ajouter la garde WebGL dans `src/App.vue`**

Dans `<script setup>`, ajouter l'import et le calcul :

```ts
import maplibregl from 'maplibre-gl'
const webglSupported = maplibregl.supported()
```

Dans le `<template>`, remplacer le bloc `<section class="stage">` par une version qui court-circuite si WebGL manque :

```vue
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
        @select-line="state.selectLine"
        @background-click="state.reset"
      />
    </section>
```

- [ ] **Step 2: Créer `README.md`**

```markdown
# Métro de Paris — carte interactive

Carte web des tracés géographiques réels des 16 lignes du métro parisien
(1–14, 3bis, 7bis), pour apprendre le réseau : surbrillance d'une ligne au
clic, affichage/masquage des noms de stations.

## Stack

Vue 3 + Vite + TypeScript, MapLibre GL JS. Données open data IDFM / Ville de
Paris, bundlées dans `public/data/` (aucun appel réseau au runtime).

## Développement

```bash
npm install
npm run dev      # serveur de dev
npm test         # tests unitaires (Vitest)
npm run build    # build de production
```

## Mise à jour des données

Les fichiers de `public/data/` sont générés (et commités). Pour les régénérer
depuis les sources open data :

```bash
npm run data:prep
```

Sources :
- Tracés & stations : Open Data Île-de-France Mobilités
- Fond de plan : Open Data Ville de Paris (arrondissements)
```

- [ ] **Step 3: Vérifier compilation et build**

Run: `npx vue-tsc --noEmit && npm run build`
Expected: 0 erreur, build réussi.

- [ ] **Step 4: Commit**

```bash
git add src/App.vue README.md
git commit -m "feat: garde WebGL et documentation"
```

---

## Notes de mise en œuvre

- **`maplibregl.supported()`** : selon la version de MapLibre, cette API peut être exposée différemment. Si `supported()` n'existe pas sur le namespace importé dans la version installée, remplacer la garde par un simple test de contexte WebGL (`!!document.createElement('canvas').getContext('webgl')`) — l'objectif (message clair sans crash) reste le même.
- **Compte de lignes** : si `npm run data:prep` ne renvoie pas exactement 16 lignes, inspecter les valeurs distinctes de `indice_lig` renvoyées par la source pour ajuster `normalizeLineId` (Task 3) — ne pas coder en dur une liste de features.
- **Performance des labels** : afficher les ~300 noms simultanément (toggle « tous les noms ») crée ~300 nœuds DOM repositionnés à chaque frame de déplacement. Si des saccades apparaissent, throttler `onRender` via `requestAnimationFrame` (un seul recalcul par frame) — l'API du composant `StationLabels` ne change pas.
```
