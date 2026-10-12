import { defineConfig, type Plugin } from 'vitest/config';

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

export default defineConfig({
  base: './',
  plugins: [offline()],
  build: { target: 'safari15' },
  test: { include: ['tests/**/*.test.ts'] },
});
