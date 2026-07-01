import type { Board, CellState, Difficulty } from '../puzzle/types';

export type GameMode = 'play' | 'daily';

const CAT_EMOJIS = [
  '🐱','🐈','😸','😹','😻','😾','🐈‍⬛','🐶','🐱‍👤','😽',
  '🙀','😺','🐯','🦁','🐆','🐄','🐮','🐷','🐖','🐽'
];

export interface LevelState {
  level: number;
  board: Board | null;
  boardState: CellState[][];
  hearts: number;
  moves: any[];
  solved: boolean;
  catSkinIndex: number;
}

export interface AppState {
  mode: GameMode;
  difficulty: Difficulty;
  level: number;
  levels: LevelState[];
  selectedLevel: number | null;
  highScore: number;
  catSkin: string;
  catSkinIndex: number;
  soundOn: boolean;
  stats: { played: number; wins: number; bestTime: number | null; };
}

export const initialState: AppState = {
  mode: 'play',
  difficulty: 'normal',
  level: 1,
  levels: [],
  selectedLevel: null,
  highScore: 0,
  catSkin: CAT_EMOJIS[0],
  catSkinIndex: 0,
  soundOn: true,
  stats: { played: 0, wins: 0, bestTime: null },
};

export function loadState(): AppState {
  try {
    const saved = localStorage.getItem('meowdoku-save');
    if (saved) return { ...initialState, ...JSON.parse(saved) };
  } catch {}
  return { ...initialState };
}

export function saveState(s: AppState) {
  try {
    localStorage.setItem(
      'meowdoku-save',
      JSON.stringify({
        mode: s.mode,
        difficulty: s.difficulty,
        level: s.level,
        selectedLevel: s.selectedLevel,
        highScore: s.highScore,
        catSkin: s.catSkin,
        catSkinIndex: s.catSkinIndex,
        soundOn: s.soundOn,
        stats: s.stats,
        levels: s.levels.map(l => ({
          level: l.level,
          hearts: l.hearts,
          solved: l.solved,
          catSkinIndex: l.catSkinIndex,
          boardSize: l.board?.size,
          difficulty: l.board?.difficulty,
          boardState: l.boardState,
        })),
      })
    );
  } catch {}
}

function isValidPlacement(boardState: CellState[][], board: Board, row: number, col: number): boolean {
  const regionId = board.grid[row][col];
  for (let i = 0; i < board.size; i++) {
    for (let j = 0; j < board.size; j++) {
      if (board.grid[i][j] === regionId && boardState[i][j] === 'cat') {
        return false;
      }
    }
  }
  for (let j = 0; j < board.size; j++) {
    if (boardState[row][j] === 'cat') return false;
  }
  for (let i = 0; i < board.size; i++) {
    if (boardState[i][col] === 'cat') return false;
  }
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < board.size && nc >= 0 && nc < board.size && boardState[nr][nc] === 'cat') {
        return false;
      }
    }
  }
  return true;
}

export function createLevel(s: AppState, mode: GameMode, level: number, board: Board): AppState {
  const boardState = board.puzzle.map(row => row.map(v => (v === 1 ? 'cat' : 'empty')));
  const ns: AppState = {
    ...s,
    mode,
    level,
    selectedLevel: level,
    levels: [
      ...s.levels.filter(l => l.level !== level),
      {
        level,
        board,
        boardState,
        hearts: 3,
        moves: [],
        solved: false,
        catSkinIndex: s.catSkinIndex,
      },
    ],
  };
  saveState(ns);
  return ns;
}

export function handleCellTap(
  s: AppState,
  level: number,
  row: number,
  col: number,
  doubleTap = false
): { state: AppState; hearts: number; placed: boolean } {
  const lvl = s.levels.find(x => x.level === level);
  if (!lvl || lvl.solved || lvl.hearts <= 0 || !lvl.board) {
    return { state: s, hearts: lvl?.hearts ?? 0, placed: false };
  }

  const val = lvl.boardState[row][col];
  const boardState = lvl.boardState.map(r => [...r]);
  let hearts = lvl.hearts;
  let placed = false;

  if (lvl.board.puzzle[row][col] === 1 && val === 'cat') {
    return { state: s, hearts, placed };
  }

  if (val === 'empty' && doubleTap) {
    if (isValidPlacement(boardState, lvl.board, row, col)) {
      boardState[row][col] = 'cat';
      placed = true;
    } else {
      hearts -= 1;
    }
  } else if (val === 'empty' && !doubleTap) {
    boardState[row][col] = 'x-mark';
  } else if (val === 'x-mark') {
    if (doubleTap && isValidPlacement(boardState, lvl.board, row, col)) {
      boardState[row][col] = 'cat';
      placed = true;
    } else if (doubleTap) {
      hearts -= 1;
    } else {
      boardState[row][col] = 'empty';
    }
  } else if (val === 'cat') {
    if (!doubleTap) boardState[row][col] = 'empty';
  }

  const nextState: AppState = { ...s, levels: [...s.levels] };
  const idx = nextState.levels.findIndex(x => x.level === level);
  nextState.levels[idx] = { ...nextState.levels[idx], boardState, hearts };

  const catsPlaced = boardState.flat().filter((x): x is 'cat' => x === 'cat').length;
  const totalCats = lvl.board.solution.flat().filter((x): x is 1 => x === 1).length;

  if (catsPlaced === totalCats && hearts > 0) {
    let valid = true;
    const seenRow = new Set<number>();
    const seenCol = new Set<number>();
    const seenRegion = new Set<number>();
    for (let r = 0; r < 9 && valid; r++) {
      for (let c = 0; c < 9 && valid; c++) {
        if (boardState[r][c] !== 'cat') continue;
        if (seenRow.has(r) || seenCol.has(c) || seenRegion.has(lvl.board.grid[r][c])) {
          valid = false;
          break;
        }
        for (let dr = -1; dr <= 1 && valid; dr++) {
          for (let dc = -1; dc <= 1 && valid; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9 && boardState[nr][nc] === 'cat') {
              valid = false;
              break;
            }
          }
        }
        seenRow.add(r);
        seenCol.add(c);
        seenRegion.add(lvl.board.grid[r][c]);
      }
    }

    if (valid) {
      nextState.levels[idx] = { ...nextState.levels[idx], solved: true };
      if (nextState.level > nextState.highScore) nextState.highScore = nextState.level;
      nextState.stats = { ...nextState.stats, wins: nextState.stats.wins + 1 };
    }
  }

  saveState(nextState);
  return { state: nextState, hearts, placed };
}

export function rotateSkin(s: AppState): AppState {
  const next = (s.catSkinIndex + 1) % CAT_EMOJIS.length;
  return { ...s, catSkinIndex: next, catSkin: CAT_EMOJIS[next] };
}
