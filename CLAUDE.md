# CLAUDE.md : Tomettes

Tomettes est un puzzle d'action sur grille hexagonale (tomettes provençales) :
on échange des tuiles voisines en biais pour former des alignements de 3 ou plus,
pendant que la pile monte. Cible principale : iPhone, Safari, en portrait ; aussi
jouable à la souris et au clavier.

## Documents de référence

- `README.md` : règles, modes, réglages, déploiement, variables d'environnement.
- `docs/NATIF-CAPACITOR.md` : plan du passage en application native (en attente du feu vert).
- `tools/video/README.md` : vidéos de promotion filmées en mode capture (`?capture=1`).
- `docs/store/` : fiches App Store et Google Play (textes en 6 langues, réglages) ; visuels produits par `tools/store/`.

## Stack et contraintes

- **Vite + TypeScript** strict, sans framework UI. Menus et HUD en DOM, plateau en Canvas 2D.
- `src/core/` est **pur et déterministe** (pas de DOM) et testé par Vitest.
- Tous les paramètres de jeu sont dans `src/config.ts`, réglables en direct dans le
  panneau de debug (appui long en haut à gauche, ou `?dev=1`), avec une explication
  par paramètre dans `src/ui/params.ts`. Outils de développement (debug, capture, robot)
  seulement avec `npm run dev` ou un build `DEV_TOOLS=1` : jamais dans la version publiée.
- Langues : français (référence, `src/i18n/fr.ts`), anglais, espagnol, allemand,
  italien, chinois. Tout nouveau texte visible reçoit ses traductions le jour même ;
  `tests/i18n.test.ts` vérifie que chaque langue a toutes les clés.
- Déploiement : **Cloudflare** (`wrangler.jsonc` : site statique servi depuis `dist/`, plus un
  Worker `worker/index.ts` pour le duel en ligne, routes `/api/*`, salles et file du « joueur au hasard » en Durable Objects),
  branché sur le dépôt GitHub. Build : `npm run build` ; déploiement : `npx wrangler deploy`.
  Chaque push sur `main` part en production. `base: './'` dans Vite, `.nvmrc` à `22`.
- Le développeur teste surtout sur la version déployée, depuis son iPhone.

## Conventions

- Noms de code en anglais. Textes du jeu et commentaires d'intention en français.
- Petits commits, un sujet par commit, messages en français.
- Auteur des commits : Calanques United <calanquesunited@gmail.com>. Aucune mention
  d'outil ou d'IA, ni dans les commits (pas de co-auteur, pas de lien de session),
  ni dans le jeu, ni dans les textes publiés.
- Chaque commit est poussé directement sur `main` (déploiement en production par
  Cloudflare), une fois `npm run build` et `npm test` passés.
- Toute nouvelle mécanique est proposée et validée par le développeur avant d'être codée.

## Commandes

- `npm run dev` : serveur Vite (`--host`)
- `npm run build` : vérification des types et build de production
- `npm test` : Vitest
- `npm run deploy` : build puis `wrangler deploy` (après `npx wrangler login`)
- `npm run serve` : build puis `wrangler dev` (jeu + serveur du duel en ligne, en local)
