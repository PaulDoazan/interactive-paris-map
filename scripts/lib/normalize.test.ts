import { describe, it, expect } from 'vitest'
import { normalizeLineId } from './normalize'

describe('normalizeLineId', () => {
  it('laisse les lignes numériques intactes', () => {
    expect(normalizeLineId('1')).toBe('1')
    expect(normalizeLineId('14')).toBe('14')
  })

  it('normalise les variantes bis', () => {
    expect(normalizeLineId('3B')).toBe('3bis')
    expect(normalizeLineId('3bis')).toBe('3bis')
    expect(normalizeLineId('3BIS')).toBe('3bis')
    expect(normalizeLineId('7B')).toBe('7bis')
  })

  it('trim les espaces', () => {
    expect(normalizeLineId(' 4 ')).toBe('4')
  })
})
