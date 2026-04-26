<template>
  <div class="app">
    <header>
      <h1>vimku</h1>
      <div class="controls">
        <select v-model="difficulty" @change="newGame(difficulty)">
          <option value="easy">easy</option>
          <option value="medium">medium</option>
          <option value="hard">hard</option>
        </select>
        <button @click="newGame(difficulty)">new game</button>
        <!-- desktop controls -->
        <button v-if="!isMobile" @click="undo">undo [u]</button>
        <button v-if="!isMobile" @click="hint">hint</button>
        <button v-if="!isMobile" :class="{ active: noteMode }" @click="noteMode = !noteMode">
          note [n]{{ noteMode ? ' ON' : '' }}
        </button>
        <button v-if="!isMobile" :class="{ active: vimMode }" @click="toggleVimMode">
          vim{{ vimMode ? ' ON' : '' }}
        </button>
        <!-- mobile controls -->
        <button v-if="isMobile" @click="hint">hint</button>
        <button
          v-if="isMobile"
          @click="
            () => {
              if (selected !== null) clearCell(selected)
            }
          "
        >
          x
        </button>
        <button v-if="isMobile" @click="undo">u</button>
      </div>
    </header>

    <div class="board-area" :class="{ finding: isFinding }">
      <div class="coord-header">
        <span class="coord-corner"></span>
        <span v-for="c in 9" :key="c" class="coord-label col-label">{{ c }}</span>
      </div>
      <div class="board-main">
        <div class="coord-sidebar">
          <span
            v-for="r in 9"
            :key="r"
            class="coord-label row-label"
            :class="{ 'coord-active': findSelectedRow === r }"
            >{{ r }}</span
          >
        </div>
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
                  :class="{ 'note-match': notes[idx].has(n) && selectedDigit === n }"
                  >{{ notes[idx].has(n) ? n : '' }}</span
                >
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <DigitTray
      :board="board"
      :is-mobile="isMobile"
      :selected="selected"
      @fill="onTrayFill"
      @fill-note="onTrayFillNote"
    />

    <div v-if="showSolved" class="solved-overlay" @click.self="showSolved = false">
      <div class="solved-box">
        <div class="solved-title">solved</div>
        <template v-if="isMobile">
          <button class="solved-btn" @click="newGame(difficulty)">new game</button>
          <button class="solved-btn" @click="showSolved = false">review</button>
        </template>
        <template v-else>
          <div class="help-row">
            <span class="help-cmd">n</span>
            <span class="help-desc">new game</span>
          </div>
          <div class="help-close">Esc to review board</div>
        </template>
      </div>
    </div>

    <div v-show="cmdMode || isFinding" class="statusline">
      <template v-if="cmdMode">
        <span class="cmd-bar">:{{ cmdBuf }}<span class="cmd-cursor">_</span></span>
        <span v-if="cmdHint" class="cmd-hint">{{ cmdHint }}</span>
      </template>
      <template v-else>
        <span class="find-label">-- FIND --</span>
        <span class="find-buf">{{ findDisplayBuf }}</span>
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

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useSudoku, type Difficulty, type Direction } from './composables/useSudoku'
import DigitTray from './components/DigitTray.vue'

const {
  board,
  given,
  notes,
  selected,
  noteMode,
  difficulty,
  won,
  conflicts,
  newGame: _newGame,
  setCell,
  clearCell,
  undo,
  hint,
  move,
  jumpTo,
} = useSudoku()

const vimMode = ref(true)
const findBuf = ref('') // '' | 'f' | 'f{digit}'
const cmdMode = ref(false)
const cmdBuf = ref('')
const showHelp = ref(false)
const showSolved = ref(false)
const isMobile = ref(false)

const isFinding = computed(() => findBuf.value.length > 0)
const findSelectedRow = computed(() =>
  findBuf.value.length === 2 ? parseInt(findBuf.value[1]) : null,
)
const findDisplayBuf = computed(() => {
  if (findBuf.value.length === 1) return '[_][_]'
  return `[${findBuf.value[1]}][_]`
})

function checkMobile() {
  isMobile.value = window.innerWidth <= 600
}

watch(isMobile, (mobile) => {
  if (mobile) {
    vimMode.value = false
    findBuf.value = ''
  }
})

function newGame(d?: Difficulty) {
  _newGame(d)
  showSolved.value = false
}

const COMMANDS = ['easy', 'hard', 'help', 'hint', 'medium', 'new']

