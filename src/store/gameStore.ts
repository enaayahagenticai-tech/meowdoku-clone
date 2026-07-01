import type { Difficulty } from '../puzzle/types';

export type GameMode = 'play' | 'daily';

export const CAT_EMOJIS = [
  '🐱','🐈','😸','😹','😻','😾','🐈‍⬛','🐶','🐱‍👤','😽',
  '🙀','😺','🐯','🦁','🐆','🐄','🐮','🐷','🐖','🐽'
];

export const TOTAL_LEVELS = 100;

export interface AppState {
  mode: GameMode;
  level: number;
  unlockedLevel: number;
  highScore: number;
  catSkin: string;
  catSkinIndex: number;
  soundOn: boolean;
  stats: { played: number; wins: number; bestTime: number | null };
}

export const initialState: AppState = {
  mode: 'play',
  level: 1,
  unlockedLevel: 1,
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
    localStorage.setItem('meowdoku-save', JSON.stringify(s));
  } catch {}
}

export function rotateSkin(s: AppState): AppState {
  const next = (s.catSkinIndex + 1) % CAT_EMOJIS.length;
  return { ...s, catSkinIndex: next, catSkin: CAT_EMOJIS[next] };
}

// Records the outcome of a level attempt: always counts a play, and on a
// win, unlocks the next level sequentially and bumps the high score.
export function recordLevelResult(s: AppState, level: number, won: boolean): AppState {
  return {
    ...s,
    stats: {
      ...s.stats,
      played: s.stats.played + 1,
      wins: won ? s.stats.wins + 1 : s.stats.wins,
    },
    highScore: won ? Math.max(s.highScore, level) : s.highScore,
    unlockedLevel: won
      ? Math.min(TOTAL_LEVELS, Math.max(s.unlockedLevel, level + 1))
      : s.unlockedLevel,
  };
}

// Difficulty steps up every 5 levels, cycling through the tiers.
export function difficultyForLevel(level: number, tiers: Difficulty[]): Difficulty {
  const tier = Math.floor((level - 1) / 5) % tiers.length;
  return tiers[tier];
}
