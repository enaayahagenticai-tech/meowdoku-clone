import { useEffect, useRef, useState } from 'react';
import {
  CAT_EMOJIS,
  TOTAL_LEVELS,
  difficultyForLevel,
  loadState,
  recordLevelResult,
  rotateSkin,
  saveDailyState,
  saveState,
} from './store/gameStore';
import type { AppState, LevelResult } from './store/gameStore';
import type { Difficulty } from './puzzle/types';
import SoundManager from './sounds/soundManager';
import haptics from './utils/haptics';
import './global.css';
import './App.css';

type Mode = 'daily' | 'play';
type Screen = 'menu' | 'play' | 'levels' | 'shop' | 'stats' | 'daily-result';
type CellValue = 'empty' | 'x-mark' | 'cat';

const DIFFICULTY_TIERS: Difficulty[] = ['normal', 'hard', 'ultra'];
const MAX_LIVES = 3;
const COLORS = ['#FFD1DC','#D1E8FF','#D1FFD1','#FFF5BA','#F0D1FF','#B6D4FF','#FFE2CC','#CCFFE2','#E2CCFF','#D1FFF5'];

const GRID_REGIONS: number[][] = Array.from({length:9}, () => Array(9).fill(0));
for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) GRID_REGIONS[r][c] = Math.floor(r/3)*3 + Math.floor(c/3) + 1;

function makeBoard(diff: Difficulty) {
  const solution = Array.from({length:9}, () => Array<number>(9).fill(0));
  const cellsByRegion = Array.from({length:10}, () => [] as number[][]);
  for (let r=0;r<9;r++) for(let c=0;c<9;c++) cellsByRegion[GRID_REGIONS[r][c]].push([r,c]);
  const regionList = Array.from({length:9}, (_,i) => ({id:i+1, cells:cellsByRegion[i+1], color: COLORS[i%COLORS.length]}));
  function ok(sol: number[][], row: number, col: number) {
    for (let j=0;j<9;j++) if (sol[row][j]) return false;
    for (let i=0;i<9;i++) if (sol[i][col]) return false;
    for (let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1; dc++){ if(!dr && !dc) continue; const nr=row+dr,nc=col+dc; if(nr>=0&&nr<9&&nc>=0&&nc<9 && sol[nr][nc]) return false; }
    return true;
  }
  function place(idx:number){ if(idx>9) return true; for(const [row,col] of regionList[idx].cells) if(ok(solution,row,col)){ solution[row][col]=1; if(place(idx+1)) return true; solution[row][col]=0; } return false; }
  const puzzle = Array.from({length:9}, ()=>Array<number>(9).fill(0));
  for (let i=0;i<20;i++) if(place(i+1)) break;
  const keep = diff==='normal'?5 : diff==='hard'?2 : 0;
  const cells:[number,number][]=[]; for(let r=0;r<9;r++) for(let c=0;c<9;c++) if(solution[r][c]) cells.push([r,c]);
  for(const [r,c] of [...cells].sort(()=>Math.random()-0.5).slice(0,Math.max(1,keep))) puzzle[r][c]=1;
  return { solution, puzzle, regions: regionList, colors: regionList.map(x=>x.color), grid: GRID_REGIONS, difficulty: diff };
}

