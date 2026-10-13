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

Déploiement : Netlify lit `netlify.toml` (build `npm run build`, dossier `dist`).

## Jouer

- **Échanger** : glisser une tuile vers une voisine en biais (jamais vers le
  haut ou le bas), au doigt ou à la souris ; plusieurs échanges d'un même geste.
- **Aligner** : 3 tuiles ou plus de même couleur, verticalement ou en diagonale.
- **Combos et chaînes** : plus de 3 tuiles d'un coup, ou de nouveaux
  alignements formés par les chutes (×2, ×3…) → points et pause de la pile.
- **Rosace** : au moins 5 des 6 voisines d'une tuile de la même autre couleur.
  L'anneau disparaît et le centre devient une **tomette d'or** ; l'échanger avec
  une voisine fait disparaître toute la couleur de cette voisine.
- **Tuiles spéciales** : fêlée (ne s'aligne pas, réparée par un alignement
  voisin), scellée (non déplaçable, libérée par un alignement voisin), joker
  (toutes les couleurs).
- **La pile monte** : maintenir « Monter » (ou Espace) pour accélérer. Zone
  d'attention orange près du haut, puis alerte rouge avec jauge de grâce.
- **Pause** : bouton ❚❚, Échap ou P.

Modes : Classique (sans fin), Contre-la-montre (2 min), Mosaïque (un max de
rosaces en 3 min), Express (départ au niveau 8). Un record par mode, 22 succès,
statistiques, tutoriel guidé au premier lancement.

## Réglages

- **Joueur** (accueil ou pause → Réglages) : effets sonores, musique, effets
  visuels, tremblement, thème (Pastel clair, Pastel sombre, Terre cuite).
- **Développement** : panneau de debug avec tous les paramètres expliqués,
  appliqués en direct et mémorisés. Ouverture : appui long (1 s) en haut à
  gauche, ou bouton ⚙ avec `?dev=1` dans l'adresse. « Exporter » copie la
  configuration en JSON.

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
