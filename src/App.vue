<script setup lang="ts">
import { onMounted } from 'vue'
import { useMetroData } from './composables/useMetroData'
import { useMapState } from './composables/useMapState'
import MetroMap from './components/MetroMap.vue'
import LineLegend from './components/LineLegend.vue'
import MapControls from './components/MapControls.vue'
import PanelSheet from './components/PanelSheet.vue'

const data = useMetroData()
const state = useMapState()

function detectWebgl(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
  } catch {
    return false
  }
}

const webglSupported = detectWebgl()

onMounted(() => data.load())
</script>

<template>
  <div class="app">
    <PanelSheet title="Métro de Paris">
      <MapControls
        :show-all-labels="state.showAllLabels.value"
        :show-selected-line-labels="state.showSelectedLineLabels.value"
        :has-selection="state.selectedLineId.value !== null"
        @update:show-all-labels="state.showAllLabels.value = $event"
        @update:show-selected-line-labels="state.showSelectedLineLabels.value = $event"
        @reset="state.reset"
      />
      <LineLegend
        :lines="data.linesMeta.value"
        :selected-line-id="state.selectedLineId.value"
        @select="state.selectLine"
      />
    </PanelSheet>

    <section class="stage">
      <p v-if="!webglSupported" class="status error">
        Votre navigateur ne supporte pas WebGL, nécessaire à l'affichage de la carte.
      </p>
      <p v-else-if="data.loading.value" class="status">Chargement du réseau…</p>
      <p v-else-if="data.error.value" class="status error">
        Erreur : {{ data.error.value }}
      </p>
      <MetroMap
        v-else-if="data.lines.value && data.stations.value && data.arrondissements.value"
        :lines="data.lines.value"
        :stations="data.stations.value"
        :arrondissements="data.arrondissements.value"
        :selected-line-id="state.selectedLineId.value"
        :show-all-labels="state.showAllLabels.value"
        :show-selected-line-labels="state.showSelectedLineLabels.value"
        :pinned-keys="state.pinnedStations.value"
        @select-line="state.selectLine"
        @toggle-station="state.toggleStation"
        @background-click="state.reset"
      />
    </section>
  </div>
</template>

<style>
html, body, #app { height: 100%; margin: 0; }
body { font-family: system-ui, -apple-system, sans-serif; }
</style>

<style scoped>
.app { display: flex; height: 100%; }
.stage { position: relative; flex: 1 1 auto; }
.status { padding: 24px; font-size: 15px; }
.status.error { color: #b00020; }

/* Mobile : carte plein écran, la feuille (PanelSheet) se superpose. */
@media (max-width: 767px) {
  .app { display: block; position: relative; }
  .stage { position: absolute; inset: 0; }
}
</style>
