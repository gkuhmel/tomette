import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vitest/config';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

/**
 * Génère `sw.js` au build : service worker qui met en cache tous les fichiers
 * du site pour jouer hors ligne. Le nom du cache change à chaque build, ce qui
 * remplace l'ancienne version au lancement suivant.
 */
function offline(): Plugin {
  return {
    name: 'tomettes-offline',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = ['./', ...Object.keys(bundle).map((f) => `./${f}`)];
      const extra = [
        './manifest.webmanifest',
        './icons/apple-touch-icon.png',
        './icons/icon-192.png',
        './icons/icon-512.png',
        './icons/icon-maskable-512.png',
        './icons/favicon-64.png',
        './privacy.html',
      ];
      const version = Date.now().toString(36);
      const source = `// Généré au build — ne pas modifier.
const CACHE = 'tomettes-${version}';
const FILES = ${JSON.stringify([...files, ...extra])};

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    // Page : réseau d'abord (pour les mises à jour), cache si hors ligne.
    e.respondWith(fetch(req).catch(() => caches.match('./', { ignoreSearch: true })));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

/**
 * Outils de développement (panneau de debug, mode capture, ami robot) : présents avec
 * `npm run dev`, ou dans un build local lancé avec DEV_TOOLS=1 (vidéos, captures des stores).
 * Absents de la version publiée : le code est retiré au build, aucun paramètre ne les ouvre.
 */
export default defineConfig(({ command }) => ({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __DEV_TOOLS__: JSON.stringify(command === 'serve' || process.env.DEV_TOOLS === '1'),
  },
  plugins: [offline()],
  build: { target: 'safari15' },
  test: { include: ['tests/**/*.test.ts'] },
}));
