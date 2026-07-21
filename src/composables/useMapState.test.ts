import { describe, it, expect } from 'vitest'
import { useMapState } from './useMapState'

describe('useMapState', () => {
  it('sélectionne une ligne', () => {
    const s = useMapState()
    s.selectLine('4')
    expect(s.selectedLineId.value).toBe('4')
  })

  it('re-cliquer la ligne active la désélectionne', () => {
    const s = useMapState()
    s.selectLine('4')
    s.selectLine('4')
    expect(s.selectedLineId.value).toBeNull()
  })

  it('valeurs par défaut des toggles et des pins', () => {
    const s = useMapState()
    expect(s.showAllLabels.value).toBe(false)
    expect(s.showSelectedLineLabels.value).toBe(true)
    expect(s.pinnedStations.value.size).toBe(0)
  })

  it('toggleStation ajoute puis retire une clé', () => {
    const s = useMapState()
    s.toggleStation('2.35,48.85')
    expect(s.pinnedStations.value.has('2.35,48.85')).toBe(true)
    s.toggleStation('2.35,48.85')
    expect(s.pinnedStations.value.has('2.35,48.85')).toBe(false)
  })

  it('toggleStation gère plusieurs stations indépendamment', () => {
    const s = useMapState()
    s.toggleStation('a')
    s.toggleStation('b')
    expect(s.pinnedStations.value.size).toBe(2)
    s.toggleStation('a')
    expect([...s.pinnedStations.value]).toEqual(['b'])
  })

  it('reset efface la sélection ET les pins', () => {
    const s = useMapState()
    s.selectLine('4')
    s.toggleStation('a')
    s.reset()
    expect(s.selectedLineId.value).toBeNull()
    expect(s.pinnedStations.value.size).toBe(0)
  })
})
