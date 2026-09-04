import type { RefactorInput, RefactorOutput } from './refactor';

/**
 * Deterministic, 100% local Code Refactor Engine for NLO.
 *
 * Converts arbitrary uploaded legal source documents (judgments, policy briefs,
 * research papers, opinions) into publication-ready NLO markdown articles
 * entirely in code — with ZERO network dependency, instant execution (<10ms),
 * and zero load on the NVIDIA NIM API key.
 */
export function codeRefactor(input: RefactorInput): RefactorOutput {
  const rawText = (input.rawText || '').trim();
  const articleType = input.articleType || 'research';
  const today = new Date();
  const year = today.getFullYear();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const monthName = monthNames[today.getMonth()];
  const formattedToday = today.toISOString().slice(0, 10);

  // 1. Clean and normalize lines
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // 2. Extract or infer Title
  const title = extractTitle(lines, input.sourceFilename, articleType);

  // 3. Generate clean slug from title
  const slug = generateSlug(title);

  // 4. Extract or infer Date
  const extractedDate = extractDate(rawText) || formattedToday;

  // 5. Select Category from available options
  const category = detectCategory(rawText, input.categoryOptions);

  // 6. Generate Legal Tags
  const tags = detectTags(rawText, articleType, category);

  // 7. Synthesize Abstract
  const abstract = extractAbstract(rawText, lines, title);

  // 8. Generate Citation
  const citation = `Bhoomija Khanna (ed.), '${title}', National Legal Observatory (${monthName} ${year}).`;

  // 9. Format Canonical NLO Markdown Body
  const body = formatNloBody({
    rawText,
    lines,
    title,
    articleType,
    monthName,
    year,
  });

  // Calculate publishAt (embargo rule for monthly reviews: 27th 18:30 IST)
  let publishAt: string | undefined;
  if (slug.includes('monthly-review') || slug.includes('monthly-legal-review')) {
    publishAt = `${year}-${String(today.getMonth() + 1).padStart(2, '0')}-27T18:30:00+05:30`;
  }

  return {
    slug,
    type: articleType,
    format: articleType === 'research' ? 'long-form' : 'brief',
    title,
    date: extractedDate,
    publishAt,
    categories: [category],
    tags,
    abstract,
    citation,
    coverImage: '',
    body,
  };
}

/**
 * Extracts title from document header, case patterns, or source filename.
 */
