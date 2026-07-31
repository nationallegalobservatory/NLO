import { generateSW } from 'workbox-build';

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
    { url: '/', revision: null },
    { url: '/offline', revision: null },
    { url: '/publications', revision: null },
    { url: '/authors', revision: null },
    { url: '/about', revision: null },
    { url: '/contact', revision: null },
    { url: '/api/offline/bootstrap', revision: null },
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
        networkTimeoutSeconds: 3,
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
