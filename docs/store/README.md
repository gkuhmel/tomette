# Fiches App Store et Google Play

Tout ce qu'il faut pour remplir les deux stores, en 6 langues (français, anglais,
espagnol, allemand, italien, chinois simplifié).

- Textes : `docs/store/<langue>.md` (générés depuis `tools/store/texts.json` par
  `node tools/store/texts.mjs`, qui vérifie toutes les limites de caractères).
- Visuels : produits par `tools/store/` (voir plus bas), hors dépôt.

## Visuels à envoyer

| Store | Emplacement | Fichiers | Format |
|---|---|---|---|
| App Store | Captures iPhone 6,9″ | `appstore-iphone-6.9/<langue>/1…7.jpg` | 1320 × 2868 |
| App Store | Captures iPad 13″ (seulement si l'app est publiée pour iPad) | `appstore-ipad-13/<langue>/1…7.jpg` | 2064 × 2752 |
| App Store | Icône (dans Xcode, pas dans App Store Connect) | `icons/appstore-icon-1024.png` | 1024 × 1024, sans transparence |
| Google Play | Captures téléphone | `googleplay-phone/<langue>/1…7.jpg` | 1080 × 1920 |
| Google Play | Image de présentation | `googleplay-feature/feature-<langue>.jpg` | 1024 × 500 |
| Google Play | Icône | `icons/googleplay-icon-512.png` | 512 × 512, 32 bits |

Les captures 6,9″ suffisent pour tous les iPhone (Apple les réduit pour les autres
tailles). Ordre : 1 chaîne, 2 en biais, 3 chaînes, 4 rosace, 5 duel, 6 modes,
7 expédition. La 1re est la plus importante : c'est elle qu'on voit dans les
résultats de recherche.

Conseil : publier la version iOS **pour iPhone seulement** au départ (réglage
« Devices » dans Xcode). Le jeu est pensé pour un téléphone en portrait ; sur iPad
il reste jouable mais occupe le centre de l'écran. Les captures iPad sont prêtes si
on l'ouvre plus tard.

## Réglages communs aux deux stores

- **Nom** : Tomettes (si le nom est déjà pris sur l'App Store : « Tomettes – Puzzle »).
- **Catégorie** : Jeux → Puzzle (App Store : catégorie secondaire « Occasionnels » /
  Casual ; Google Play : Puzzle, tags « Match 3 », « Casse-tête », « Hors ligne »).
- **Langue principale** : français. Ajouter les 5 autres langues avec les fiches.
- **Pays** : tous, **sauf la Chine continentale** (un jeu y exige une licence
  officielle). Le chinois simplifié sert pour Singapour, la Malaisie et la diaspora ;
  une fiche en chinois traditionnel (Taïwan, Hong Kong) peut être ajoutée plus tard.
- **Copyright** : © 2026 Calanques United.
- **URL de confidentialité** : `https://<adresse du site>/privacy.html` (page déjà en ligne).
- **URL d'assistance** : une page de contact ou une adresse e-mail dédiée (à créer).
- **Prix** : à fixer avec le modèle retenu (gratuit + déblocage complet). Ne jamais
  écrire de prix dans les textes (refusé par Apple).

## Âge

- **App Store** : répondre « Aucun » à toutes les questions de contenu → **4+**.
  Attention : le duel en ligne affiche le **pseudo** choisi par l'adversaire (contenu créé
  par les joueurs, même minimal). Garde-fous à citer dans les notes pour la validation :
  pseudos filtrés (grossièretés et insultes, 6 langues, côté jeu et serveur), option
  « Masquer les pseudos » dans les Réglages, pas de discussion, adresse de contact dans
  À propos. Pas de discussion entre joueurs : le duel en
  ligne n'échange que l'état des parties.
- **Google Play** (questionnaire IARC) : jeu, pas de violence, pas de langage,
  pas d'achat de jetons de hasard ; « Les utilisateurs peuvent-ils interagir ? » :
  **oui** (duel en ligne avec un pseudo visible, sans messagerie). Résultat attendu :
  **PEGI 3 / Tout public**, avec la mention « Interactions entre utilisateurs ».
- **Public cible Google Play** : choisir **13 ans et plus**. Inclure les moins de
  13 ans ferait entrer l'app dans le programme « Familles » (règles plus strictes
  sur la mesure d'audience et les rapports d'erreurs).

## Confidentialité

Ce que fait le jeu :

- parties, records, réglages : **sur l'appareil uniquement**, pas de compte ;
- mesure d'audience **anonyme, sans cookie** (Umami) et **rapports d'erreurs**
  (Sentry), seulement si leurs identifiants sont fournis au build ;
- duel en ligne (ami ou joueur au hasard) : le pseudo choisi librement et l'état des grilles
  transitent par Cloudflare, **rien n'est enregistré** ;
- pas de publicité, pas de suivi entre applications, pas d'identifiant publicitaire.

**App Store — « Confidentialité de l'app »** (si Umami et Sentry sont activés dans l'app) :

- Diagnostics → Données de plantage : collectées, **non liées à l'utilisateur**, pas de suivi.
- Utilisation → Interaction avec le produit : collectée, **non liée à l'utilisateur**, pas de suivi.
- Finalité : fonctionnalité de l'app et analyses.
- Si les deux sont désactivés dans la version native : « Aucune donnée collectée ».
- Pas de demande de suivi (App Tracking Transparency) à afficher.
- Chiffrement (export) : uniquement HTTPS → « Utilise un chiffrement exempté »
  (`ITSAppUsesNonExemptEncryption` = NO dans `Info.plist`).

**Google Play — « Sécurité des données »** (mêmes hypothèses) :

- Données collectées : « Activité dans l'application → Interactions avec l'application »
  et « Infos et performances de l'application → Journaux de plantage, Diagnostics ».
- Partagées avec des tiers : non (Umami et Sentry agissent comme sous-traitants).
- Chiffrées en transit : oui. Suppression sur demande : non applicable (données anonymes).
- Collecte obligatoire : non liée à un compte ; pas de compte dans l'app.

## Achat intégré (quand le déblocage sera codé)

Produit non consommable, identifiant suggéré `tomettes.full`. Nom affiché :
« Tomettes complet » (en : « Tomettes Full », es : « Tomettes completo »,
de : « Tomettes komplett », it : « Tomettes completo », zh : « Tomettes 完整版 »).
Description à écrire une fois le contenu du déblocage validé.

## Refaire les visuels

```bash
DEV_TOOLS=1 npm run build && npx vite preview --port 4173 --strictPort   # dans un autre terminal
cd tools/store
node raw.mjs        # captures du jeu (7 scènes × 6 langues × iPhone, Android, iPad)
node compose.mjs    # visuels avec accroches (captions.json) + images Google Play
node icon.mjs       # icônes 1024 et 512 px
node texts.mjs      # fiches texte docs/store/<langue>.md
```

Variables utiles : `LANGS=fr,en`, `DEVICES=iphone`. Les scènes s'appuient sur des
parties déterministes (graine + nombre de pas) : si les règles du jeu changent,
vérifier les images et ajuster les pas dans `raw.mjs`.
