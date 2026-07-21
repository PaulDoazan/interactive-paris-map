import { describe, it, expect } from 'vitest'
import { RATP_LINE_COLORS, getLineColor } from './lineColors'

describe('RATP_LINE_COLORS', () => {
  it('couvre les 16 lignes canoniques', () => {
    const ids = ['1','2','3','3bis','4','5','6','7','7bis','8','9','10','11','12','13','14']
    for (const id of ids) {
      expect(RATP_LINE_COLORS[id]).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })
})

describe('getLineColor', () => {
  it('préfixe # à une couleur source sans dièse', () => {
    expect(getLineColor('1', 'FFCD00')).toBe('#FFCD00')
  })

  it('conserve une couleur source avec dièse', () => {
    expect(getLineColor('1', '#abcabc')).toBe('#abcabc')
  })

  it('retombe sur le mapping RATP si pas de couleur source', () => {
    expect(getLineColor('2')).toBe(RATP_LINE_COLORS['2'])
  })

  it('retombe sur gris pour une ligne inconnue sans source', () => {
    expect(getLineColor('99')).toBe('#8c8c8c')
  })

  it('ignore une source vide', () => {
    expect(getLineColor('2', '')).toBe(RATP_LINE_COLORS['2'])
  })
})
