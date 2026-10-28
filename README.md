# Tomettes

Puzzle d'action sur grille hexagonale (tomettes provençales) : on échange des
tuiles voisines en biais pour former des alignements de 3 ou plus, pendant que
la pile monte. Jouable sur iPhone (Safari, installable sur l'écran d'accueil)
et sur ordinateur.

## Lancer

```sh
npm install
npm run dev      # serveur de dev (accessible sur le réseau local)
npm test         # tests Vitest
npm run build    # vérification des types + build statique dans dist/
```

## Déploiement (Cloudflare)

Site statique servi par Cloudflare (`wrangler.jsonc`, dossier `dist/`, sans code Worker),
comme les autres jeux. Dans le tableau de bord Cloudflare : Workers & Pages → Create →
Import a repository → `gkuhmel/tomette`, puis :

- Commande de build : `npm run build`
- Commande de déploiement : `npx wrangler deploy`
- Node 22 (fichier `.nvmrc`)

Déploiement manuel possible : `npm run deploy` (après `npx wrangler login`).

## Jouer

- **Échanger** : glisser une tuile vers une voisine en biais (jamais vers le
  haut ou le bas), au doigt ou à la souris ; plusieurs échanges d'un même geste.
- **Aligner** : 3 tuiles ou plus de même couleur, verticalement ou en diagonale.
- **Combos et chaînes** : plus de 3 tuiles d'un coup, ou de nouveaux
  alignements formés par les chutes (×2, ×3…) → points et pause de la pile.
- **Rosace** : au moins 5 des 6 voisines d'une tuile de la même autre couleur.
  L'anneau disparaît et le centre devient une **tomette d'or** ; l'échanger avec
  une voisine fait disparaître toute la couleur de cette voisine.
- **Farandole** : 5 tuiles d'une même couleur qui se suivent en file (chacune touche
  la suivante, sans embranchement ni boucle), formées par le jeu du joueur (une tuile
  échangée ou tombée). Elles disparaissent (bonus, pause) et la voisine la plus haute
  devient un joker ; à partir de 6, elle devient une **cigale** : quand la cigale
  disparaît, toute sa rangée part avec elle. Rare si on ne la cherche pas (simulation :
  environ une toutes les 4 minutes en Express Expert).
