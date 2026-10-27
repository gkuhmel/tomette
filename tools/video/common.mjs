import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

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
const CHROMIUM = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const URL_GAME = process.env.TOMETTES_URL || 'http://127.0.0.1:4173';
export async function open({ lang = 'fr', theme } = {}) {
  const b = await chromium.launch({ executablePath: CHROMIUM });
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 });
  await ctx.addInitScript(([lang, theme]) => {
    localStorage.setItem('tomettes.config', JSON.stringify({ music: 0, sound: 0, ...(theme !== undefined ? { theme } : {}) }));
    localStorage.setItem('tomettes.lang', lang); localStorage.setItem('tomettes.tutorial', '1');
  }, [lang, theme]);
  const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERR', String(e)));
  await p.clock.install({ time: 1_700_000_000_000 });
  await p.goto(`${URL_GAME}/?capture=1`);
  await p.clock.runFor(1500);
  return { b, p };
}
