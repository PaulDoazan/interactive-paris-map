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