function formatTime(ms?: number | null) {
  if (ms == null) return '--';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

function starsForLevel(level: number) {
  if (level % 5 === 0) return 3;
  return 2;
}

function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [screen, setScreen] = useState<Screen>('menu');
  const [win, setWin] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [resultStars, setResultStars] = useState<0|1|2|3>(0);
  const taps = useRef<{row:number,col:number,t:number}[]>([]);
  const wrongIdRef = useRef(0);

  const [board, setBoard] = useState(() => makeBoard('normal'));
  const [boardState, setBoardState] = useState<CellValue[][]>([]);
  const [lives, setLives] = useState(MAX_LIVES);
  const [solved, setSolved] = useState(false);
  const [level, setLevel] = useState(1);
  const [mode, setMode] = useState<Mode>('play');
  const [wrongCell, setWrongCell] = useState<{row:number,col:number} | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTsRef = useRef(0);
  const winUnlockedRef = useRef(false);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const sfx = (name: string) => { if (state.soundOn) SoundManager.play(name); };
  const tap = (fn: () => void) => () => { sfx('click'); fn(); };

  const clearTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };
  const startTimer = () => {
    clearTimer();
    startTsRef.current = Date.now() - elapsed;
    timerRef.current = setInterval(() => setElapsed(Date.now() - startTsRef.current), 250);
  };

  const applyBoard = (levelNum: number, m: Mode) => {
    const diff = m === 'play' ? difficultyForLevel(levelNum, DIFFICULTY_TIERS) : 'normal';
    const b = makeBoard(diff);
    const initBoardState = b.puzzle.map(r => r.map(v => v===1 ? 'cat' : 'empty')) as CellValue[][];
    setBoard(b); setBoardState(initBoardState); setLives(MAX_LIVES); setSolved(false);
    setLevel(levelNum); setMode(m); setWrongCell(null); setElapsed(0); winUnlockedRef.current = false;
    setWin(false); setGameOver(false);
    setState(s => s.mode === m ? s : { ...s, mode: m });
    startTimer();
    sfx('flip');
  };

  const openBoard = (m: Mode, n?: number) => {
    const initialLevel = m === 'daily' ? 1 : (n ?? (m === 'play' ? state.unlockedLevel : state.level));
    applyBoard(initialLevel, m);
    setScreen('play');
    // First-time players get a one-off placement hint until they place a cat.
    setShowHint(state.stats.played === 0);
  };

  const showDailyResult = (finalElapsed: number) => {
    saveDailyState({ level, won: true, elapsedMs: finalElapsed });
    setScreen('daily-result');
  };

  const addLevelResult = (result: LevelResult) => {
    setState(s => {
      const levelResults = { ...(s.levelResults || {}), [level]: result } as Record<number, LevelResult>;
      return { ...s, levelResults };
    });
  };

  const finishLevel = (won: boolean, finalLives: number) => {
    if (winUnlockedRef.current) return;
    winUnlockedRef.current = true;
    clearTimer();
    const finalElapsed = Date.now() - startTsRef.current;
    setElapsed(finalElapsed);
    const starCount = won ? (starsForLevel(level) as 1|2|3) : 0;
    setResultStars(starCount);
    setState(s => recordLevelResult(s, level, won, finalElapsed));
    addLevelResult({ won, stars: starCount, elapsedMs: won ? finalElapsed : null, heartsLeft: finalLives });
    if (won) {
      // Staged celebration: the solve chime already fired in onCell; follow it
      // with the bigger fanfare, then a streak flourish on milestones.
      sfx(mode === 'daily' ? 'dailyDone' : 'levelComplete');
      const newStreak = state.stats.streak + 1;
      if (newStreak >= 3 && newStreak % 3 === 0) setTimeout(() => sfx('streak'), 550);
      if (mode === 'daily') showDailyResult(finalElapsed); else setWin(true);
    } else {
      sfx('lifeLost');
      setGameOver(true);
    }
  };

  const isValid = (bs: CellValue[][], brd: any, row:number, col:number) => {
    if (brd.puzzle[row][col] === 1 && bs[row][col] !== 'cat') return false;
    for (let j=0;j<9;j++) if (bs[row][j]==='cat') return false;
    for (let i=0;i<9;i++) if (bs[i][col]==='cat') return false;
    for (let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1; dc++){ if(!dr && !dc) continue; const nr=row+dr,nc=col+dc; if(nr>=0&&nr<9&&nc>=0&&nc<9 && bs[nr][nc]==='cat') return false; }
    return true;
  };

  const onCell = (r: number, c:number) => {
    if (solved || gameOver || lives<=0) return;
    const now = Date.now();
    const recent = taps.current.find(t=>t.row===r && t.col===c);
    const doubleTap = !!recent && (now-recent.t) < 300;
    taps.current = [...taps.current.filter(t=>!(t.row===r&&t.col===c)), {row:r,col:c,t:now}];

    const val = boardState[r][c];
    const next = boardState.map(row => [...row]) as CellValue[][];
    let hp = lives;
    let placed = false;
    let wrongMove = false;

    const tryPlace = () => {
      if (isValid(next, board, r, c)) { next[r][c] = 'cat'; placed = true; }
      else { hp -= 1; wrongMove = true; }
    };

    if (val === 'empty') { if (doubleTap) tryPlace(); else next[r][c] = 'x-mark'; }
    else if (val === 'x-mark') { if (doubleTap) tryPlace(); else next[r][c] = 'empty'; }
    else if (val === 'cat') { if (!doubleTap) next[r][c] = 'empty'; }

    setBoardState(next);
    setLives(hp);

    if (placed) { setShowHint(false); sfx('place'); haptics.place(); }
    else if (wrongMove) {
      sfx('wrong'); haptics.wrong();
      const id = ++wrongIdRef.current;
      setWrongCell({ row: r, col: c });
      setTimeout(() => { if (wrongIdRef.current === id) setWrongCell(null); }, 400);
    } else {
      sfx('flip');
    }

    const cats = next.flat().filter(x=>x==='cat').length;
    const totalCats = board.solution.flat().filter((x: number)=>x===1).length;

    if (!wrongMove && cats === totalCats && hp>0 && isValid(next,board,r,c)) {
      setSolved(true);
      sfx('win');
      haptics.win();
      setTimeout(() => finishLevel(true, hp), 300);
    } else if (hp <= 0) {
      setTimeout(() => finishLevel(false, 0), 300);
    }
  };

  const nextLevel = () => {
    sfx('levelUp');
    setWin(false);
    applyBoard(Math.min(TOTAL_LEVELS, level + 1), mode);
  };
  const restart = () => { sfx('click'); applyBoard(level, mode); };
  const backToMenu = () => { clearTimer(); setScreen('menu'); sfx('back'); };
  const toggleSound = () => { const next = !state.soundOn; setState(s => ({ ...s, soundOn: next })); if(next) sfx('toggle'); };

  return (
    <div>
      {screen === 'menu' && (
        <div className="screen">
          <div style={{display:'flex',justifyContent:'flex-end',padding:'8px 0'}}>
            <button className="btn btn-secondary" onClick={toggleSound} style={{padding:'8px 12px',fontSize:20}}>{state.soundOn ? '🔊' : '🔇'}</button>
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,flex:1}}>
            <div style={{fontSize:64}}>🐱</div>
            <h1 style={{fontSize:32,fontWeight:800,color:'#9333ea'}}>Meowdoku Clone</h1>
            <div style={{display:'flex',gap:8,width:'100%'}}>
              <button className="btn btn-primary" style={{flex:1,padding:14}} onClick={tap(()=>openBoard('play'))}>Play Now</button>
              <button className="btn btn-primary" style={{flex:1,padding:14,background:'#ec4899'}} onClick={tap(()=>openBoard('daily'))}>Daily</button>
            </div>
            <div style={{display:'flex',gap:8,width:'100%'}}>
              <button className="btn btn-secondary" style={{flex:1,padding:10}} onClick={tap(()=>setScreen('levels'))}>Levels</button>
              <button className="btn btn-secondary" style={{flex:1,padding:10}} onClick={tap(()=>setScreen('shop'))}>Shop</button>
              <button className="btn btn-secondary" style={{flex:1,padding:10}} onClick={tap(()=>setScreen('stats'))}>Stats</button>
            </div>
          </div>
        </div>
      )}

      {screen === 'play' && boardState.length && (
        <div className="screen">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <button className="btn btn-secondary" onClick={tap(backToMenu)}>← Back</button>
            <div style={{display:'flex',gap:12,alignItems:'center'}}>
              <span style={{fontSize:12,color:'#ec4899',fontWeight:800}}>{formatTime(elapsed)}</span>
              <div className="hearts" style={{display:'flex',gap:4}}>
                {Array.from({length: 3}).map((_,i) => (<span key={i} className={`heart ${lives<=i?'lost':''}`}>❤️</span>))}
              </div>
            </div>
            <span style={{fontSize:12,color:'#6b7280',textTransform:'uppercase',fontWeight:700}}>{board.difficulty}</span>
          </div>

          {showHint && (
            <button className="hint-banner" onClick={()=>setShowHint(false)}>
              <span className="hint-tap">👆</span>
              <span><b>Double-tap</b> an empty cell to place a cat · <b>single-tap</b> to mark ×</span>
              <span className="hint-dismiss">tap to dismiss</span>
            </button>
          )}

          <div style={{background:'white',borderRadius:16,padding:8,boxShadow:'0 2px 8px rgba(0,0,0,0.06)',flex:1,display:'flex',flexDirection:'column'}}>
            <div className="board" style={{gridTemplateColumns:'repeat(9, 1fr)'}}>
              {boardState.map((row, r) => row.map((cell, c) => {
                const bg = board.colors[board.grid[r][c] % board.colors.length] + '40';
                const isWrong = wrongCell?.row === r && wrongCell?.col === c;
                const animClass = isWrong ? 'cell-wrong' : cell === 'cat' ? 'cell-cat' : cell === 'x-mark' ? 'cell-xmark' : 'cell-empty';
                let content: any = null;
                if (cell === 'x-mark') content = <span style={{color:'#9ca3af',fontWeight:700}}>×</span>;
                else if (cell === 'cat') content = <span style={{fontSize:36}}>{state.catSkin}</span>;
                return (
                  <button key={`${r}-${c}-${cell}-${isWrong?'wrong':'ok'}`} className={`cell ${animClass}`} onClick={()=>onCell(r,c)} style={{backgroundColor:bg}}>
                    {content}
                  </button>
                );
              }))}
            </div>

            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 4px',fontSize:13,color:'#6b7280'}}>
              <span>Level {level}</span>
              <span>Cats: {boardState.flat().filter(x=>x==='cat').length}/9</span>
            </div>

            <div style={{display:'flex',gap:8,paddingTop:8}}>
              <button className="btn btn-secondary" onClick={restart} style={{flex:1}}>Restart</button>
              <button className="btn btn-secondary" onClick={tap(backToMenu)} style={{flex:1}}>Menu</button>
            </div>
          </div>
        </div>
      )}

      {screen === 'levels' && (
        <div className="screen">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <button className="btn btn-secondary" onClick={tap(backToMenu)}>← Back</button>
            <h2 style={{margin:0,fontSize:20,fontWeight:800,color:'#9333ea'}}>Levels</h2>
            <div style={{width:60}}></div>
          </div>
          <p style={{fontSize:12,color:'#6b7280',marginBottom:12}}>Difficulty rises every 5 levels: {DIFFICULTY_TIERS.join(' → ')} → repeat</p>
          <div className="menu-grid" style={{overflowY:'auto'}}>
            {Array.from({length: TOTAL_LEVELS}).map((_,i) => {
              const lvl = i + 1;
              const locked = lvl > state.unlockedLevel;
              const result = state.levelResults ? state.levelResults[lvl] : undefined;
              const isNext = lvl === state.unlockedLevel;
              const stars = result && result.won ? Array.from({length: 3}).map((_, idx) => idx < (result.stars || 0) ? '⭐' : '☆').join('') : '';
              return (
                <button key={lvl} disabled={locked} onClick={tap(()=>openBoard('play', lvl))} className={`level-btn ${locked ? 'locked' : ''} ${isNext ? 'level-current' : ''}`} style={{fontSize: 18, display:'flex', flexDirection:'column', gap:2}}>
                  <span>{locked ? '🔒' : lvl}</span>
                  <span style={{fontSize:9, lineHeight:1}}>{stars}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {screen === 'shop' && (
        <div className="screen">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <button className="btn btn-secondary" onClick={tap(backToMenu)}>← Back</button>
            <h2 style={{margin:0,fontSize:20,fontWeight:800,color:'#ec4899'}}>Cat Shop</h2>
            <div style={{width:60}}></div>
          </div>
          <p style={{fontSize:13,color:'#6b7280',marginBottom:12}}>Unlock by winning levels</p>
          <div className="menu-grid" style={{overflowY:'auto'}}>
            {CAT_EMOJIS.map((cat, i) => {
              const requiredWins = i * 3 + 1;
              const unlocked = state.stats.wins >= requiredWins;
              return (
                <button key={i} disabled={!unlocked} onClick={()=>{ if(unlocked){ setState(rotateSkin({...state, catSkinIndex:i, catSkin:CAT_EMOJIS[i]})); sfx('unlock'); }}} className="level-btn" style={{opacity: unlocked?1:0.35, fontSize:36}}>
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {screen === 'stats' && (
        <div className="screen">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <button className="btn btn-secondary" onClick={tap(backToMenu)}>← Back</button>
            <h2 style={{margin:0,fontSize:20,fontWeight:800,color:'#9333ea'}}>Stats</h2>
            <div style={{width:60}}></div>
          </div>
          {(() => {
            const results = state.levelResults || {};
            const totalStars = Object.values(results).reduce((sum, r) => sum + (r.won ? (r.stars || 0) : 0), 0);
            const progress = Math.round((state.unlockedLevel / TOTAL_LEVELS) * 100);
            const insight = state.stats.streak >= 3
              ? `🔥 You're on a ${state.stats.streak}-win streak — keep it going!`
              : state.stats.played === 0
                ? '🐾 Play your first level to start tracking progress!'
                : `⭐ ${totalStars} stars earned · ${TOTAL_LEVELS - state.unlockedLevel + 1} levels to conquer`;
            return (
              <div className="insight-card">
                <div className="insight-msg">{insight}</div>
                <div className="progress-track"><div className="progress-fill" style={{width:`${progress}%`}} /></div>
                <div className="insight-sub">{progress}% of levels unlocked</div>
              </div>
            );
          })()}
          <div style={{background:'white',borderRadius:16,padding:20,boxShadow:'0 2px 8px rgba(0,0,0,0.06)',display:'flex',flexDirection:'column',gap:16}}>
            <div style={{display:'flex',justifyContent:'space-between'}}><span>Games Played</span><b>{state.stats.played}</b></div>
            <div style={{display:'flex',justifyContent:'space-between'}}><span>Games Won</span><b>{state.stats.wins}</b></div>
            <div style={{display:'flex',justifyContent:'space-between'}}><span>Win Rate</span><b>{state.stats.played?Math.round(state.stats.wins/state.stats.played*100)+'%':'0%'}</b></div>
            <div style={{display:'flex',justifyContent:'space-between'}}><span>Best Level</span><b>{state.highScore}</b></div>
            <div style={{display:'flex',justifyContent:'space-between'}}><span>Levels Unlocked</span><b>{state.unlockedLevel}/{TOTAL_LEVELS}</b></div>
            <div style={{display:'flex',justifyContent:'space-between'}}><span>Win Streak</span><b>{state.stats.streak}</b></div>
            <div style={{display:'flex',justifyContent:'space-between'}}><span>Best Streak</span><b>{state.stats.bestStreak}</b></div>
            <div style={{display:'flex',justifyContent:'space-between'}}><span>Best Time</span><b>{formatTime(state.stats.bestTime)}</b></div>
            <div style={{display:'flex',justifyContent:'space-between'}}><span>Best Daily</span><b>{formatTime(state.stats.bestDailyTime)}</b></div>
            <div style={{display:'flex',justifyContent:'space-between'}}><span>Current Cat</span><b style={{fontSize:32}}>{state.catSkin}</b></div>
          </div>
        </div>
      )}

      {screen === 'daily-result' && (
        <div className="screen">
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,flex:1}}>
            <div style={{fontSize:56}}>📅</div>
            <h2 style={{fontSize:24,fontWeight:800,color:'#9333ea'}}>Daily Challenge</h2>
            <div style={{fontSize:40,fontWeight:800,color:'#ec4899',lineHeight:1}}>{formatTime(elapsed)}</div>
            {state.stats.bestDailyTime != null && elapsed <= state.stats.bestDailyTime && (
              <div className="unlock-banner">🏆 New personal best!</div>
            )}
            <div style={{display:'flex',gap:16,width:'100%'}}>
              <div className="btn btn-secondary" style={{flex:1}}>Best: {formatTime(state.stats.bestDailyTime)}</div>
              <div className="btn btn-secondary" style={{flex:1}}>Streak: {state.stats.streak}</div>
            </div>
            <button className="btn btn-primary" onClick={tap(()=>setScreen('menu'))} style={{width:'100%',padding:14}}>Menu</button>
          </div>
        </div>
      )}

      {win && (
        <div className="win-overlay" onClick={()=>setWin(false)}>
          <div className="win-card" onClick={e=>e.stopPropagation()}>
            <div className="confetti-wrap">
              {Array.from({length: 14}).map((_, i) => (
                <span key={i} className="confetti-piece" style={{ left: `${(i * 37) % 100}%`, background: COLORS[i % COLORS.length], animationDelay: `${(i % 5) * 0.1}s` }} />
              ))}
            </div>
            <div className="win-emoji">🎉</div>
            <h2 style={{fontSize:28,fontWeight:800,color:'#9333ea',marginBottom:8}}>Level Complete!</h2>
            <div style={{display:'flex',gap:6,justifyContent:'center',marginBottom:16}}>
              {Array.from({length: 3}).map((_, i) => (
                <span key={i} style={{color: i < resultStars ? '#f59e0b' : '#d1d5db', fontSize: 34}}>★</span>
              ))}
            </div>
            {mode === 'play' && level < TOTAL_LEVELS && state.unlockedLevel === level + 1 && (
              <div className="unlock-banner">🔓 Level {level + 1} unlocked!</div>
            )}
            <p style={{color:'#6b7280',marginBottom:24}}>
              {mode === 'daily' ? `Time: ${formatTime(elapsed)}` : `Great job solving this puzzle!`}
            </p>
            {mode === 'play' && level < TOTAL_LEVELS && (
              <button className="btn btn-primary" onClick={tap(nextLevel)} style={{width:'100%',padding:14}}>Next Level</button>
            )}
            <div style={{display:'flex',gap:8,marginTop:8}}>
              <button className="btn btn-secondary" onClick={tap(restart)} style={{flex:1}}>Retry</button>
              <button className="btn btn-secondary" onClick={tap(()=>setWin(false))} style={{flex:1}}>Menu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
