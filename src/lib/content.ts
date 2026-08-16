import {
  getArticles as getLocalArticles,
  getArticleBySlug as getLocalArticleBySlug,
  getAuthors as getLocalAuthors,
  getAuthorBySlug as getLocalAuthorBySlug,
  getCategories as getLocalCategories,
  getCategoryBySlug as getLocalCategoryBySlug,
  ArticleData,
  AuthorData,
  CategoryData,
  extractBibliographyEntries,
} from './markdown';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

type DbAuthorRow = {
  slug: string;
  name: string;
  role: string;
  avatar: string;
  bio: string;
  social_links?: AuthorData['socialLinks'];
};

type DbArticleRow = {
  slug: string;
  type: ArticleData['type'];
  format?: ArticleData['format'];
  title: string;
  author_slug: string;
  date: string;
  categories?: string[];
  tags?: string[];
  content: string;
  raw_content?: string;
  reading_time?: string;
  draft?: boolean;
  case_summary?: string;
  legal_principles?: string[];
  statutes_referenced?: string[];
  key_takeaways?: string[];
  citation?: string;
  policy_overview?: string;
  policy_objectives?: string[];
  legal_implications?: string[];
  abstract?: string;
  references?: string[];
  cover_image?: string;
  coverImage?: string;
  private?: boolean;
};

type SupabaseError = {
  code?: string;
  message: string;
};

// Helper to map DB row to ArticleData type
function mapDbArticleToArticleData(dbArt: DbArticleRow, authorDetails?: AuthorData): ArticleData {
  const bibliography = extractBibliographyEntries('', dbArt.references || []);

  return {
    slug: dbArt.slug,
    type: dbArt.type,
    format: dbArt.format,
    title: dbArt.title,
    author: dbArt.author_slug,
    authorDetails,
    date: dbArt.date,
    categories: dbArt.categories || [],
    tags: dbArt.tags || [],
    content: dbArt.content,
    rawContent: dbArt.raw_content || '',
    readingTime: dbArt.reading_time || '5 min read',
    draft: dbArt.draft || false,
    
    caseSummary: dbArt.case_summary,
    legalPrinciples: dbArt.legal_principles,
    statutesReferenced: dbArt.statutes_referenced,
    keyTakeaways: dbArt.key_takeaways,
    citation: dbArt.citation,
    
    policyOverview: dbArt.policy_overview,
    policyObjectives: dbArt.policy_objectives,
    legalImplications: dbArt.legal_implications,
    
    abstract: dbArt.abstract,
    references: dbArt.references,
    bibliography,
    coverImage: dbArt.cover_image || dbArt.coverImage,
  };
}

export function formatPublicationDate(
  article: Pick<ArticleData, 'date' | 'format' | 'slug'>
): string {
  const date = new Date(article.date);
  if (Number.isNaN(date.getTime())) {
    return article.date;
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function getCategories(): Promise<CategoryData[]> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = (await supabase
        .from('categories')
        .select('*')) as { data: CategoryData[] | null; error: SupabaseError | null };
      if (!error && data) {
        return data as CategoryData[];
      }
      console.warn('Supabase categories error, falling back to local files:', error);
    }
  }
  return getLocalCategories();
}

export async function getCategoryBySlug(slug: string): Promise<CategoryData | undefined> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = (await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .single()) as { data: CategoryData | null; error: SupabaseError | null };
      if (!error && data) {
        return data as CategoryData;
      }
    }
  }
  return getLocalCategoryBySlug(slug);
}

export async function getAuthors(): Promise<AuthorData[]> {
  const localAuthors = getLocalAuthors();
  const localAuthorsMap = new Map(localAuthors.map((a) => [a.slug, a]));

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = (await supabase
        .from('authors')
        .select('*')) as { data: DbAuthorRow[] | null; error: SupabaseError | null };
      if (!error && data) {
        return data
          .map((d): AuthorData => {
            const local = localAuthorsMap.get(d.slug);
            const rawLinks = local?.socialLinks || d.social_links || {};
            const socialLinks: NonNullable<AuthorData['socialLinks']> = {
              ...(rawLinks as NonNullable<AuthorData['socialLinks']>),
            };
            delete socialLinks.twitter;

            return {
              slug: d.slug,
              name: local?.name || d.name,
              role: local?.role || d.role,
              avatar: local?.avatar || d.avatar,
              bio: local?.bio || d.bio,
              socialLinks,
            };
          })
          .filter((a: AuthorData) => localAuthorsMap.has(a.slug));
      }
      console.warn('Supabase authors error, falling back to local files:', error);
    }
  }
  return localAuthors;
}

