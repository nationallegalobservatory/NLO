import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked, type Tokens } from 'marked';

const contentDirectory = path.join(process.cwd(), 'content');
const categoriesPath = path.join(contentDirectory, 'categories.json');

// Configure marked options to include custom heading renderer with anchor IDs
const customRenderer = new marked.Renderer();
customRenderer.heading = function ({ text, depth }: Tokens.Heading) {
  const slug = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-');
  return `<h${depth} id="${slug}">${text}</h${depth}>`;
};

marked.use({ renderer: customRenderer });

marked.setOptions({
  gfm: true,
  breaks: true,
});

export interface AuthorData {
  slug: string;
  name: string;
  role: string;
  avatar: string;
  bio: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
  content?: string;
}

export interface BibliographyEntry {
  citation: string;
  url?: string;
  label?: string;
  section?: string;
}

export interface CategoryData {
  slug: string;
  name: string;
  description: string;
  color: string;
}

export interface ArticleData {
  slug: string;
  type: 'judgment' | 'policy' | 'research' | 'opinion';
  format?: 'monthly-report' | 'post' | 'blog'; // content format filter
  title: string;
  author: string; // author slug
  authorDetails?: AuthorData;
  date: string;
  categories: string[];
  tags: string[];
  content: string; // HTML string
  rawContent: string;
  readingTime: string;
  draft?: boolean; // if true, article is hidden from public listings
  private?: boolean; // if true, only accessible from Bhoomija's profile reader
  
  // Type specific metadata
  caseSummary?: string;
  legalPrinciples?: string[];
  statutesReferenced?: string[];
  keyTakeaways?: string[];
  citation?: string;
  
  policyOverview?: string;
  policyObjectives?: string[];
  legalImplications?: string[];
  
  abstract?: string;
  references?: string[];
  bibliography?: BibliographyEntry[];
  coverImage?: string;
  publishAt?: string; // scheduled launch ISO timestamp
}

const BANNED_BIBLIOGRAPHY_HOSTS = new Set([
  'whatsapp.com',
  'web.whatsapp.com',
  'wa.me',
  't.me',
  'telegram.me',
  'telegram.org',
  'facebook.com',
  'm.facebook.com',
  'instagram.com',
  'x.com',
  'twitter.com',
  'mobile.twitter.com',
  'youtube.com',
  'youtu.be',
  'reddit.com',
  'discord.com',
  'tiktok.com',
  'snapchat.com',
]);

const BANNED_BIBLIOGRAPHY_KEYWORDS = [
  'whatsapp',
  'telegram',
  'facebook',
  'instagram',
  'twitter',
  'x.com',
  'youtube',
  'reddit',
  'discord',
  'tiktok',
  'snapchat',
];

function normalizeInlineText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function sanitizeBibliographyUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return undefined;
    }

    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    if (BANNED_BIBLIOGRAPHY_HOSTS.has(host)) {
      return undefined;
    }

    return parsed.toString();
  } catch {
    return undefined;
  }
}

