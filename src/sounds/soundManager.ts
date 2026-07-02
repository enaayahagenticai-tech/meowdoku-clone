const PREFIX = '/meowdoku-clone/src/sounds/sfx/';
const files: Record<string, string> = {
  click: `${PREFIX}click.mp3`,
  clickTick: `${PREFIX}click-tick.mp3`,
  place: `${PREFIX}place.mp3`,
  wrong: `${PREFIX}wrong.mp3`,
  win: `${PREFIX}win.mp3`,
  levelComplete: `${PREFIX}levelComplete.mp3`,
};

let audioCtx: AudioContext | null = null;

function getCtx() {
  if (!audioCtx) {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  return audioCtx;
}

function beep(freq: number, ms: number, type: 'sine' | 'triangle' = 'sine', vol = 0.0001) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = vol;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    setTimeout(() => { try { osc.stop(); } catch {} }, ms);
  } catch {}
}

export default {
  play(name: keyof typeof files, fallback: 'click' | 'clickTick' | 'place' | 'wrong' | 'win' | 'levelComplete' = 'clickTick') {
    const src = files[name] || files[fallback];
    try {
      const a = new Audio(src);
      a.preload = 'none';
      a.volume = 0.35;
      const p = a.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch {
      beep(660, 90, 'triangle', 0.0001);
    }
  },
};
