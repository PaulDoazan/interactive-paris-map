<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { Feature, FeatureCollection, Point } from 'geojson'
import type { StationProps } from '../types'
import { useMapController } from '../composables/useMapController'
import StationLabels from './StationLabels.vue'

const props = withDefaults(
  defineProps<{
    lines: FeatureCollection
    stations: FeatureCollection
    arrondissements: FeatureCollection
    selectedLineId: string | null
    showAllLabels: boolean
    showSelectedLineLabels: boolean
    pinnedKeys?: Set<string>
  }>(),
  {
    pinnedKeys: () => new Set<string>(),
  },
)
const emit = defineEmits<{
  selectLine: [id: string]
  backgroundClick: []
  toggleStation: [key: string]
}>()

const container = ref<HTMLElement | null>(null)
const mapRef = shallowRef<MapLibreMap | null>(null)
const controller = useMapController()

onMounted(() => {
  if (!container.value) return
  controller.mount(container.value, {
    lines: props.lines,
    stations: props.stations,
    arrondissements: props.arrondissements,
  })
  const map = controller.getMap()
  map?.on('load', () => {
    controller.applySelection(props.selectedLineId)
    mapRef.value = map
  })
  controller.onMapClick({
    station: (key) => emit('toggleStation', key),
    line: (id) => emit('selectLine', id),
    background: () => emit('backgroundClick'),
  })
})

watch(
  () => props.selectedLineId,
  (id) => controller.applySelection(id),
)

onBeforeUnmount(() => controller.destroy())
</script>

<template>
  <div class="map-wrap">
    <div ref="container" class="map" />
    <StationLabels
      :map="mapRef"
      :stations="(props.stations.features as Feature<Point, StationProps>[])"
      :selected-line-id="selectedLineId"
      :show-all-labels="showAllLabels"
      :show-selected-line-labels="showSelectedLineLabels"
      :pinned-keys="pinnedKeys"
    />
  </div>
</template>

<style scoped>
.map-wrap { position: relative; width: 100%; height: 100%; }
.map { position: absolute; inset: 0; }
</style>
