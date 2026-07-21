<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { Feature, Point } from 'geojson'
import type { StationProps } from '../types'
import { computeVisibleLabelStations } from '../map/labels'

const props = defineProps<{
  map: MapLibreMap | null
  stations: Feature<Point, StationProps>[]
  selectedLineId: string | null
  showAllLabels: boolean
  showSelectedLineLabels: boolean
}>()

// Compteur incrémenté à chaque frame pour forcer le recalcul des positions.
const tick = ref(0)

const visible = computed(() =>
  computeVisibleLabelStations(props.stations, {
    selectedLineId: props.selectedLineId,
    showAllLabels: props.showAllLabels,
    showSelectedLineLabels: props.showSelectedLineLabels,
  }),
)

function positioned() {
  void tick.value // dépendance réactive
  const map = props.map
  if (!map) return []
  return visible.value.map((f) => {
    const [lng, lat] = (f.geometry as Point).coordinates
    const p = map.project([lng, lat])
    return {
      name: f.properties.name,
      x: p.x,
      y: p.y,
    }
  })
}

const labels = computed(() => positioned())

function onRender() {
  tick.value++
}

watch(
  () => props.map,
  (map, _old, onCleanup) => {
    if (!map) return
    map.on('render', onRender)
    onCleanup(() => map.off('render', onRender))
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  props.map?.off('render', onRender)
})
</script>

<template>
  <div class="labels-layer">
    <span
      v-for="l in labels"
      :key="l.name"
      class="station-label"
      :style="{ transform: `translate(${l.x}px, ${l.y}px)` }"
    >{{ l.name }}</span>
  </div>
</template>

<style scoped>
.labels-layer {
  position: absolute; inset: 0; pointer-events: none; overflow: hidden;
}
.station-label {
  position: absolute; top: 0; left: 0;
  margin: 4px 0 0 6px;
  font-size: 11px; line-height: 1;
  color: #1a1a1a; white-space: nowrap;
  text-shadow: 0 0 2px #fff, 0 0 2px #fff, 0 0 2px #fff;
}
</style>
