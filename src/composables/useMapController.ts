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
