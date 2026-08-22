export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private oscA: OscillatorNode | null = null;
  private oscB: OscillatorNode | null = null;
  private noise: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;
  private screech: GainNode | null = null;
  muted = false;
  unlocked = false;

  unlock() {
    if (this.unlocked && this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx({ latencyHint: "interactive" });
    this.master = this.ctx.createGain();
    this.sfx = this.ctx.createGain();
    this.engineGain = this.ctx.createGain();
    this.screech = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.55;
    this.sfx.gain.value = 0.7;
    this.engineGain.gain.value = 0.0;
    this.screech.gain.value = 0;
    this.sfx.connect(this.master);
    this.engineGain.connect(this.master);
    this.screech.connect(this.master);
    this.master.connect(this.ctx.destination);

    this.oscA = this.ctx.createOscillator();
    this.oscB = this.ctx.createOscillator();
    this.oscA.type = "sawtooth";
    this.oscB.type = "square";
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    this.oscA.connect(filter);
    this.oscB.connect(filter);
    filter.connect(this.engineGain);
    this.oscA.start();
    this.oscB.start();

    const n = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const data = n.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noise = this.ctx.createBufferSource();
    this.noise.buffer = n;
    this.noise.loop = true;
    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.value = 0.04;
    const nFilter = this.ctx.createBiquadFilter();
    nFilter.type = "bandpass";
    nFilter.frequency.value = 1400;
    this.noise.connect(nFilter);
    nFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.screech);
    this.noise.start();

    this.unlocked = true;
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.55, this.ctx.currentTime, 0.02);
    }
  }

  setEngine(rpm: number, throttle: number, drifting: boolean) {
    if (!this.ctx || !this.oscA || !this.oscB || !this.engineGain || !this.screech) return;
    const t = this.ctx.currentTime;
    const freq = 42 + rpm * 0.018;
    this.oscA.frequency.setTargetAtTime(freq, t, 0.03);
    this.oscB.frequency.setTargetAtTime(freq * 0.5, t, 0.03);
    const vol = 0.02 + throttle * 0.07 + rpm / 90000;
    this.engineGain.gain.setTargetAtTime(vol, t, 0.05);
    this.screech.gain.setTargetAtTime(drifting ? 0.12 + throttle * 0.06 : 0.0, t, 0.04);
  }

  beep(freq: number, dur = 0.12, vol = 0.18) {
    if (!this.ctx || !this.sfx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "square";
    o.frequency.value = freq;
    g.gain.value = vol;
    g.gain.setTargetAtTime(0, this.ctx.currentTime + dur * 0.4, 0.04);
    o.connect(g);
    g.connect(this.sfx);
    o.start();
    o.stop(this.ctx.currentTime + dur);
  }

  impact() {
    this.beep(90, 0.16, 0.22);
  }

  countdown(n: number) {
    this.beep(n <= 0 ? 880 : 440, n <= 0 ? 0.28 : 0.12, 0.2);
  }

  finish() {
    this.beep(660, 0.18, 0.2);
    setTimeout(() => this.beep(880, 0.28, 0.2), 140);
  }

  ui() {
    this.beep(520, 0.07, 0.1);
  }

  resume() {
    if (this.ctx?.state === "suspended") void this.ctx.resume();
  }

  dispose() {
    try {
      this.oscA?.stop();
      this.oscB?.stop();
      this.noise?.stop();
      void this.ctx?.close();
    } catch {
      /* already closed */
    }
    this.ctx = null;
    this.unlocked = false;
  }
}
