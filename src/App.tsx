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
  type AppState,
} from './store/gameStore';
import type { Difficulty } from './puzzle/types';
import SoundManager from './sounds/soundManager';
import haptics from './utils/haptics';
import './global.css';
import './App.css';

type Mode = 'daily' | 'play';
type Screen = 'menu' | 'play' | 'levels' | 'shop' | 'stats' | 'daily-result';
type CellValue = 'empty' | 'x-mark' | 'cat';

const DIFFICULTY_TIERS: Difficulty[] = ['normal', 'hard', 'ultra'];
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
    for (let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
      if (!dr && !dc) continue;
      const nr=row+dr,nc=col+dc; if (nr>=0&&nr<9&&nc>=0&&nc<9&&sol[nr][nc]) return false;
    }
    return true;
  }
  function place(idx:number){
    if (idx>9) return true;
    for (const [row,col] of regionList[idx].cells) if (ok(solution,row,col)) { solution[row][col]=1; if (place(idx+1)) return true; solution[row][col]=0; }
    return false;
  }
  const puzzle = Array.from({length:9}, ()=>Array<number>(9).fill(0));
  for (let i=0;i<20;i++) if(place(i+1)) break;
  const keep = diff==='normal'?5 : diff==='hard'?2 : 0;
  const cells:[number,number][]=[]; for (let r=0;r<9;r++) for(let c=0;c<9;c++) if(solution[r][c]) cells.push([r,c]);
  for (const [r,c] of [...cells].sort(()=>Math.random()-0.5).slice(0,Math.max(1,keep))) puzzle[r][c]=1;
  return { solution, puzzle, regions: regionList, colors: regionList.map(x=>x.color), grid: GRID_REGIONS, difficulty: diff };
}

