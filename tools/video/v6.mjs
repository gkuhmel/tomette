// Vidéo 6 : le sol de tomettes qui devient le jeu.
import { Shoot, cap, encode, DIR } from './lib.mjs';
import { readFileSync } from 'node:fs';
const S = new Shoot('6-sol');
const p = await S.open();
await p.addScriptTag({ content: readFileSync(`${DIR}/floor.js`, 'utf8') });
await p.evaluate(() => { const T = tomettes; T.setDifficulty('hard'); T.start(16, 'express'); T.autoplay('normal', 113, { thinkMs: 1100, blunder: 0.45, smart: true }); T.skip(8640); window.ovHook(); });
S.mark('music-off');
// 1) Le sol (caméra qui glisse lentement).
for (let k = 0; k < 80; k++) await S.f(0, { floor: { zoom: 1.15 - k * 0.0012, pan: k * 0.6 },
  cap1: k > 4 ? cap('Ces carreaux,<br>tu les as déjà vus&nbsp;👀', k - 4, { y: 12, size: 34 }) : null,
  cap2: k > 38 ? cap('les <span class="y">tomettes</span><br>de Provence 🧡', k - 38, { y: 76, size: 38, rot: 2 }) : null });
S.mark('whoosh');
// 2) Les tomettes prennent les couleurs du jeu.
for (let k = 0; k < 54; k++) {
  if (k % 3 === 0 && k < 45) S.mark('tick', { g: 0.5 + k / 60 });
  await S.f(0, { floor: { zoom: 1.054 - k * 0.0012, pan: 48 + k * 0.6, wave: k / 38 }, cap1: cap('…et si on y<br><span class="y">jouait</span>&nbsp;? 🤔', k, { y: 11, size: 40 }) });
}
// 3) Fondu vers le vrai jeu.
S.mark('impact', { g: 0.6 }); S.mark('music-on');
let chain = 0, chainAt = 0;
for (let k = 0; k < 150; k++) {
  const o = { floor: k < 12 ? { zoom: 1.0, pan: 73, wave: 3, alpha: 1 - k / 12 } : null, flash: k < 12 ? 0.25 * (1 - k / 12) : 0,
    cap1: k < 70 ? cap('J’en ai fait<br>un <span class="y">jeu</span>&nbsp;🧩', k, { y: 11, size: 40 }) : cap('Tu <span class="y">échanges</span>,<br>ça <span class="r">enchaîne</span>', k - 70, { y: 11, size: 38 }),
    big: chain >= 2 ? cap(`<span class="${chain >= 5 ? 'r' : 'y'}">×${chain}</span>`, S.n - chainAt, { y: 24, size: 70 + chain * 12, rot: -4 }) : null };
  const st = await S.f(2, o);
  for (const c of st.clears) if (c.chain > chain) { chain = c.chain; chainAt = S.n; if (chain >= 3) S.mark('whoosh', { g: 0.4 }); }
  if (k === 70) S.mark('whoosh', { g: 0.6 });
}
S.mark('ding'); S.mark('music-off');
for (let k = 0; k < 60; k++) await S.f(0, { end: { t: k, l1: 'Le puzzle des tomettes', l2: 'Gratuit · lien en bio 👆' } });
await S.close();
encode('6-sol');
console.log('frames', S.n, 'chain', chain);
