/**
 * NLO article refactor prompt + robust JSON parser.
 *
 * The AI's job: take an arbitrary source document (research paper, judgment
 * summary, draft notes, etc.) and produce a structured NLO article that fits
 * the existing NLO markdown frontmatter conventions exactly.
 *
 * Output is JSON; we then re-encode it back to markdown with the canonical
 * NLO body header.
 */

export interface RefactorInput {
  rawText: string;
  authorSlug: string; // usually 'bhoomija-khanna'
  /** Categories that exist in the NLO taxonomy — the AI must pick from this list. */
  categoryOptions: { slug: string; name: string }[];
  /** Article type — drives which optional fields the AI fills in. */
  articleType: 'judgment' | 'policy' | 'research' | 'opinion';
  /** Optional: filename + mime to give the AI a hint. */
  sourceFilename?: string;
  sourceMime?: string;
}

export interface RefactorOutput {
  slug: string;
  type: 'judgment' | 'policy' | 'research' | 'opinion';
  format?: string;
  title: string;
  date: string; // YYYY-MM-DD
  publishAt?: string; // ISO
  categories: string[]; // slugs from categoryOptions
  tags: string[];
  abstract: string;
  citation: string;
  coverImage: string;
  body: string; // markdown body
  // Optional structured fields by type
  case_summary?: string;
  legal_principles?: string[];
  statutes_referenced?: string[];
  key_takeaways?: string[];
  policy_overview?: string;
  policy_objectives?: string[];
  legal_implications?: string[];
  references?: string[];
}

const SYSTEM_PROMPT = `You are an editorial refactor engine for the National Legal Observatory (NLO), an India-focused legal research publication.

Your job: take a source document (research paper, judgment review, policy brief, opinion draft) and convert it into a publication-ready NLO article that exactly matches the existing NLO frontmatter + body conventions.

Rules:
1. **Frontmatter keys (required):** slug, type, format, title, author, date, publishAt, categories, tags, abstract, citation, coverImage.
2. **author** is the slug of the author — given to you in the input. Use it verbatim.
3. **slug** must be lowercase, hyphenated, derived from the title. No diacritics. 2–6 words.
4. **date** is YYYY-MM-DD. Use the document's date if present, else today's date.
5. **publishAt** is ISO 8601 with timezone. For Monthly Reviews, use the 27th of the month at 18:30 IST (YYYY-MM-27T18:30:00+05:30). For other content, use 09:00 IST on the chosen publish date.
6. **categories** must be a subset of the provided categoryOptions. Pick 1–3.
7. **tags** are free-form short labels (3–8 of them). Lowercase, hyphenated.
8. **abstract** is 1–3 sentences, ~30–60 words. Plain English summary.
9. **citation** is a Chicago-style citation string, e.g. "Author Name (ed.), 'Title', National Legal Observatory (Month Year)."
10. **coverImage** is "" if not provided.
11. **body** is full markdown. The first lines should include a centered NLO header block (mirror the existing NLO style):
    - "__NATIONAL LEGAL OBSERVATORY__"
    - "*Independent Legal Research | India*"
    - "*<Type> | <Month Year>*"
    - "__<Title>__"  (as a heading or h1)
    - Then numbered or named sections (## 01 | ..., ## 02 | ...).
12. Body must use markdown only — no HTML unless it's a single centered header div (and even then prefer plain markdown).
13. For **judgment** type: fill in case_summary, legal_principles, statutes_referenced, key_takeaways (3–5 items each).
14. For **policy** type: fill in policy_overview, policy_objectives, legal_implications.
15. For **research** type: fill in abstract, references (3–10 items).
16. For **opinion** type: body is the opinion itself; no required extras.
17. **Preserve all citations and footnote-style references** from the source. Use markdown footnote syntax [^1], [^2] where appropriate. If the source has URLs, include them as bare markdown links.
18. **No invented facts.** If something is not in the source, leave the field empty or omit it. Do not fabricate case numbers, statutes, or quotes.
19. **Tone:** sober, precise, institutional. Not breathless, not casual. This is a research publication read by lawyers and policy people.
20. **Length:** body should be the substantive length of the source. If source is 1500 words, output ~1500 words. If 5000, output ~5000. Do not summarize down to 300.

Output: a single JSON object matching the schema. No prose, no markdown fences. Just the JSON.`;

export function buildRefactorPrompt(input: RefactorInput): string {
  const today = new Date().toISOString().slice(0, 10);
  return `Source filename: ${input.sourceFilename || '(unknown)'}
Source mime: ${input.sourceMime || 'text/plain'}
Article type: ${input.articleType}
Author slug (use verbatim): ${input.authorSlug}
Today's date (fallback if not in source): ${today}

Available categories (pick from these slugs only):
${input.categoryOptions.map((c) => `  - ${c.slug}  (${c.name})`).join('\n')}

--- BEGIN SOURCE DOCUMENT ---
${input.rawText}
--- END SOURCE DOCUMENT ---

Now output the JSON object.`;
}

/**
 * Robust JSON extraction.
 *
 * LLMs frequently:
 *   - wrap the JSON in markdown fences (\`\`\`json ... \`\`\`)
 *   - prepend/append prose ("Here is the refactored article:")
 *   - nest the JSON inside extra text
 *   - return JSON5-ish with trailing commas
 *   - truncate mid-object
 *
 * This function tolerates all of the above. Strategy:
 *   1. Strip markdown fences if present.
 *   2. Try strict JSON.parse on the whole string.
 *   3. If that fails, find the first '{' and the matching closing '}' (counting
 *      braces + respecting strings) and parse that substring.
 *   4. If that fails, attempt a minimal JSON5 cleanup (trailing commas).
 *   5. Throw with the raw text (truncated) attached for debugging.
 */
export function safeParseRefactor(raw: string): RefactorOutput {
  if (typeof raw !== 'string') {
    throw new Error('Refactor output was not a string');
  }

  // 1) Strip markdown fences.
  let text = raw.trim();
  if (text.startsWith('```')) {
    text = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();
  }

  // 2) Try strict parse first.
  try {
    return JSON.parse(text) as RefactorOutput;
  } catch {
    // continue
  }

  // 3) Find the first balanced { ... } substring.
  const start = text.indexOf('{');
  if (start >= 0) {
    const candidate = extractFirstJsonObject(text, start);
    if (candidate) {
      try {
        return JSON.parse(candidate) as RefactorOutput;
      } catch {
        // continue to step 4
      }

      // 4) Minimal JSON5 cleanup: remove trailing commas before } or ]
      const cleaned = candidate.replace(/,(\s*[}\]])/g, '$1');
      try {
        return JSON.parse(cleaned) as RefactorOutput;
      } catch {
        // give up — fall through to throw
      }
    }
  }

  throw new Error(
    `Failed to parse refactor JSON. First 200 chars of raw: ${text.slice(0, 200)}`,
  );
}

/**
 * Walk from `startIdx` (a '{') to the matching '}', respecting JSON string
 * boundaries + escape sequences. Returns the substring, or null if no match.
 *
 * Cheap hand-rolled state machine — avoids depending on a JSON-tolerance
 * library for what's usually <2 KB of model output.
 */
function extractFirstJsonObject(text: string, startIdx: number): string | null {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') {
      depth++;
      continue;
    }
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        return text.slice(startIdx, i + 1);
      }
    }
  }
  return null;
}
