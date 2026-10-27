import { open } from './common.mjs';
const [n0, n1, diff, think, blunder] = process.argv.slice(2);
const { b, p } = await open();
for (let seed = +n0; seed < +n1; seed++) {
  const r = await p.evaluate(([seed, diff, think, blunder]) => { const T = tomettes; T.setDifficulty(diff); T.start(seed, 'duel'); T.autoplay('hard', seed * 7 + 1, { thinkMs: +think, blunder: +blunder, smart: true });
    const h = (g) => { for (let r = 0; r < g.grid.rows; r++) for (let c = 0; c < g.grid.cols; c++) if (g.grid.get(c, r)) return g.grid.rows - r; return 0; };
    let i = 0, maxMe = 0, maxCpu = 0, lastHigh = 0;
    for (; i < 60 * 400 && !T.game.over && !T.cpu.over; i++) { T.step(); if (i % 30 === 0) { const a = h(T.game), b = h(T.cpu); maxMe = Math.max(maxMe, a); maxCpu = Math.max(maxCpu, b); if (a >= 10) lastHigh = i; } }
    return { seed, steps: i, win: T.cpu.over && !T.game.over, maxMe, maxCpu, lastHigh };
  }, [seed, diff, think, blunder]);
  console.log(JSON.stringify(r));
}
await b.close();
