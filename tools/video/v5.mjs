// Vidéo 5 : le dev en coulisses (plans courts coupés en rythme).
import { Shoot, cap, encode } from './lib.mjs';
const S = new Shoot('5-coulisses');
const p = await S.open();
const SEG = 46; // ~3 temps à 118 BPM
const cut = () => { S.mark('whoosh', { g: 0.7 }); };
const c1 = (html, k, extra = {}) => cap(html, k, { y: 13, size: 38, ...extra });
const start = (seed, mode, diff, skip, aiSeed, think = 1100, bl = 0.45) => p.evaluate(([seed, mode, diff, skip, aiSeed, think, bl]) => {
  for (const id of ['screen-exp', 'screen-home']) { const e = document.getElementById(id); if (e) e.hidden = true; }
  const T = tomettes; T.setDifficulty(diff); T.start(seed, mode); T.autoplay('normal', aiSeed, { thinkMs: think, blunder: bl, smart: true }); T.skip(skip); window.ovHook(); }, [seed, mode, diff, skip, aiSeed, think, bl]);
// A) Accueil.
cut();
for (let k = 0; k < SEG; k++) await S.f(0, { cap1: c1('J’ai créé un jeu 🧩', k, { y: 61 }), cap2: k > 12 ? cap('inspiré des <span class="y">tomettes</span><br>de Provence', k - 12, { y: 76, size: 34, rot: 2 }) : null }, 1000 / 30);
// B) Échanger en biais (début de partie).
await start(10, 'express', 'hard', 700, 71); cut();
for (let k = 0; k < SEG; k++) await S.f(2, { flash: Math.max(0, 0.5 - k * 0.15), cap1: c1('Tu échanges les tuiles<br><span class="y">en biais</span> ↗️', k) });
// C) Une chaîne (un seul coup → ×5).
await start(16, 'express', 'hard', 8664, 113); cut();
let chain = 0;
for (let k = 0; k < SEG + 10; k++) {
  const st = await S.f(k < 8 ? 2 : 1, { flash: Math.max(0, 0.5 - k * 0.15), cap1: c1('Tu enchaînes<br>les <span class="y">combos</span>', k),
    big: chain >= 2 ? cap(`<span class="${chain >= 5 ? 'r' : 'y'}">×${chain}</span>`, 10, { y: 33, size: 70 + chain * 10, rot: -4 }) : null, zoom: { s: 1 + chain * 0.015, x: 50, y: 60 } }, k < 8 ? 1000 / 30 : 1000 / 60);
  for (const c of st.clears) if (c.chain > chain) chain = c.chain;
}
// D) Rosace.
await start(4, 'mosaic', 'normal', 1266 - 40, 29, 900, 0.3); cut();
let ros = -1;
for (let k = 0; k < SEG + 10; k++) {
  const slow = k > 18 && (ros < 0 || k - ros < 16);
  const st = await S.f(slow ? 1 : 2, { flash: Math.max(0, 0.5 - k * 0.15) + (ros >= 0 ? Math.max(0, 0.4 - (k - ros) * 0.1) : 0),
    cap1: c1('Tu formes<br>des <span class="y">rosaces</span> 🌸', k),
    big: ros >= 0 ? cap('🌸', k - ros, { y: 30, size: 90, rot: 0 }) : null,
    zoom: { s: 1.5, x: 82, y: 82 } }, slow ? 1000 / 60 : 1000 / 30);
  if (ros < 0 && st.clears.some((c) => c.ros)) { ros = k; S.mark('impact', { g: 0.5 }); }
}
console.log('rosace à', ros);
// E) Duel : les dalles tombent.
await p.evaluate(() => tomettes.autoplay(null));
await p.evaluate(() => { const T = tomettes; T.setDifficulty('hard'); T.start(4, 'duel'); T.autoplay('hard', 29, { thinkMs: 800, blunder: 0.3, smart: true }); T.skip(4120); window.ovHook(); }); cut();
for (let k = 0; k < SEG + 10; k++) await S.f(3, { flash: Math.max(0, 0.5 - k * 0.15), cap1: c1('Tu affrontes l’ordi…<br>ou <span class="y">tes amis</span> ⚔️', k), mini: 1.6 }, 1000 / 20);
// F) Expédition.
await p.evaluate(() => { tomettes.autoplay(null); document.getElementById('screen-home').hidden = false; document.querySelectorAll('#screen-home .hex-btn')[4].click(); }); cut();
for (let k = 0; k < SEG; k++) {
  if (k === 22) await p.evaluate(() => { const s = document.getElementById('screen-exp'); s.scrollTop = 330; });
  await S.f(0, { flash: Math.max(0, 0.5 - k * 0.15), cap1: c1('Et une <span class="y">expédition</span><br>en 20 manches 🧭', k, { y: 60 }) }, 1000 / 30);
}
// G) Fin.
S.mark('ding'); S.mark('music-off');
for (let k = 0; k < 66; k++) await S.f(0, { end: { t: k, l1: '6 langues · 0 pub · fait main', l2: 'Gratuit · lien en bio 👆' },
  cap1: k > 6 ? cap('Tu testes ? 👇', k - 6, { y: 12, size: 44 }) : null });
await S.close();
encode('5-coulisses');
console.log('frames', S.n);
