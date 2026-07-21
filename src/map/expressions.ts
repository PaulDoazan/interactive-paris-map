export function baseLineOpacity(selectedLineId: string | null): number {
  return selectedLineId === null ? 1 : 0.15
}

export function highlightFilter(selectedLineId: string | null): unknown[] {
  return ['==', ['get', 'lineId'], selectedLineId ?? '__none__']
}

export function stationHighlightFilter(selectedLineId: string | null): unknown[] {
  return ['in', selectedLineId ?? '__none__', ['get', 'lineIds']]
}
