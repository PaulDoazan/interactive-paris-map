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
