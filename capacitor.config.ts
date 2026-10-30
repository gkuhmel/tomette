import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Application native (Capacitor) : la version web construite (`dist/`) emballée dans une
 * vraie application iOS. Voir docs/NATIF-CAPACITOR.md.
 */
const config: CapacitorConfig = {
  // Identifiant définitif une fois l'application publiée.
  appId: 'com.calanquesunited.tomettes',
  appName: 'Tomettes',
  webDir: 'dist',
  ios: {
    // Le jeu gère lui-même les bords de l'écran (encoche, barre d'accueil).
    contentInset: 'never',
    // Pas d'inspection de la vue web dans la version publiée.
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      // Masqué par le jeu dès qu'il est prêt (pas d'écran blanc entre les deux).
      launchAutoHide: false,
      backgroundColor: '#dbe7ff',
      showSpinner: false,
    },
  },
};

export default config;
