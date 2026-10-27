# Vidéos de promotion (TikTok, Reels, Shorts)

Scripts qui filment le jeu image par image (1080 × 1920, 30 i/s) et montent des
vidéos courtes : textes animés, ralentis, zooms, bruitages et rythme, carte de fin.

## Principe

- Le jeu tourne en **mode capture** (`?capture=1`) : mode développeur sans bouton
  de debug, avec un objet `window.tomettes` pour lancer une partie, la faire jouer
  par l'ordinateur (`autoplay`), avancer vite (`skip`) ou image par image (`frame`).
- Tout est déterministe : une graine + un nombre de pas donnent toujours la même
  partie. Les scripts `search-*.mjs` cherchent les bons moments (sauvetage de
  dernière seconde, grosse chaîne, coup unique, rosace, duel serré), puis les
  scripts `v1` à `v6` les filment.
- Le calque de montage (`overlay.js`, `floor.js`) est injecté dans la page ; le son
  est synthétisé (`sfx.py`, numpy) à partir des événements du jeu ; `ffmpeg` assemble.

## Utilisation

```bash
npm run build && npx vite preview --port 4173 --strictPort   # dans un autre terminal
cd tools/video
node v1.mjs        # → out/tomettes-1-sauve.mp4
```

Prérequis : Node 22, Playwright et Chromium (`CHROMIUM_PATH`), Python 3 avec numpy,
ffmpeg. Adresse du jeu : `TOMETTES_URL` (par défaut `http://127.0.0.1:4173`).

| Script | Vidéo |
|---|---|
| `v1.mjs` | Sauvé à la dernière seconde |
| `v2.mjs` | Chaîne ×7 au ralenti |
| `v3.mjs` | Duel serré contre l'ordinateur (Expert) |
| `v4.mjs` | « Tu vois le coup ? » : un seul échange, chaîne ×5 |
| `v5.mjs` | Coulisses : plans courts sur tous les modes |
| `v6.mjs` | Un sol de tomettes qui devient le jeu |

Les moments filmés dépendent des règles du jeu : si une règle change, relancer
la recherche (`search-*.mjs`) et mettre à jour les graines et les pas dans les scripts.
