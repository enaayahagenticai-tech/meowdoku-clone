// Sound manager: plays file-based SFX if available, otherwise falls back to synthesized audio.
// Files belong in `src/sounds/sfx/`. Keep the existing files as a safety fallback.

export type SoundName = 'place' | 'wrong' | 'win' | 'levelComplete' | 'click';

const SFX_PATHS: Record<SoundName, string> = {
  place: './sfx/place.mp3',
  wrong: './sfx/wrong.mp3',
  win: './sfx/win.mp3',
  levelComplete: './sfx/levelComplete.mp3',
  click: './sfx/click.mp3',
};

class SoundManager {
  private ctx: AudioContext | null = null;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  play(sound: SoundName) {
    const url = SFX_PATHS[sound];
    if (url) {
      try {
        const audio = new Audio(url);
        audio.addEventListener('error', () => this.playSynthesized(sound), {once: true});
        audio.play().catch(() => this.playSynthesized(sound));
        return;
      } catch {
        // continue to synthesized fallback below
      }
    }
    this.playSynthesized(sound);
  }

  private playSynthesized(sound: SoundName) {
    const ctx = this.getCtx();
    switch (sound) {
      case 'place': this.meowSound(ctx); break;
      case 'wrong': this.heartbeatSound(ctx); break;
      case 'win': this.successSound(ctx); break;
      case 'levelComplete': this.fanfareSound(ctx); break;
      case 'click': this.clickSound(ctx); break;
    }
  }

  private meowSound(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    gain.gain.value = 0.22;
    osc.frequency.setValueAtTime(240, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(560, ctx.currentTime + 0.12);
    osc.start(); osc.stop(ctx.currentTime + 0.18);
  }

  private heartbeatSound(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.frequency.value = 180;
    osc.start(); osc.stop(ctx.currentTime + 0.35);
  }

  private successSound(ctx: AudioContext) {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.18);
      osc.frequency.value = freq;
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.18);
    });
  }

  private fanfareSound(ctx: AudioContext) {
    const chords = [
      [523, 659, 784],
      [587, 740, 880],
      [659, 831, 988],
    ] as const;
    chords.forEach((chord, i) => {
      const start = ctx.currentTime + i * 0.2;
      chord.forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.09, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
        osc.frequency.value = freq;
        osc.start(start);
        osc.stop(start + 0.4);
      });
    });
  }

  private clickSound(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    gain.gain.value = 0.1;
    osc.frequency.value = 960;
    osc.start(); osc.stop(ctx.currentTime + 0.06);
  }
}

export default new SoundManager();
