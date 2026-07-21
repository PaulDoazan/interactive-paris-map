import type { StationProps } from '../types'

export interface LabelOptions {
  selectedLineId: string | null
  showAllLabels: boolean
  showSelectedLineLabels: boolean
  pinnedKeys: Set<string>
}

// Union (sans doublon, ordre source) : labels décidés par les filtres ∪ stations épinglées.
export function computeVisibleLabelStations<T extends { properties: StationProps }>(
  stations: T[],
  keyOf: (s: T) => string,
  opts: LabelOptions,
): T[] {
  return stations.filter((s) => {
    if (opts.showAllLabels) return true
    if (opts.pinnedKeys.has(keyOf(s))) return true
    if (opts.showSelectedLineLabels && opts.selectedLineId !== null) {
      return s.properties.lineIds.includes(opts.selectedLineId)
    }
    return false
  })
}
