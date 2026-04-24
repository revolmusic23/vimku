# vimku

一個終端機風格的 Sudoku 遊戲，使用 Vue 3 + Vite 開發。

## 技術棧

- Vue 3 (Composition API)
- Vite
- 不使用任何 UI library，CSS 全部手刻

## UI 風格

- Catppuccin Mocha 配色
- Monospace font
- 終端機感：用 border 畫格線，避免圓角、陰影、漸層等 GUI 元素
- 按鈕用純文字 + border，不要花俏樣式

## 操作方式

- 滑鼠點格子可選取
- `hjkl` 移動游標
- 數字鍵 `1-9` 填入數字
- `x` 或 `Delete` 清除格子
- `u` undo
- `n` 切換 note mode

## 功能清單

- [ ] 9x9 盤面，合法 Sudoku 生成
- [ ] 難度選擇（Easy / Medium / Hard）
- [ ] Note mode（格子內顯示小數字候選）
- [ ] 衝突高亮（同 row / col / 3x3 box 有重複時標紅）
- [ ] Hint（提示一格正確答案）
- [ ] Undo（可多步）
- [ ] 偵測完成（填完且正確時顯示勝利）

## 架構原則

- `board` 用長度 81 的一維陣列（index = row \* 9 + col）
- conflict 用 `computed` 算，不要手動維護
- keybinding 集中在一個地方管理（不要散落各 component）
- 不要過度 component 拆分，簡單就好
