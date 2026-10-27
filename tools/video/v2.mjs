// Vidéo 2 : la plus grosse chaîne, au ralenti, compteur qui monte.
import { Shoot, cap, encode } from './lib.mjs';
const S = new Shoot('2-chaine');
const p = await S.open();
await p.evaluate(() => { const T = tomettes; T.setDifficulty('hard'); T.start(16, 'express'); T.autoplay('normal', 113, { thinkMs: 1100, blunder: 0.45, smart: true }); T.skip(11654 - 36); });
await S.hook();
S.mark('whoosh');
let chain = 0, chainAt = -99, steps = 11654 - 36;
const hook = (k) => cap('Attends la fin… 👀', k, { y: 12, size: 44 });
// 1) Accroche en temps réel jusqu'au premier échange.
for (let k = 0; steps < 11654; k++) { await S.f(2, { cap1: hook(k) }); steps += 2; }
// 2) La chaîne à 0,75x, le compteur grossit à chaque palier.
let k = 0;
while (steps < 11885) {
  const n = k % 2 ? 2 : 1; k++;
  const since = S.n - chainAt;
  const o = {
    cap1: chain < 2 ? hook(S.n) : null,
    big: chain >= 2 ? cap(`<span class="${chain >= 6 ? 'r' : chain >= 4 ? 'y' : ''}">×${chain}</span>`, since, { y: 20, size: 70 + chain * 10, rot: -3 + (chain % 2) * 6 }) : null,
    zoom: { s: 1 + Math.min(0.16, chain * 0.022), x: 50, y: 55 },
    flash: chain >= 2 ? Math.max(0, 0.35 - since * 0.08) : 0,
    shake: chain >= 4 ? Math.max(0, chain * 1.4 - since * 0.9) : 0,
  };
  const st = await S.f(n, o, (1000 / 60) * n);
  steps += n;
  for (const c of st.clears) if (c.chain > chain || c.chain === 1) {
    chain = c.chain; chainAt = S.n;
    if (chain >= 2) S.mark(chain >= 6 ? 'impact' : 'whoosh', { g: chain >= 6 ? 0.8 : 0.4 });
  }
}
// 3) Final : ×7 en grand, ralenti puis temps réel.
S.mark('impact'); S.mark('music-on');
for (let j = 0; j < 45; j++) {
  await S.f(j < 20 ? 1 : 2, {
    big: cap(`<span class="r">×${chain}</span>`, j + 8, { y: 20, size: 150, rot: -4, pulse: 0.04 * Math.sin(j * 0.8) }),
    cap2: j > 12 ? cap('<span class="y">CHAÎNE</span> 🤯', j - 12, { y: 40, size: 48 }) : null,
    zoom: { s: 1.16 - Math.min(0.16, j * 0.008), x: 50, y: 55 },
    shake: Math.max(0, 10 - j * 0.7), flash: Math.max(0, 0.7 - j * 0.12),
  }, j < 20 ? 1000 / 60 : 1000 / 30);
  if (j === 12) S.mark('whoosh', { g: 0.6 });
}
S.mark('whoosh');
for (let j = 0; j < 40; j++) await S.f(2, { cap1: cap('Ton record ? 👇', j, { y: 14, size: 48 }) });
S.mark('ding'); S.mark('music-off');
for (let j = 0; j < 50; j++) await S.f(0, { end: { t: j, l1: 'Gratuit · sans pub', l2: 'Lien en bio 👆' } });
await S.close();
encode('2-chaine');
console.log('frames', S.n, 'chain', chain);
