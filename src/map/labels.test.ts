import { describe, it, expect } from 'vitest'
import { computeVisibleLabelStations } from './labels'

const stations = [
  { properties: { id: 'Z1', name: 'A', lineIds: ['1', '5'] } },
  { properties: { id: 'Z2', name: 'B', lineIds: ['4'] } },
  { properties: { id: 'Z3', name: 'C', lineIds: ['5'] } },
]

describe('computeVisibleLabelStations', () => {
  it('rien par défaut (aucun toggle, aucune sélection)', () => {
    const out = computeVisibleLabelStations(stations, {
      selectedLineId: null, showAllLabels: false, showSelectedLineLabels: true,
    })
    expect(out).toEqual([])
  })

  it('tout si showAllLabels', () => {
    const out = computeVisibleLabelStations(stations, {
      selectedLineId: '4', showAllLabels: true, showSelectedLineLabels: true,
    })
    expect(out).toHaveLength(3)
  })

  it('seulement la ligne sélectionnée si showSelectedLineLabels', () => {
    const out = computeVisibleLabelStations(stations, {
      selectedLineId: '5', showAllLabels: false, showSelectedLineLabels: true,
    })
    expect(out.map((s) => s.properties.name)).toEqual(['A', 'C'])
  })

  it('rien si sélection mais showSelectedLineLabels off', () => {
    const out = computeVisibleLabelStations(stations, {
      selectedLineId: '5', showAllLabels: false, showSelectedLineLabels: false,
    })
    expect(out).toEqual([])
  })
})