const HELP_ENTRIES = [
  { key: 'hjkl', desc: 'move cursor' },
  { key: 'g / G', desc: 'jump to top / bottom row' },
  { key: '0 / $', desc: 'jump to first / last column' },
  { key: 'f{r}{c}', desc: 'jump to row r, col c (vim)' },
  { key: '1-9', desc: 'fill digit' },
  { key: 'x / Del', desc: 'clear cell' },
  { key: 'u', desc: 'undo' },
  { key: 'n', desc: 'toggle note mode' },
  { key: 'v', desc: 'toggle vim mode' },
  { key: ':new', desc: 'new game' },
  { key: ':easy/medium/hard', desc: 'new game with difficulty' },
  { key: ':hint', desc: 'reveal selected cell' },
  { key: ':help / ?', desc: 'toggle this help' },
]

const cmdHint = computed(() => {
  if (!cmdBuf.value) return ''
  const matches = COMMANDS.filter((c) => c.startsWith(cmdBuf.value))
  if (matches.length === 1 && matches[0] !== cmdBuf.value) return matches[0]
  if (matches.length > 1) return matches.join('  ')
  return ''
})

function onCompositionStart() {
  if (cmdMode.value) {
    cmdMode.value = false
    cmdBuf.value = ''
  }
}

onMounted(() => {
  checkMobile()
  if (isMobile.value) vimMode.value = false
  newGame()
  window.addEventListener('keydown', onKey)
  window.addEventListener('compositionstart', onCompositionStart)
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('compositionstart', onCompositionStart)
  window.removeEventListener('resize', checkMobile)
})

function toggleVimMode() {
  vimMode.value = !vimMode.value
  findBuf.value = ''
}

function onCellClick(idx: number) {
  selected.value = idx
  findBuf.value = ''
}

function onTrayFill(d: number) {
  if (selected.value === null) return
  setCell(selected.value, d)
  if (won.value) showSolved.value = true
}

function onTrayFillNote(d: number) {
  if (selected.value === null) return
  const prev = noteMode.value
  noteMode.value = true
  setCell(selected.value, d)
  noteMode.value = prev
}

const selectedDigit = computed(() => (selected.value !== null ? board.value[selected.value] : 0))

function cellClass(idx: number) {
  const row = Math.floor(idx / 9)
  const col = idx % 9
  const selVal = selectedDigit.value
  return {
    selected: selected.value === idx,
    given: given.value[idx],
    conflict: conflicts.value.has(idx),
    highlight: selected.value !== null && isHighlighted(idx),
    'same-digit': selVal && board.value[idx] === selVal && selected.value !== idx,
    'box-right': col === 2 || col === 5,
    'box-bottom': row === 2 || row === 5,
    'find-row': findSelectedRow.value !== null && row + 1 === findSelectedRow.value,
  }
}

function isHighlighted(idx: number) {
  const sel = selected.value
  if (sel === null) return false
  const sRow = Math.floor(sel / 9),
    sCol = sel % 9
  const iRow = Math.floor(idx / 9),
    iCol = idx % 9
  return sRow === iRow || sCol === iCol
}

function execCmd(cmd: string) {
  switch (cmd) {
    case 'new':
      newGame(difficulty.value)
      break
    case 'easy':
      newGame('easy')
      break
    case 'medium':
      newGame('medium')
      break
    case 'hard':
      newGame('hard')
      break
    case 'hint':
      hint()
      break
    case 'help':
      showHelp.value = !showHelp.value
      break
  }
}

