import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/cms/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const ALLOWED_CATEGORIES = [
  'constitutional-law',
  'criminal-law',
  'civil-law',
  'corporate-law',
  'technology-law',
  'public-policy',
  'human-rights',
  'international-law',
  'intellectual-property',
  'environmental-law',
];

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }

    const { content, currentTitle } = (await req.json().catch(() => ({}))) as {
      content?: string;
      currentTitle?: string;
    };

    if (!content || typeof content !== 'string' || content.trim().length < 50) {
      return NextResponse.json(
        { error: 'Body content is required and must be at least 50 characters long.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'NVIDIA NIM API key is not configured.' },
        { status: 500 }
      );
    }

    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const authorName = 'Bhoomija Khanna';

    const systemPrompt = `You are the chief legal editor and indexing system for the National Legal Observatory (NLO).
Your task is to analyze the provided legal publication body and generate accurate editorial metadata strictly derived from the text.
STRICT SCOPE: Only extract facts and principles present in the article. Do not hallucinate external details.

Return ONLY a valid JSON object matching this schema:
{
  "title": "Clean, authoritative publication title",
  "abstract": "Crisp 2-3 sentence executive summary capturing the central legal dispute, statutory framework, and judicial/policy takeaway.",
  "citation": "${authorName}, '[Title]', National Legal Observatory (${dateStr}).",
  "tags": ["3 to 6 comma-separated legal keywords like constitutionalism, procedural fairness, etc."],
  "category": "One of: constitutional-law, criminal-law, civil-law, corporate-law, technology-law, public-policy, human-rights, international-law, intellectual-property, environmental-law",
  "index": "A concise, numbered markdown Table of Contents / Index reflecting the sections in the document."
}`;

    const userPrompt = `Publication Draft:
Title: ${currentTitle || 'Untitled'}
Content:
${content.slice(0, 15000)}

Generate the exact JSON metadata now.`;

    const model = process.env.NVIDIA_DEFAULT_MODEL || 'meta/llama-3.2-11b-vision-instruct';
    const fallbackModel = process.env.NVIDIA_FALLBACK_MODEL || 'mistralai/mistral-large-2-instruct';

    let res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      console.warn(`[autofill] Model ${model} returned ${res.status}, falling back to ${fallbackModel}`);
      res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: fallbackModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: 1500,
          response_format: { type: 'json_object' },
        }),
      });
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return NextResponse.json({ error: `NVIDIA NIM failed (${res.status}): ${errText.slice(0, 150)}` }, { status: 502 });
    }

    const data = await res.json();
    const rawText = data?.choices?.[0]?.message?.content || '{}';

    // Parse JSON
    let parsed: {
      title?: string;
      abstract?: string;
      citation?: string;
      tags?: string[];
      category?: string;
      index?: string;
    } = {};

    try {
      parsed = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      }
    }

    // Sanitize category
    if (parsed.category && !ALLOWED_CATEGORIES.includes(parsed.category)) {
      parsed.category = ALLOWED_CATEGORIES[0];
    }

    return NextResponse.json({
      ok: true,
      data: {
        title: parsed.title || currentTitle || '',
        abstract: parsed.abstract || '',
        citation: parsed.citation || `${authorName}, '${parsed.title || currentTitle || 'Legal Dispatch'}', National Legal Observatory (${dateStr}).`,
        tags: Array.isArray(parsed.tags) ? parsed.tags : (typeof parsed.tags === 'string' ? (parsed.tags as string).split(',').map((s: string) => s.trim()) : []),
        category: parsed.category || 'constitutional-law',
        index: parsed.index || '',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[autofill] Error:', message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
