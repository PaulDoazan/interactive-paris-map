import type { Feature, FeatureCollection, Point, Geometry } from 'geojson'
import { getLineColor } from '../../src/data/lineColors'
import type { LineMeta, LineProps, StationProps } from '../../src/types'
import { normalizeLineId } from './normalize'

// Ordre d'affichage canonique des lignes de métro.
const LINE_ORDER = ['1','2','3','3bis','4','5','6','7','7bis','8','9','10','11','12','13','14']

function orderIndex(lineId: string): number {
  const i = LINE_ORDER.indexOf(lineId)
  return i === -1 ? LINE_ORDER.length : i
}

export function filterMetroLineFeatures(fc: FeatureCollection): Feature<Geometry, LineProps>[] {
  return fc.features
    .filter((f) => f.properties?.mode === 'METRO')
    .map((f) => {
      const lineId = normalizeLineId(String(f.properties!.indice_lig))
      const color = getLineColor(lineId, f.properties!.colourweb_hexa as string | undefined)
      const props: LineProps = { lineId, color }
      return { type: 'Feature', geometry: f.geometry, properties: props } as Feature<Geometry, LineProps>
    })
}

export function buildStationsCollection(fc: FeatureCollection): FeatureCollection<Point, StationProps> {
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
  const features: Feature<Point, StationProps>[] = [...byZone.values()].map((s) => {
    const props: StationProps = {
      name: s.name,
      lineIds: [...s.lineIds].sort((a, b) => orderIndex(a) - orderIndex(b)),
    }
    return { type: 'Feature', geometry: s.geometry, properties: props } as Feature<Point, StationProps>
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
