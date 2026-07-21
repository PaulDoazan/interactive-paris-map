import { ref, type Ref } from 'vue'

export interface MapState {
  selectedLineId: Ref<string | null>
  showAllLabels: Ref<boolean>
  showSelectedLineLabels: Ref<boolean>
  selectLine: (id: string) => void
  reset: () => void
}

export function useMapState(): MapState {
  const selectedLineId = ref<string | null>(null)
  const showAllLabels = ref(false)
  const showSelectedLineLabels = ref(true)

  function selectLine(id: string): void {
    selectedLineId.value = selectedLineId.value === id ? null : id
  }

  function reset(): void {
    selectedLineId.value = null
  }

  return { selectedLineId, showAllLabels, showSelectedLineLabels, selectLine, reset }
}
