import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LineLegend from './LineLegend.vue'

const lines = [
  { id: '1', name: 'Ligne 1', color: '#FFCD00', order: 0 },
  { id: '2', name: 'Ligne 2', color: '#003CA6', order: 1 },
]

describe('LineLegend', () => {
  it('rend un bouton par ligne', () => {
    const w = mount(LineLegend, { props: { lines, selectedLineId: null } })
    expect(w.findAll('button.line-item')).toHaveLength(2)
  })

  it('émet select au clic', async () => {
    const w = mount(LineLegend, { props: { lines, selectedLineId: null } })
    await w.findAll('button.line-item')[1].trigger('click')
    expect(w.emitted('select')?.[0]).toEqual(['2'])
  })

  it('marque la ligne sélectionnée', () => {
    const w = mount(LineLegend, { props: { lines, selectedLineId: '2' } })
    const items = w.findAll('button.line-item')
    expect(items[1].classes()).toContain('is-selected')
    expect(items[0].classes()).not.toContain('is-selected')
  })
})
