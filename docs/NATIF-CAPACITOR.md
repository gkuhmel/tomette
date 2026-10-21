# Passage en application native (Capacitor) — plan en attente

Statut : **en attente du feu vert**. Rien n'est encore fait dans le code.
Pour lancer : dire « go Capacitor » en indiquant ce qui est prêt (comptes,
identifiant de l'appli).

## Principe

Capacitor emballe la version web construite (`dist/`) dans une vraie
application iOS et Android (vue web intégrée). Le jeu est statique et déjà
hors ligne : le moteur, le rendu, le son, les gestes et les modes ne changent
pas. La version web (Cloudflare) continue d'exister avec le même code.

## 1. Adaptations du code

| Point | Pourquoi | Solution |
|---|---|---|
| Service worker | Inutile en natif, non supporté sur iOS | Ne pas l'enregistrer si `Capacitor.isNativePlatform()` |
| Sauvegardes (records, stats, succès, réglages) | iOS peut vider le stockage de la vue web | `@capacitor/preferences` (avec repli sur localStorage en web) |
| Vibrations | Impossibles dans Safari, possibles en natif | `@capacitor/haptics` : léger à l'échange, plus fort sur chaînes et rosace ; réglage on/off |
| Barre d'état, écran de démarrage | Aspect « vraie appli » | `@capacitor/status-bar`, `@capacitor/splash-screen` |
| Icônes et splash | Toutes les tailles des stores | `@capacitor/assets` à partir d'une image 1024×1024 (icône actuelle) |
| Orientation | Verrouillage portrait | Réglage des projets iOS/Android ; retirer « Tourne ton téléphone » en natif |
| Arrière-plan | Pause fiable | `@capacitor/app` (`appStateChange`) |
| Panneau de debug | Ne pas le livrer | Désactivé dans la version store |

## 2. Étapes techniques

```sh
npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init Tomettes <identifiant> --web-dir dist
npm run build
npx cap add ios
npx cap add android
npx cap sync
```

Mises à jour ensuite : `npm run build` → `npx cap sync` → nouvelle compilation.
L'identifiant (ex. `fr.tonnom.tomettes`) est définitif une fois publié.

## 3. Compilation dans le cloud (pas besoin de Mac ni de npm en local)

- **Android** : GitHub Actions (Linux) → APK à installer directement + AAB pour
  Google Play.
- **iOS** : GitHub Actions sur macOS (ou Codemagic) → compilation, signature et
  envoi automatique sur **TestFlight**. Nécessite une clé API App Store Connect
  stockée en secret du dépôt.

## 4. Ce qu'il faut côté utilisateur

- [ ] Choisir l'identifiant de l'appli (ex. `fr.tonnom.tomettes`)
- [ ] iOS : compte **Apple Developer** (99 $/an) + clé API App Store Connect
- [ ] Android (optionnel) : compte **Google Play Console** (25 $, une fois)
- [ ] Vérifier que le nom « Tomettes » est disponible sur les stores

## 5. Publication

**App Store**
- Politique de confidentialité (page simple « aucune donnée collectée »,
  hébergeable avec le site), captures d'écran aux tailles iPhone, description,
  classement d'âge.
- Risque : Apple refuse les simples sites emballés ; un jeu complet, hors
  ligne, avec vibrations natives passe normalement.

**Google Play**
- Compte personnel récent : test fermé obligatoire avant la production
  (de l'ordre de 12 testeurs pendant 14 jours — règle à revérifier au moment
  de publier).
- Alternative sans store : partager l'APK.

## 6. Plan d'exécution au feu vert

1. Adaptations du code (tableau §1).
2. Initialisation Capacitor, projets iOS/Android, icônes et splash.
3. Compilation cloud : APK Android tout de suite ; TestFlight dès que le
   compte Apple est prêt.
4. Fiche store : textes, captures, page de confidentialité.