function extractTitle(lines: string[], sourceFilename?: string, articleType?: string): string {
  // Check first 20 lines for prominent title indicators
  const candidates = lines.slice(0, 25);

  // Pattern A: Markdown H1 (# Title)
  for (const line of candidates) {
    if (line.startsWith('# ') && line.length > 5) {
      return cleanTitle(line.replace(/^#\s+/, ''));
    }
  }

  // Pattern B: Case law pattern (X v. Y or In Re: X)
  for (const line of candidates) {
    if (/\b(?:v\.|vs\.|versus)\b/i.test(line) && line.length > 8 && line.length < 160) {
      return cleanTitle(line);
    }
    if (/^in\s+re\b/i.test(line) && line.length > 8 && line.length < 160) {
      return cleanTitle(line);
    }
  }

  // Pattern C: Uppercase or Title Case substantive line
  for (const line of candidates) {
    // Skip boilerplate
    if (/^(national legal observatory|editorial|page\s+\d+|contents|index)/i.test(line)) {
      continue;
    }
    const words = line.split(/\s+/);
    if (words.length >= 3 && words.length <= 16 && line.length <= 120) {
      // Must not be a date or metadata
      if (!/^\d{1,2}\s+[a-z]+\s+\d{4}/i.test(line) && !/^[a-z]+:\s*/i.test(line)) {
        return cleanTitle(line);
      }
    }
  }

  // Pattern D: Derive from filename
  if (sourceFilename) {
    const cleaned = sourceFilename
      .replace(/\.(pdf|docx|txt|md|rtf)$/i, '')
      .replace(/[-_]+/g, ' ')
      .trim();
    if (cleaned.length > 3) {
      return cleanTitle(cleaned);
    }
  }

  // Fallback
  return `Legal Analysis on ${articleType ? articleType.toUpperCase() : 'Constitutional Jurisprudence'}`;
}

function cleanTitle(str: string): string {
  return str
    .replace(/^["'#*\s]+|["'#*\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generates an SEO & file-safe kebab-case slug.
 */
function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join('-');

  return base || `nlo-article-${Date.now()}`;
}

/**
 * Extracts a date if explicitly mentioned in standard Indian/international formats.
 */
function extractDate(text: string): string | null {
  const monthMap: Record<string, string> = {
    january: '01', february: '02', march: '03', april: '04',
    may: '05', june: '06', july: '07', august: '08',
    september: '09', october: '10', november: '11', december: '12',
    jan: '01', feb: '02', mar: '03', apr: '04',
    jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };

  // Pattern: 27 August 2026 or 27th August 2026
  const match1 = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})\b/i);
  if (match1) {
    const d = String(match1[1]).padStart(2, '0');
    const m = monthMap[match1[2].toLowerCase()];
    const y = match1[3];
    if (m) return `${y}-${m}-${d}`;
  }

  // Pattern: August 27, 2026
  const match2 = text.match(/\b([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})\b/i);
  if (match2) {
    const m = monthMap[match2[1].toLowerCase()];
    const d = String(match2[2]).padStart(2, '0');
    const y = match2[3];
    if (m) return `${y}-${m}-${d}`;
  }

  // Pattern: YYYY-MM-DD
  const match3 = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (match3) return match3[0];

  return null;
}

/**
 * Maps document keywords to available NLO categories.
 */
function detectCategory(text: string, categoryOptions: { slug: string; name: string }[]): string {
  const lower = text.toLowerCase();
  const availableSlugs = new Set(categoryOptions.map((c) => c.slug));

  const techKeywords = ['artificial intelligence', 'ai', 'data protection', 'privacy', 'it rules', 'deepfake', 'algorithm', 'digital governance', 'intermediary', 'surveillance'];
  const crimKeywords = ['criminal', 'penal', 'bns', 'ipc', 'custody', 'bail', 'prosecution', 'accused', 'offence', 'evidence', 'arrest'];
  const corpKeywords = ['competition commission', 'sebi', 'merger', 'insolvency', 'ibc', 'corporate', 'tax', 'arbitration'];

  if (techKeywords.some((k) => lower.includes(k)) && availableSlugs.has('technology-law')) {
    return 'technology-law';
  }
  if (crimKeywords.some((k) => lower.includes(k)) && availableSlugs.has('criminal-jurisprudence')) {
    return 'criminal-jurisprudence';
  }
  if (corpKeywords.some((k) => lower.includes(k)) && availableSlugs.has('corporate-commercial')) {
    return 'corporate-commercial';
  }
  if (availableSlugs.has('constitutional-law')) {
    return 'constitutional-law';
  }

  return categoryOptions[0]?.slug || 'constitutional-law';
}

/**
 * Extracts 4-7 relevant slugified tags from legal concepts.
 */
function detectTags(text: string, articleType: string, category: string): string[] {
  const lower = text.toLowerCase();
  const tags = new Set<string>();

  tags.add(category);
  tags.add(articleType);

  const concepts: [string, string][] = [
    ['supreme court', 'supreme-court-of-india'],
    ['high court', 'high-court'],
    ['constitution', 'constitutional-law'],
    ['article 21', 'article-21'],
    ['article 14', 'article-14'],
    ['fundamental right', 'fundamental-rights'],
    ['judicial review', 'judicial-review'],
    ['privacy', 'right-to-privacy'],
    ['digital', 'digital-governance'],
    ['deepfake', 'deepfakes'],
    ['it rules', 'it-rules-2026'],
    ['ratio decidendi', 'ratio-decidendi'],
    ['procedural fairness', 'procedural-fairness'],
    ['precedent', 'legal-precedent'],
    ['statutory interpretation', 'statutory-interpretation'],
  ];

  for (const [kw, tag] of concepts) {
    if (lower.includes(kw)) {
      tags.add(tag);
      if (tags.size >= 6) break;
    }
  }

  if (tags.size < 4) {
    tags.add('india-jurisprudence');
    tags.add('observatory-dispatch');
  }

  return Array.from(tags).slice(0, 6);
}

/**
 * Synthesizes a crisp 1-3 sentence abstract from the document.
 */
function extractAbstract(text: string, lines: string[], title: string): string {
  // Look for Abstract or Executive Summary section
  const summaryMatch = text.match(/(?:abstract|executive summary|synopsis)[\s:\n]+([\s\S]{100,500}?)(?:\n\s*\n|##|\b(?:introduction|context|background)\b)/i);
  if (summaryMatch && summaryMatch[1]) {
    const cleaned = summaryMatch[1].replace(/\s+/g, ' ').trim();
    if (cleaned.length > 50) {
      return truncateSentence(cleaned, 350);
    }
  }

  // Fallback: scan for first substantive paragraph
  for (const line of lines.slice(1, 30)) {
    if (line === title) continue;
    if (line.length > 80 && !line.startsWith('#') && !line.startsWith('By ') && !line.startsWith('Date:')) {
      return truncateSentence(line, 350);
    }
  }

  return `This legal analysis examines the constitutional principles, statutory frameworks, and judicial reasoning surrounding ${title}, evaluating its broader institutional and jurisprudential impact.`;
}

function truncateSentence(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const sub = text.slice(0, maxLen);
  const lastDot = sub.lastIndexOf('.');
  if (lastDot > 100) return sub.slice(0, lastDot + 1);
  return sub.trim() + '…';
}

/**
 * Formats the Markdown body with canonical NLO header and structured sections.
 */
function formatNloBody(params: {
  rawText: string;
  lines: string[];
  title: string;
  articleType: string;
  monthName: string;
  year: number;
}): string {
  const { rawText, lines, title, articleType, monthName, year } = params;

  // Header banner
  const headerBlock = `<div align="center">

**NATIONAL LEGAL OBSERVATORY**  
*Independent Legal Research | India*  
*${articleType.toUpperCase()} | ${monthName} ${year}*  

# ${title}

</div>

***\n\n`;

  // Check if text already has markdown headings
  const hasMarkdownHeadings = /^(?:#{1,3})\s+[A-Za-z0-9]/m.test(rawText);

  if (hasMarkdownHeadings) {
    // Preserve existing markdown headers, simply ensuring clean spacing and header block
    const cleanedBody = rawText
      .replace(/^#\s+[^\n]+\n+/, '') // strip top duplicate H1 if present
      .trim();
    return headerBlock + cleanedBody;
  }

  // If unformatted raw text, section it into canonical NLO 5-part structure
  const substantiveParas = lines.filter((l) => l.length > 30 && !l.startsWith('Page '));

  if (substantiveParas.length < 5) {
    return headerBlock + rawText;
  }

  const chunkSize = Math.max(1, Math.floor(substantiveParas.length / 5));
  const sectionHeaders = getSectionHeaders(articleType);

  const sections: string[] = [];
  for (let i = 0; i < 5; i++) {
    const header = sectionHeaders[i] || `## 0${i + 1} | Substantive Analysis`;
    const start = i * chunkSize;
    const end = i === 4 ? substantiveParas.length : (i + 1) * chunkSize;
    const chunkParas = substantiveParas.slice(start, end);

    sections.push(`${header}\n\n${chunkParas.join('\n\n')}`);
  }

  return headerBlock + sections.join('\n\n');
}

function getSectionHeaders(type: string): string[] {
  switch (type) {
    case 'judgment':
      return [
        '## 01 | Case Brief & Procedural History',
        '## 02 | Core Constitutional & Statutory Questions',
        '## 03 | Ratio Decidendi & Judicial Reasoning',
        '## 04 | Observatory Commentary & Critical Analysis',
        '## 05 | Precedential Value & Key Takeaways',
      ];
    case 'policy':
      return [
        '## 01 | Executive Summary & Legislative Intent',
        '## 02 | Key Regulatory Provisions & Statutory Framework',
        '## 03 | Constitutional & Procedural Scrutiny',
        '## 04 | Stakeholder Impact & Governance Analysis',
        '## 05 | Observatory Recommendations',
      ];
    case 'opinion':
      return [
        '## 01 | The Contested Landscape',
        '## 02 | Doctrinal Critique & Legal Tension',
        '## 03 | Constitutional Imperatives & The Road Ahead',
        '## 04 | Institutional Balance',
        '## 05 | Conclusion',
      ];
    case 'research':
    default:
      return [
        '## 01 | Introduction & Theoretical Framework',
        '## 02 | Juridical Landscape & Comparative Review',
        '## 03 | Doctrinal Analysis & Empirical Scrutiny',
        '## 04 | Policy & Jurisprudential Implications',
        '## 05 | Conclusion & Research Synthesis',
      ];
  }
}
