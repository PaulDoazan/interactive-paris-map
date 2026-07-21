export function normalizeLineId(indiceLig: string): string {
  const v = indiceLig.trim()
  const m = /^(\d+)\s*(b|bis)$/i.exec(v)
  if (m) return `${m[1]}bis`
  return v
}
