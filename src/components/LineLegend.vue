<script setup lang="ts">
import type { LineMeta } from '../types'

defineProps<{ lines: LineMeta[]; selectedLineId: string | null }>()
const emit = defineEmits<{ select: [id: string] }>()
</script>

<template>
  <nav class="legend" aria-label="Lignes de métro">
    <button
      v-for="line in lines"
      :key="line.id"
      type="button"
      class="line-item"
      :class="{ 'is-selected': line.id === selectedLineId }"
      @click="emit('select', line.id)"
    >
      <span class="dot" :style="{ backgroundColor: line.color }" aria-hidden="true" />
      <span class="label">{{ line.name }}</span>
    </button>
  </nav>
</template>

<style scoped>
.legend { display: flex; flex-direction: column; gap: 2px; }
.line-item {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 8px; border: none; background: transparent;
  cursor: pointer; border-radius: 6px; font: inherit; text-align: left;
  opacity: 0.55; transition: opacity 0.15s, background 0.15s;
}
.line-item:hover { background: rgba(0, 0, 0, 0.05); opacity: 0.85; }
.line-item.is-selected { opacity: 1; background: rgba(0, 0, 0, 0.08); font-weight: 600; }
.dot { width: 16px; height: 16px; border-radius: 50%; flex: 0 0 auto; }
</style>
