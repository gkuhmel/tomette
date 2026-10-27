// Captures brutes du jeu pour les stores : 7 scènes × langues × formats d'écran.
import { open } from '../video/common.mjs';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CJK_CSS } from './raw-fonts.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const OVERLAY = readFileSync(`${HERE}../video/overlay.js`, 'utf8');
export const DEVICES = {
  iphone: { width: 360, height: 780, scale: 3 },
  android: { width: 360, height: 640, scale: 3 },
  ipad: { width: 768, height: 1024, scale: 2 },
};
const LANGS = (process.env.LANGS || 'fr,en,es,de,it,zh').split(',');
const ONLY = process.env.DEVICES ? process.env.DEVICES.split(',') : Object.keys(DEVICES);

async function frames(p, n, steps = 1, dt = 1000 / 60) {
  for (let i = 0; i < n; i++) { await p.clock.runFor(dt); await p.evaluate((s) => tomettes.frame(s), steps); }
}
const start = (p, a) => p.evaluate(([seed, mode, diff, skip, aiSeed, think, bl, skill]) => {
  for (const s of document.querySelectorAll('.screen')) if (s.id !== 'screen-rotate') s.hidden = true;
  const T = tomettes; T.setDifficulty(diff); T.start(seed, mode);
  T.autoplay(skill ?? 'normal', aiSeed, { thinkMs: think, blunder: bl, smart: true }); T.skip(skip); window.ovHook();
}, a);
const clean = (p) => p.evaluate(() => window.ovRender({ frame: 0, touch: false }));

for (const dev of ONLY) for (const lang of LANGS) {
  const out = `${HERE}out/raw/${dev}/${lang}`; mkdirSync(out, { recursive: true });
  const { b, p } = await open({ lang, ...DEVICES[dev] });
  await p.addScriptTag({ content: OVERLAY });
  if (lang === 'zh') {
    await p.addStyleTag({ content: CJK_CSS });
    await p.evaluate(async () => { await Promise.all(['500', '700', '800', '900'].flatMap((w) => [document.fonts.load(`${w} 20px Nunito`, '经典远征'), document.fonts.load(`${w} 20px Fredoka`, '经典远征')])); });
  }
  const shot = (name) => p.screenshot({ path: `${out}/${name}.png` });
  // 6) Accueil (avant toute partie).
  await p.clock.runFor(2500); await clean(p); await shot('6-modes');
  // 2) Tutoriel, étape « En biais » (main animée).
  await p.evaluate(() => document.querySelector('#screen-home .tool-btn').click());
  await p.clock.runFor(800); await p.keyboard.press('KeyN'); await frames(p, 40, 1); await clean(p); await shot('2-biais');
  // 1) Un seul coup → chaîne ×5 (popup en cours).
  await start(p, [16, 'express', 'hard', 8722, 113, 1100, 0.45]); await frames(p, 11); await clean(p); await shot('1-chaine5');
  // 3) Chaîne ×7.
  await start(p, [16, 'express', 'hard', 11868, 113, 1100, 0.45]); await frames(p, 11); await clean(p); await shot('3-chaine7');
  // 4) Rosace et tomette d'or (Mosaïque).
  await start(p, [4, 'mosaic', 'normal', 1262, 29, 900, 0.3]); await frames(p, 9); await clean(p); await shot('4-rosace');
  // 5) Duel contre l'ordinateur (dalles qui tombent).
  await start(p, [4, 'duel', 'hard', 5200, 29, 800, 0.3, 'hard']); await frames(p, 6, 2); await clean(p); await shot('5-duel');
  // 7) Expédition : choix d'une carte après la 1re manche.
  await p.evaluate(() => { tomettes.autoplay(null); localStorage.removeItem('tomettes.run');
    for (const s of document.querySelectorAll('.screen')) s.hidden = true; document.getElementById('screen-home').hidden = false;
    document.querySelectorAll('#screen-home .hex-btn')[4].click(); });
  await p.clock.runFor(300);
  await p.evaluate(() => document.querySelector('#screen-exp .btn.primary').click());
  await frames(p, 30, 2);
  await p.keyboard.press('KeyW'); await frames(p, 4, 2);
  await p.clock.runFor(3000); await frames(p, 2, 0); await clean(p); await shot('7-expedition');
  await b.close();
  console.log('ok', dev, lang);
}
