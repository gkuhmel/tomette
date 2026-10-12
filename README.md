# Tomettes

Puzzle navigateur sur grille hexagonale (tomettes provençales) : on échange des
tuiles voisines pour former des alignements de 3+, dans une pile qui monte.
Prototype v0, mode endless, pour iPhone / Safari.

## Lancer

```sh
npm install
npm run dev      # serveur de dev (accessible sur le réseau local)
npm test         # tests Vitest de src/core
npm run build    # vérification des types + build statique dans dist/
```

- Fonctionne sur iPhone (Safari) et sur ordinateur (Chrome, etc.).
- Sur ordinateur : glisser à la souris, Espace maintenue pour faire monter la pile.
- Panneau de debug : bouton ⚙ à côté de « Monter » (ou appui long 1 s en haut à gauche).

## Jouer

Modes : Classique (sans fin), Contre-la-montre (2 min), Mosaïque (un max de
rosaces en 3 min), Express (départ au niveau 8). Un record par mode.

- Poser le doigt sur une tuile puis glisser vers un voisin **latéral**
  (haut-gauche, bas-gauche, haut-droite, bas-droite) : les tuiles s'échangent.
  On peut enchaîner plusieurs échanges dans le même glissé. Jamais en vertical.
- Alignements de 3+ sur les 3 axes (vertical et deux diagonales).
- Rosace : au moins 5 des 6 voisines d'une tuile sont d'une même autre couleur
  (`rosaceMin`, 5 par défaut ; possible contre un bord).
  L'anneau disparaît (bonus + pause) et le centre devient une tomette d'or ;
  l'échanger avec une voisine fait disparaître toute la couleur de cette voisine.
  Désactivable dans le panneau de debug (`rosace` = 0).
- Tuiles spéciales dans les nouvelles rangées : fêlée (ne s'aligne pas,
  réparée par un alignement voisin), scellée (non déplaçable, libérée par un
  alignement voisin), joker (toutes les couleurs). Fréquences réglables.
- Bouton « Monter » : accélère la pile (et annule le stop time).

## Hors ligne

Le site est une application web installable : dans Safari, Partager →
« Sur l'écran d'accueil ». Elle s'ouvre en plein écran et fonctionne sans
réseau (service worker généré au build, voir `vite.config.ts`).

## Organisation

- `src/config.ts` : tous les paramètres réglables.
- `src/core/` : logique pure et déterministe (hex, grille, alignements,
  gravité, chaînes, montée, RNG, orchestration à 60 Hz).
- `src/render/` : rendu Canvas 2D (sprites pré-rendus par couleur, thèmes).
- `src/input/` : geste glisser-tenir (Pointer Events).
- `src/ui/` : écrans, panneau de debug, localStorage.

## Choix d'implémentation à noter

- Une tuile posée sur une tuile en hover/chute n'est pas « soutenue » : les
  piles tombent d'un bloc.
- Un échange est aussi refusé si l'une des tuiles est déjà en `swapping` ; en
  glissé, il est retenté à chaque tick, donc un glissé rapide s'enchaîne dès
  la fin de l'animation précédente.
- Une tuile `hovering` peut être échangée.
- L'alerte se déclenche quand la montée devrait reprendre alors que la rangée
  du haut est occupée. Un clear l'annule ; si la rangée est toujours occupée
  quand la montée reprend, une nouvelle alerte (grâce complète) démarre.
- La rangée d'aperçu est générée sans alignement avec la grille actuelle, puis
  revérifiée à son activation (la grille a pu changer entre-temps).
