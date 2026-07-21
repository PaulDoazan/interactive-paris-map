<script setup lang="ts">
defineProps<{
  showAllLabels: boolean
  showSelectedLineLabels: boolean
  hasSelection: boolean
}>()
const emit = defineEmits<{
  'update:showAllLabels': [v: boolean]
  'update:showSelectedLineLabels': [v: boolean]
  reset: []
}>()
</script>

<template>
  <div class="controls">
    <label>
      <input
        type="checkbox" data-test="toggle-all"
        :checked="showAllLabels"
        @change="emit('update:showAllLabels', ($event.target as HTMLInputElement).checked)"
      />
      Afficher tous les noms de stations
    </label>
    <label>
      <input
        type="checkbox" data-test="toggle-selected"
        :checked="showSelectedLineLabels"
        @change="emit('update:showSelectedLineLabels', ($event.target as HTMLInputElement).checked)"
      />
      Noms de la ligne sélectionnée
    </label>
    <button
      type="button" data-test="reset"
      :disabled="!hasSelection"
      @click="emit('reset')"
    >
      Réinitialiser la sélection
    </button>
  </div>
</template>

<style scoped>
.controls { display: flex; flex-direction: column; gap: 8px; }
label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
button { padding: 6px 10px; cursor: pointer; }
button:disabled { opacity: 0.4; cursor: default; }
</style>
