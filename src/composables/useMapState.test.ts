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

  it('reset efface la sélection', () => {
    const s = useMapState()
    s.selectLine('4')
    s.reset()
    expect(s.selectedLineId.value).toBeNull()
  })

  it('valeurs par défaut des toggles', () => {
    const s = useMapState()
    expect(s.showAllLabels.value).toBe(false)
    expect(s.showSelectedLineLabels.value).toBe(true)
  })
})
