// Icône redessinée en vectoriel : 1024 px (App Store, sans transparence) et 512 px (Google Play, 32 bits).
import { open } from '../video/common.mjs';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { svg } from './icon-svg.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const { b, p } = await open({ width: 1024, height: 1024, scale: 1 });
mkdirSync(`${HERE}out/icons`, { recursive: true });
for (const size of [1024, 512]) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<html><body style="margin:0">${svg(size)}</body></html>`);
  await p.screenshot({ path: `${HERE}out/icons/icon-${size}.png` });
}
await b.close();