function formatTime(ms?: number | null) {
  if (ms == null) return '--';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [screen, setScreen] = useState<Screen>('menu');
  const [win, setWin] = useState(false);
  const taps = useRef<{row:number,col:number,t:number}[]>([]);
  const wrongIdRef = useRef(0);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const [board, setBoard] = useState(() => makeBoard('normal'));
  const [boardState, setBoardState] = useState<CellValue[][]>([]);
  const [hearts, setHearts] = useState(3);
  const [solved, setSolved] = useState(false);
  const [level, setLevel] = useState(1);
  const [mode, setMode] = useState<Mode>('play');
  const [wrongCell, setWrongCell] = useState<{row:number,col:number} | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTsRef = useRef(0);
  const winUnlockedRef = useRef(false);

  const tap = (fn: () => void) => () => { if (state.soundOn) SoundManager.play('click'); fn(); };

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
    setBoard(b); setBoardState(initBoardState); setHearts(3); setSolved(false);
    setLevel(levelNum); setMode(m); setWrongCell(null); setElapsed(0); winUnlockedRef.current = false;
    startTimer();
  };

  const openBoard = (m: Mode, n?: number) => {
    const initialLevel = m === 'daily' ? 1 : (n ?? (m === 'play' ? state.unlockedLevel : state.level));
    applyBoard(initialLevel, m);
    setScreen('play');
  };

  const showDailyResult = () => {
    const won = solved && hearts > 0;
    saveDailyState({ level, won, elapsedMs: won ? elapsed : null });
    setScreen('daily-result');
  };

  const isValid = (bs: CellValue[][], brd: any, row:number, col:number) => {
    if (brd.puzzle[row][col] === 1 && bs[row][col] !== 'cat') return false;
    for (let j=0;j<9;j++) if (bs[row][j]==='cat') return false;
    for (let i=0;i<9;i++) if (bs[i][col]==='cat') return false;
    for (let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
      if (!dr && !dc) continue;
      const nr=row+dr,nc=col+dc; if (nr>=0&&nr<9&&nc>=0&&nc<9&&bs[nr][nc]==='cat') return false;
    }
    return true;
  };

  const onCell = (r: number, c:number) => {
    if (solved || hearts<=0) return;
    const now = Date.now();
    const recent = taps.current.find(t=>t.row===r && t.col===c);
    const doubleTap = !!recent && (now-recent.t) < 300;
    taps.current = [...taps.current.filter(t=>!(t.row===r&&t.col===c)), {row:r,col:c,t:now}];

    const val = boardState[r][c];
    const next = boardState.map(row => [...row]) as CellValue[][];
    let hp = hearts;
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
    setHearts(hp);

    if (placed) { if (state.soundOn) SoundManager.play('place'); haptics.place(); }
    if (wrongMove) {
      if (state.soundOn) SoundManager.play('wrong'); haptics.wrong();
      const id = ++wrongIdRef.current;
      setWrongCell({ row: r, col: c });
      setTimeout(() => { if (wrongIdRef.current === id) setWrongCell(null); }, 400);
    }

    const cats = next.flat().filter(x=>x==='cat').length;
    const totalCats = board.solution.flat().filter((x: number)=>x===1).length;

    if (!wrongMove && cats === totalCats && hp>0 && isValid(next,board,r,c)) {
      setSolved(true);
      SoundManager.play('win');
      haptics.win();
      setState(s => recordLevelResult(s, level, true, elapsed));
      if (!winUnlockedRef.current) {
        winUnlockedRef.current = true;
        setTimeout(() => { setWin(true); SoundManager.play('levelComplete'); clearTimer(); showDailyResult(); }, 250);
      }
    } else if (hp <= 0) {
      if (!winUnlockedRef.current) {
        winUnlockedRef.current = true;
        setState(s => recordLevelResult(s, level, false, elapsed));
      }
    }
  };

  const restart = () => {
    if (state.soundOn) SoundManager.play('click');
    applyBoard(level, mode);
    startTimer();
  };
  const backToMenu = () => { clearTimer(); setScreen('menu'); };
  const toggleSound = () => {
    const next = !state.soundOn;
    setState(s => ({ ...s, soundOn: next }));
    if (next) SoundManager.play('click');
  };

  return (
    <div>
      {screen === 'menu' && (
        <div className="screen">
          <div style={{display:'flex',justifyContent:'flex-end',padding:'8px 0'}}>
            <button className="btn btn-secondary" onClick={toggleSound} style={{padding:'8px 12px',fontSize:20}}>
              {state.soundOn ? '🔊' : '🔇'}
            </button>
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
                {Array.from({length: 3}).map((_,i) => (<span key={i} className={`heart ${hearts<=i?'lost':''}`}>❤️</span>))}
              </div>
            </div>
            <span style={{fontSize:12,color:'#6b7280',textTransform:'uppercase',fontWeight:700}}>{board.difficulty}</span>
          </div>

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
                  <button
                    key={`${r}-${c}-${cell}-${isWrong ? 'wrong' : 'ok'}`}
                    className={`cell ${animClass}`}
                    onClick={()=>onCell(r,c)}
                    style={{backgroundColor:bg}}
                  >
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
            <button className="btn btn-secondary" onClick={tap(()=>setScreen('menu'))}>← Back</button>
            <h2 style={{margin:0,fontSize:20,fontWeight:800,color:'#9333ea'}}>Levels</h2>
            <div style={{width:60}}></div>
          </div>
          <p style={{fontSize:12,color:'#6b7280',marginBottom:12}}>
            Difficulty rises every 5 levels: {DIFFICULTY_TIERS.join(' → ')} → repeat
          </p>
          <div className="menu-grid" style={{overflowY:'auto'}}>
            {Array.from({length: TOTAL_LEVELS}).map((_,i) => {
              const lvl = i + 1;
              const locked = lvl > state.unlockedLevel;
              const isNext = lvl === state.unlockedLevel;
              return (
                <button
                  key={lvl}
                  disabled={locked}
                  onClick={tap(()=>openBoard('play', lvl))}
                  className={`level-btn ${locked ? 'locked' : ''} ${isNext ? 'level-current' : ''}`}
                >
                  {locked ? '🔒' : lvl}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {screen === 'shop' && (
        <div className="screen">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <button className="btn btn-secondary" onClick={tap(()=>setScreen('menu'))}>← Back</button>
            <h2 style={{margin:0,fontSize:20,fontWeight:800,color:'#ec4899'}}>Cat Shop</h2>
            <div style={{width:60}}></div>
          </div>
          <p style={{fontSize:13,color:'#6b7280',marginBottom:12}}>Unlock by winning levels</p>
          <div className="menu-grid" style={{overflowY:'auto'}}>
            {CAT_EMOJIS.map((cat, i) => {
              const requiredWins = i * 3 + 1;
              const unlocked = state.stats.wins >= requiredWins;
              return (
                <button key={i} disabled={!unlocked} onClick={()=>{ if(unlocked){ setState(rotateSkin({...state, catSkinIndex:i, catSkin:CAT_EMOJIS[i]})); if(state.soundOn) SoundManager.play('click'); }}} className="level-btn" style={{opacity: unlocked?1:0.35, fontSize:36}}>
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
            <button className="btn btn-secondary" onClick={tap(()=>setScreen('menu'))}>← Back</button>
            <h2 style={{margin:0,fontSize:20,fontWeight:800,color:'#9333ea'}}>Stats</h2>
            <div style={{width:60}}></div>
          </div>
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
                <span
                  key={i}
                  className="confetti-piece"
                  style={{ left: `${(i * 37) % 100}%`, background: COLORS[i % COLORS.length], animationDelay: `${(i % 5) * 0.1}s` }}
                />
              ))}
            </div>
            <div className="win-emoji">🎉</div>
            <h2 style={{fontSize:28,fontWeight:800,color:'#9333ea',marginBottom:8}}>Level Complete!</h2>
            <p style={{color:'#6b7280',marginBottom:24}}>
              {mode === 'daily' ? `Time: ${formatTime(elapsed)}` : `Great job solving the puzzle!`}
            </p>
            <button className="btn btn-primary" onClick={tap(()=>setWin(false))} style={{width:'100%',padding:14}}>Continue</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
