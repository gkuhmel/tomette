# Application native (Capacitor)

Statut : **projet iOS en place** (`ios/`, Capacitor 8, Swift Package Manager : pas
besoin de CocoaPods). Android : pas encore ajouté (`npx cap add android` le jour venu).

## Principe

Capacitor emballe la version web construite (`dist/`) dans une vraie application iOS
(vue web intégrée). Le moteur, le rendu, le son, les gestes et les modes ne changent
pas ; la version web (Cloudflare) continue d'exister avec le même code. Tout ce qui est
propre à l'appli est dans `src/native.ts` (sans effet dans un navigateur).

| Point | Solution |
|---|---|
| Identifiant | `com.calanquesunited.tomettes` (`capacitor.config.ts`), définitif une fois publié |
| Duel en ligne | La page n'est pas servie par le site : serveur et liens d'invitation passent par `https://tomettes.calanquesunited.com` (`SITE_ORIGIN`). Le serveur accepte l'origine `capacitor://localhost` |
| Sauvegardes | Chaque écriture est doublée dans `@capacitor/preferences` et restaurée au lancement si iOS a vidé le stockage de la vue web |
| Vibrations | `@capacitor/haptics` : léger à l'échange, plus fort sur chaînes et combos, fort sur rosaces et farandoles, alerte sur attaque reçue ; réglage « Vibrations » (visible dans l'appli seulement) |
| Barre d'état | Texte clair ou foncé selon le haut du thème (`@capacitor/status-bar`) |
| Écran de démarrage | Rosace sur le fond du jeu, retiré dès la première image (`@capacitor/splash-screen`) |
| Service worker | Pas enregistré dans l'appli |
| Appareils, orientation | iPhone seulement, portrait seulement (`Info.plist`, projet Xcode) |
| Langues | 6 langues déclarées (`CFBundleLocalizations`), langue de développement : français |
| Chiffrement | `ITSAppUsesNonExemptEncryption` = NO (HTTPS seulement) |
| Outils de développement | Absents (build normal, sans `DEV_TOOLS`) |
| Mesure d'audience, erreurs | Seulement si `VITE_UMAMI_ID` / `VITE_SENTRY_DSN` sont définis au build ; un build sur le Mac sans ces variables = « Aucune donnée collectée » |

Icône et écran de démarrage : `node tools/native/assets.mjs` les redessine depuis
l'icône vectorielle (`tools/store/icon-svg.mjs`) dans `ios/App/App/Assets.xcassets`.

## Compiler sur le Mac

Une fois : Xcode (Mac App Store, le lancer une fois), Node 22 (nodejs.org), puis :

```sh
git clone https://github.com/gkuhmel/tomette.git
cd tomette
npm install
npm run ios        # build du jeu, copie dans le projet iOS, ouverture de Xcode
```

Dans Xcode, la première fois :
1. Xcode → Settings → Accounts : ajouter le compte Apple Developer.
2. Projet **App** → cible **App** → **Signing & Capabilities** : cocher « Automatically
   manage signing », choisir le **Team**. Vérifier le Bundle Identifier
   `com.calanquesunited.tomettes`.

Essai sur l'iPhone : le brancher, accepter « Faire confiance », activer Réglages →
Confidentialité et sécurité → **Mode développeur**, le choisir en haut de Xcode, ▶︎.

Envoi à Apple : en haut « Any iOS Device (arm64) », **Product → Archive**, puis
**Distribute App → App Store Connect → Upload**. La version arrive dans App Store
Connect (onglet TestFlight) après quelques minutes.

À chaque mise à jour : `git pull`, `npm install`, `npm run ios`, augmenter **Build**
(onglet General de la cible App : 1, 2, 3…), puis Archive → Upload. Le numéro de
version affiché (**Version**, ex. 1.0) ne change qu'aux vraies nouvelles versions.

## Avant la première soumission

- [ ] Créer l'app dans App Store Connect (Apps → +), même identifiant, nom « Tomettes »
- [ ] Fiche : textes et captures (`docs/store/`), confidentialité, âge (`docs/store/README.md`)
- [ ] Tester sur l'iPhone : partie, duel en ligne (ami et hasard), vibrations, reprise
      après passage en arrière-plan, sauvegardes après redémarrage
- [ ] Achat intégré créé dans App Store Connect (voir `docs/store/README.md`)
- [ ] Liens d'invitation qui ouvrent l'appli (liens universels) : plus tard, demande
      l'identifiant d'équipe Apple et un fichier `apple-app-site-association` sur le site

## Achat intégré « Tomettes complet »

Plugin `@capgo/native-purchases` (StoreKit 2) : l'achat est signé par Apple et vérifié par
l'iPhone, sans serveur. Revérifié à chaque lancement (un remboursement le retire), gardé
pour jouer hors ligne. Code : `src/purchase.ts` ; verrous : `src/core/premium.ts`.

**Tester sans payer, dans Xcode** (pas besoin d'App Store Connect) :
1. Glisser `ios/App/Tomettes.storekit` dans le navigateur de projet de Xcode (sans
   l'ajouter à la cible).
2. Product → Scheme → Edit Scheme… → Run → Options → **StoreKit Configuration** :
   `Tomettes.storekit`.
3. Lancer ▶︎ : l'achat ouvre une fausse fenêtre de l'App Store. Pour recommencer :
   Debug → StoreKit → Manage Transactions, supprimer l'achat.

**Bac à sable et TestFlight** : une fois le produit créé dans App Store Connect (contrat
des apps payantes signé), retirer le fichier StoreKit du schéma ; acheter avec un compte
de test (Utilisateurs et accès → Sandbox) ou depuis TestFlight : rien n'est débité.

**Dans le navigateur, en développement** (`npm run dev`) : le panneau de debug a une
bascule « Version complète : oui / non », et l'achat y est simulé.

## Android (plus tard)

`npm i @capacitor/android && npx cap add android`, compte Google Play Console (25 $),
test fermé obligatoire pour un compte personnel récent avant la production.
