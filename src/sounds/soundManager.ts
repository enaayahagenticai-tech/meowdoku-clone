// Sound manager using Web Audio API (no external files needed)
// Free sounds - no ElevenLabs API key required

class SoundManager {
  private ctx: AudioContext;
  
  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  
  play(sound: 'place' | 'wrong' | 'win' | 'click') {
    switch(sound) {
      case 'place':
        this.meowSound();
        break;
      case 'wrong':
        this.heartbeatSound();
        break;
      case 'win':
        this.successSound();
        break;
      case 'click':
        this.clickSound();
        break;
    }
  }
  
  private meowSound() {
    // Simple "meow" sound - low then high tone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    gain.gain.value = 0.2;
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.1);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }
  
  private heartbeatSound() {
    // Low pulse for wrong answer
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    osc.frequency.value = 150;
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }
  
  private successSound() {
    // Ascending arpeggio for win
    const notes = [523, 659, 784, 1047]; // C E G C
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.1 + 0.15);
      osc.frequency.value = freq;
      osc.start(this.ctx.currentTime + i * 0.1);
      osc.stop(this.ctx.currentTime + i * 0.1 + 0.15);
    });
  }
  
  private clickSound() {
    // Soft blip
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    gain.gain.value = 0.08;
    osc.frequency.value = 800;
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }
}

export default new SoundManager();