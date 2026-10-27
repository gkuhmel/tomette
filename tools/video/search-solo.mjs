import { open } from './common.mjs';
import { writeFileSync } from 'node:fs';
const { b, p } = await open();
const out = [];
const [mode, skill, n0, n1, think, blunder, diff] = process.argv.slice(2);
for (let seed = +n0; seed < +n1; seed++) {
  const r = await p.evaluate(([seed, mode, skill, think, blunder, diff]) => {
    const T = window.tomettes;
    T.setDifficulty(diff);
    T.start(seed, mode); T.autoplay(skill, seed * 7 + 1, { thinkMs: think, blunder, smart: true });
    const res = { seed, chains: [], saves: [], coups: [] };
    let lastClear = -999, lastSwap = -999, alertAt = -1;
    for (let i = 0; i < 60 * 300 && !T.game.over; i++) {
      const wasAlert = T.game.alert;
      if (wasAlert && alertAt < 0) alertAt = i;
      const ev = T.step();
      const sig = []; // signals cleared in step; detect swap via game.stats? use ev only
      for (const e of ev) {
        if (e.kind !== 'clear') continue;
        if (e.chain >= 3) res.chains.push({ i, chain: e.chain, size: e.size });
        if (wasAlert && !T.game.alert) res.saves.push({ i, alertAt, chain: e.chain, size: e.size });
        if (e.chain === 1 && i - lastClear > 120) res.coups.push({ i, quietBefore: i - lastClear });
        lastClear = i;
      }
      if (!T.game.alert) alertAt = -1;
    }
    res.steps = T.game.over ? 'over' : 'alive'; res.score = T.game.score; res.maxChain = T.game.stats.maxChain;
    // coups suivis d'une chaîne >= 3
    res.coups = res.coups.filter(c => res.chains.some(x => x.i > c.i && x.i - c.i < 200 && !res.coups.some(d => d.i > c.i && d.i < x.i)));
    return res;
  }, [seed, mode, skill, +think, +blunder, diff]);
  out.push(r);
  console.log(seed, r.steps, 'allsaves', r.saves.length, r.score, 'maxChain', r.maxChain, 'saves', JSON.stringify(r.saves.filter(s => s.chain >= 2)), 'coups', r.coups.length);
}
if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify(out));
await b.close();
