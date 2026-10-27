// Vidéo 4 : « Tu vois le coup ? » — plateau figé, compte à rebours, puis la solution (un seul échange → ×5).
import { Shoot, cap, encode } from './lib.mjs';
const S = new Shoot('4-coup');
const p = await S.open();
await p.evaluate(() => { const T = tomettes; T.setDifficulty('hard'); T.start(16, 'express'); T.autoplay('normal', 113, { thinkMs: 1100, blunder: 0.45, smart: true }); T.skip(8676); });
await S.hook();
await S.f(0, {}); S.n = 0; // première image propre (le dessin rattrape l'état)
const q1 = (k) => cap('Tu vois le coup&nbsp;? 🤔', k, { y: 10, size: 38 });
const q2 = (k) => cap('<span class="y">1 seul échange</span><br>pour une chaîne ×5', k, { y: 17.5, size: 28, rot: 2 });
const z = (k) => ({ s: 1 + Math.min(0.06, k * 0.0007), x: 50, y: 60 });
S.mark('whoosh'); S.mark('music-off');
let k = 0;
// 1) Plateau figé + compte à rebours 3, 2, 1.
for (let n = 3; n >= 1; n--) {
  S.mark('tick', { g: 1.2 });
  for (let j = 0; j < 30; j++, k++) await S.f(0, { cap1: q1(k), cap2: k > 8 ? q2(k - 8) : null, big: cap(`${n}`, j, { y: 27, size: 100, rot: 0, alpha: Math.max(0.15, 1 - j / 34) }), zoom: z(k) }, 0);
}
// 2) La réponse.
S.mark('whoosh'); S.mark('music-on');
const ring = { c1: 2, r1: 9, c2: 3, r2: 8 };
for (let j = 0; j < 30; j++, k++) await S.f(0, { cap1: cap('La réponse 👇', j, { y: 12, size: 46 }), ring, zoom: z(k) }, 1000 / 30);
// 3) L'échange et la chaîne au ralenti.
let chain = 0, chainAt = 0;
for (let j = 0; j < 68; j++, k++) {
  const since = S.n - chainAt;
  const o = {
    ring: j < 6 ? ring : null,
    big: chain >= 2 ? cap(`<span class="${chain >= 5 ? 'r' : chain >= 4 ? 'y' : ''}">×${chain}</span>`, since, { y: 18, size: 80 + chain * 12, rot: -3 + (chain % 2) * 6 }) : null,
    zoom: { s: 1.06 + Math.min(0.1, chain * 0.02), x: 50, y: 60 },
    flash: chain >= 2 ? Math.max(0, 0.3 - since * 0.08) : 0, shake: chain >= 4 ? Math.max(0, chain * 1.5 - since * 0.9) : 0,
  };
  const st = await S.f(1, o, 1000 / 60);
  for (const c of st.clears) if (c.chain > chain) { chain = c.chain; chainAt = S.n; if (chain >= 2) S.mark(chain >= 5 ? 'impact' : 'whoosh', { g: chain >= 5 ? 0.8 : 0.4 }); }
}
// 4) Chute : l'ordinateur ne joue plus, pour ne montrer que ce coup.
await p.evaluate(() => tomettes.autoplay(null));
S.mark('whoosh');
for (let j = 0; j < 45; j++) await S.f(2, { big: cap(`<span class="r">×${chain}</span>`, j + 8, { y: 18, size: 140, rot: -4 }), cap2: cap('en <span class="y">un seul</span> coup 🤯', j, { y: 37, size: 40 }), zoom: { s: 1.16 - Math.min(0.16, j * 0.01), x: 50, y: 60 } });
S.mark('whoosh');
for (let j = 0; j < 40; j++) await S.f(2, { cap1: cap('Tu l’avais vu ? 👀', j, { y: 14, size: 48 }) });
S.mark('ding'); S.mark('music-off');
for (let j = 0; j < 50; j++) await S.f(0, { end: { t: j, l1: 'Gratuit · sans pub', l2: 'Lien en bio 👆' } });
await S.close();
encode('4-coup');
console.log('frames', S.n, 'chain', chain);
