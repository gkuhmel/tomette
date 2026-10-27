// Visuels des stores : accroche + capture dans un cadre, aux formats Apple et Google Play.
import { open } from '../video/common.mjs';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CJK_CSS } from './raw-fonts.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = `${HERE}../..`;
const CAPTIONS = JSON.parse(readFileSync(`${HERE}captions.json`, 'utf8'));
const LANGS = (process.env.LANGS || Object.keys(CAPTIONS).join(',')).split(',');
const SCENES = ['1-chaine5', '2-biais', '3-chaine7', '4-rosace', '5-duel', '6-modes', '7-expedition'];
// Couleurs des tuiles (thème Faïence), une par scène.
const TILES = ['#f2766b', '#3466d6', '#f2c94c', '#5cb85c', '#9b7ede', '#2fb5b0'];
const SCENE_COLOR = ['#f2766b', '#2fb5b0', '#e0a92a', '#9b7ede', '#f2766b', '#3466d6', '#5cb85c'];

/** Formats : taille finale, capture source, largeur de la capture, tailles de texte. */
const FORMATS = {
  'appstore-iphone-6.9': { w: 1320, h: 2868, src: 'iphone', shotW: 1000, h1: 108, h2: 54, top: 150, bezel: 26, radius: 96 },
  'appstore-ipad-13': { w: 2064, h: 2752, src: 'ipad', shotW: 1560, h1: 124, h2: 64, top: 140, bezel: 30, radius: 60 },
  'googleplay-phone': { w: 1080, h: 1920, src: 'android', shotW: 800, h1: 80, h2: 40, top: 80, bezel: 20, radius: 64 },
};

const font = (re) => {
  const f = readdirSync(`${ROOT}/dist/assets`).find((n) => re.test(n));
  return `data:font/woff2;base64,${readFileSync(`${ROOT}/dist/assets/${f}`).toString('base64')}`;
};
const FONTS = `
@font-face{font-family:Fredoka;font-weight:700;src:url(${font(/^fredoka-latin-700-normal.*woff2$/)})}
@font-face{font-family:Nunito;font-weight:800;src:url(${font(/^nunito-latin-800-normal.*woff2$/)})}
@font-face{font-family:Nunito;font-weight:900;src:url(${font(/^nunito-latin-900-normal.*woff2$/)})}`;

/** Hexagones décoratifs (positions fixes, couleurs du jeu). */
function hexes(w, h, seed) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  let out = '';
  for (let i = 0; i < 9; i++) {
    const size = w * (0.06 + rnd() * 0.12);
    const x = rnd() * w - size / 2, y = rnd() * h - size / 2;
    out += `<i class="hx" style="left:${x}px;top:${y}px;width:${size}px;height:${size * 0.866}px;background:${TILES[Math.floor(rnd() * 6)]};opacity:${0.1 + rnd() * 0.12};transform:rotate(${rnd() * 30 - 15}deg)"></i>`;
  }
  return out;
}

function page(fmt, lang, scene, i, shot) {
  const F = FORMATS[fmt];
  const [h1, h2] = CAPTIONS[lang][scene];
  const color = SCENE_COLOR[i];
  const badge = i === 0 ? `<div class="badge">${CAPTIONS[lang].badge}</div>` : '';
  return `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}${lang === 'zh' ? CJK_CSS : ''}
  *{margin:0;box-sizing:border-box}
  body{width:${F.w}px;height:${F.h}px;overflow:hidden;position:relative;font-family:Nunito,sans-serif;
    background:linear-gradient(180deg,#dbe7ff 0%,#eef0ff 45%,#fbf6ee 100%)}
  .hx{position:absolute;clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)}
  .cap{position:absolute;left:6%;right:6%;top:${F.top}px;text-align:center}
  h1{font-family:Fredoka,Nunito,sans-serif;font-weight:700;font-size:${F.h1}px;line-height:1.08;color:#1d2a44;letter-spacing:.5px}
  h2{display:inline-block;margin-top:${F.h2 * 0.6}px;padding:${F.h2 * 0.28}px ${F.h2 * 0.7}px;border-radius:999px;background:${color};
    color:#fff;font-weight:900;font-size:${F.h2}px;line-height:1.15;box-shadow:0 ${F.h2 * 0.15}px 0 rgba(0,0,0,.12)}
  .dev{position:absolute;left:50%;transform:translateX(-50%);bottom:${F.h * 0.022}px;padding:${F.bezel}px;border-radius:${F.radius}px;background:#1d2a44;
    box-shadow:0 ${F.w * 0.02}px ${F.w * 0.06}px rgba(29,42,68,.35)}
  .dev img{display:block;width:${F.shotW}px;border-radius:${F.radius - F.bezel}px}
  .badge{position:absolute;right:${F.w * 0.04}px;top:${F.h * 0.38}px;transform:rotate(-8deg);z-index:2;padding:${F.h2 * 0.35}px ${F.h2 * 0.6}px;border-radius:${F.h2 * 0.5}px;
    background:#fff;color:#1d2a44;font-weight:900;font-size:${F.h2 * 0.8}px;box-shadow:0 8px 24px rgba(29,42,68,.25);border:${F.h2 * 0.08}px solid #f2c94c}
  </style></head><body>${hexes(F.w, F.h, 11 + i * 7)}
  <div class="cap"><h1>${h1}</h1><h2>${h2}</h2></div>
  <div class="dev"><img src="data:image/png;base64,${shot}"></div>${badge}</body></html>`;
}

