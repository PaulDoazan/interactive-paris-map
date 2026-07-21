import type { Feature, Point } from 'geojson'
import type { StationProps } from '../types'

// Identité stable d'une station (id_ref_zdc), préservée à travers MapLibre :
// les propriétés ne sont pas quantifiées, contrairement aux géométries.
export function stationKey(f: Feature<Point, StationProps>): string {
  return f.properties.id
}
