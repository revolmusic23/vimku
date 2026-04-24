<template>
  <div class="digit-tray">
    <div v-for="d in 9" :key="d" class="digit-col" :class="{ done: remainingCounts[d - 1] === 0 }">
      <div class="dot-area">{{ '•'.repeat(Math.min(remainingCounts[d - 1], 8)) }}</div>
      <span class="label">{{ d }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  board: number[]
}>()

const remainingCounts = computed(() => {
  const counts = new Array(10).fill(0)
  for (const v of props.board) if (v) counts[v]++
  return Array.from({ length: 9 }, (_, i) => 9 - counts[i + 1])
})
</script>

<style scoped>
.digit-tray {
  display: grid;
  grid-template-columns: repeat(9, 52px);
  width: 468px;
}

.digit-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 6px;
  gap: 2px;
}

.dot-area {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--overlay1);
  width: 4ch;
  word-break: break-all;
  line-height: 0.8;
  min-height: calc(2 * 0.7rem * 1.1);
}

.label {
  font-size: 1rem;
  color: var(--subtext0);
  width: 100%;
  text-align: center;
}

.done .label {
  color: var(--surface1);
}
</style>
