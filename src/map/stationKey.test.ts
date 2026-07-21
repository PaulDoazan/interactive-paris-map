import { describe, it, expect } from 'vitest'
import type { Feature, Point } from 'geojson'
import type { StationProps } from '../types'
import { stationKey } from './stationKey'

function feat(id: string): Feature<Point, StationProps> {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [2.35, 48.85] },
    properties: { id, name: 'X', lineIds: ['1'] },
  }
}

describe('stationKey', () => {
  it('retourne l’id stable de la station', () => {
    expect(stationKey(feat('Z1'))).toBe('Z1')
  })

  it('distingue des stations différentes', () => {
    expect(stationKey(feat('Z1'))).not.toBe(stationKey(feat('Z2')))
  })
})
