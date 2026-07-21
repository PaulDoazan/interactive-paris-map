import { describe, it, expect } from 'vitest'
import type { Feature, Point } from 'geojson'
import type { StationProps } from '../types'
import { stationKey } from './stationKey'

function feat(lng: number, lat: number, name = 'X'): Feature<Point, StationProps> {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: { name, lineIds: ['1'] },
  }
}

describe('stationKey', () => {
  it('dérive une clé "lng,lat" depuis les coordonnées', () => {
    expect(stationKey(feat(2.35, 48.85))).toBe('2.35,48.85')
  })

  it('est déterministe et distingue des coordonnées différentes', () => {
    expect(stationKey(feat(2.3, 48.8))).toBe('2.3,48.8')
    expect(stationKey(feat(2.3, 48.8))).not.toBe(stationKey(feat(2.31, 48.8)))
  })
})
