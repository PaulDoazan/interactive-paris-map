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
