import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useMetroData } from './useMetroData'

const fc = { type: 'FeatureCollection', features: [] }
const meta = [{ id: '1', name: 'Ligne 1', color: '#FFCD00', order: 0 }]

function mockFetchOk() {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    ok: true,
    json: async () => (url.endsWith('lines.json') ? meta : fc),
  })))
}

describe('useMetroData', () => {
  beforeEach(() => vi.unstubAllGlobals())

  it('charge les données et bascule loading', async () => {
    mockFetchOk()
    const d = useMetroData()
    expect(d.loading.value).toBe(false)
    const p = d.load()
    expect(d.loading.value).toBe(true)
    await p
    expect(d.loading.value).toBe(false)
    expect(d.error.value).toBeNull()
    expect(d.linesMeta.value).toEqual(meta)
    expect(d.lines.value).toEqual(fc)
  })

  it('remonte une erreur si un fetch échoue', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })))
    const d = useMetroData()
    await d.load()
    expect(d.error.value).toMatch(/500|données/i)
    expect(d.loading.value).toBe(false)
  })
})
