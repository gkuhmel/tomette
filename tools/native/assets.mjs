// Icône et écran de démarrage de l'appli iOS, dessinés depuis l'icône vectorielle.
// Usage : node tools/native/assets.mjs (Chromium : variable CHROMIUM_PATH, sinon celui de Playwright).
// Écrit directement dans ios/App/App/Assets.xcassets (fichiers suivis par git).
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { svg } from '../store/icon-svg.mjs';

// Playwright : celui du projet s'il est installé, sinon l'installation globale.
async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    const root = execSync('npm root -g').toString().trim();
    return import(pathToFileURL(`${root}/playwright/index.mjs`).href);
  }
}
const { chromium } = await loadPlaywright();

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const XC = `${ROOT}ios/App/App/Assets.xcassets`;
/** Couleur de fond du jeu au lancement (même que `theme-color` et le fond de l'accueil). */
const SPLASH_BG = '#dbe7ff';

const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const p = await b.newPage();
async function render(file, size, html) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<html><body style="margin:0;background:${SPLASH_BG}">${html}</body></html>`);
  // JPEG impossible pour l'icône : PNG, mais fond plein (Apple refuse la transparence).
  await p.screenshot({ path: file, omitBackground: false });
}
// Icône App Store : 1024 px, fond opaque.
await render(`${XC}/AppIcon.appiconset/AppIcon-512@2x.png`, 1024, svg(1024));
// Écran de démarrage : la rosace au centre, petite, sur le fond du jeu (iOS recadre le carré).
for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
  await render(`${XC}/Splash.imageset/${name}`, 2732, svg(2732, SPLASH_BG, 0.32));
}
await b.close();
console.log('Icône et écran de démarrage écrits dans', XC);
