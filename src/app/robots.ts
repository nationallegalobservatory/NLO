import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://legal-observatory.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/cms/',
          '/api/',
          '/_next/',
          '/offline',
          '/bhoomija/research/', // Private embargoed review documents
        ],
      },
      {
        userAgent: 'GPTBot',
        allow: '/',
        disallow: ['/cms/', '/api/', '/bhoomija/research/'],
      },
      {
        userAgent: 'Google-Extended',
        allow: '/',
        disallow: ['/cms/', '/api/', '/bhoomija/research/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
