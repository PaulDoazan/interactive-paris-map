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
