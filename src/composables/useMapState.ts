import { ref, type Ref } from 'vue'

export interface MapState {
  selectedLineId: Ref<string | null>
  showAllLabels: Ref<boolean>
  showSelectedLineLabels: Ref<boolean>
  pinnedStations: Ref<Set<string>>
  selectLine: (id: string) => void
  toggleStation: (key: string) => void
  reset: () => void
}

export function useMapState(): MapState {
  const selectedLineId = ref<string | null>(null)
  const showAllLabels = ref(false)
  const showSelectedLineLabels = ref(true)
  const pinnedStations = ref<Set<string>>(new Set())

  function selectLine(id: string): void {
    selectedLineId.value = selectedLineId.value === id ? null : id
  }

  function toggleStation(key: string): void {
    // Réassigne un nouveau Set pour déclencher la réactivité.
    const next = new Set(pinnedStations.value)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    pinnedStations.value = next
  }

  function reset(): void {
    selectedLineId.value = null
    pinnedStations.value = new Set()
  }

  return {
    selectedLineId,
    showAllLabels,
    showSelectedLineLabels,
    pinnedStations,
    selectLine,
    toggleStation,
    reset,
  }
}
