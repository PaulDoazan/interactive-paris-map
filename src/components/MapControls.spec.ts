import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MapControls from './MapControls.vue'

const base = { showAllLabels: false, showSelectedLineLabels: true, hasSelection: false }

describe('MapControls', () => {
  it('émet update:showAllLabels au toggle', async () => {
    const w = mount(MapControls, { props: base })
    await w.get('[data-test=toggle-all]').setValue(true)
    expect(w.emitted('update:showAllLabels')?.[0]).toEqual([true])
  })

  it('émet reset au clic du bouton', async () => {
    const w = mount(MapControls, { props: { ...base, hasSelection: true } })
    await w.get('[data-test=reset]').trigger('click')
    expect(w.emitted('reset')).toHaveLength(1)
  })
})
