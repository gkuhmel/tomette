/**
 * Sons et musique générés en direct (Web Audio), sans fichier audio.
 * Le contexte audio ne démarre qu'après un premier geste (exigence de Safari).
 * Sur iPhone, le mode « ambient » respecte le bouton silencieux.
 */

/** Gamme pentatonique (do majeur) : tout ce qui est joué sonne juste ensemble. */
const PENTA = [0, 2, 4, 7, 9];
const noteHz = (step: number, base = 523.25) =>
  base * Math.pow(2, (PENTA[((step % 5) + 5) % 5] + 12 * Math.floor(step / 5)) / 12);

export class Sound {
  private ctx: AudioContext | null = null;
  private sfx: GainNode | null = null;
  private musicBus: GainNode | null = null;
  sfxOn = true;
  musicOn = true;
  private lastLand = 0;
  private musicTimer = 0;
  private nextBeat = 0;
  private beat = 0;
  /** Tempo de la musique (accéléré avec le niveau). */
  tempo = 1;
  private playing = false;

  /** À appeler dans un gestionnaire de geste (pointerdown…). */
  unlock(): void {
    try {
      const nav = navigator as Navigator & { audioSession?: { type: string } };
      if (nav.audioSession) nav.audioSession.type = 'ambient';
      if (!this.ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.sfx = this.ctx.createGain();
        this.sfx.gain.value = 0.55;
        this.sfx.connect(this.ctx.destination);
        this.musicBus = this.ctx.createGain();
        this.musicBus.gain.value = 0.16;
        this.musicBus.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /** Une note de « marimba » : sinus + harmonique, attaque courte. */
  private pluck(freq: number, at: number, dur = 0.35, vol = 0.35, out: AudioNode | null = this.sfx, type: OscillatorType = 'sine'): void {
    const ctx = this.ctx;
    if (!ctx || !out) return;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    g.connect(out);
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    o.start(at);
    o.stop(at + dur + 0.02);
    const h = ctx.createOscillator();
    const hg = ctx.createGain();
    hg.gain.value = 0.25;
    h.type = 'sine';
    h.frequency.value = freq * 4;
    h.connect(hg);
    hg.connect(g);
    h.start(at);
    h.stop(at + dur * 0.4);
  }

  private now(): number {
    return this.ctx ? this.ctx.currentTime + 0.005 : 0;
  }

  private ok(): boolean {
    return !!this.ctx && this.sfxOn && this.ctx.state === 'running';
  }

  swap(): void {
    if (!this.ok()) return;
    this.pluck(1320, this.now(), 0.06, 0.12, this.sfx, 'triangle');
  }

  land(): void {
    if (!this.ok()) return;
    const t = this.now();
    if (t - this.lastLand < 0.06) return;
    this.lastLand = t;
    this.pluck(196, t, 0.09, 0.14, this.sfx, 'triangle');
  }

  /** Disparition : accord qui monte d'un cran à chaque maillon de chaîne. */
  clear(chain: number, size: number): void {
    if (!this.ok()) return;
    const t = this.now();
    const root = (chain - 1) * 2;
    this.pluck(noteHz(root), t, 0.4, 0.3);
    this.pluck(noteHz(root + 2), t + 0.05, 0.4, 0.22);
    if (size >= 4) this.pluck(noteHz(root + 4), t + 0.1, 0.45, 0.2);
    if (chain >= 2) this.pluck(noteHz(root + 5), t + 0.15, 0.5, 0.22);
  }

  rosace(): void {
    if (!this.ok()) return;
    const t = this.now();
    for (let i = 0; i < 7; i++) this.pluck(noteHz(i + 3), t + i * 0.06, 0.6, 0.22);
    this.pluck(noteHz(10), t + 0.45, 1.2, 0.18);
  }

  gold(): void {
    if (!this.ok() || !this.ctx || !this.sfx) return;
    const ctx = this.ctx;
    const t = this.now();
    // Souffle filtré qui monte.
    const len = Math.floor(ctx.sampleRate * 0.5);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(400, t);
    f.frequency.exponentialRampToValueAtTime(4000, t + 0.45);
    const g = ctx.createGain();
    g.gain.value = 0.25;
    src.connect(f);
    f.connect(g);
    g.connect(this.sfx);
    src.start(t);
    [0, 2, 4].forEach((s, i) => this.pluck(noteHz(s + 5), t + 0.3 + i * 0.02, 0.9, 0.18));
  }

  slide(): void {
    if (!this.ok()) return;
    const t = this.now();
    this.pluck(660, t, 0.08, 0.1, this.sfx, 'triangle');
    this.pluck(520, t + 0.05, 0.1, 0.08, this.sfx, 'triangle');
  }

  repair(): void {
    if (!this.ok()) return;
    this.pluck(noteHz(9), this.now(), 0.25, 0.14);
  }

  /** Dalle de mortier qui tombe : deux notes graves. */
  mortar(): void {
    if (!this.ok()) return;
    const t = this.now();
    this.pluck(98, t, 0.2, 0.2, this.sfx, 'triangle');
    this.pluck(73, t + 0.08, 0.3, 0.18, this.sfx, 'triangle');
  }

  /** Dalle transformée en tuiles : petit arpège qui s'éparpille. */
  crumble(): void {
    if (!this.ok()) return;
    const t = this.now();
    [4, 7, 11, 14].forEach((n, i) => this.pluck(noteHz(n), t + i * 0.04, 0.18, 0.1));
  }

  level(): void {
    if (!this.ok()) return;
    const t = this.now();
    this.pluck(noteHz(5), t, 0.3, 0.2);
    this.pluck(noteHz(7), t + 0.12, 0.5, 0.2);
  }

  alertTick(): void {
    if (!this.ok()) return;
    this.pluck(330, this.now(), 0.12, 0.18, this.sfx, 'square');
  }

  gameOver(): void {
    if (!this.ok()) return;
    const t = this.now();
    [4, 2, 0, -3].forEach((s, i) => this.pluck(noteHz(s, 392), t + i * 0.18, 0.5, 0.22));
  }

  ui(): void {
    if (!this.ok()) return;
    this.pluck(880, this.now(), 0.05, 0.08, this.sfx, 'triangle');
  }

  // --- Musique : arpège doux généré, grille d'accords en boucle -------------

  startMusic(): void {
    this.playing = true;
    if (!this.ctx || this.musicTimer) return;
    this.nextBeat = this.ctx.currentTime + 0.1;
    this.musicTimer = window.setInterval(() => this.schedule(), 60);
  }

  stopMusic(): void {
    this.playing = false;
    window.clearInterval(this.musicTimer);
    this.musicTimer = 0;
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || !this.playing) return;
    if (!this.musicOn || ctx.state !== 'running') {
      this.nextBeat = ctx.currentTime + 0.1;
      return;
    }
    // Accords : I – vi – IV – V (en degrés pentatoniques approximatifs).
    const chords = [0, -2, -3, -1];
    const pattern = [0, 2, 4, 2, 5, 4, 2, 4];
    const step = 0.32 / Math.max(0.5, this.tempo);
    while (this.nextBeat < ctx.currentTime + 0.2) {
      const bar = Math.floor(this.beat / 8) % chords.length;
      const n = chords[bar] + pattern[this.beat % 8];
      this.pluck(noteHz(n, 261.63), this.nextBeat, 0.5, this.beat % 2 ? 0.18 : 0.26, this.musicBus);
      if (this.beat % 8 === 0) this.pluck(noteHz(chords[bar], 130.81), this.nextBeat, 1.6, 0.3, this.musicBus, 'triangle');
      this.nextBeat += step;
      this.beat++;
    }
  }
}
