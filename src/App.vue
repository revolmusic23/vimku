<template>
  <div class="app" @keydown="onKey" tabindex="0" ref="appEl">
    <header>
      <h1>vimku</h1>
      <div class="controls">
        <select v-model="difficulty" @change="newGame(difficulty)">
          <option value="easy">easy</option>
          <option value="medium">medium</option>
          <option value="hard">hard</option>
        </select>
        <button @click="newGame(difficulty)">new game</button>
        <button @click="undo">undo [u]</button>
        <button @click="hint">hint</button>
        <button :class="{ active: noteMode }" @click="noteMode = !noteMode">
          note [n]{{ noteMode ? ' ON' : '' }}
        </button>
      </div>
    </header>

    <div class="board" @click.self="selected = null">
      <div
        v-for="(val, idx) in board"
        :key="idx"
        class="cell"
        :class="cellClass(idx)"
        @click="selected = idx"
      >
        <template v-if="val">
          <span class="digit">{{ val }}</span>
        </template>
        <template v-else-if="notes[idx].size">
          <div class="notes">
            <span
              v-for="n in 9"
              :key="n"
              class="note-digit"
            >{{ notes[idx].has(n) ? n : '' }}</span>
          </div>
        </template>
      </div>
    </div>

    <div v-if="won" class="win-banner">
      puzzle solved!
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useSudoku } from './composables/useSudoku.js'

const {
  board, given, notes, selected,
  noteMode, difficulty, won, conflicts,
  newGame, setCell, clearCell, undo, hint, move,
} = useSudoku()

const appEl = ref(null)

onMounted(() => {
  newGame()
  appEl.value?.focus()
})

function cellClass(idx) {
  const row = Math.floor(idx / 9)
  const col = idx % 9
  return {
    selected: selected.value === idx,
    given: given.value[idx],
    conflict: conflicts.value.has(idx),
    highlight: selected.value !== null && isHighlighted(idx),
    'box-right': col === 2 || col === 5,
    'box-bottom': row === 2 || row === 5,
  }
}

function isHighlighted(idx) {
  const sel = selected.value
  if (sel === null) return false
  const sRow = Math.floor(sel / 9), sCol = sel % 9
  const iRow = Math.floor(idx / 9), iCol = idx % 9
  if (sRow === iRow || sCol === iCol) return true
  const sBox = Math.floor(sRow / 3) * 3 + Math.floor(sCol / 3)
  const iBox = Math.floor(iRow / 3) * 3 + Math.floor(iCol / 3)
  return sBox === iBox
}

function onKey(e) {
  const key = e.key

  if (['h', 'j', 'k', 'l'].includes(key)) {
    e.preventDefault()
    move(key)
    return
  }

  if (selected.value === null) return

  if (key >= '1' && key <= '9') {
    setCell(selected.value, parseInt(key))
    return
  }

  if (key === 'x' || key === 'Delete' || key === 'Backspace') {
    clearCell(selected.value)
    return
  }

  if (key === 'u') {
    undo()
    return
  }

  if (key === 'n') {
    noteMode.value = !noteMode.value
    return
  }
}
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  outline: none;
}

header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

h1 {
  font-size: 1.5rem;
  color: var(--lavender);
  letter-spacing: 0.15em;
}

.controls {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.board {
  display: grid;
  grid-template-columns: repeat(9, 52px);
  grid-template-rows: repeat(9, 52px);
  border: 2px solid var(--surface2);
}

.cell {
  width: 52px;
  height: 52px;
  border: 1px solid var(--surface0);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  user-select: none;
}

.cell.box-right  { border-right:  2px solid var(--surface2); }
.cell.box-bottom { border-bottom: 2px solid var(--surface2); }

.cell.highlight  { background: var(--surface0); }
.cell.selected   { background: var(--surface1); }

.cell.given .digit  { color: var(--subtext1); }
.cell:not(.given) .digit { color: var(--blue); }
.cell.conflict .digit   { color: var(--red); }

.digit {
  font-size: 1.3rem;
}

.notes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  width: 100%;
  height: 100%;
  padding: 1px;
}

.note-digit {
  font-size: 0.6rem;
  color: var(--overlay1);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.win-banner {
  border: 1px solid var(--green);
  color: var(--green);
  padding: 0.5rem 2rem;
  font-size: 1.1rem;
  letter-spacing: 0.1em;
}
</style>