export async function getAuthorBySlug(slug: string): Promise<AuthorData | undefined> {
  const localAuthor = getLocalAuthorBySlug(slug);
  if (!localAuthor) {
    return undefined;
  }

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = (await supabase
        .from('authors')
        .select('*')
        .eq('slug', slug)
        .single()) as { data: DbAuthorRow | null; error: SupabaseError | null };
      if (!error && data) {
        const rawLinks = localAuthor.socialLinks || data.social_links || {};
        const socialLinks: NonNullable<AuthorData['socialLinks']> = {
          ...(rawLinks as NonNullable<AuthorData['socialLinks']>),
        };
        delete socialLinks.twitter;

        return {
          slug: data.slug,
          name: localAuthor.name || data.name,
          role: localAuthor.role || data.role,
          avatar: localAuthor.avatar || data.avatar,
          bio: localAuthor.bio || data.bio,
          socialLinks,
        };
      }
    }
  }
  return localAuthor;
}

export async function getArticles(
  typeFolder?: 'judgments' | 'policies' | 'research' | 'opinions'
): Promise<ArticleData[]> {
  const localArticles = await getLocalArticles(typeFolder);
  const localArticlesMap = new Map(localArticles.map((a) => [a.slug, a]));

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      let query = supabase.from('articles').select('*');
      if (typeFolder) {
        // Map typeFolder names to db type slugs (singular)
        const typeMapping: Record<string, string> = {
          judgments: 'judgment',
          policies: 'policy',
          research: 'research',
          opinions: 'opinion',
        };
        query = query.eq('type', typeMapping[typeFolder] || typeFolder);
      }
      const { data: dbArticles, error } = (await query.order('date', { ascending: false })) as {
        data: DbArticleRow[] | null;
        error: SupabaseError | null;
      };
      
      if (!error && dbArticles) {
        const authors = await getAuthors();
        const authorsMap = new Map(authors.map((a) => [a.slug, a]));
        const rows = dbArticles as DbArticleRow[];
        
        const dbSlugs = new Set(rows.map((art) => art.slug));
        const localOnlyArticles = localArticles.filter((art) => !dbSlugs.has(art.slug));
        
        const mappedDb = rows
          .map((art) => {
            const authorDetails = authorsMap.get(art.author_slug);
            const mapped = mapDbArticleToArticleData(art, authorDetails);
            const local = localArticlesMap.get(art.slug);
            if (local) {
              return {
                ...mapped,
                format: local.format || mapped.format,
                title: local.title || mapped.title,
                content: local.content || mapped.content,
                rawContent: local.rawContent || mapped.rawContent,
                abstract: local.abstract || mapped.abstract,
                categories: local.categories || mapped.categories,
                tags: local.tags || mapped.tags,
                citation: local.citation || mapped.citation,
                references: local.references || mapped.references,
                bibliography: local.bibliography || mapped.bibliography,
                date: local.date || mapped.date,
                authorDetails: local.authorDetails || mapped.authorDetails,
              };
            }
            return mapped;
          })
          // Only show articles that exist in local content AND are not drafts
          .filter((art: ArticleData) => localArticlesMap.has(art.slug) && !art.draft);

        const combined = [...mappedDb, ...localOnlyArticles];
        // Ensure final list is sorted by date (since local dates might override DB dates)
        return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
      console.warn('Supabase articles query error, falling back to local files:', error);
    }
  }
  return localArticles;
}

