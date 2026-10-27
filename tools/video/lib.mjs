import { open } from './common.mjs';
import { mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
export const DIR = fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, '');
/** Images et vidéos produites (hors dépôt). */
export const OUT = `${DIR}/out`;
export class Shoot {
  constructor(name) { this.name = name; this.n = 0; this.dir = `${OUT}/frames-${name}`; rmSync(this.dir, { recursive: true, force: true }); mkdirSync(this.dir, { recursive: true }); this.marks = []; }
  async open(opts) { const { b, p } = await open(opts); this.b = b; this.p = p; await p.addScriptTag({ content: readFileSync(`${DIR}/overlay.js`, 'utf8') }); return p; }
  async hook() { await this.p.evaluate(() => window.ovHook()); }
  mark(k, extra = {}) { this.marks.push({ f: this.n, k, ...extra }); }
  /** Une image : `steps` pas de jeu, `dt` ms d'horloge (effets visuels), calque `o`. */
  async f(steps, o = {}, dt = 1000 / 30) {
    await this.p.clock.runFor(dt);
    const st = await this.p.evaluate(([steps, o]) => { window.ovRender(o); if (steps >= 0) tomettes.frame(steps); window.ovRender(o);
      const g = tomettes.game; return { clears: window.__log.filter((e) => e.f === o.frame && e.k === 'clear'), alert: g.alert, grace: g.graceLeft, over: g.over, score: g.score, chain: g.chain, clearing: g.clearing, state: tomettes.state }; }, [steps, { ...o, frame: this.n }]);
    await this.p.screenshot({ path: `${this.dir}/${String(this.n).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
    this.n++;
    return st;
  }
  async close() {
    const log = await this.p.evaluate(() => window.__log);
    writeFileSync(`${this.dir}/log.json`, JSON.stringify({ frames: this.n, log, marks: this.marks }));
    await this.b.close();
  }
}
/** Texte d'accroche : t = images depuis l'apparition. */
export const cap = (html, t, extra = {}) => ({ html, t, ...extra });
export function encode(name, music = true) {
  const d = `${OUT}/frames-${name}`;
  execFileSync('python3', [`${DIR}/sfx.py`, `${d}/log.json`, `${d}/audio.wav`, music ? '1' : '0']);
  mkdirSync(OUT, { recursive: true });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', `${d}/%05d.jpg`, '-i', `${d}/audio.wav`,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '19', '-preset', 'medium', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', '-af', 'acompressor=threshold=-24dB:ratio=4:attack=5:release=120:makeup=6,loudnorm=I=-14:TP=-1.5:LRA=9', '-ar', '44100', `${OUT}/tomettes-${name}.mp4`]);
}
