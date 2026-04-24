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

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useSudoku, type Difficulty, type Direction } from './composables/useSudoku'
import DigitTray from './components/DigitTray.vue'

type VimMode = 'normal' | 'insert'

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
const mode = ref<VimMode>('normal')
const countBuf = ref('')
const cmdMode = ref(false)
const cmdBuf = ref('')
const showHelp = ref(false)
const showSolved = ref(false)
const isMobile = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth <= 600
}

watch(isMobile, (mobile) => {
  if (mobile) {
    vimMode.value = false
    mode.value = 'normal'
    countBuf.value = ''
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
  { key: '1-9', desc: 'fill digit' },
  { key: 'x / Del', desc: 'clear cell' },
  { key: 'u', desc: 'undo' },
  { key: 'n', desc: 'toggle note mode' },
  { key: 'v', desc: 'toggle vim mode' },
  { key: 'i / a', desc: 'enter insert mode (vim)' },
  { key: 'Esc', desc: 'normal mode (vim)' },
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
  mode.value = 'normal'
  countBuf.value = ''
}

function onCellClick(idx: number) {
  selected.value = idx
  if (vimMode.value && mode.value === 'normal') {
    mode.value = 'insert'
  }
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

  // Command mode takes priority
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
    return
  }

  // vim mode ON
  if (mode.value === 'normal') {
    if (key >= '1' && key <= '9') {
      e.preventDefault()
      countBuf.value += key
      return
    }
    if (key === '0') {
      e.preventDefault()
      jumpTo('start')
      countBuf.value = ''
      return
    }
    if (key === '$') {
      e.preventDefault()
      jumpTo('end')
      countBuf.value = ''
      return
    }
    if (key === 'g') {
      e.preventDefault()
      jumpTo('top')
      countBuf.value = ''
      return
    }
    if (key === 'G') {
      e.preventDefault()
      jumpTo('bottom')
      countBuf.value = ''
      return
    }
    if (['h', 'j', 'k', 'l'].includes(key)) {
      e.preventDefault()
      const count = Math.min(parseInt(countBuf.value) || 1, 8)
      for (let i = 0; i < count; i++) move(key as Direction)
      countBuf.value = ''
      return
    }
    if (key === 'i' || key === 'a') {
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
    if (key === 'u') {
      undo()
      countBuf.value = ''
      return
    }
    if (key === 'n') {
      noteMode.value = !noteMode.value
      countBuf.value = ''
      return
    }
    if (key === 'Escape') {
      countBuf.value = ''
      return
    }
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
    if (key === 'n') {
      noteMode.value = !noteMode.value
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

/* default (non-vim) and insert mode: green */
.cell.selected {
  background: color-mix(in srgb, var(--green) 30%, var(--base));
}

/* normal mode: peach (can't insert) */
.vim-normal .cell.selected {
  background: color-mix(in srgb, var(--peach) 40%, var(--base));
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

.count-buf {
  font-size: 0.85rem;
  color: var(--overlay2);
}

.mode-label {
  font-size: 0.85rem;
  letter-spacing: 0.05em;
}

.mode-label.normal {
  color: var(--lavender);
}
.mode-label.insert {
  color: var(--green);
}
</style>
