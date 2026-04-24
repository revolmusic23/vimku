import { ref, computed } from 'vue'

// ── Generator ──────────────────────────────────────────────────────────────

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function isValid(board, idx, num) {
  const row = Math.floor(idx / 9)
  const col = idx % 9
  const boxRow = Math.floor(row / 3) * 3
  const boxCol = Math.floor(col / 3) * 3

  for (let c = 0; c < 9; c++) {
    if (board[row * 9 + c] === num) return false
  }
  for (let r = 0; r < 9; r++) {
    if (board[r * 9 + col] === num) return false
  }
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (board[(boxRow + r) * 9 + (boxCol + c)] === num) return false
    }
  }
  return true
}

function solve(board, idx = 0) {
  if (idx === 81) return true
  if (board[idx] !== 0) return solve(board, idx + 1)

  for (const num of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (isValid(board, idx, num)) {
      board[idx] = num
      if (solve(board, idx + 1)) return true
      board[idx] = 0
    }
  }
  return false
}

function countSolutions(board, idx = 0, limit = 2) {
  if (idx === 81) return 1
  if (board[idx] !== 0) return countSolutions(board, idx + 1, limit)

  let count = 0
  for (let num = 1; num <= 9; num++) {
    if (isValid(board, idx, num)) {
      board[idx] = num
      count += countSolutions(board, idx + 1, limit)
      board[idx] = 0
      if (count >= limit) return count
    }
  }
  return count
}

const HOLES = { easy: 35, medium: 45, hard: 55 }

function generatePuzzle(difficulty = 'medium') {
  const solution = new Array(81).fill(0)
  solve(solution)

  const puzzle = [...solution]
  const indices = shuffle([...Array(81).keys()])
  let holes = 0
  const target = HOLES[difficulty]

  for (const idx of indices) {
    if (holes >= target) break
    const backup = puzzle[idx]
    puzzle[idx] = 0
    const copy = [...puzzle]
    if (countSolutions(copy) === 1) {
      holes++
    } else {
      puzzle[idx] = backup
    }
  }

  return { puzzle, solution }
}

// ── Composable ─────────────────────────────────────────────────────────────

export function useSudoku() {
  const board = ref(new Array(81).fill(0))
  const solution = ref(new Array(81).fill(0))
  const given = ref(new Array(81).fill(false))
  const notes = ref(Array.from({ length: 81 }, () => new Set()))
  const selected = ref(null)
  const noteMode = ref(false)
  const difficulty = ref('medium')
  const history = ref([])
  const won = ref(false)

  function newGame(diff = difficulty.value) {
    difficulty.value = diff
    const result = generatePuzzle(diff)
    board.value = result.puzzle
    solution.value = result.solution
    given.value = result.puzzle.map(v => v !== 0)
    notes.value = Array.from({ length: 81 }, () => new Set())
    history.value = []
    selected.value = null
    won.value = false
    noteMode.value = false
  }

  const conflicts = computed(() => {
    const set = new Set()
    for (let i = 0; i < 81; i++) {
      const v = board.value[i]
      if (!v) continue
      const row = Math.floor(i / 9)
      const col = i % 9
      const boxRow = Math.floor(row / 3) * 3
      const boxCol = Math.floor(col / 3) * 3

      for (let c = 0; c < 9; c++) {
        const j = row * 9 + c
        if (j !== i && board.value[j] === v) { set.add(i); set.add(j) }
      }
      for (let r = 0; r < 9; r++) {
        const j = r * 9 + col
        if (j !== i && board.value[j] === v) { set.add(i); set.add(j) }
      }
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const j = (boxRow + r) * 9 + (boxCol + c)
          if (j !== i && board.value[j] === v) { set.add(i); set.add(j) }
        }
      }
    }
    return set
  })

  function pushHistory() {
    history.value.push({
      board: [...board.value],
      notes: notes.value.map(s => new Set(s)),
    })
  }

  function setCell(idx, num) {
    if (given.value[idx]) return
    pushHistory()
    if (noteMode.value) {
      const s = new Set(notes.value[idx])
      if (s.has(num)) s.delete(num)
      else s.add(num)
      notes.value[idx] = s
    } else {
      board.value[idx] = num
      notes.value[idx] = new Set()
      checkWin()
    }
  }

  function clearCell(idx) {
    if (given.value[idx]) return
    pushHistory()
    board.value[idx] = 0
    notes.value[idx] = new Set()
  }

  function undo() {
    if (!history.value.length) return
    const prev = history.value.pop()
    board.value = prev.board
    notes.value = prev.notes
    won.value = false
  }

  function hint() {
    if (selected.value === null) return
    const idx = selected.value
    if (given.value[idx] || board.value[idx] === solution.value[idx]) return
    pushHistory()
    board.value[idx] = solution.value[idx]
    notes.value[idx] = new Set()
    checkWin()
  }

  function checkWin() {
    if (board.value.every((v, i) => v === solution.value[i])) {
      won.value = true
    }
  }

  function move(dir) {
    if (selected.value === null) { selected.value = 0; return }
    const idx = selected.value
    const row = Math.floor(idx / 9)
    const col = idx % 9
    if (dir === 'h' && col > 0) selected.value = idx - 1
    if (dir === 'l' && col < 8) selected.value = idx + 1
    if (dir === 'k' && row > 0) selected.value = idx - 9
    if (dir === 'j' && row < 8) selected.value = idx + 9
  }

  return {
    board, solution, given, notes, selected,
    noteMode, difficulty, won, conflicts,
    newGame, setCell, clearCell, undo, hint, move,
  }
}
