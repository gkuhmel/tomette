import { open } from './common.mjs';
const [seed, from, to] = process.argv.slice(2).map(Number);
const { b, p } = await open();
console.log(await p.evaluate(([seed, from, to]) => { const T = tomettes; T.setDifficulty('hard'); T.start(seed, 'express'); T.autoplay('normal', seed * 7 + 1, { thinkMs: 1100, blunder: 0.45, smart: true }); T.skip(from);
  const o = []; const g = T.game; const ts = g.trySwap.bind(g); let i = from; g.trySwap = (...a) => { const r = ts(...a); if (r) o.push(i + ':SWAP' + JSON.stringify(a)); return r; };
  for (; i < to; i++) { for (const e of T.step()) if (e.kind === 'clear') o.push(i + ':c' + e.chain + 's' + e.size + (e.rosaces ? 'R' : '')); } return o.join(' '); }, [seed, from, to]));
await b.close();
