import { NextResponse } from 'next/server';
import { getArticles, getAuthors } from '../../../lib/content';

type ArticleRecord = Awaited<ReturnType<typeof getArticles>>[number];

type SearchResult = {
  slug: string;
  type: string;
  title: string;
  date: string;
  authorName: string;
  category: string;
  excerpt: string;
};

type AuthorSearchResult = {
  slug: string;
  name: string;
  role: string;
  bio: string;
  excerpt: string;
};

type ReferenceSearchResult = {
  articleSlug: string;
  articleTitle: string;
  reference: string;
  url?: string;
  host?: string;
  kind?: 'bibliography';
  authorName?: string;
};

type WebReferencePreview = {
  url: string;
  host: string;
  title: string;
  description: string;
  sourceReference: string;
};

type SourceCandidate = {
  kind: 'bibliography';
  articleSlug?: string;
  articleTitle?: string;
  authorName?: string;
  reference: string;
  href?: string;
  host?: string;
  score: number;
};

type AiSearchScope = {
  site: string;
  searchedFields: string[];
  matched: {
    publications: number;
    authorProfiles: number;
    bibliographies: number;
    webPages: number;
  };
  bibliographySources: string[];
  profileSources: string[];
  webSources: string[];
  summary: string;
};

type AiSourcePack = {
  nloArticles: SearchResult[];
  profiles: AuthorSearchResult[];
  citations: ReferenceSearchResult[];
  webPages: WebReferencePreview[];
};

const AI_SEARCH_LIMIT_PER_MINUTE = 3;
const AI_WEB_REFERENCE_LIMIT = 3;
const AI_REFERENCE_CONTEXT_LIMIT = 6;
const FETCH_TIMEOUT_MS = 4500;
const aiRateLimitMap = new Map<string, { count: number; resetTime: number }>();
const BANNED_RESPONSE_KEYWORDS = [
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

const WEBSITE_SEARCH_FIELDS = [
  'publication titles',
  'publication abstracts',
  'full publication text',
  'tags',
  'categories',
  'author names',
  'author profiles',
  'author bios',
  'case summaries',
  'statutes referenced',
  'policy overviews',
  'publication dates',
  'verified bibliography entries',
  'internal links',
  'verified bibliography urls',
];

function getClientIdentifier(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || '127.0.0.1';
  }

  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

function checkAiRateLimit(ip: string): { allowed: boolean; resetTimeRemaining?: number } {
  const now = Date.now();
  const windowMs = 60 * 1000;

  const record = aiRateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    aiRateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (record.count >= AI_SEARCH_LIMIT_PER_MINUTE) {
    return {
      allowed: false,
      resetTimeRemaining: Math.ceil((record.resetTime - now) / 1000),
    };
  }

  record.count += 1;
  return { allowed: true };
}

function normalizeReference(reference: string) {
  return reference.replace(/\s+/g, ' ').trim();
}

function extractHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return url;
  }
}

function stripHtmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMetaContent(html: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1].replace(/\s+/g, ' ').trim();
    }
  }
  return '';
}

function extractTextSnippet(text: string, cleanQuery: string) {
  if (!text) {
    return '';
  }

  if (!cleanQuery) {
    return text.slice(0, 240);
  }

  const lowerText = text.toLowerCase();
  const index = lowerText.indexOf(cleanQuery);
  if (index === -1) {
    return text.slice(0, 240);
  }

  const start = Math.max(0, index - 90);
  const end = Math.min(text.length, index + cleanQuery.length + 150);
  return text.slice(start, end).trim();
}

const STOP_WORDS = new Set([
  'tell', 'me', 'about', 'abt', 'what', 'is', 'who', 'show', 'the', 'a', 'an', 'in', 'of', 'for', 'and', 'or', 'to', 'on', 'with', 'at', 'by', 'from', 'why', 'how', 'does', 'it', 'are', 'were', 'was', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'did', 'done', 'tell-me-abt', 'tell-me-about'
]);

function getSearchTerms(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((term) => term.length > 1 && !STOP_WORDS.has(term));
}

function scoreCandidateText(candidateText: string, cleanQuery: string) {
  if (!cleanQuery) {
    return 0;
  }

  const lower = candidateText.toLowerCase();
  if (lower === cleanQuery) return 6;
  if (lower.includes(cleanQuery)) return 4;

  const terms = getSearchTerms(cleanQuery);
  if (terms.length === 0) return 0;

  const tokenHits = terms.filter((token) => lower.includes(token)).length;
  return tokenHits;
}

