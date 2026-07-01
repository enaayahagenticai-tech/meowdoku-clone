import type { Board, Region } from './types';

const PALETTE = ['#FFD1DC','#D1E8FF','#D1FFD1','#FFF5BA','#F0D1FF','#B6D4FF','#FFE2CC','#CCFFE2','#E2CCFF','#D1FFF5'];

function newBoard(size: 9): Board {
  const ids: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  const regions: Region[] = [];
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) ids[i][j] = (i * 3) + (j % 3) + 1;
  }
  for (let r = 1; r <= size; r++) {
    const cells: number[][] = [];
    for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) if (ids[i][j] === r) cells.push([i, j]);
    regions.push({ id: r, cells, color: PALETTE[r % PALETTE.length] });
  }
  return {
    size,
    grid: ids,
    regions,
    colors: regions.map(_ => _.color),
    solution: Array.from({ length: size }, () => Array(size).fill(null)),
    puzzle: Array.from({ length: size }, () => Array(size).fill(null)),
    difficulty: 'normal'
  };
}

function ok(b: Board, row: number, col: number) {
  for (let j = 0; j < b.size; j++) if (b.solution[row][j] === 1) return false;
  for (let i = 0; i < b.size; i++) if (b.solution[i][col] === 1) return false;
  for (const [r, c] of catPositions(b.solution)) if (Math.abs(r - row) <= 1 && Math.abs(c - col) <= 1) return false;
  return true;
}

function* catPositions(sol: (1|null)[][]) {
  for (let r = 0; r < sol.length; r++) for (let c = 0; c < sol[r].length; c++) if (sol[r][c] === 1) yield [r, c] as const;
}

function solveCat(b: Board, regionIdx: number): boolean {
  if (regionIdx > b.size) return true;
  const reg = b.regions[regionIdx - 1];
  const shuffled = [...reg.cells].sort(() => Math.random() - 0.5);
  for (const [r, c] of shuffled) if (ok(b, r, c)) {
    b.solution[r][c] = 1;
    if (solveCat(b, regionIdx + 1)) return true;
    b.solution[r][c] = null;
  }
  return false;
}

export function makeSolution(): Board {
  const b = newBoard(9);
  if (!solveCat(b, 1)) return makeSolution();
  return b;
}

export function makePuzzle(diff: 'normal'|'hard'|'ultra'): Board {
  const b = makeSolution();
  const keep = diff === 'normal' ? 5 : diff === 'hard' ? 2 : 0;
  const clues: [number,number][] = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (b.solution[r][c] === 1) clues.push([r, c]);
  const shuffle = clues.sort(() => Math.random() - 0.5);
  const keepSet = new Set((shuffle.slice(0, Math.max(keep, 1)) as [number,number][]).map(([r,c]) => r*9 + c));
  const puzzle = Array.from({ length: 9 }, () => Array(9).fill(null));
  for (const [r, c] of shuffle) puzzle[r][c] = keepSet.has(r*9 + c) ? 1 : null;
  b.puzzle = puzzle;
  b.difficulty = diff;
  return b;
}

export function dailyBoard(): Board {
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const diff: 'normal'|'hard'|'ultra' = d.getDay() % 3 === 0 ? 'hard' : d.getDay() % 3 === 1 ? 'ultra' : 'normal';
  let b = makePuzzle(diff);
  const sub = (seed * 2654435761 >>> 0) % 1000;
  const clues: [number,number][] = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (b.solution[r][c] === 1 || b.puzzle[r][c] === 1) clues.push([r, c]);
  const kept = clues.sort((a, b2) => ((a[0]*31 + a[1] + sub) % 97) - ((b2[0]*31 + b2[1] + seed) % 97)).slice(0, Math.max(1, clues.length - (sub % 4)));
  const set = new Set(kept.map(([r,c]) => r*9 + c));
  const puzzle = Array.from({ length: 9 }, () => Array(9).fill(null));
  b.solution.forEach((row, r) => row.forEach((v, c) => { if (v === 1) puzzle[r][c] = set.has(r*9 + c) ? 1 : null; }));
  b.puzzle = puzzle;
  b.difficulty = diff;
  return b;
}

const seen = new Set<string>();
export function uniquePuzzle(count: number): Board[] {
  const out: Board[] = [];
  while (out.length < count) {
    const b = makePuzzle(['normal','hard','ultra'][out.length % 3] as any);
    const key = b.puzzle.map(r => r.map(v => v ? '1' : '0').join('')).join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(b);
  }
  return out;
}
