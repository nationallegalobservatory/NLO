import { generateSW } from 'workbox-build';
import fs from 'node:fs';
import path from 'node:path';

function collectContentRoutes() {
  const root = path.resolve('content');
  const routes = new Set([
    '/',
    '/about',
    '/authors',
    '/contact',
    '/privacy',
    '/terms',
    '/citation-permissions',
    '/bhoomija',
    '/publications',
    '/offline',
  ]);

  const authorsDir = path.join(root, 'authors');
  if (fs.existsSync(authorsDir)) {
    for (const file of fs.readdirSync(authorsDir)) {
      if (file.endsWith('.md')) {
        routes.add(`/authors/${file.replace(/\.md$/, '')}`);
      }
    }
  }

  const publishFolders = [
    ['research', 'research'],
    ['opinions', 'opinions'],
    ['judgments', 'judgments'],
    ['policies', 'policies'],
  ];

  for (const [folder, routeFolder] of publishFolders) {
    const dir = path.join(root, folder);
    if (!fs.existsSync(dir)) continue;

    for (const file of fs.readdirSync(dir)) {
      if (file.endsWith('.md')) {
        const slug = file.replace(/\.md$/, '');
        routes.add(`/publications/${routeFolder}/${slug}`);
        if (folder === 'research') {
          routes.add(`/bhoomija/research/${slug}`);
        }
      }
    }
  }

  return Array.from(routes);
}

const routeEntries = collectContentRoutes().map((url) => ({ url, revision: null }));

const { count, size, warnings } = await generateSW({
  swDest: 'public/sw.js',
  globDirectory: 'public',
  globPatterns: [
    '**/*.{css,js,html,webmanifest,json,png,svg,jpg,jpeg,webp,ico,pdf,docx}',
  ],
  globIgnores: ['sw.js', 'workbox-*.js'],
  inlineWorkboxRuntime: true,
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: true,
  ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^source$/],
  additionalManifestEntries: [
    { url: '/api/offline/bootstrap', revision: null },
    ...routeEntries,
  ],
  navigateFallback: '/offline',
  navigateFallbackDenylist: [/^\/api\//, /^\/_next\//],
  runtimeCaching: [
    {
      urlPattern: ({ url }) => url.pathname.startsWith('/_next/static/'),
      handler: 'CacheFirst',
      options: {
        cacheName: 'nlo-next-static',
        expiration: {
          maxEntries: 120,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        },
      },
    },
    {
      urlPattern: ({ request }) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'nlo-pages',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 80,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
      },
    },
    {
      urlPattern: ({ url }) => url.pathname === '/api/offline/bootstrap',
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'nlo-bootstrap',
        expiration: {
          maxEntries: 6,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
      },
    },
    {
      urlPattern: ({ url }) => url.pathname.startsWith('/api/search'),
      handler: 'NetworkFirst',
      options: {
        cacheName: 'nlo-search-api',
        networkTimeoutSeconds: 2,
        expiration: {
          maxEntries: 40,
          maxAgeSeconds: 60 * 60 * 24 * 7,
        },
      },
    },
    {
      urlPattern: ({ request }) =>
        request.destination === 'image' ||
        request.destination === 'font' ||
        request.destination === 'style' ||
        request.destination === 'script',
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'nlo-static-assets',
        expiration: {
          maxEntries: 180,
          maxAgeSeconds: 60 * 60 * 24 * 90,
        },
      },
    },
    {
      urlPattern: ({ url }) => /\.(?:pdf|docx)$/i.test(url.pathname),
      handler: 'CacheFirst',
      options: {
        cacheName: 'nlo-documents',
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 60 * 60 * 24 * 180,
        },
      },
    },
  ],
});

for (const warning of warnings) {
  console.warn(warning);
}

console.log(`Generated service worker: ${count} precached files, ${(size / 1024).toFixed(1)} KB.`);