function containsBannedBibliographyKeyword(text: string): boolean {
  const normalized = text.toLowerCase();
  return BANNED_BIBLIOGRAPHY_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function extractFirstHttpUrl(text: string): string | undefined {
  const match = text.match(/https?:\/\/[^\s<>"')\]]+/i);
  if (!match?.[0]) {
    return undefined;
  }

  return sanitizeBibliographyUrl(match[0].replace(/[).,;]+$/, ''));
}

function isBibliographyHeading(line: string): boolean {
  const headingMatch = line.match(/^#{1,6}\s*(.+)$/);
  if (!headingMatch?.[1]) {
    return false;
  }

  return /^(references?|bibliograph(?:y|ies)|works cited|sources?)$/i.test(headingMatch[1].trim());
}

function parseBibliographyLine(line: string, section?: string): BibliographyEntry | undefined {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('![')) {
    return undefined;
  }

  const numberedLink = trimmed.match(
    /^(?:[-*]|\d+\.)?\s*\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)(?:\s*[–—-]\s*(.+))?$/
  );
  if (numberedLink?.[2]) {
    return {
      label: normalizeInlineText(numberedLink[1] || numberedLink[3] || numberedLink[2]),
      citation: normalizeInlineText(numberedLink[3] || numberedLink[1] || numberedLink[2]),
      url: sanitizeBibliographyUrl(numberedLink[2]),
      section,
    };
  }

  const plainUrl = trimmed.match(/^(?:[-*]|\d+\.)?\s*(https?:\/\/\S+)$/);
  if (plainUrl?.[1]) {
    const url = sanitizeBibliographyUrl(plainUrl[1]);
    return url
      ? {
          label: url,
          citation: url,
          url,
          section,
        }
      : undefined;
  }

  const anchorLink = trimmed.match(/^(?:[-*]|\d+\.)?\s*<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/i);
  if (anchorLink?.[1]) {
    const url = sanitizeBibliographyUrl(anchorLink[1]);
    if (!url) {
      return undefined;
    }

    const label = normalizeInlineText(anchorLink[2] || url);
    return {
      label,
      citation: label,
      url,
      section,
    };
  }

  return {
    citation: normalizeInlineText(trimmed.replace(/^(?:[-*]|\d+\.)\s*/, '')),
    section,
  };
}

export function extractBibliographyEntries(
  rawContent: string,
  references: string[] = []
): BibliographyEntry[] {
  const entries: BibliographyEntry[] = [];
  const seen = new Set<string>();

  const addEntry = (entry: BibliographyEntry | undefined) => {
    if (!entry || !entry.citation) {
      return;
    }

    if (!entry.url && containsBannedBibliographyKeyword(entry.citation)) {
      return;
    }

    const key = `${entry.url || ''}|${entry.citation}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    entries.push(entry);
  };

  for (const reference of references) {
    const citation = normalizeInlineText(reference);
    const url = extractFirstHttpUrl(citation);
    addEntry({
      citation,
      url,
      label: citation,
      section: 'frontmatter',
    });
  }

  const lines = rawContent.split(/\r?\n/);
  let inBibliographySection = false;

  for (const line of lines) {
    if (isBibliographyHeading(line)) {
      inBibliographySection = true;
      continue;
    }

    if (!inBibliographySection) {
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    if (/^#{1,6}\s+/.test(trimmed) && !isBibliographyHeading(trimmed)) {
      break;
    }

    const parsed = parseBibliographyLine(trimmed, 'markdown');
    if (parsed?.url || parsed?.citation) {
      addEntry(parsed);
      continue;
    }
  }

  return entries;
}

// Helper to calculate reading time
function calculateReadingTime(text: string): string {
  const wordsPerMinute = 200;
  const noOfWords = text.split(/\s+/).length;
  const minutes = Math.ceil(noOfWords / wordsPerMinute);
  return `${minutes} min read`;
}

// Get all categories
export function getCategories(): CategoryData[] {
  try {
    if (!fs.existsSync(categoriesPath)) return [];
    const fileContent = fs.readFileSync(categoriesPath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error reading categories:', error);
    return [];
  }
}

export function getCategoryBySlug(slug: string): CategoryData | undefined {
  const categories = getCategories();
  return categories.find((cat) => cat.slug === slug);
}

// Get author profile by slug
export function getAuthorBySlug(slug: string): AuthorData | undefined {
  try {
    let normalizedSlug = slug || 'bhoomija-khanna';
    if (normalizedSlug === 'bhoomija') normalizedSlug = 'bhoomija-khanna';

    let filePath = path.join(contentDirectory, 'authors', `${normalizedSlug}.md`);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(contentDirectory, 'authors', 'bhoomija-khanna.md');
      normalizedSlug = 'bhoomija-khanna';
    }
    if (!fs.existsSync(filePath)) return undefined;

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);

    return {
      slug: data.slug || normalizedSlug,
      name: data.name || 'Bhoomija Khanna',
      role: data.role || 'National Legal Observatory Founder & Chief Editor',
      avatar: data.avatar || '/images/bhoomija-avatar.png',
      bio: data.bio || 'Bhoomija Khanna is the founder and chief editor of the National Legal Observatory.',
      socialLinks: data.socialLinks || {},
      content: content,
    };
  } catch (error) {
    console.error(`Error reading author ${slug}:`, error);
    return undefined;
  }
}

// Get all author profiles
export function getAuthors(): AuthorData[] {
  try {
    const authorsDir = path.join(contentDirectory, 'authors');
    if (!fs.existsSync(authorsDir)) return [];

    const fileNames = fs.readdirSync(authorsDir);
    return fileNames
      .filter((fileName) => fileName.endsWith('.md'))
      .map((fileName) => {
        const slug = fileName.replace(/\.md$/, '');
        return getAuthorBySlug(slug);
      })
      .filter((author): author is AuthorData => author !== undefined);
  } catch (error) {
    console.error('Error reading authors directory:', error);
    return [];
  }
}

// Get single article by type and slug
export async function getArticleBySlug(
  typeFolder: 'judgments' | 'policies' | 'research' | 'opinions',
  slug: string
): Promise<ArticleData | undefined> {
  try {
    const filePath = path.join(contentDirectory, typeFolder, `${slug}.md`);
    if (!fs.existsSync(filePath)) return undefined;

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);

    // Convert Markdown to HTML
    const contentHtml = await marked(content);
    const readingTime = calculateReadingTime(content);

    // Fetch author details
    const authorDetails = data.author ? getAuthorBySlug(data.author) : undefined;
    const bibliography = extractBibliographyEntries(content, Array.isArray(data.references) ? data.references : []);

    return {
      slug: data.slug || slug,
      type: data.type || 'research',
      format: data.format,
      title: data.title || '',
      author: data.author || '',
      authorDetails,
      date: data.date || '',
      categories: data.categories || [],
      tags: data.tags || [],
      content: contentHtml,
      rawContent: content,
      readingTime: data.readingTime || readingTime,
      coverImage: data.coverImage,
      
      // Judgment reviews
      caseSummary: data.caseSummary,
      legalPrinciples: data.legalPrinciples,
      statutesReferenced: data.statutesReferenced,
      keyTakeaways: data.keyTakeaways,
      citation: data.citation,
      
      // Policy reviews
      policyOverview: data.policyOverview,
      policyObjectives: data.policyObjectives,
      legalImplications: data.legalImplications,
      
      // Research
      abstract: data.abstract,
      references: data.references,
      bibliography,
      publishAt: data.publishAt,
      // Access control
      draft: data.draft || false,
      private: data.private || false,
    };
  } catch (error) {
    console.error(`Error reading article ${typeFolder}/${slug}:`, error);
    return undefined;
  }
}

// Get all articles across folders, or in a specific folder
export async function getArticles(
  typeFolder?: 'judgments' | 'policies' | 'research' | 'opinions',
  includeScheduled: boolean = false
): Promise<ArticleData[]> {
  const folders = typeFolder
    ? [typeFolder]
    : (['judgments', 'policies', 'research', 'opinions'] as const);

  let allArticles: ArticleData[] = [];

  for (const folder of folders) {
    const dirPath = path.join(contentDirectory, folder);
    if (!fs.existsSync(dirPath)) continue;

    const fileNames = fs.readdirSync(dirPath);
    const articles = await Promise.all(
      fileNames
        .filter((fileName) => fileName.endsWith('.md'))
        .map(async (fileName) => {
          const slug = fileName.replace(/\.md$/, '');
          return getArticleBySlug(folder, slug);
        })
    );

    allArticles = allArticles.concat(
      articles.filter((art): art is ArticleData => {
        if (!art || art.draft || art.private) return false;
        if (!includeScheduled && art.publishAt && new Date(art.publishAt).getTime() > Date.now()) {
          return false;
        }
        return true;
      })
    );
  }

  // Sort by date descending
  return allArticles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
