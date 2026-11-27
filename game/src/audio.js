// Gobble Run sound: every noise is synthesised with WebAudio, no audio files. A gobble is a fast
// falling chirp stack, the squawk a harsh buzz, and pickups ring little bells. Sound starts only
// after the player's first key or click, as browsers require.

export class GobbleAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  unlock() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      this.ctx = null;
    }
  }

  tone(freqFrom, freqTo, seconds, type, gain, when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqTo), t0 + seconds);
    amp.gain.setValueAtTime(gain, t0);
    amp.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
    osc.connect(amp).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.02);
  }

  jump() { this.tone(320, 640, 0.14, 'square', 0.05); }
  dash() { this.tone(180, 720, 0.22, 'sawtooth', 0.04); }
  gobble() {
    for (let i = 0; i < 4; i += 1) this.tone(700 - i * 60, 260, 0.09, 'square', 0.06, i * 0.07);
  }
  squawk() { this.tone(900, 180, 0.3, 'sawtooth', 0.09); this.tone(1200, 300, 0.24, 'square', 0.05, 0.03); }
  pickup() { this.tone(880, 1320, 0.1, 'sine', 0.07); this.tone(1320, 1760, 0.12, 'sine', 0.05, 0.07); }
  shieldUp() { this.tone(520, 1040, 0.2, 'triangle', 0.08); }
  nearMiss() { this.tone(1400, 900, 0.08, 'sine', 0.04); }
  zoneFanfare() {
    this.tone(523, 523, 0.12, 'triangle', 0.07);
    this.tone(659, 659, 0.12, 'triangle', 0.07, 0.11);
    this.tone(784, 784, 0.2, 'triangle', 0.08, 0.22);
  }
  caught() {
    this.tone(392, 392, 0.18, 'triangle', 0.09);
    this.tone(330, 330, 0.18, 'triangle', 0.09, 0.17);
    this.tone(262, 196, 0.4, 'triangle', 0.09, 0.34);
  }
  escaped() {
    const notes = [523, 659, 784, 1046, 784, 1046];
    notes.forEach((n, i) => this.tone(n, n, 0.16, 'triangle', 0.08, i * 0.13));
    this.gobble();
  }
}
