import { open } from './common.mjs';
const [n0, n1] = process.argv.slice(2).map(Number);
const { b, p } = await open();
const all = [];
for (let seed = n0; seed < n1; seed++) {
  const r = await p.evaluate((seed) => { const T = tomettes; T.setDifficulty('hard'); T.start(seed, 'express'); T.autoplay('normal', seed * 7 + 1, { thinkMs: 1100, blunder: 0.45, smart: true });
    const g = T.game; const ts = g.trySwap.bind(g); let i = 0, lastSwap = -1, swapsSince = 0, lastClear = -999, quiet = 0, best = [];
    let cur = null;
    g.trySwap = (...a) => { const r = ts(...a); if (r) { if (cur) cur.closed = true; lastSwap = i; quiet = i - lastClear; } return r; };
    for (; i < 60 * 300 && !g.over; i++) for (const e of T.step()) { if (e.kind !== 'clear') continue;
      if (e.chain === 1) { if (cur && !cur.dirty && cur.max >= 3) best.push(cur); cur = { swap: lastSwap, quiet, max: 1, dirty: i - lastSwap > 20 }; }
      else if (cur && !cur.closed) cur.max = Math.max(cur.max, e.chain);
      lastClear = i; }
    return best.map(x => ({ seed, ...x }));
  }, seed);
  all.push(...r);
}
all.sort((a, b) => b.max - a.max || b.quiet - a.quiet);
console.log(JSON.stringify(all.slice(0, 10)));
await b.close();
