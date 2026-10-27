// Vidéo 3 : duel serré contre l'ordinateur (Expert) : qui craque le premier ?
import { Shoot, cap, encode } from './lib.mjs';
const S = new Shoot('3-duel');
const p = await S.open();
const END = 8654;
await p.evaluate(() => { const T = tomettes; T.setDifficulty('hard'); T.start(4, 'duel'); T.autoplay('hard', 29, { thinkMs: 800, blunder: 0.3, smart: true }); T.skip(3900); });
await S.hook();
S.mark('whoosh');
// 1) Accroche sur un passage accéléré (x2).
for (let k = 0; k < 90; k++) await S.f(4, {
  cap1: cap('Moi 🆚 l’ordi <span class="y">Expert</span>', k, { y: 17, size: 36 }),
  cap2: k > 25 ? cap('Qui craque le premier&nbsp;?', k - 25, { y: 25, size: 30, rot: 2 }) : null,
}, 1000 / 15);
// 2) Coupe : la fin, en temps réel.
await p.evaluate((n) => tomettes.skip(n), END - 330 - (3900 + 360));
S.mark('impact', { g: 0.5 }); S.mark('whoosh', { g: 0.6 });
let k = 0, over = false;
while (!over && k < 400) {
  const left = END - (3900 + 360) - (END - 330 - (3900 + 360)) ; // (informatif)
  const late = k > 120;
  const st = await S.f(late ? 1 : 2, {
    flash: Math.max(0, 0.6 - k * 0.15),
    cap1: k < 70 ? cap('2 minutes plus tard…', k, { y: 17, size: 34 }) : cap('Les deux<br>piles au<br><span class="r">plafond</span>&nbsp;😱', k - 70, { y: 12, size: 30, box: [3, 48] }),
    vig: late ? 0.45 + 0.3 * Math.sin(k * 0.7) : 0,
    mini: k > 70 ? 1 + Math.min(1.3, (k - 70) * 0.08) : 1,
    cap2: k > 80 ? cap('👆 l’ordi', k - 80, { y: 31, size: 26, rot: 3, box: [60, 97] }) : null,
    zoom: late ? { s: 1 + Math.min(0.06, (k - 120) * 0.002), x: 50, y: 25 } : undefined,
  }, late ? 1000 / 60 : 1000 / 30);
  if (k === 70) S.mark('whoosh', { g: 0.6 });
  if (late && k % 6 === 0) S.mark('tick', { g: 0.7 });
  over = st.over || (await p.evaluate(() => tomettes.cpu.over));
  k++;
}
console.log('fin du duel à', k);
// 3) Victoire : écran de résultat.
S.mark('impact'); S.mark('music-on');
for (let j = 0; j < 70; j++) await S.f(0, { flash: Math.max(0, 0.8 - j * 0.1) }, 1000 / 30);
S.mark('whoosh'); S.mark('ding', { g: 0.6 });
for (let j = 0; j < 75; j++) await S.f(0, {
  end: { t: j, l1: 'Duel contre l’ordi ou tes amis', l2: 'Gratuit · lien en bio 👆' },
  cap1: j > 8 ? cap('Tu le bats, toi ? 👇', j - 8, { y: 14, size: 42 }) : null,
});
S.mark('music-off');
await S.close();
encode('3-duel');
console.log('frames', S.n);
