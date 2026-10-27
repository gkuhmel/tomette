import { open } from './common.mjs';
const { b, p } = await open();
const r = await p.evaluate(() => { const T = tomettes; const out = [];
  for (let seed = 1; seed < 40 && out.length < 8; seed++) { T.setDifficulty('normal'); T.start(seed, 'mosaic'); T.autoplay('normal', seed * 7 + 1, { thinkMs: 900, blunder: 0.3, smart: true });
    for (let i = 0; i < 60 * 120 && !T.game.over; i++) for (const e of T.step()) if (e.kind === 'clear' && e.rosaces) out.push({ seed, i, chain: e.chain }); }
  return out; });
console.log(JSON.stringify(r));
await b.close();
