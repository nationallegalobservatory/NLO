import { getArticles, getAuthors } from '../content';

export interface DocumentChunk {
  id: string;
  sourceType: 'article' | 'author';
  slug: string;
  title: string;
  author: string;
  date: string;
  category: string;
  tags: string[];
  sectionTitle: string;
  content: string;
  citation?: string;
  url: string;
}

export interface SearchMatch {
  chunk: DocumentChunk;
  score: number;
}

export interface SearchNloResult {
  inScope: boolean;
  query: string;
  matches: SearchMatch[];
  denialMessage?: string;
}

let cachedChunks: DocumentChunk[] | null = null;
let lastIndexTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
  'will', 'with', 'what', 'who', 'where', 'when', 'why', 'how', 'tell', 'me',
  'about', 'abt', 'can', 'you', 'give', 'show', 'list', 'please', 'explain'
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

function chunkArticle(article: Awaited<ReturnType<typeof getArticles>>[number]): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  const authorName = article.authorDetails?.name || 'Bhoomija Khanna';
  const category = article.categories?.[0] ? article.categories[0].replace(/-/g, ' ').toUpperCase() : 'GENERAL';
  const typeMapping: Record<string, string> = {
    judgment: 'judgments',
    policy: 'policies',
    research: 'research',
    opinion: 'opinions',
  };
  const folder = typeMapping[article.type] || 'research';
  const url = `/publications/${folder}/${article.slug}`;

  // 1. Overview chunk (Title, Abstract, Key Takeaways, Case Summary, Policy Overview)
  const overviewParts: string[] = [];
  if (article.abstract) overviewParts.push(`Abstract: ${article.abstract}`);
  if (article.caseSummary) overviewParts.push(`Case Summary: ${article.caseSummary}`);
  if (article.policyOverview) overviewParts.push(`Policy Overview: ${article.policyOverview}`);
  if (article.keyTakeaways && article.keyTakeaways.length > 0) {
    overviewParts.push(`Key Takeaways:\n- ${article.keyTakeaways.join('\n- ')}`);
  }
  if (article.legalPrinciples && article.legalPrinciples.length > 0) {
    overviewParts.push(`Legal Principles:\n- ${article.legalPrinciples.join('\n- ')}`);
  }
  if (article.statutesReferenced && article.statutesReferenced.length > 0) {
    overviewParts.push(`Statutes Referenced: ${article.statutesReferenced.join(', ')}`);
  }

  if (overviewParts.length > 0) {
    chunks.push({
      id: `${article.slug}-overview`,
      sourceType: 'article',
      slug: article.slug,
      title: article.title,
      author: authorName,
      date: article.date,
      category,
      tags: article.tags || [],
      sectionTitle: 'Overview & Key Findings',
      content: overviewParts.join('\n\n'),
      citation: article.citation,
      url,
    });
  }

  // 2. Body sections chunked by markdown headings
  const rawBody = article.rawContent || article.content || '';
  const sections = rawBody.split(/\n(?=##?\s+)/);
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i].trim();
    if (!sec || sec.length < 50) continue;
    const firstLine = sec.split('\n')[0].replace(/^#+\s*/, '').trim();
    const cleanContent = sec.replace(/^#+\s*[^\n]+\n/, '').replace(/\s+/g, ' ').trim();
    if (cleanContent.length < 30) continue;

    chunks.push({
      id: `${article.slug}-sec-${i}`,
      sourceType: 'article',
      slug: article.slug,
      title: article.title,
      author: authorName,
      date: article.date,
      category,
      tags: article.tags || [],
      sectionTitle: firstLine || `Section ${i + 1}`,
      content: cleanContent.slice(0, 1200),
      citation: article.citation,
      url,
    });
  }

  return chunks;
}

export async function getOrBuildNloIndex(): Promise<DocumentChunk[]> {
  const now = Date.now();
  if (cachedChunks && now - lastIndexTime < CACHE_TTL_MS) {
    return cachedChunks;
  }

  try {
    const [articles, authors] = await Promise.all([getArticles(), getAuthors()]);
    const chunks: DocumentChunk[] = [];

    // Articles
    for (const article of articles) {
      chunks.push(...chunkArticle(article));
    }

    // Authors
    for (const author of authors) {
      chunks.push({
        id: `author-${author.slug}`,
        sourceType: 'author',
        slug: author.slug,
        title: `${author.name} — ${author.role}`,
        author: author.name,
        date: 'Current',
        category: 'EDITORIAL PROFILE',
        tags: ['editor', 'researcher', author.role.toLowerCase()],
        sectionTitle: 'Profile & Bio',
        content: `${author.name} is ${author.role} at National Legal Observatory. ${author.bio} ${author.content || ''}`.slice(0, 1000),
        url: `/bhoomija`,
      });
    }

    cachedChunks = chunks;
    lastIndexTime = now;
    return chunks;
  } catch (err) {
    console.error('[vectorStore] Failed to build knowledge base:', err);
    return cachedChunks || [];
  }
}

export async function searchNloKnowledge(
  query: string,
  options?: { maxResults?: number; scoreThreshold?: number }
): Promise<SearchNloResult> {
  const maxResults = options?.maxResults ?? 3;
  const scoreThreshold = options?.scoreThreshold ?? 2.5;

  const cleanQuery = query.trim().toLowerCase();
  const queryTokens = tokenize(cleanQuery);

  if (queryTokens.length === 0) {
    return {
      inScope: false,
      query,
      matches: [],
      denialMessage: 'Please provide a specific query regarding legal research or cases in the observatory archive.',
    };
  }

  const chunks = await getOrBuildNloIndex();
  const scored: SearchMatch[] = [];

  for (const chunk of chunks) {
    let score = 0;
    const titleLower = chunk.title.toLowerCase();
    const sectionLower = chunk.sectionTitle.toLowerCase();
    const contentLower = chunk.content.toLowerCase();
    const tagsLower = chunk.tags.map((t) => t.toLowerCase()).join(' ');

    // Exact full query match
    if (titleLower.includes(cleanQuery)) score += 10;
    if (sectionLower.includes(cleanQuery)) score += 6;
    if (contentLower.includes(cleanQuery)) score += 4;

    // Token matches with field weights
    for (const token of queryTokens) {
      if (titleLower.includes(token)) score += 4.0;
      if (tagsLower.includes(token)) score += 3.0;
      if (sectionLower.includes(token)) score += 2.5;
      if (contentLower.includes(token)) score += 1.0;
    }

    if (score > 0) {
      scored.push({ chunk, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const topMatches = scored.slice(0, maxResults);

  // Strict scope check: if the top score does not meet the threshold, it is outside NLO scope
  const bestScore = topMatches[0]?.score ?? 0;
  if (bestScore < scoreThreshold) {
    return {
      inScope: false,
      query,
      matches: [],
      denialMessage: 'This topic is outside the scope of the National Legal Observatory. The Observatory database only indexes legal research, judgments, legislative trackers, and policy analyses published on NLO.',
    };
  }

  return {
    inScope: true,
    query,
    matches: topMatches,
  };
}

export function buildNloSystemPrompt(searchResult: SearchNloResult): string {
  if (!searchResult.inScope || searchResult.matches.length === 0) {
    return [
      'You are the National Legal Observatory (NLO) Research AI.',
      'STRICT SCOPE RULE: You only answer questions regarding legal publications, judgments, and policies published in the National Legal Observatory.',
      'The user asked about a topic that is NOT in the Observatory archive.',
      'Answer strictly and concisely: "This topic is outside the scope of the National Legal Observatory. The Observatory database only indexes legal research, judgments, legislative trackers, and policy analyses published on NLO."',
      'Do not provide any other answer or general speculation.',
    ].join('\n');
  }

  const contextText = searchResult.matches
    .map(
      (m, idx) => `[Source ${idx + 1}]
Publication: ${m.chunk.title}
Date: ${m.chunk.date}
Author: ${m.chunk.author}
Category: ${m.chunk.category}
Section: ${m.chunk.sectionTitle}
URL: ${m.chunk.url}
Excerpt:
${m.chunk.content}
`
    )
    .join('\n---\n');

  return [
    'You are the National Legal Observatory (NLO) Research Assistant.',
    'Your goal is to answer the user query based ONLY on the provided Observatory context below.',
    'STRICT RULES:',
    '1. Answer concisely AF: Maximum 2 to 3 crisp, informative sentences. Zero fluff, zero introductory filler.',
    '2. Every claim must come strictly from the provided sources. Do not extrapolate or speculate.',
    '3. If the provided context does not explicitly answer the query, state: "The Observatory database does not contain information to answer this specific question."',
    '4. Explicitly cite the publication title and date (e.g. "[Publication Title] (Date)").',
    '',
    '=== OBSERVATORY CONTEXT ===',
    contextText,
  ].join('\n');
}
