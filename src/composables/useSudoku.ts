import { ref, computed } from 'vue'

export type Difficulty = 'easy' | 'medium' | 'hard'
export type Direction = 'h' | 'j' | 'k' | 'l'

type HistoryEntry = { board: number[]; notes: Set<number>[] }

// ── Generator ──────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function isValid(board: number[], idx: number, num: number): boolean {
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

function solve(board: number[], idx = 0): boolean {
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

function countSolutions(board: number[], idx = 0, limit = 2): number {
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

const HOLES: Record<Difficulty, number> = { easy: 35, medium: 45, hard: 55 }

function generatePuzzle(difficulty: Difficulty = 'medium'): {
  puzzle: number[]
  solution: number[]
} {
  const solution = new Array<number>(81).fill(0)
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
  const board = ref<number[]>(new Array(81).fill(0))
  const solution = ref<number[]>(new Array(81).fill(0))
  const given = ref<boolean[]>(new Array(81).fill(false))
  const notes = ref<Set<number>[]>(Array.from({ length: 81 }, () => new Set()))
  const selected = ref<number | null>(null)
  const noteMode = ref(false)
  const difficulty = ref<Difficulty>('medium')
  const history = ref<HistoryEntry[]>([])
  const won = ref(false)

  function newGame(diff: Difficulty = difficulty.value) {
    difficulty.value = diff
    const result = generatePuzzle(diff)
    board.value = result.puzzle
    solution.value = result.solution
    given.value = result.puzzle.map((v) => v !== 0)
    notes.value = Array.from({ length: 81 }, () => new Set())
    history.value = []
    selected.value = null
    won.value = false
    noteMode.value = false
  }

  const conflicts = computed(() => {
    const set = new Set<number>()
    for (let i = 0; i < 81; i++) {
      const v = board.value[i]
      if (!v) continue
      const row = Math.floor(i / 9)
      const col = i % 9
      const boxRow = Math.floor(row / 3) * 3
      const boxCol = Math.floor(col / 3) * 3

      for (let c = 0; c < 9; c++) {
        const j = row * 9 + c
        if (j !== i && board.value[j] === v) {
          set.add(i)
          set.add(j)
        }
      }
      for (let r = 0; r < 9; r++) {
        const j = r * 9 + col
        if (j !== i && board.value[j] === v) {
          set.add(i)
          set.add(j)
        }
      }
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const j = (boxRow + r) * 9 + (boxCol + c)
          if (j !== i && board.value[j] === v) {
            set.add(i)
            set.add(j)
          }
        }
      }
    }
    return set
  })

  function pushHistory() {
    history.value.push({
      board: [...board.value],
      notes: notes.value.map((s) => new Set(s)),
    })
  }

  function clearPeerNotes(idx: number, num: number) {
    const row = Math.floor(idx / 9)
    const col = idx % 9
    const boxRow = Math.floor(row / 3) * 3
    const boxCol = Math.floor(col / 3) * 3
    const peers = new Set<number>()
    for (let c = 0; c < 9; c++) peers.add(row * 9 + c)
    for (let r = 0; r < 9; r++) peers.add(r * 9 + col)
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++) peers.add((boxRow + r) * 9 + (boxCol + c))
    peers.delete(idx)
    for (const p of peers) {
      if (notes.value[p].has(num)) {
        const s = new Set(notes.value[p])
        s.delete(num)
        notes.value[p] = s
      }
    }
  }

  function setCell(idx: number, num: number) {
    if (given.value[idx]) return
    pushHistory()
    if (noteMode.value) {
      const s = new Set(notes.value[idx])
      if (s.has(num)) s.delete(num)
      else s.add(num)
      notes.value[idx] = s
    } else {
      if (board.value[idx] === num) {
        board.value[idx] = 0
      } else {
        board.value[idx] = num
        notes.value[idx] = new Set()
        clearPeerNotes(idx, num)
      }
      checkWin()
    }
  }

  function clearCell(idx: number) {
    if (given.value[idx]) return
    pushHistory()
    board.value[idx] = 0
    notes.value[idx] = new Set()
  }

  function undo() {
    if (!history.value.length) return
    const prev = history.value.pop()!
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
    clearPeerNotes(idx, solution.value[idx])
    checkWin()
  }

  function checkWin() {
    if (board.value.every((v, i) => v === solution.value[i])) {
      won.value = true
    }
  }

  function move(dir: Direction) {
    if (selected.value === null) {
      selected.value = 0
      return
    }
    const idx = selected.value
    const row = Math.floor(idx / 9)
    const col = idx % 9
    if (dir === 'h' && col > 0) selected.value = idx - 1
    if (dir === 'l' && col < 8) selected.value = idx + 1
    if (dir === 'k' && row > 0) selected.value = idx - 9
    if (dir === 'j' && row < 8) selected.value = idx + 9
  }

  function jumpTo(target: 'top' | 'bottom' | 'start' | 'end') {
    if (selected.value === null) {
      selected.value = 0
      return
    }
    const idx = selected.value
    const row = Math.floor(idx / 9)
    const col = idx % 9
    if (target === 'top') selected.value = col
    if (target === 'bottom') selected.value = 72 + col
    if (target === 'start') selected.value = row * 9
    if (target === 'end') selected.value = row * 9 + 8
  }

  return {
    board,
    solution,
    given,
    notes,
    selected,
    noteMode,
    difficulty,
    won,
    conflicts,
    newGame,
    setCell,
    clearCell,
    undo,
    hint,
    move,
    jumpTo,
  }
}