- **Tutoriel** : 9 étapes jouées sur le plateau (échange, en biais, combo,
  chaîne, monter, tuile fêlée, rosace, tomette d'or, farandole), avec une main
  animée qui montre le geste. Lancé à la première partie, rejouable par le
  bouton « Tutoriel » de l'accueil ; les règles détaillées sont dans Réglages.
- **Commandes de motifs** (Classique, Contre-la-montre, Mosaïque, Express) : un
  motif à réaliser est affiché à droite du score (triangle, arc ou
  farandole d'une couleur, rosace, combo de 5, chaîne ×3). Réussi : bonus, pause de la
  pile, et une tomette d'or toutes les 3 commandes.
- **Tuiles spéciales** : fêlée (ne s'aligne pas, réparée par un alignement
  voisin), scellée (non déplaçable, libérée par un alignement voisin), joker
  (toutes les couleurs).
- **Campagne** : 30 manches. Une ligne d'arrivée en damier remonte avec la
  pile ; la manche est gagnée quand plus aucune tuile n'est au-dessus. 1 à 3
  étoiles selon le temps ; chaque manche réussie ouvre la suivante.
- **Défier un ami** (dans Duel) : duel en ligne. Un joueur crée une partie et
  partage le code de 4 lettres (ou le lien `?room=ABCD`) ; l'autre le saisit.
  Chacun fait tourner sa propre partie ; un petit Worker Cloudflare (une salle
  = un Durable Object, `worker/index.ts`) relaie attaques et aperçu de la pile.
  Rien n'est stocké côté serveur.
- **Joueur au hasard** (dans Duel) : file d'attente commune (`/api/lobby`, un seul Durable
  Object `Lobby`). Dès que deux joueurs attendent, la file leur donne un code de salle et
  le pseudo de l'autre, puis la partie se joue dans une salle normale. Personne en
  30 secondes : retour à l'écran Duel. Sans inscription : un **pseudo** libre et un
  numéro tiré une fois (« Cigale#2741 », stocké sur l'appareil), échangé au début de
  chaque partie en ligne et affiché dans le HUD et à la fin. Pseudos filtrés
  (`src/core/names.ts`, grossièretés et insultes dans les 6 langues, même déguisées : « C0nn4rd »,
  « f.u.c.k ») : refusés à la saisie, et remplacés par « Joueur » par le serveur.
  **Tester sans ami** (mode développeur, `?dev=1`) : « 🤖 Un robot entre dans la file »
  sur l'écran de recherche ; dans Duel, « 🤖 Un robot crée une
  salle » (le robot attend, on rejoint avec son code), ou dans la salle qu'on vient de
  créer, « 🤖 Faire venir un robot ». Le robot est un vrai second joueur : il passe par
  le serveur, joue sa partie (IA du duel), envoie attaques et grille, accepte les revanches
  (`src/net/robot.ts`).
- **Garde-fous du serveur** (`worker/index.ts`) : au-delà de 30 messages par seconde, le
  surplus est ignoré, et la connexion coupée au-delà de 100 (un joueur en envoie environ 5) ;
  une connexion à une salle dure au plus 30 minutes ; au plus 30 recherches de joueur au
  hasard par minute et par adresse IP (seule une empreinte de l'adresse est gardée, en
  mémoire, une minute). En complément, une règle de limitation de débit Cloudflare
  (gratuite) sur `/api/` est conseillée : tableau de bord Cloudflare → Security → WAF →
  Rate limiting rules (chemin commençant par `/api/`, 20 requêtes par 10 s et par IP).
- **Expédition** (tuile de l'accueil, qui ouvre un écran de présentation) : roguelite de
  20 manches (difficulté de l'accueil) à ligne d'arrivée, une seule vie. L'expédition en
  cours est sauvegardée (`tomettes.run`) : on la reprend (une manche interrompue repart
  de son début, un choix de carte en attente propose les mêmes cartes) ou on l'abandonne. Après chaque manche réussie, 1 carte parmi 3 (bonus +
  contrepartie, cumulés jusqu'à la fin). Deux familles : 7 cartes **cumulables**,
  petits échanges qui peuvent revenir et s'empiler (ex. Sieste : pile −10 % de
  vitesse, points −15 %) ; 7 cartes **uniques**, fortes, avec une contrepartie
  lourde (ex. Palette : 1 couleur de moins, pile +25 %, points −20 %). Le Bouclier
  sauve une fois d'un débordement. 14 cartes (dont Carreau : tirer une tuile d'un double-tap,
  Mistral, Feu d'artifice, Arc-en-ciel, Pastis), chacune avec son pictogramme,
  rappelées sous le score et détaillées dans la pause. Score de run, record et
  3 succès dédiés.
- **Duel** : contre l'ordinateur (niveau selon la difficulté choisie ; plus il
  est fort, plus ses attaques sont puissantes). Combos et chaînes envoient des
  dalles de mortier ; combo de 6 = Fêlures (4 tuiles), chaîne ×4 = Séisme,
  tomette d'or = Gel (5 tuiles scellées), rosace = Nuit tombée (6 s sans
  couleurs) et un bouclier pour soi, farandole = dalle sur toute la largeur
  (+ Fêlures à partir de 6). Contre-attaque : une attaque lancée
  pendant que des dalles arrivent les annule d'abord. Pile adverse en
  miniature dans le HUD.
- **Missions et niveau joueur** : 3 missions du jour (nouvelles à minuit) et
  une mission au long cours. Parties et missions rapportent de l'XP ; le
  niveau débloque 8 thèmes et 4 jeux de pictogrammes. Thèmes aux palettes variées
  (Bonbon, Océan, Automne, Néon) et, au niveau 20, le thème ultime **Tomettes** : vraies
  tomettes de faïence émaillée (tranche de terre cuite, nuances, craquelures, reflet, 4
  formes faites main), joint de chaux et décor de Provence (village perché, cyprès, lavande).
- **Dalles de mortier** : à partir du niveau 3, une dalle de 2 à 4 tuiles tombe
  du haut de temps en temps. Ni déplaçable ni alignable ; un alignement qui la
  touche la transforme entièrement en tuiles normales, qui peuvent prolonger la
  chaîne.
- **La pile monte** : maintenir « Monter » (ou Espace) pour accélérer. Zone
  d'attention orange près du haut, puis alerte rouge avec jauge de grâce.
- **Éboulement** : une pile nettement plus haute que sa voisine s'affaisse (la
  tuile du sommet glisse en biais). Compense les colonnes du bord, qui ont moins
  de lignes possibles (5 au lieu de 9) et montaient plus vite. Réglable (`slide`,
  `slideMinDrop`).
