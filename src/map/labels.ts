import type { StationProps } from '../types'

export interface LabelOptions {
  selectedLineId: string | null
  showAllLabels: boolean
  showSelectedLineLabels: boolean
}

export function computeVisibleLabelStations<T extends { properties: StationProps }>(
  stations: T[],
  opts: LabelOptions,
): T[] {
  if (opts.showAllLabels) return stations
  if (opts.showSelectedLineLabels && opts.selectedLineId !== null) {
    const id = opts.selectedLineId
    return stations.filter((s) => s.properties.lineIds.includes(id))
  }
  return []
}
