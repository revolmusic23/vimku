<template>
  <div class="digit-tray" :class="{ mobile: isMobile }">
    <!-- desktop: existing layout -->
    <template v-if="!isMobile">
      <div
        v-for="d in 9"
        :key="d"
        class="digit-col"
        :class="{ done: remainingCounts[d - 1] === 0 }"
      >
        <div class="dot-area">{{ '•'.repeat(Math.min(remainingCounts[d - 1], 8)) }}</div>
        <span class="label">{{ d }}</span>
      </div>
    </template>

    <!-- mobile: two interactive rows -->
    <template v-else>
      <div class="fill-row" :class="{ inactive: selected === null }">
        <button
          v-for="d in 9"
          :key="d"
          class="fill-btn"
          :class="{ done: remainingCounts[d - 1] === 0 }"
          @click="selected !== null && emit('fill', d)"
        >
          <span class="fill-dots">{{ '•'.repeat(Math.min(remainingCounts[d - 1], 8)) }}</span>
          <span class="fill-num">{{ d }}</span>
        </button>
      </div>
      <div class="note-row" :class="{ inactive: selected === null }">
        <button
          v-for="d in 9"
          :key="d"
          class="note-btn"
          @click="selected !== null && emit('fillNote', d)"
        >
          {{ d }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  board: number[]
  isMobile?: boolean
  selected?: number | null
}>()

const emit = defineEmits<{
  fill: [digit: number]
  fillNote: [digit: number]
}>()

const remainingCounts = computed(() => {
  const counts = new Array(10).fill(0)
  for (const v of props.board) if (v) counts[v]++
  return Array.from({ length: 9 }, (_, i) => 9 - counts[i + 1])
})
</script>

<style scoped>
/* ── desktop ── */
.digit-tray:not(.mobile) {
  display: grid;
  grid-template-columns: repeat(9, var(--cell, 52px));
  width: calc(9 * var(--cell, 52px));
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

/* ── mobile ── */
.digit-tray.mobile {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--mantle);
  border-top: 1px solid var(--surface1);
  padding: 0.4rem 0.5rem;
  padding-bottom: calc(0.4rem + env(safe-area-inset-bottom, 0px));
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.fill-row,
.note-row {
  display: flex;
  gap: 0.25rem;
}

.fill-row.inactive,
.note-row.inactive {
  opacity: 0.35;
}

.fill-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.25rem 0;
  background: var(--surface0);
  border: 1px solid var(--surface1);
  color: var(--text);
  font-family: inherit;
  cursor: pointer;
  gap: 1px;
}

.fill-btn.done .fill-num {
  color: var(--surface2);
}

.fill-btn:not(.done) .fill-num {
  color: var(--text);
}

.fill-btn:active:not(.inactive *) {
  background: var(--surface1);
}

.fill-dots {
  font-size: 0.5rem;
  color: var(--overlay1);
  line-height: 1;
  height: 1.5rem;
  overflow: hidden;
  word-break: break-all;
  width: 4ch;
  text-align: center;
}

.fill-num {
  font-size: 1rem;
  line-height: 1;
}

.note-row {
  border-top: 1px solid var(--surface0);
  padding-top: 0.3rem;
}

.note-btn {
  flex: 1;
  padding: 0.2rem 0;
  background: transparent;
  border: 1px solid var(--surface0);
  color: var(--overlay1);
  font-family: inherit;
  font-size: 0.75rem;
  cursor: pointer;
}

.note-btn:active {
  background: var(--surface0);
  color: var(--text);
}
</style>
