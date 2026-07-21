import { describe, it, expect } from 'vitest'
import { baseLineOpacity, highlightFilter, stationHighlightFilter } from './expressions'

describe('baseLineOpacity', () => {
  it('pleine opacité sans sélection', () => {
    expect(baseLineOpacity(null)).toBe(1)
  })
  it('estompe quand une ligne est sélectionnée', () => {
    expect(baseLineOpacity('4')).toBe(0.15)
  })
})

describe('highlightFilter', () => {
  it('ne garde rien sans sélection', () => {
    expect(highlightFilter(null)).toEqual(['==', ['get', 'lineId'], '__none__'])
  })
  it('filtre sur la ligne sélectionnée', () => {
    expect(highlightFilter('7bis')).toEqual(['==', ['get', 'lineId'], '7bis'])
  })
})

describe('stationHighlightFilter', () => {
  it('ne garde rien sans sélection', () => {
    expect(stationHighlightFilter(null)).toEqual(['in', '__none__', ['get', 'lineIds']])
  })
  it('filtre les stations contenant la ligne', () => {
    expect(stationHighlightFilter('5')).toEqual(['in', '5', ['get', 'lineIds']])
  })
})