function onKey(e: KeyboardEvent) {
  const key = e.key

  if (showSolved.value) {
    e.preventDefault()
    if (key === 'Escape') {
      showSolved.value = false
    } else if (key === 'n' || key === 'N') {
      newGame(difficulty.value)
      showSolved.value = false
    }
    return
  }

  if (showHelp.value) {
    e.preventDefault()
    if (key === 'Escape' || key === '?') showHelp.value = false
    return
  }

  if (cmdMode.value) {
    if (e.isComposing) return
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
      const match = COMMANDS.find((c) => c.startsWith(cmdBuf.value) && c !== cmdBuf.value)
      if (match) cmdBuf.value = match
      return
    }
    if (key.length === 1 && key.charCodeAt(0) < 128) {
      cmdBuf.value += key
    }
    return
  }

  // find mode (vim only)
  if (isFinding.value) {
    e.preventDefault()
    if (key === 'Escape') {
      findBuf.value = ''
      return
    }
    if (key >= '1' && key <= '9') {
      if (findBuf.value.length === 1) {
        findBuf.value = 'f' + key
      } else {
        const row = parseInt(findBuf.value[1]) - 1
        const col = parseInt(key) - 1
        selected.value = row * 9 + col
        findBuf.value = ''
      }
      return
    }
    findBuf.value = ''
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

  if (key === ':') {
    e.preventDefault()
    cmdMode.value = true
    cmdBuf.value = ''
    return
  }

  if (['h', 'j', 'k', 'l'].includes(key)) {
    e.preventDefault()
    move(key as Direction)
    return
  }
  if (key === 'g') {
    e.preventDefault()
    jumpTo('top')
    return
  }
  if (key === 'G') {
    e.preventDefault()
    jumpTo('bottom')
    return
  }
  if (key === '0') {
    e.preventDefault()
    jumpTo('start')
    return
  }
  if (key === '$') {
    e.preventDefault()
    jumpTo('end')
    return
  }

  if (vimMode.value && key === 'f') {
    e.preventDefault()
    if (selected.value === null) selected.value = 0
    findBuf.value = 'f'
    return
  }

  if (selected.value === null) return

  if (key >= '1' && key <= '9') {
    setCell(selected.value, parseInt(key))
    if (won.value) showSolved.value = true
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
  --cell: 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  outline: none;
  position: relative;
}

@media (max-width: 600px) {
  .app {
    --cell: clamp(32px, calc((100vw - 1rem - 4px) / 9), 52px);
    gap: 0.6rem;
    padding-bottom: 8rem;
  }
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

/* board area with coordinate labels */
.board-area {
  display: flex;
  flex-direction: column;
}

.coord-header {
  display: flex;
  align-items: center;
  height: 1.4rem;
  opacity: 0;
  pointer-events: none;
}

.board-area.finding .coord-header {
  opacity: 1;
  pointer-events: auto;
}

.coord-corner {
  width: 1.5rem;
  flex-shrink: 0;
}

.coord-label {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  color: var(--overlay1);
}

.col-label {
  width: var(--cell);
}

.board-main {
  display: flex;
}

.coord-sidebar {
  display: flex;
  flex-direction: column;
  width: 1.5rem;
  opacity: 0;
  pointer-events: none;
}

.board-area.finding .coord-sidebar {
  opacity: 1;
  pointer-events: auto;
}

.row-label {
  height: var(--cell);
}

.row-label.coord-active {
  color: var(--yellow);
}

.board {
  display: grid;
  grid-template-columns: repeat(9, var(--cell));
  grid-template-rows: repeat(9, var(--cell));
  border: 2px solid var(--overlay0);
}

.cell {
  width: var(--cell);
  height: var(--cell);
  border: 1px solid color-mix(in srgb, var(--surface0) 50%, var(--surface1));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  user-select: none;
}

.cell.box-right {
  border-right: 2px solid var(--overlay0);
}
.cell.box-bottom {
  border-bottom: 2px solid var(--overlay0);
}

.cell.highlight {
  background: var(--surface0);
}
.cell.same-digit {
  background: color-mix(in srgb, var(--peach) 30%, var(--base));
}
.cell.selected {
  background: color-mix(in srgb, var(--green) 30%, var(--base));
}
.cell.find-row {
  background: color-mix(in srgb, var(--yellow) 15%, var(--base));
}

.cell.given .digit {
  color: var(--subtext1);
}
.cell:not(.given) .digit {
  color: var(--blue);
}
.cell.conflict .digit {
  color: var(--red);
}

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

.note-digit.note-match {
  background: color-mix(in srgb, var(--peach) 30%, var(--base));
  color: var(--text);
}

.solved-overlay {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--base) 90%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.solved-box {
  border: 1px solid var(--green);
  padding: 1rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 20ch;
}

.solved-title {
  color: var(--green);
  font-size: 1.1rem;
  letter-spacing: 0.15em;
  margin-bottom: 0.25rem;
}

.solved-btn {
  width: 100%;
  padding: 0.5rem;
  text-align: center;
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

.help-cmd {
  color: var(--yellow);
  min-width: 20ch;
}
.help-desc {
  color: var(--subtext0);
}

.help-close {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--overlay1);
  text-align: right;
}

.statusline {
  width: calc(9 * var(--cell) + 4px);
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
  50% {
    opacity: 0;
  }
}

.cmd-hint {
  font-size: 0.8rem;
  color: var(--overlay1);
}

.find-label {
  font-size: 0.85rem;
  color: var(--yellow);
  letter-spacing: 0.05em;
}

.find-buf {
  font-size: 0.85rem;
  color: var(--overlay2);
}
</style>
