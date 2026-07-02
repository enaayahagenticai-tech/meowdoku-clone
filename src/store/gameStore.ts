import type { Difficulty } from '../puzzle/types';

export type GameMode = 'play' | 'daily';

export const CAT_EMOJIS = [
  '🐱','🐈','😸','😹','😻','😾','🐈‍⬛','🐶','🐱‍👤','😽',
  '🙀','😺','🐯','🦁','🐆','🐄','🐮','🐷','🐖','🐽'
];

export const TOTAL_LEVELS = 100;
export const LEVELS_PER_TIER = 5;

export interface LevelResult {
  won: boolean;
  stars: 0 | 1 | 2 | 3;
  elapsedMs: number | null;
  heartsLeft: number;
}

export interface AppState {
  mode: GameMode;
  level: number;
  unlockedLevel: number;
  highScore: number;
  catSkin: string;
  catSkinIndex: number;
  soundOn: boolean;
  levelResults: Record<number, LevelResult>;
  stats: {
    played: number;
    wins: number;
    bestTime: number | null;
    streak: number;
    bestStreak: number;
    bestDailyTime: number | null;
    totalStars: number;
  };
}

export const initialState: AppState = {
  mode: 'play',
  level: 1,
  unlockedLevel: 1,
  highScore: 0,
  catSkin: CAT_EMOJIS[0],
  catSkinIndex: 0,
  soundOn: true,
  levelResults: {},
  stats: { played: 0, wins: 0, bestTime: null, streak: 0, bestStreak: 0, bestDailyTime: null, totalStars: 0 },
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

export function recordLevelResult(s: AppState, level: number, won: boolean, elapsedMs?: number | null): AppState {
  const nextStats = {
    ...s.stats,
    played: s.stats.played + 1,
    wins: won ? s.stats.wins + 1 : s.stats.wins,
    streak: won ? s.stats.streak + 1 : 0,
    bestStreak: won ? Math.max(s.stats.bestStreak, s.stats.streak + 1) : s.stats.bestStreak,
    bestTime: won && elapsedMs != null ? (s.stats.bestTime == null ? elapsedMs : Math.min(s.stats.bestTime, elapsedMs)) : s.stats.bestTime,
  };
  if (s.mode === 'daily' && won && elapsedMs != null) {
    nextStats.bestDailyTime = s.stats.bestDailyTime == null ? elapsedMs : Math.min(s.stats.bestDailyTime, elapsedMs);
  }
  return {
    ...s,
    stats: nextStats,
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

export function dailyKey() {
  const d = new Date();
  return `meowdoku-daily-${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

export function loadDailyState() {
  try {
    const saved = localStorage.getItem(dailyKey());
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

export function saveDailyState(payload: { level: number; won: boolean; elapsedMs: number | null }) {
  try {
    localStorage.setItem(dailyKey(), JSON.stringify({ ...payload, updatedAt: Date.now() }));
  } catch {}
}