export async function getArticleBySlug(
  typeFolder: 'judgments' | 'policies' | 'research' | 'opinions',
  slug: string
): Promise<ArticleData | undefined> {
  const localArticle = await getLocalArticleBySlug(typeFolder, slug);
  if (!localArticle) {
    return undefined;
  }

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data: dbArt, error } = (await supabase
        .from('articles')
        .select('*')
        .eq('slug', slug)
        .single()) as { data: DbArticleRow | null; error: SupabaseError | null };
        
      if (!error && dbArt) {
        const articleData = dbArt as DbArticleRow;
        const authorDetails = await getAuthorBySlug(articleData.author_slug);
        const mapped = mapDbArticleToArticleData(articleData, authorDetails);
        return {
          ...mapped,
          format: localArticle.format || mapped.format,
          title: localArticle.title || mapped.title,
          content: localArticle.content || mapped.content,
          rawContent: localArticle.rawContent || mapped.rawContent,
          abstract: localArticle.abstract || mapped.abstract,
          categories: localArticle.categories || mapped.categories,
          tags: localArticle.tags || mapped.tags,
          citation: localArticle.citation || mapped.citation,
          references: localArticle.references || mapped.references,
          bibliography: localArticle.bibliography || mapped.bibliography,
          coverImage: localArticle.coverImage || mapped.coverImage,
        };
      }
    }
  }
  return localArticle;
}

// Get related articles
export async function getRelatedArticles(currentArticle: ArticleData, limit: number = 3): Promise<ArticleData[]> {
  const allArticles = await getArticles();
  return allArticles
    .filter((art) => art.slug !== currentArticle.slug) // exclude current
    .filter((art) => 
      art.categories.some((cat) => currentArticle.categories.includes(cat)) ||
      art.tags.some((tag) => currentArticle.tags.includes(tag))
    )
    .slice(0, limit);
}

// Page View Tracking
export async function incrementPageView(slug: string): Promise<number> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      // Direct database call via rpc or increment table row
      const rpc = supabase.rpc as unknown as (
        fn: 'increment_page_view',
        params: { article_slug: string }
      ) => Promise<{ data: number | null; error: SupabaseError | null }>;
      const { data, error } = await rpc('increment_page_view', { article_slug: slug });
      if (!error && data !== null) {
        return data as number;
      }
      // If RPC is missing, insert/update page_views row
      const { data: selectData } = (await supabase
        .from('page_views')
        .select('views')
        .eq('slug', slug)
        .maybeSingle()) as { data: { views?: number } | null; error: SupabaseError | null };
      
      const newViews = (Number((selectData as { views?: number } | null)?.views ?? 0)) + 1;
      const pageViewsWriter = supabase.from('page_views') as unknown as {
        upsert: (row: { slug: string; views: number; updated_at: string }) => Promise<{
          error: SupabaseError | null;
        }>;
      };
      await pageViewsWriter.upsert({
        slug,
        views: newViews,
        updated_at: new Date().toISOString(),
      });
      return newViews;
    }
  }
  
  // Client-side LocalStorage fallback for tracking
  if (typeof window !== 'undefined') {
    const key = `view_count_${slug}`;
    const current = parseInt(localStorage.getItem(key) || '0', 10);
    const updated = current + 1;
    localStorage.setItem(key, updated.toString());
    return updated;
  }
  return 124; // Static server render default page view placeholder
}

// Fetch Page Views
export async function getPageViewCount(slug: string): Promise<number> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = (await supabase
        .from('page_views')
        .select('views')
        .eq('slug', slug)
        .maybeSingle()) as { data: { views?: number } | null; error: SupabaseError | null };
      if (!error && data) {
        return Number((data as { views?: number } | null)?.views ?? 0);
      }
    }
  }
  
  if (typeof window !== 'undefined') {
    return parseInt(localStorage.getItem(`view_count_${slug}`) || '0', 10) + 124;
  }
  
  // Return a seeded predictable view count for aesthetics
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = slug.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash % 400) + 112;
}

// Newsletter subscription
export async function subscribeToNewsletter(email: string): Promise<{ success: boolean; message: string }> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const newsletterWriter = supabase.from('newsletter_subscribers') as unknown as {
        insert: (row: { email: string; subscribed_at: string }[]) => Promise<{
          error: SupabaseError | null;
        }>;
      };
      const { error } = await newsletterWriter.insert([
        { email, subscribed_at: new Date().toISOString() },
      ]);
      
      if (error) {
        if (error.code === '23505') { // Postgres duplicate key error
          return { success: true, message: 'You have already subscribed to our newsletter.' };
        }
        return { success: false, message: error.message };
      }
      return { success: true, message: 'Thank you for subscribing to our publications!' };
    }
  }
  
  return {
    success: true,
    message: 'Subscription successful (Local Mode: Simulating newsletter subscription for ' + email + ')',
  };
}
