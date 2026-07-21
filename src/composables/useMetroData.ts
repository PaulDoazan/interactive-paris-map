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