function getArticleMatchScore(article: ArticleRecord, cleanQuery: string) {
  const terms = getSearchTerms(cleanQuery);
  if (terms.length === 0) {
    return { matched: false };
  }

  // An article matches if any of the clean terms are found in title, content, author, tags, etc.
  const titleMatch = terms.some((term) => article.title.toLowerCase().includes(term));
  const contentMatch = terms.some((term) => article.rawContent?.toLowerCase().includes(term));
  const htmlContentMatch = terms.some((term) => article.content?.toLowerCase().includes(term));
  const authorMatch = article.authorDetails?.name ? terms.some((term) => article.authorDetails!.name.toLowerCase().includes(term)) : false;
  const tagMatch = article.tags.some((tag) => terms.some((term) => tag.toLowerCase().includes(term)));
  const categoryMatch = article.categories.some((cat) => terms.some((term) => cat.toLowerCase().includes(term)));
  const caseMatch = article.caseSummary ? terms.some((term) => article.caseSummary!.toLowerCase().includes(term)) : false;
  const policyMatch = article.policyOverview ? terms.some((term) => article.policyOverview!.toLowerCase().includes(term)) : false;
  const referenceMatch = article.references ? article.references.some((ref) => terms.some((term) => ref.toLowerCase().includes(term))) : false;

  return {
    matched:
      titleMatch ||
      contentMatch ||
      htmlContentMatch ||
      authorMatch ||
      tagMatch ||
      categoryMatch ||
      caseMatch ||
      policyMatch ||
      referenceMatch,
    titleMatch,
    contentMatch,
    authorMatch,
  };
}

function buildSearchResults(cleanQuery: string, articles: ArticleRecord[]) {
  return articles
    .filter((article) => getArticleMatchScore(article, cleanQuery).matched)
    .map<SearchResult>((article) => ({
      slug: article.slug,
      type: article.type,
      title: article.title,
      date: article.date,
      authorName: article.authorDetails?.name || 'Observatory Scholar',
      category: article.categories[0] ? article.categories[0].replace('-', ' ').toUpperCase() : 'GENERAL',
      excerpt:
        article.abstract ||
        article.caseSummary ||
        article.policyOverview ||
        article.rawContent?.slice(0, 240) ||
        '',
    }))
    .slice(0, 8);
}

function buildAuthorResults(cleanQuery: string, authors: Awaited<ReturnType<typeof getAuthors>>) {
  const terms = getSearchTerms(cleanQuery);
  if (terms.length === 0) return [];

  return authors
    .filter((author) => {
      const searchableFields = [author.name, author.role, author.bio, author.content];
      return searchableFields.some((field) => 
        field && terms.some((term) => field.toLowerCase().includes(term))
      );
    })
    .map<AuthorSearchResult>((author) => ({
      slug: author.slug,
      name: author.name,
      role: author.role,
      bio: author.bio,
      excerpt: author.content?.replace(/\s+/g, ' ').trim().slice(0, 240) || author.bio || '',
    }))
    .slice(0, 4);
}

function buildReferenceResults(
  cleanQuery: string,
  articles: ArticleRecord[]
) {
  const candidates: SourceCandidate[] = [];

  for (const article of articles) {
    const articleContext = [
      article.title,
      article.authorDetails?.name || '',
      article.abstract || '',
      article.caseSummary || '',
      article.policyOverview || '',
      article.rawContent || '',
      article.content || '',
      ...(article.categories || []),
      ...(article.tags || []),
      ...((article.bibliography || []).map((entry) => entry.citation)),
    ].join(' ');

    for (const entry of article.bibliography || []) {
      const normalized = normalizeReference(entry.citation || entry.label || entry.url || '');
      const url = entry.url;
      candidates.push({
        kind: 'bibliography',
        articleSlug: article.slug,
        articleTitle: article.title,
        reference: normalized,
        href: url,
        host: url ? extractHost(url) : undefined,
        score: scoreCandidateText(`${articleContext} ${normalized} ${url || ''}`, cleanQuery),
      });
    }
  }

  const rankedCandidates = candidates
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .filter((candidate, index, array) => {
      const key = `${candidate.kind}|${candidate.href || ''}|${candidate.reference}`;
      return array.findIndex((item) => `${item.kind}|${item.href || ''}|${item.reference}` === key) === index;
    });

  return rankedCandidates.slice(0, AI_REFERENCE_CONTEXT_LIMIT).map<ReferenceSearchResult>((candidate) => ({
    articleSlug: candidate.articleSlug || 'site',
    articleTitle: candidate.articleTitle || candidate.authorName || 'Site source',
    reference: candidate.reference,
    url: candidate.href,
    host: candidate.host,
    kind: candidate.kind,
    authorName: candidate.authorName,
  }));
}

