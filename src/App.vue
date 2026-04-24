<template>
  <div class="app" :class="vimMode ? `vim-${mode}` : ''">
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
        <button :class="{ active: vimMode }" @click="toggleVimMode">
          vim{{ vimMode ? ' ON' : '' }}
        </button>
      </div>
    </header>

    <div class="board" @click.self="selected = null">
      <div
        v-for="(val, idx) in board"
        :key="idx"
        class="cell"
        :class="cellClass(idx)"
        @click="onCellClick(idx)"
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

    <div v-show="cmdMode || vimMode" class="statusline">
      <template v-if="cmdMode">
        <span class="cmd-bar">:{{ cmdBuf }}<span class="cmd-cursor">_</span></span>
        <span v-if="cmdHint" class="cmd-hint">{{ cmdHint }}</span>
      </template>
      <template v-else>
        <span v-if="vimMode" class="mode-label" :class="mode">-- {{ mode.toUpperCase() }} --</span>
        <span v-if="vimMode && countBuf" class="count-buf">{{ countBuf }}</span>
      </template>
    </div>

    <div v-if="showHelp" class="help-overlay">
      <div class="help-box">
        <div class="help-title">help</div>
        <div class="help-row" v-for="entry in HELP_ENTRIES" :key="entry.key">
          <span class="help-cmd">{{ entry.key }}</span>
          <span class="help-desc">{{ entry.desc }}</span>
        </div>
        <div class="help-close">Esc / ? to close</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSudoku } from './composables/useSudoku.js'

const {
  board, given, notes, selected,
  noteMode, difficulty, won, conflicts,
  newGame, setCell, clearCell, undo, hint, move,
} = useSudoku()

const vimMode = ref(false)
const mode = ref('normal')
const countBuf = ref('')
const cmdMode = ref(false)
const cmdBuf = ref('')
const showHelp = ref(false)

const COMMANDS = ['easy', 'hard', 'help', 'hint', 'medium', 'new']

const HELP_ENTRIES = [
  { key: 'hjkl',        desc: 'move cursor' },
  { key: '1-9',         desc: 'fill digit' },
  { key: 'x / Del',     desc: 'clear cell' },
  { key: 'u',           desc: 'undo' },
  { key: 'n',           desc: 'toggle note mode' },
  { key: 'v',           desc: 'toggle vim mode' },
  { key: 'i',           desc: 'enter insert mode (vim)' },
  { key: 'Esc',         desc: 'normal mode (vim)' },
  { key: ':new',        desc: 'new game' },
  { key: ':easy/medium/hard', desc: 'new game with difficulty' },
  { key: ':hint',       desc: 'reveal selected cell' },
  { key: ':help / ?',   desc: 'toggle this help' },
]

const cmdHint = computed(() => {
  if (!cmdBuf.value) return ''
  const matches = COMMANDS.filter(c => c.startsWith(cmdBuf.value))
  if (matches.length === 1 && matches[0] !== cmdBuf.value) return matches[0]
  if (matches.length > 1) return matches.join('  ')
  return ''
})

onMounted(() => {
  newGame()
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
})

function toggleVimMode() {
  vimMode.value = !vimMode.value
  mode.value = 'normal'
  countBuf.value = ''
}

function onCellClick(idx) {
  selected.value = idx
  if (vimMode.value && mode.value === 'normal') {
    mode.value = 'insert'
  }
}

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
  return sRow === iRow || sCol === iCol
}

function execCmd(cmd) {
  switch (cmd) {
    case 'new':    newGame(difficulty.value); break
    case 'easy':   newGame('easy'); break
    case 'medium': newGame('medium'); break
    case 'hard':   newGame('hard'); break
    case 'hint':   hint(); break
    case 'help':   showHelp.value = !showHelp.value; break
  }
}

