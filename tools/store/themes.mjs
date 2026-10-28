// Aperçu des thèmes : accueil + partie, pour vérifier les couleurs et le rendu des tuiles.
import { open } from '../video/common.mjs';
const S = process.argv[2];
const themes = (process.argv[3] || '8,9,10,11,12').split(',').map(Number);
for (const theme of themes) {
  const { b, p } = await open({ theme, width: 360, height: 780, scale: 2 });
  await p.clock.runFor(2500);
  await p.screenshot({ path: `${S}/th${theme}-home.png` });
  await p.evaluate(() => { const T = tomettes; T.setDifficulty('hard'); T.start(16, 'express'); T.autoplay('normal', 113, { thinkMs: 1100, blunder: 0.45, smart: true }); T.skip(8722); });
  for (let i = 0; i < 11; i++) { await p.clock.runFor(16); await p.evaluate(() => tomettes.frame(1)); }
  await p.screenshot({ path: `${S}/th${theme}-game.png` });
  await b.close();
}
