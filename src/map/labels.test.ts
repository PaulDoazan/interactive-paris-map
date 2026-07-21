import { describe, it, expect } from 'vitest'
import { computeVisibleLabelStations } from './labels'

const stations = [
  { properties: { id: 'A', name: 'A', lineIds: ['1', '5'] } },
  { properties: { id: 'B', name: 'B', lineIds: ['4'] } },
  { properties: { id: 'C', name: 'C', lineIds: ['5'] } },
]
const keyOf = (s: { properties: { id: string } }) => s.properties.id
const noPins = new Set<string>()

describe('computeVisibleLabelStations', () => {
  it('rien par défaut (aucun toggle, aucune sélection, aucun pin)', () => {
    const out = computeVisibleLabelStations(stations, keyOf, {
      selectedLineId: null, showAllLabels: false, showSelectedLineLabels: true, pinnedKeys: noPins,
    })
    expect(out).toEqual([])
  })

  it('tout si showAllLabels', () => {
    const out = computeVisibleLabelStations(stations, keyOf, {
      selectedLineId: '4', showAllLabels: true, showSelectedLineLabels: true, pinnedKeys: noPins,
    })
    expect(out).toHaveLength(3)
  })

  it('seulement la ligne sélectionnée si showSelectedLineLabels', () => {
    const out = computeVisibleLabelStations(stations, keyOf, {
      selectedLineId: '5', showAllLabels: false, showSelectedLineLabels: true, pinnedKeys: noPins,
    })
    expect(out.map((s) => s.properties.name)).toEqual(['A', 'C'])
  })

  it('rien si sélection mais showSelectedLineLabels off', () => {
    const out = computeVisibleLabelStations(stations, keyOf, {
      selectedLineId: '5', showAllLabels: false, showSelectedLineLabels: false, pinnedKeys: noPins,
    })
    expect(out).toEqual([])
  })

  it('affiche une station épinglée sans sélection ni toggle', () => {
    const out = computeVisibleLabelStations(stations, keyOf, {
      selectedLineId: null, showAllLabels: false, showSelectedLineLabels: true,
      pinnedKeys: new Set(['B']),
    })
    expect(out.map((s) => s.properties.name)).toEqual(['B'])
  })

  it('union sélection + pins sans doublon et en ordre source stable', () => {
    // ligne 5 -> A, C ; pins A (déjà là) + B -> A, B, C
    const out = computeVisibleLabelStations(stations, keyOf, {
      selectedLineId: '5', showAllLabels: false, showSelectedLineLabels: true,
      pinnedKeys: new Set(['A', 'B']),
    })
    expect(out.map((s) => s.properties.name)).toEqual(['A', 'B', 'C'])
  })
})
