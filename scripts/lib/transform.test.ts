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
      geometry: { type: 'Point', coordinates: [2.351, 48.851] },
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
    expect(bastille.properties.id).toBe('Z1')
    const lb = out.features.find((f) => f.properties.name === 'Louis Blanc')!
    expect(lb.properties.lineIds).toEqual(['7bis'])
    expect(lb.properties.id).toBe('Z2')
  })

  it('préserve la géométrie du premier point rencontré', () => {
    const out = buildStationsCollection(stationFC as any)
    const bastille = out.features.find((f) => f.properties.name === 'Bastille')!
    // Bastille first entry has coords [2.35, 48.85], second has [2.351, 48.851]
    // Should keep the first one
    expect(bastille.geometry).toEqual({ type: 'Point', coordinates: [2.35, 48.85] })
  })

  it('trie les lineIds en ordre métro canonique même si désordonné en entrée', () => {
    // Create fixture where line 5 appears BEFORE line 1 at same station
    const outOfOrderFC = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [2.40, 48.90] },
          properties: { mode: 'METRO', indice_lig: '5', nom_gares: 'Test', id_ref_zdc: 'Z99' },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [2.40, 48.90] },
          properties: { mode: 'METRO', indice_lig: '1', nom_gares: 'Test', id_ref_zdc: 'Z99' },
        },
      ],
    }
    const out = buildStationsCollection(outOfOrderFC as any)
    const station = out.features[0]
    // Lines added as [5, 1], but should be sorted to [1, 5] by canonical order
    expect(station.properties.lineIds).toEqual(['1', '5'])
  })
})

describe('buildLinesMeta', () => {
  it('produit une meta par ligne, triée par ordre métro', () => {
    const lines = filterMetroLineFeatures(lineFC as any)
    const meta = buildLinesMeta(lines)
    expect(meta.map((m) => m.id)).toEqual(['1', '7bis'])
    expect(meta[0]).toMatchObject({ id: '1', name: 'Ligne 1', color: '#FFCD00', order: 0 })
  })

  it('trie par ordre métro canonique même si les lignes arrivent désordonnées', () => {
    // Create features in reverse order: 7bis then 1
    const reversedFC = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[2.30, 48.80], [2.31, 48.81]] },
          properties: { mode: 'METRO', indice_lig: '7B', colourweb_hexa: '' },
        },
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[2.35, 48.85], [2.36, 48.86]] },
          properties: { mode: 'METRO', indice_lig: '1', colourweb_hexa: 'FFCD00' },
        },
      ],
    }
    const lines = filterMetroLineFeatures(reversedFC as any)
    const meta = buildLinesMeta(lines)
    // Should be sorted to [1, 7bis] despite arriving [7bis, 1]
    expect(meta.map((m) => m.id)).toEqual(['1', '7bis'])
    // order field reflects position in sorted result
    expect(meta[0].order).toBe(0) // line 1 is first in sorted result
    expect(meta[1].order).toBe(1) // line 7bis is second in sorted result
  })
})
