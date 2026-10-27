import { MetadataRoute } from 'next';
import { getArticles, getAuthors } from '@/lib/content';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://legal-observatory.vercel.app';
  const now = Date.now();

  // Static core routes with priority and change frequencies
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/publications`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/authors`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/bhoomija`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/citation-permissions`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/copyright`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.4,
    },
  ];

  // Fetch all verified articles
  const articles = await getArticles();

  // Map category to route folder
  const folderForType = (type: string) => {
    switch (type) {
      case 'judgment':
        return 'judgments';
      case 'policy':
        return 'policies';
      case 'opinion':
        return 'opinions';
      default:
        return 'research';
    }
  };

  const articleRoutes: MetadataRoute.Sitemap = articles
    .filter((article) => {
      // Exclude private and future-embargoed articles from sitemap
      if (article.private) return false;
      if (article.publishAt && new Date(article.publishAt).getTime() > now) return false;
      return true;
    })
    .map((article) => {
      const folder = folderForType(article.type);
      return {
        url: `${baseUrl}/publications/${folder}/${article.slug}`,
        lastModified: article.date ? new Date(article.date) : new Date(),
        changeFrequency: 'monthly',
        priority: article.format === 'monthly-report' ? 0.9 : 0.8,
      };
    });

  // Author profile routes
  const authors = await getAuthors();
  const authorRoutes: MetadataRoute.Sitemap = authors
    .filter((author) => author.slug !== 'bhoomija-khanna') // Bhoomija has canonical at /bhoomija
    .map((author) => ({
      url: `${baseUrl}/authors/${author.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    }));

  return [...staticRoutes, ...articleRoutes, ...authorRoutes];
}
