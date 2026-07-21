import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Feature, Point } from 'geojson'
import type { StationProps } from '../types'
import StationLabels from './StationLabels.vue'

const stations: Feature<Point, StationProps>[] = [
  { type: 'Feature', geometry: { type: 'Point', coordinates: [2.35, 48.85] },
    properties: { name: 'Bastille', lineIds: ['1', '5'] } },
  { type: 'Feature', geometry: { type: 'Point', coordinates: [2.33, 48.86] },
    properties: { name: 'Opéra', lineIds: ['3'] } },
]

// Fausse instance MapLibre : project renvoie une position fixe, on/off no-op.
const fakeMap = {
  project: () => ({ x: 10, y: 20 }),
  on: () => {},
  off: () => {},
} as any

describe('StationLabels', () => {
  it('n\'affiche aucun label par défaut', () => {
    const w = mount(StationLabels, {
      props: { map: fakeMap, stations, selectedLineId: null,
        showAllLabels: false, showSelectedLineLabels: true },
    })
    expect(w.findAll('.station-label')).toHaveLength(0)
  })

  it('affiche les labels de la ligne sélectionnée', async () => {
    const w = mount(StationLabels, {
      props: { map: fakeMap, stations, selectedLineId: '5',
        showAllLabels: false, showSelectedLineLabels: true },
    })
    const labels = w.findAll('.station-label')
    expect(labels).toHaveLength(1)
    expect(labels[0].text()).toBe('Bastille')
  })

  it('affiche tous les labels si showAllLabels', () => {
    const w = mount(StationLabels, {
      props: { map: fakeMap, stations, selectedLineId: null,
        showAllLabels: true, showSelectedLineLabels: false },
    })
    expect(w.findAll('.station-label')).toHaveLength(2)
  })
})