function onKey(e) {
  const key = e.key

  if (showHelp.value) {
    e.preventDefault()
    if (key === 'Escape' || key === '?') showHelp.value = false
    return
  }

  // Command mode takes priority
  if (cmdMode.value) {
    e.preventDefault()
    if (key === 'Escape') {
      cmdMode.value = false
      cmdBuf.value = ''
      return
    }
    if (key === 'Enter') {
      execCmd(cmdBuf.value.trim())
      cmdMode.value = false
      cmdBuf.value = ''
      return
    }
    if (key === 'Backspace') {
      cmdBuf.value = cmdBuf.value.slice(0, -1)
      return
    }
    if (key === 'Tab') {
      const match = COMMANDS.find(c => c.startsWith(cmdBuf.value) && c !== cmdBuf.value)
      if (match) cmdBuf.value = match
      return
    }
    if (key.length === 1) {
      cmdBuf.value += key
      return
    }
    return
  }

  if (key === '?') {
    e.preventDefault()
    showHelp.value = !showHelp.value
    return
  }

  if (key === 'v') {
    toggleVimMode()
    return
  }

  // Enter command mode
  if (key === ':') {
    e.preventDefault()
    cmdMode.value = true
    cmdBuf.value = ''
    countBuf.value = ''
    mode.value = 'normal'
    return
  }

  if (!vimMode.value) {
    if (['h', 'j', 'k', 'l'].includes(key)) {
      e.preventDefault()
      move(key)
      return
    }
    if (selected.value === null) return
    if (key >= '1' && key <= '9') { setCell(selected.value, parseInt(key)); return }
    if (key === 'x' || key === 'Delete' || key === 'Backspace') { clearCell(selected.value); return }
    if (key === 'u') { undo(); return }
    if (key === 'n') { noteMode.value = !noteMode.value; return }
    return
  }

  // vim mode ON
  if (mode.value === 'normal') {
    if (key >= '1' && key <= '9') {
      e.preventDefault()
      countBuf.value += key
      return
    }
    if (key === '0' && countBuf.value) {
      e.preventDefault()
      countBuf.value += '0'
      return
    }
    if (['h', 'j', 'k', 'l'].includes(key)) {
      e.preventDefault()
      const count = Math.min(parseInt(countBuf.value) || 1, 8)
      for (let i = 0; i < count; i++) move(key)
      countBuf.value = ''
      return
    }
    if (key === 'i') {
      e.preventDefault()
      if (selected.value === null) selected.value = 0
      mode.value = 'insert'
      countBuf.value = ''
      return
    }
    if (key === 'x' || key === 'Delete' || key === 'Backspace') {
      if (selected.value !== null) clearCell(selected.value)
      countBuf.value = ''
      return
    }
    if (key === 'u') { undo(); countBuf.value = ''; return }
    if (key === 'n') { noteMode.value = !noteMode.value; countBuf.value = ''; return }
    if (key === 'Escape') { countBuf.value = ''; return }
    countBuf.value = ''
  }

  if (mode.value === 'insert') {
    if (key === 'Escape') {
      e.preventDefault()
      mode.value = 'normal'
      return
    }
    if (['h', 'j', 'k', 'l'].includes(key)) {
      e.preventDefault()
      move(key)
      return
    }
    if (selected.value === null) return
    if (key >= '1' && key <= '9') { setCell(selected.value, parseInt(key)); return }
    if (key === 'x' || key === 'Delete' || key === 'Backspace') { clearCell(selected.value); return }
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
  position: relative;
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
  border: 2px solid var(--overlay0);
}

.cell {
  width: 52px;
  height: 52px;
  border: 1px solid color-mix(in srgb, var(--surface0) 50%, var(--surface1));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  user-select: none;
}

.cell.box-right  { border-right:  2px solid var(--overlay0); }
.cell.box-bottom { border-bottom: 2px solid var(--overlay0); }

.cell.highlight  { background: var(--surface0); }

/* default (non-vim) and insert mode: green */
.cell.selected { background: color-mix(in srgb, var(--green) 35%, var(--base)); }

/* normal mode: peach (can't insert) */
.vim-normal .cell.selected { background: color-mix(in srgb, var(--peach) 40%, var(--base)); }

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

.help-overlay {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--base) 90%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.help-box {
  border: 1px solid var(--overlay0);
  padding: 1rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 28ch;
}

.help-title {
  color: var(--lavender);
  font-size: 0.9rem;
  letter-spacing: 0.1em;
  margin-bottom: 0.25rem;
}

.help-row {
  display: flex;
  gap: 1.5rem;
  font-size: 0.85rem;
}

.help-cmd  { color: var(--yellow); min-width: 20ch; }
.help-desc { color: var(--subtext0); }

.help-close {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--overlay1);
  text-align: right;
}

.statusline {
  width: 468px;
  min-height: 1.4rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cmd-bar {
  font-size: 0.85rem;
  color: var(--text);
}

.cmd-cursor {
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}

.cmd-hint {
  font-size: 0.8rem;
  color: var(--overlay1);
}

.count-buf {
  font-size: 0.85rem;
  color: var(--overlay2);
}

.mode-label {
  font-size: 0.85rem;
  letter-spacing: 0.05em;
}

.mode-label.normal { color: var(--lavender); }
.mode-label.insert { color: var(--green); }
</style>
