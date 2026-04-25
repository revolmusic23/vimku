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
- `g` / `G` 跳第一行 / 最後一行，`0` / `$` 跳行首 / 行尾
- 數字鍵 `1-9` 填入數字
- `x` 或 `Delete` 清除格子
- `u` undo
- `n` 切換 note mode
- `:` 開啟 command bar，`Esc` 取消，`Enter` 執行，`Tab` 補全

## 功能清單

- [x] 9x9 盤面，合法 Sudoku 生成（backtracking + 唯一解驗證）
- [x] 難度選擇（`:easy` / `:medium` / `:hard`）
- [x] Note mode（格子內顯示小數字候選，填入數字時自動清除同 peer 候選）
- [x] 衝突高亮（同 row / col / 3x3 box 有重複時標紅）
- [x] Hint（只開放 `:hint`，避免誤觸）
- [x] Undo（可多步）
- [x] 偵測完成（填完且正確時顯示 solved modal，按任意鍵或 new 繼續）
- [x] DigitTray（顯示 1-9 各數字剩餘數量，全填完時變灰）
- [x] `:` Command Mode（支援 `new`、`easy`、`medium`、`hard`、`hint`、`help`，Tab 補全）
- [ ] RWD（手機版可玩，觸控輸入數字）
- [ ] `:theme` 切換其他終端機主題
- [ ] 預設在第一排第一格？現在預設不會 selected
- [ ] solved 之後如果 esc，應該要讓他不可編輯
- [ ] normal 跟 insert 說實在不太方便，看有沒有辦法用 insert 做到所有？然後拿掉 `5j` 看有沒有替代方案？比方說 `f45` 直接跑到對應的格子？

## 架構原則

- `board` 用長度 81 的一維陣列（index = row \* 9 + col）
- conflict 用 `computed` 算，不要手動維護
- keybinding 集中在 App.vue 的 `keydown` handler，不散落各 component
- 不要過度 component 拆分，簡單就好

## RWD / 手機（待實作）

- 目前完全沒有 `@media` query，DigitTray 和棋盤寬度固定，手機會爆版
- 觸控輸入：點格子後跳出數字 overlay（1-9 + 清除），vim keybinding 對手機無意義
- puzzle 生成（backtracking）hard 難度耗時較長，手機上不能 block UI，必要時用 Web Worker

## 效能注意事項

- `generatePuzzle` 使用 backtracking + `countSolutions` 確保唯一解，hard 難度偶爾耗時較長
