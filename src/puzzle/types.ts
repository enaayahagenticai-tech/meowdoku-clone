export type CellState = 'empty' | 'x-mark' | 'cat';
export type Difficulty = 'normal' | 'hard' | 'ultra';

export interface Region {
  id: number;
  cells: number[][];
  color: string;
}

export interface Board {
  size: number;
  grid: number[][];
  regions: Region[];
  colors: string[];
  solution: (1|null)[][];
  puzzle: (1|null)[][];
  difficulty: Difficulty;
}

export interface Move {
  type: 'place' | 'x' | 'clear';
  row: number;
  col: number;
  prev: CellState;
}
