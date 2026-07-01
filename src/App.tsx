import { useState, useEffect, useRef } from 'react';
import { loadState, saveState, rotateSkin, type AppState } from './store/gameStore';
import SoundManager from './sounds/soundManager';
import './global.css';
import './App.css';

type Mode = 'daily' | 'play';
type Difficulty = 'normal' | 'hard' | 'ultra';

const CAT_EMOJIS = [
  '🐱','🐈','😸','😹','😻','😾','🐈‍⬛','🐶','🐱‍👤','😽',
  '🙀','😺','🐯','🦁','🐆','🐄','🐮','🐷','🐖','🐽'
];
const DIFFICULTIES: Difficulty[] = ['normal','hard','ultra'];
const COLORS = ['#FFD1DC','#D1E8FF','#D1FFD1','#FFF5BA','#F0D1FF','#B6D4FF','#FFE2CC','#CCFFE2','#E2CCFF','#D1FFF5'];

const GRID_REGIONS: number[][] = Array.from({length:9}, () => Array(9).fill(0));
for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) GRID_REGIONS[r][c] = Math.floor(r/3)*3 + Math.floor(c/3) + 1;

function makeBoard(diff: Difficulty) {
  const solution = Array.from({length:9}, () => Array<number>(9).fill(0));
  const cellsByRegion = Array.from({length:10}, () => [] as number[][]);
  for (let r=0;r<9;r++) for(let c=0;c<9;c++) cellsByRegion[GRID_REGIONS[r][c]].push([r,c]);
  const regionList = Array.from({length:9}, (_,i) => ({id:i+1, cells:cellsByRegion[i+1], color: COLORS[i%COLORS.length]}));
  // simple solver identical to generator layout
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

function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [screen, setScreen] = useState<'menu'|'play'|'levels'|'shop'|'stats'>('menu');
  const [diff, setDiff] = useState<Difficulty>('normal');
  const [win, setWin] = useState(false);
  const taps = useRef<{row:number,col:number,t:number}[]>([]);

  useEffect(() => { saveState(state); }, [state]);

  const [board, setBoard] = useState(() => makeBoard(diff));
  const [boardState, setBoardState] = useState<('empty'|'x-mark'|'cat')[][]>([]);
  const [hearts, setHearts] = useState(3);
  const [solved, setSolved] = useState(false);
  const [level, setLevel] = useState(1);
  const [mode, setMode] = useState<Mode>('play');

  const applyBoard = (levelNum:number, m:Mode, d: Difficulty) => {
    const b = m==='daily' ? makeBoard(d) : makeBoard(d);
    const initBoardState = b.puzzle.map(r => r.map(v => v===1 ? 'cat' : 'empty'));
    setBoard(b); setBoardState(initBoardState); setHearts(3); setSolved(false);
    setLevel(levelNum); setMode(m);
  };

  const openBoard = (m: Mode, n?: number) => {
    applyBoard(n ?? state.level, m, diff);
    setScreen('play');
  };

  const isValid = (bs:('empty'|'x-mark'|'cat')[][], brd:any, row:number, col:number) => {
    if (brd.puzzle[row][col] === 1 && bs[row][col] !== 'cat') return false;
    for (let j=0;j<9;j++) if (bs[row][j]==='cat') return false;
    for (let i=0;i<9;i++) if (bs[i][col]==='cat') return false;
    for (let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
      if (!dr && !dc) continue;
      const nr=row+dr,nc=col+dc;
      if (nr>=0&&nr<9&&nc>=0&&nc<9&&bs[nr][nc]==='cat') return false;
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
    const next = boardState.map(row => [...row]) as any;
    let hp = hearts;
    if (val === 'empty') { if(doubleTap){ if(isValid(next,board,r,c)){ next[r][c]='cat'; SoundManager.play('place'); } else { hp-=1; SoundManager.play('wrong'); } } else { next[r][c]='x-mark'; } }
    else if (val === 'x-mark') { if(doubleTap){ if(isValid(next,board,r,c)){ next[r][c]='cat'; SoundManager.play('place'); } else { hp-=1; SoundManager.play('wrong'); } } else { next[r][c]='empty'; } }
    else if (val === 'cat') { if(!doubleTap) next[r][c]='empty'; }
    setBoardState(next); setHearts(hp);
    const cats = next.flat().filter((x:string)=>x==='cat').length;
    if (cats === board.solution.flat().filter(x=>x===1).length && hp>0 && isValid(next,board,r,c)) {
      setSolved(true); SoundManager.play('win');
      setTimeout(()=>setWin(true), 250);
    } else if (hp < hearts) SoundManager.play('wrong');
  };

  const restart = () => applyBoard(level, mode, diff);
  const backToMenu = () => { saveState(state); setScreen('menu'); setWin(false); };

  return (
    <div>
      {screen === 'menu' && (
        <div className="screen">
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,flex:1}}>
            <div style={{fontSize:64}}>🐱</div>
            <h1 style={{fontSize:32,fontWeight:800,color:'#9333ea'}}>Meowdoku Clone</h1>
            <div style={{display:'flex',gap:8,width:'100%'}}>
              <button className="btn btn-primary" style={{flex:1,padding:14}} onClick={()=>openBoard('play')}>Play Now</button>
              <button className="btn btn-primary" style={{flex:1,padding:14,background:'#ec4899'}} onClick={()=>openBoard('daily')}>Daily</button>
            </div>
            <div style={{display:'flex',gap:8,width:'100%'}}>
              <button className="btn btn-secondary" style={{flex:1,padding:10}} onClick={()=>setScreen('levels')}>Levels</button>
              <button className="btn btn-secondary" style={{flex:1,padding:10}} onClick={()=>setScreen('shop')}>Shop</button>
              <button className="btn btn-secondary" style={{flex:1,padding:10}} onClick={()=>setScreen('stats')}>Stats</button>
            </div>
          </div>
        </div>
      )}

      {screen === 'play' && boardState.length && (
        <div className="screen">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <button className="btn btn-secondary" onClick={backToMenu}>← Back</button>
            <div style={{display:'flex',gap:4}}>
              {Array.from({length:3}).map((_,i) => (<span key={i} className={`heart ${hearts<=i?'lost':''}`}>❤️</span>))}
            </div>
            <span style={{fontSize:12,color:'#6b7280',textTransform:'uppercase',fontWeight:700}}>{diff}</span>
          </div>

          <div style={{background:'white',borderRadius:16,padding:8,boxShadow:'0 2px 8px rgba(0,0,0,0.06)',flex:1,display:'flex',flexDirection:'column'}}>
            <div className="board" style={{gridTemplateColumns:'repeat(9, 1fr)'}}>
              {boardState.map((row, r) => row.map((cell, c) => {
                const bg = board.colors[board.grid[r][c] % board.colors.length] + '40';
                let content: any = null;
                if (cell === 'x-mark') content = <span style={{color:'#9ca3af',fontWeight:700}}>×</span>;
                else if (cell === 'cat') content = <span style={{fontSize:36}}>{state.catSkin}</span>;
                return <button key={`${r}-${c}`} className="cell" onClick={()=>onCell(r,c)} style={{backgroundColor:bg}}>{content}</button>;
              }))}
            </div>

            <div style={{display:'flex',justifyContent:'space-between',padding:'8px 4px',fontSize:13,color:'#6b7280'}}>
              <span>Cats: {boardState.flat().filter(x=>x==='cat').length}/9</span>
              <span>Level {level}</span>
            </div>

            <div style={{display:'flex',gap:8,paddingTop:8}}>
              <button className="btn btn-secondary" onClick={restart} style={{flex:1}}>Restart</button>
              <button className="btn btn-secondary" onClick={()=>setScreen('menu')} style={{flex:1}}>Menu</button>
            </div>
          </div>
        </div>
      )}

      {screen === 'levels' && (
        <div className="screen">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <button className="btn btn-secondary" onClick={()=>setScreen('menu')}>← Back</button>
            <h2 style={{margin:0,fontSize:20,fontWeight:800,color:'#9333ea'}}>Levels</h2>
            <div style={{width:60}}></div>
          </div>
          <div style={{display:'flex',gap:6,marginBottom:12}}>
            {DIFFICULTIES.map(d => <button key={d} onClick={()=>{setDiff(d);applyBoard(level,mode,d);}} className={`btn ${diff===d?'btn-primary':'btn-secondary'}`} style={{flex:1}}>{d[0].toUpperCase()+d.slice(1)}</button>)}
          </div>
          <div className="menu-grid" style={{overflowY:'auto'}}>
            {Array.from({length:100}).map((_,i) => (<button key={i} onClick={()=>openBoard('play',i+1)} className="level-btn">{i+1}</button>))}
          </div>
        </div>
      )}

      {screen === 'shop' && (
        <div className="screen">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <button className="btn btn-secondary" onClick={()=>setScreen('menu')}>← Back</button>
            <h2 style={{margin:0,fontSize:20,fontWeight:800,color:'#ec4899'}}>Cat Shop</h2>
            <div style={{width:60}}></div>
          </div>
          <p style={{fontSize:13,color:'#6b7280',marginBottom:12}}>Unlock by winning levels</p>
          <div className="menu-grid" style={{overflowY:'auto'}}>
            {CAT_EMOJIS.map((cat, i) => {
              const requiredWins = i * 3 + 1;
              const unlocked = state.stats.wins >= requiredWins;
              return (
                <button key={i} disabled={!unlocked} onClick={()=>{ if(unlocked){ setState(rotateSkin({...state, catSkinIndex:i, catSkin:CAT_EMOJIS[i]})); SoundManager.play('click'); }}} className="level-btn" style={{opacity: unlocked?1:0.35, fontSize:36}}>
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
            <button className="btn btn-secondary" onClick={()=>setScreen('menu')}>← Back</button>
            <h2 style={{margin:0,fontSize:20,fontWeight:800,color:'#9333ea'}}>Stats</h2>
            <div style={{width:60}}></div>
          </div>
          <div style={{background:'white',borderRadius:16,padding:20,boxShadow:'0 2px 8px rgba(0,0,0,0.06)',display:'flex',flexDirection:'column',gap:16}}>
            <div style={{display:'flex',justifyContent:'space-between'}}><span>Games Played</span><b>{state.stats.played}</b></div>
            <div style={{display:'flex',justifyContent:'space-between'}}><span>Games Won</span><b>{state.stats.wins}</b></div>
            <div style={{display:'flex',justifyContent:'space-between'}}><span>Win Rate</span><b>{state.stats.played?Math.round(state.stats.wins/state.stats.played*100)+'%':'0%'}</b></div>
            <div style={{display:'flex',justifyContent:'space-between'}}><span>Best Level</span><b>{state.highScore}</b></div>
            <div style={{display:'flex',justifyContent:'space-between'}}><span>Current Cat</span><b style={{fontSize:32}}>{state.catSkin}</b></div>
          </div>
        </div>
      )}

      {win && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}} onClick={()=>setWin(false)}>
          <div style={{background:'white',borderRadius:20,padding:32,maxWidth:380,width:'100%',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:72,marginBottom:16}}>🎉</div>
            <h2 style={{fontSize:28,fontWeight:800,color:'#9333ea',marginBottom:8}}>Level Complete!</h2>
            <p style={{color:'#6b7280',marginBottom:24}}>Great job solving the puzzle!</p>
            <button className="btn btn-primary" onClick={()=>setWin(false)} style={{width:'100%',padding:14}}>Continue</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
