import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PanelSheet from './PanelSheet.vue'

describe('PanelSheet', () => {
  it('rend le titre et le contenu du slot', () => {
    const w = mount(PanelSheet, {
      props: { title: 'Métro de Paris' },
      slots: { default: '<p class="slotted">contenu</p>' },
    })
    expect(w.text()).toContain('Métro de Paris')
    expect(w.find('.slotted').exists()).toBe(true)
  })

  it('est fermé par défaut et bascule is-open au clic sur la poignée', async () => {
    const w = mount(PanelSheet, { props: { title: 'T' } })
    expect(w.find('.panel').classes()).not.toContain('is-open')
    await w.find('.sheet-handle').trigger('click')
    expect(w.find('.panel').classes()).toContain('is-open')
    await w.find('.sheet-handle').trigger('click')
    expect(w.find('.panel').classes()).not.toContain('is-open')
  })
})