- **Pause** : bouton ❚❚, Échap ou P.

Modes : Classique (sans fin), Contre-la-montre (2 min), Mosaïque (un max de
rosaces en 3 min), Express (départ au niveau 8). Difficultés Détente / Normal /
Expert, un record par mode et par difficulté, 48 succès (dont 19 difficiles : chaîne ×7, campagne à 90 étoiles, Extrême… et 4 pour les
victoires en ligne : 1, 10, 50, 100), statistiques, tutoriel
guidé au premier lancement. Langues : français, anglais, espagnol, allemand,
italien, chinois (`src/i18n/`).

## Réglages

- **Joueur** (accueil ou pause → Réglages) : effets sonores, musique, effets
  visuels, tremblement, thème (Pastel clair, Pastel sombre, Terre cuite),
  langue, réinitialisation de la progression, À propos (version,
  confidentialité ; page autonome `privacy.html`).
- **Développement** : panneau de debug avec tous les paramètres expliqués,
  appliqués en direct et mémorisés. Ouverture : appui long (1 s) en haut à
  gauche, ou bouton ⚙ avec `?dev=1` dans l'adresse. « Exporter » copie la
  configuration en JSON.

## Variables d'environnement (Cloudflare → ton projet → Settings → Build → Variables and secrets)

Toutes optionnelles ; sans elles, aucun service tiers n'est chargé.

| Variable | Rôle |
|---|---|
| `VITE_UMAMI_ID` | Mesure d'audience Umami sans cookie (identifiant du site) |
| `VITE_UMAMI_SRC` | Adresse du script Umami (par défaut `https://cloud.umami.is/script.js`) |
| `VITE_SENTRY_DSN` | Remontée d'erreurs Sentry (DSN du projet) |
| `VITE_CONTACT_EMAIL` | Adresse de contact affichée dans « À propos » |

Évènements envoyés à Umami : `game_start` (mode, difficulté, langue),
`game_end` (mode, difficulté, score et durée par tranches), `achievement`,
`tutorial_done`. Aucune donnée personnelle. Ces variables servent au **build** : après en avoir
ajouté une, relancer un déploiement.

## Hors ligne

Application web installable : dans Safari, Partager → « Sur l'écran
d'accueil ». Elle s'ouvre en plein écran et fonctionne sans réseau (service
worker généré au build, voir `vite.config.ts`). Le record de l'application
installée est séparé de celui de Safari.

## Organisation

- `src/config.ts` : tous les paramètres réglables.
- `src/core/` : logique pure et déterministe, testée (hex, grille, alignements,
  gravité, chaînes, rosace, montée, modes, succès, tutoriel, boucle à 60 Hz).
- `src/render/` : rendu Canvas 2D (sprites pré-rendus, thèmes, effets).
- `src/audio/` : sons et musique générés (Web Audio, aucun fichier).
- `src/input/` : geste glisser-tenir (Pointer Events).
- `src/ui/` : écrans, réglages, succès, aide, panneau de debug, stockage local.
- `tests/` : tests Vitest de `src/core`.

## Choix d'implémentation à noter

- Une tuile posée sur une tuile en suspension ou en chute n'est pas soutenue :
  les piles tombent d'un bloc.
- Un échange est refusé si l'une des tuiles est déjà en cours d'échange ; en
  glissé, il est retenté à chaque tick.
- L'alerte se déclenche quand la montée devrait reprendre alors que la rangée
  du haut est occupée. Un alignement l'annule ; si la rangée est toujours
  occupée à la reprise, une nouvelle alerte (grâce complète) démarre.
- Les nouvelles rangées ne créent jamais d'alignement ni de rosace d'elles-mêmes
  (vérifié à la génération puis à l'activation, jokers compris).

## Vidéos de promotion

`tools/video/` filme le jeu en mode capture (`?capture=1`) et monte des vidéos
courtes au format vertical (voir `tools/video/README.md`).

## Stores

Fiches App Store et Google Play (textes en 6 langues, âge, confidentialité,
visuels à envoyer) : `docs/store/README.md`. Visuels et icônes : `tools/store/`.