async function fetchWebReferencePreview(
  url: string,
  sourceReference: string,
  cleanQuery: string
): Promise<WebReferencePreview | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    const finalUrl = response.url || url;
    const host = extractHost(finalUrl);
    if (!response.ok) {
      return {
        url: finalUrl,
        host,
        title: host,
        description: `Unable to fetch cited page (HTTP ${response.status}).`,
        sourceReference,
      };
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('html') && !contentType.toLowerCase().includes('xml')) {
      return {
        url: finalUrl,
        host,
        title: host,
        description: `Cited page is not HTML (${contentType || 'unknown content type'}).`,
        sourceReference,
      };
    }

    const html = await response.text();
    const title =
      extractMetaContent(html, [
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
        /<title[^>]*>([^<]+)<\/title>/i,
      ]) || host;
    const description =
      extractMetaContent(html, [
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
      ]) || extractTextSnippet(stripHtmlToText(html), cleanQuery) || 'No description available.';

    return {
      url: finalUrl,
      host,
      title,
      description,
      sourceReference,
    };
  } catch (error) {
    console.error('Failed to fetch cited web reference:', error);
    return {
      url,
      host: extractHost(url),
      title: extractHost(url),
      description: 'Unable to fetch cited page.',
      sourceReference,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildAiScope(
  publicationResults: SearchResult[],
  authorResults: AuthorSearchResult[],
  referenceResults: ReferenceSearchResult[],
  webPreviews: WebReferencePreview[]
): AiSearchScope {
  const bibliographySources = referenceResults.map((result) =>
    result.url
      ? `${result.articleTitle} · ${result.host || extractHost(result.url)}`
      : `${result.articleTitle} · ${result.reference}`
  );
  const profileSources = authorResults.map((result) => `${result.name} · ${result.role}`);
  const webSources = webPreviews.map((preview) => `${preview.host} · ${preview.title}`);

  return {
    site: 'National Legal Observatory website, profiles, and verified bibliography',
    searchedFields: WEBSITE_SEARCH_FIELDS,
    matched: {
      publications: publicationResults.length,
      authorProfiles: authorResults.length,
      bibliographies: referenceResults.length,
      webPages: webPreviews.length,
    },
    bibliographySources,
    profileSources,
    webSources,
    summary: `Website content, author profiles, and verified bibliography entries, plus fetched previews for cited pages.`,
  };
}

function buildAnswerPrompt(
  query: string,
  publicationResults: SearchResult[],
  authorResults: AuthorSearchResult[],
  referenceResults: ReferenceSearchResult[],
  webPreviews: WebReferencePreview[],
  scope: AiSearchScope
) {
  const publicationContext = publicationResults
    .slice(0, 6)
    .map(
      (result, index) => `
${index + 1}. ${result.title}
   Author: ${result.authorName}
   Category: ${result.category}
   Snippet: ${result.excerpt || 'No snippet available.'}`
    )
    .join('\n');

  const authorContext = authorResults
    .slice(0, 4)
    .map(
      (result, index) => `
${index + 1}. ${result.name}
   Role: ${result.role}
   Bio: ${result.bio || 'No bio available.'}
   Snippet: ${result.excerpt || 'No snippet available.'}`
    )
    .join('\n');

  const bibliographyContext = referenceResults
    .slice(0, AI_REFERENCE_CONTEXT_LIMIT)
    .map(
      (result, index) => `
${index + 1}. ${result.articleTitle}
   Bibliography: ${result.reference}
   URL: ${result.url || 'No URL available.'}`
    )
    .join('\n');

  const webContext = webPreviews
    .slice(0, AI_WEB_REFERENCE_LIMIT)
    .map(
      (result, index) => `
${index + 1}. ${result.title}
   Host: ${result.host}
   Source: ${result.sourceReference}
   Preview: ${result.description}`
    )
    .join('\n');

  return [
    'System: You are a helpful legal research assistant for the National Legal Observatory. Answer the user\'s query based ONLY on the provided Context.',
    'Strict formatting rules:',
    '1. Output at most 4 short lines.',
    '2. Each line must start with one of these labels: PROFILE: (for author profiles), NLO: (for site/publication facts), BIB: (for bibliography facts), WEB: (for cited web pages), NOTE: (for other/empty notices).',
    '3. Provide a complete, helpful sentence after the label using facts from the context.',
    '4. If no relevant information is found in the context, output exactly: "NOTE: Information not found in the observatory database."',
    '5. Do not include any intro, outro, headers, bullet points (*), markdown bolding (**) or extra commentary. Start directly with the label.',
    '',
    'Context:',
    '=== Publications ===',
    publicationContext || 'None',
    '',
    '=== Authors ===',
    authorContext || 'None',
    '',
    '=== Bibliography ===',
    bibliographyContext || 'None',
    '',
    '=== Cited Web Previews ===',
    webContext || 'None',
    '',
    `User Query: ${query}`,
    '',
    'Answer:'
  ].join('\n');
}

function formatCompactAiResponse(text: string) {
  const normalized = text
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/^\s*(answer|response|summary)\s*:\s*/i, '')
    .replace(/^\s*caveman\s*[\[\(]?\s*compact\s*[\]\)]?\s*[:\-–]?\s*/i, '')
    .replace(/[“”]/g, '"')
    .trim();

  const lines = normalized
    .split('\n')
    .flatMap((line) =>
      line
        .split(/(?<=[.!?])\s+/)
        .map((part) => part.trim())
    )
    .map((line) =>
      line
        .replace(/https?:\/\/[^\s<>"')\]]+/gi, '')
        .replace(/[ \t]+/g, ' ')
        .replace(/^["']+|["']+$/g, '')
        .trim()
    )
    .filter((line) => !BANNED_RESPONSE_KEYWORDS.some((keyword) => line.toLowerCase().includes(keyword)))
    .filter(Boolean);

  const compactLines = lines.slice(0, 4);
  return compactLines.length > 0
    ? compactLines.join('\n')
    : 'NOTE: Information not found in the observatory database.';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const aiRequested = searchParams.get('ai') === '1' || searchParams.get('mode') === 'ai';

  if (!query.trim()) {
    return NextResponse.json({ aiResponse: null, aiError: null, results: [] });
  }

  try {
    const articles = await getArticles();
    const authors = await getAuthors();
    const cleanQuery = query.toLowerCase().trim();

    // Embargo guard for unreleased Monthly Review (Vol 1 Issue 4 / September 2026)
    const isSeptemberReviewQuery =
      cleanQuery.includes('balaji') ||
      cleanQuery.includes('formalin') ||
      (cleanQuery.includes('september') && (cleanQuery.includes('review') || cleanQuery.includes('issue') || cleanQuery.includes('2026') || cleanQuery.includes('paper'))) ||
      (cleanQuery.includes('issue 4') && (cleanQuery.includes('review') || cleanQuery.includes('monthly') || cleanQuery.includes('nlo')));

    if (isSeptemberReviewQuery && Date.now() < new Date('2026-09-26T18:00:00+05:30').getTime()) {
      const embargoNotice = "Please return at 6:00 PM on 26th September; we'll have that relevant information available at that time.";
      return NextResponse.json({
        aiResponse: embargoNotice,
        aiError: null,
        results: [],
        sources: {
          nloArticles: [],
          profiles: [],
          citations: [],
          webPages: [],
        },
      });
    }

    const filtered = buildSearchResults(cleanQuery, articles);
    const authorResults = buildAuthorResults(cleanQuery, authors);
    const referenceResults = buildReferenceResults(cleanQuery, articles);
    const baseScope = buildAiScope(filtered, authorResults, referenceResults, []);
    const sourcePack: AiSourcePack = {
      nloArticles: filtered.slice(0, 6),
      profiles: authorResults.slice(0, 4),
      citations: referenceResults.slice(0, AI_REFERENCE_CONTEXT_LIMIT),
      webPages: [],
    };

    if (!aiRequested) {
      return NextResponse.json({
        aiResponse: null,
        aiError: null,
        results: filtered,
        sources: sourcePack,
      });
    }

    const nvidiaKey = process.env.NVIDIA_API_KEY?.trim();
    const rawApiKey = process.env.GEMINI_API_KEY?.trim();
    const apiKeys = rawApiKey ? rawApiKey.split(',').map(k => k.trim()).filter(Boolean) : [];
    if (!nvidiaKey && apiKeys.length === 0) {
      return NextResponse.json({
        aiResponse: null,
        aiError: 'AI search is not configured on this server yet.',
        scope: baseScope,
        results: filtered,
        sources: sourcePack,
      });
    }

    const ip = getClientIdentifier(request);
    const rateLimitStatus = checkAiRateLimit(ip);
    if (!rateLimitStatus.allowed) {
      return NextResponse.json(
        {
          error: `You have reached the limit of ${AI_SEARCH_LIMIT_PER_MINUTE} AI searches per minute. Try again in ${rateLimitStatus.resetTimeRemaining} seconds.`,
          remaining: rateLimitStatus.resetTimeRemaining,
          aiResponse: null,
          aiError: 'AI search limit reached.',
          scope: baseScope,
          results: filtered,
          sources: sourcePack,
        },
        { status: 429 }
      );
    }

    const webUrls = Array.from(
      new Set(referenceResults.map((result) => result.url).filter((url): url is string => Boolean(url)))
    ).slice(0, AI_WEB_REFERENCE_LIMIT);

    const webPreviews = (
      await Promise.all(
        webUrls.map((url) => {
          const sourceReference =
            referenceResults.find((result) => result.url === url)?.reference || url;
          return fetchWebReferencePreview(url, sourceReference, cleanQuery);
        })
      )
    ).filter((preview): preview is WebReferencePreview => Boolean(preview));

    const scope = buildAiScope(filtered, authorResults, referenceResults, webPreviews);
    sourcePack.webPages = webPreviews;
    sourcePack.profiles = authorResults.slice(0, 4);
    sourcePack.citations = referenceResults.slice(0, AI_REFERENCE_CONTEXT_LIMIT);
    sourcePack.nloArticles = filtered.slice(0, 6);

    if (!filtered.length && !authorResults.length && !referenceResults.length) {
      return NextResponse.json({
        aiResponse: 'I could not find that on the site or in cited references.',
        aiError: null,
        scope,
        results: filtered,
        sources: sourcePack,
      });
    }

    let aiResponse: string | null = null;
    let aiError: string | null = null;

    try {
      const promptText = buildAnswerPrompt(
        query,
        filtered,
        authorResults,
        referenceResults,
        webPreviews,
        scope
      );

      // 1) Try NVIDIA NIM Primary (Ultra-Fast)
      if (nvidiaKey) {
        try {
          const nimModel = process.env.NVIDIA_DEFAULT_MODEL || 'deepseek-ai/deepseek-v4-flash-0731';
          const nimRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${nvidiaKey}`,
            },
            body: JSON.stringify({
              model: nimModel,
              messages: [{ role: 'user', content: promptText }],
              temperature: 0.1,
              max_tokens: 350,
            }),
          });

          if (nimRes.ok) {
            const data = await nimRes.json();
            const raw = data?.choices?.[0]?.message?.content?.trim() || '';
            aiResponse = raw ? formatCompactAiResponse(raw) : null;
            aiError = null;
          } else {
            console.warn('[search/ai] NVIDIA NIM returned', nimRes.status, await nimRes.text().catch(() => ''));
          }
        } catch (nimErr) {
          console.error('[search/ai] NVIDIA NIM fetch error:', nimErr);
        }
      }

      // 2) Fallback to Gemini if NVIDIA failed or was unset
      if (!aiResponse && apiKeys.length > 0) {
        const requestBody = JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 800 },
        });

        for (const key of apiKeys) {
          try {
            const aiRes = await fetch(
              'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-goog-api-key': key,
                },
                body: requestBody,
              }
            );

            if (aiRes.ok) {
              const data = await aiRes.json();
              const rawResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
              aiResponse = rawResponse ? formatCompactAiResponse(rawResponse) : null;
              aiError = null;
              break;
            }
          } catch {
            // continue
          }
        }
      }

      if (!aiResponse && !aiError) {
        aiError = 'AI summary temporarily unavailable.';
      }
    } catch (e) {
      console.error('Failed to construct AI request:', e);
      aiError = 'AI summary temporarily unavailable.';
    }

    return NextResponse.json({
      aiResponse,
      aiError,
      scope,
      results: filtered,
      sources: sourcePack,
    });
  } catch (error) {
    console.error('Search API failure:', error);
    return NextResponse.json({ error: 'Failed to search archive' }, { status: 500 });
  }
}