function feature(lang) {
  const [h1, h2] = CAPTIONS[lang].feature;
  const shot = readFileSync(`${HERE}out/raw/android/${lang}/1-chaine5.png`).toString('base64');
  return `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}${lang === 'zh' ? CJK_CSS : ''}
  *{margin:0;box-sizing:border-box}
  body{width:1024px;height:500px;overflow:hidden;position:relative;font-family:Nunito,sans-serif;background:linear-gradient(120deg,#dbe7ff,#eef0ff 55%,#fbf6ee)}
  .hx{position:absolute;clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)}
  .t{position:absolute;left:56px;top:0;bottom:0;width:560px;display:flex;flex-direction:column;justify-content:center;gap:14px}
  .logo{font-family:Fredoka;font-weight:700;font-size:104px;line-height:1;color:#fff;-webkit-text-stroke:3px #7f98e6;
    text-shadow:0 5px 0 #9fb4f2,0 10px 0 #7f98e6,0 16px 26px rgba(30,50,110,.3)}
  .h1{font-family:Fredoka,Nunito;font-weight:700;font-size:38px;color:#1d2a44;line-height:1.1;margin-top:18px}
  .h2{font-weight:900;font-size:24px;color:#5b6787}
  .row{display:flex;gap:6px;margin-top:4px}.row i{width:34px;height:30px;clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)}
  .ph{position:absolute;right:70px;top:40px;width:300px;padding:12px;border-radius:40px;background:#1d2a44;transform:rotate(8deg);box-shadow:0 20px 50px rgba(29,42,68,.35)}
  .ph img{display:block;width:100%;border-radius:30px}
  </style></head><body>${hexes(1024, 500, 5)}
  <div class="t"><div class="row">${TILES.map((c) => `<i style="background:${c}"></i>`).join('')}</div><div class="logo">Tomettes</div>
  <div class="h1">${h1}</div><div class="h2">${h2}</div></div>
  <div class="ph"><img src="data:image/png;base64,${shot}"></div></body></html>`;
}

const { b, p } = await open({ width: 1080, height: 1920, scale: 1 });
for (const lang of LANGS) {
  for (const fmt of Object.keys(FORMATS)) {
    const F = FORMATS[fmt];
    const dir = `${HERE}out/${fmt}/${lang}`;
    mkdirSync(dir, { recursive: true });
    await p.setViewportSize({ width: F.w, height: F.h });
    for (const [i, scene] of SCENES.entries()) {
      const shot = readFileSync(`${HERE}out/raw/${F.src}/${lang}/${scene}.png`).toString('base64');
      await p.setContent(page(fmt, lang, scene, i, shot), { waitUntil: 'load' });
      await p.evaluate(() => document.fonts.ready);
      await p.clock.runFor(200);
      await p.screenshot({ path: `${dir}/${i + 1}-${scene.slice(2)}.jpg`, type: 'jpeg', quality: 92 });
    }
  }
  mkdirSync(`${HERE}out/googleplay-feature`, { recursive: true });
  await p.setViewportSize({ width: 1024, height: 500 });
  await p.setContent(feature(lang), { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: `${HERE}out/googleplay-feature/feature-${lang}.jpg`, type: 'jpeg', quality: 92 });
  console.log('ok', lang);
}
await b.close();
