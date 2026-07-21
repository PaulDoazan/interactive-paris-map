import type { Feature, Point } from 'geojson'
import type { StationProps } from '../types'

// Identité stable d'une station, dérivée de ses coordonnées géographiques.
export function stationKey(f: Feature<Point, StationProps>): string {
  const [lng, lat] = f.geometry.coordinates
  return `${lng},${lat}`
}
