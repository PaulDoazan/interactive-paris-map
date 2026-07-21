<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ title: string }>()

const open = ref(false)
</script>

<template>
  <aside class="panel" :class="{ 'is-open': open }">
    <button
      type="button"
      class="sheet-handle"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="grip" aria-hidden="true" />
      <span class="sheet-title">{{ title }}</span>
    </button>
    <div class="panel-content">
      <h1 class="panel-h1">{{ title }}</h1>
      <slot />
    </div>
  </aside>
</template>

<style scoped>
/* Desktop : sidebar classique. */
.panel {
  width: 280px;
  flex: 0 0 auto;
  padding: 16px;
  overflow-y: auto;
  border-right: 1px solid #e5e3dc;
  background: #fafaf8;
}
.panel-h1 { font-size: 18px; margin: 0 0 16px; }
.sheet-handle { display: none; }

/* Mobile : bottom sheet coulissant. */
@media (max-width: 767px) {
  .panel {
    position: fixed;
    left: 0; right: 0; bottom: 0; top: auto;
    width: auto;
    max-height: 70vh;
    padding: 0;
    border-right: none;
    border-top: 1px solid #e5e3dc;
    border-radius: 12px 12px 0 0;
    box-shadow: 0 -2px 16px rgba(0, 0, 0, 0.12);
    transform: translateY(calc(100% - 52px));
    transition: transform 0.25s ease;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    z-index: 10;
  }
  .panel.is-open { transform: translateY(0); }

  .sheet-handle {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    height: 52px;
    padding: 0 16px;
    border: none;
    background: transparent;
    cursor: pointer;
    font: inherit;
    text-align: left;
    flex: 0 0 auto;
  }
  .grip {
    position: absolute;
    top: 8px; left: 50%;
    transform: translateX(-50%);
    width: 36px; height: 4px;
    border-radius: 2px;
    background: #c9c6bd;
  }
  .sheet-title { font-size: 16px; font-weight: 600; }
  .panel-h1 { display: none; }
  .panel-content {
    padding: 0 16px 16px;
    overflow-y: auto;
    flex: 1 1 auto;
  }
}
</style>
