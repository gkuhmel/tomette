// Vidéo 1 : « Sauvé à la dernière seconde ».
import { Shoot, cap, encode } from './lib.mjs';
const S = new Shoot('1-sauve');
const p = await S.open();
await p.evaluate(() => { const T = tomettes; T.setDifficulty('hard'); T.start(10, 'express'); T.autoplay('normal', 71, { thinkMs: 1100, blunder: 0.45, smart: true }); T.skip(2867 - 50); });
await S.hook();
const fmt = (g) => g.toFixed(2).replace('.', ',') + ' s';
let st = { alert: false, grace: 0 };
let alertFrame = -1, minGrace = 9, saveFrame = -1;
S.mark('whoosh');
// 1) Accroche + alerte, temps réel puis ralenti quand il reste moins de 0,8 s.
for (let i = 0; i < 400; i++) {
  const slow = st.alert && st.grace < 0.8;
  const o = { cap1: cap('La pile touche<br>le <span class="r">plafond</span>…', i, { y: 13, size: 42 }) };
  if (st.alert) {
    if (alertFrame < 0) { alertFrame = S.n; S.mark('whoosh', { g: 0.6 }); }
    o.vig = 0.55 + 0.35 * Math.sin(S.n * (slow ? 0.9 : 0.6));
    o.big = cap(`<span class="r">${fmt(st.grace)}</span>`, S.n - alertFrame, { y: 30, size: 64, rot: 0, pulse: slow ? 0.05 * Math.sin(S.n) : 0 });
    if (S.n % (slow ? 4 : 8) === 0) S.mark('tick', { g: slow ? 1 : 0.7 });
    if (slow) o.zoom = { s: 1 + Math.min(0.12, (S.n - alertFrame) * 0.002), x: 50, y: 30 };
    minGrace = Math.min(minGrace, st.grace);
  }
  const was = st.alert;
  st = await S.f(slow ? 1 : 2, o, slow ? 1000 / 60 : 1000 / 30);
  if (was && !st.alert && !st.over) { saveFrame = S.n; break; }
  if (st.over) { console.log('PERDU'); break; }
}
console.log('alert', alertFrame, 'save', saveFrame, 'minGrace', minGrace);
// 2) Sauvé : flash, impact, zoom.
S.mark('impact'); S.mark('music-on');
const left = fmt(Math.max(0.01, minGrace));
for (let k = 0; k < 50; k++) {
  const o = {
    flash: Math.max(0, 0.8 - k * 0.12), shake: Math.max(0, 9 - k * 0.8),
    zoom: { s: 1.1 - Math.min(0.1, k * 0.006), x: 50, y: 35 },
    big: cap('<span class="g">SAUVÉ&nbsp;!</span>', k, { y: 22, size: 76, rot: -4 }),
    cap2: k > 10 ? cap(`à <span class="y">${left}</span> près 😮‍💨`, k - 10, { y: 36, size: 40 }) : null,
  };
  if (k === 10) S.mark('whoosh', { g: 0.7 });
  await S.f(2, o);
}
// 3) Question + carte de fin.
S.mark('whoosh');
for (let k = 0; k < 40; k++) await S.f(2, { cap1: cap('Tu aurais tenu ? 👇', k, { y: 16, size: 46 }) });
S.mark('ding'); S.mark('music-off');
for (let k = 0; k < 50; k++) await S.f(0, { end: { t: k, l1: 'Gratuit · sans pub', l2: 'Lien en bio 👆' } });
await S.close();
encode('1-sauve');
console.log('frames', S.n);
