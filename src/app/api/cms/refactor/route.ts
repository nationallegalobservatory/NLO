import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/cms/session';
import { getSupabaseAdmin, isCmsBackendConfigured } from '@/lib/cms/supabaseAdmin';
import { chatWithFallback, hasAnyProvider } from '@/lib/cms/providers';
import {
  buildRefactorPrompt,
  safeParseRefactor,
  type RefactorOutput,
} from '@/lib/cms/refactor';
import { codeRefactor } from '@/lib/cms/codeRefactor';

import {
  getLocalUpload,
  updateLocalUpload,
  saveLocalArticle,
} from '@/lib/cms/localStore';
import { getCategories as getLocalCategories } from '@/lib/markdown';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * POST /api/cms/refactor
 * body: { uploadId: string, articleType: 'judgment'|'policy'|'research'|'opinion', engine?: 'code'|'ai' }
 *
 * Refactors extracted text into standard NLO format.
 * Defaults to the 100% local Code Refactor Engine (instant, 0 network, 0 load on NIM).
 * When engine === 'ai', queries NIM and automatically falls back to Code Refactor on error.
 */
export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const { uploadId, articleType, engine = 'code' } = (await req.json().catch(() => ({}))) as {
    uploadId?: string;
    articleType?: string;
    engine?: 'code' | 'ai';
  };

  if (!uploadId || !articleType) {
    return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 });
  }
  if (!['judgment', 'policy', 'research', 'opinion'].includes(articleType)) {
    return NextResponse.json({ error: 'BAD_TYPE' }, { status: 400 });
  }

  // === LOCAL OFFLINE FALLBACK ===
  if (!isCmsBackendConfigured() || !getSupabaseAdmin()) {
    const upload = getLocalUpload(uploadId);
    if (!upload) {
      return NextResponse.json({ error: 'UPLOAD_NOT_FOUND' }, { status: 404 });
    }
    if (upload.extractionStatus !== 'extracted' || !upload.extractedText) {
      return NextResponse.json(
        { error: 'NOT_EXTRACTED', extractionStatus: upload.extractionStatus },
        { status: 400 },
      );
    }

    const categories = getLocalCategories();
    const categoryOptions = categories.map((c) => ({ slug: c.slug, name: c.name }));

    let refactor: RefactorOutput;
    let provider = 'local-code-engine';
    let model = 'deterministic-nlo-v1';

    if (engine === 'ai' && hasAnyProvider()) {
      try {
        const prompt = buildRefactorPrompt({
          rawText: upload.extractedText.slice(0, 30000),
          authorSlug: 'bhoomija-khanna',
          categoryOptions,
          articleType: articleType as 'judgment' | 'policy' | 'research' | 'opinion',
          sourceFilename: upload.originalFilename,
          sourceMime: upload.mimeType,
        });

        const resp = await chatWithFallback({
          model: '', // provider default
          messages: [
            { role: 'system', content: 'You are a precise JSON-output assistant for National Legal Observatory. Output only valid JSON.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 8000,
          response_format: { type: 'json_object' },
        });
        provider = resp.provider;
        model = resp.model;
        refactor = safeParseRefactor(resp.text);
      } catch (err) {
        console.warn('AI Refactor failed (network or rate limit), using local code refactor fallback:', err);
        refactor = codeRefactor({
          rawText: upload.extractedText,
          authorSlug: 'bhoomija-khanna',
          categoryOptions,
          articleType: articleType as 'judgment' | 'policy' | 'research' | 'opinion',
          sourceFilename: upload.originalFilename,
          sourceMime: upload.mimeType,
        });
        provider = 'local-code-engine (ai-fallback)';
      }
    } else {
      // Deterministic, 0 network, instant execution
      refactor = codeRefactor({
        rawText: upload.extractedText,
        authorSlug: 'bhoomija-khanna',
        categoryOptions,
        articleType: articleType as 'judgment' | 'policy' | 'research' | 'opinion',
        sourceFilename: upload.originalFilename,
        sourceMime: upload.mimeType,
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const saved = saveLocalArticle({
      slug: refactor.slug,
      type: articleType,
      title: refactor.title,
      author: 'bhoomija-khanna',
      date: refactor.date || today,
      categories: refactor.categories || [],
      tags: refactor.tags || [],
      abstract: refactor.abstract || '',
      citation: refactor.citation,
      coverImage: refactor.coverImage || '',
      format: refactor.format || null,
      publishAt: refactor.publishAt || null,
      cms_status: 'draft',
      content: refactor.body,
    });

    return NextResponse.json({
      ok: true,
      articleSlug: saved.slug,
      provider,
      model,
      message: 'Draft created locally via NLO Code Engine',
    });
  }

  const admin = getSupabaseAdmin()!;

  // 1) Load the upload
  const { data: upload, error: upErr } = await admin
    .from('cms_uploads')
    .select('*')
    .eq('id', uploadId)
    .single();

  if (upErr || !upload) {
    return NextResponse.json({ error: 'UPLOAD_NOT_FOUND' }, { status: 404 });
  }
  if (upload.extraction_status !== 'extracted' || !upload.extracted_text) {
    return NextResponse.json(
      { error: 'NOT_EXTRACTED', extractionStatus: upload.extraction_status },
      { status: 400 },
    );
  }
  if (upload.refactor_status === 'refactored' && upload.refactored_article_id) {
    return NextResponse.json(
      { error: 'ALREADY_REFACTORED', articleId: upload.refactored_article_id },
      { status: 409 },
    );
  }

  // 2) Load categories for the prompt
  const { data: categories } = await admin
    .from('categories')
    .select('slug, name')
    .order('name');

  const categoryOptions = (categories ?? []) as { slug: string; name: string }[];

  // 3) Mark as refactoring
  await admin
    .from('cms_uploads')
    .update({ refactor_status: 'refactoring', updated_at: new Date().toISOString() })
    .eq('id', uploadId);

  // 4) Execute Refactoring (Code Engine default, AI optional with code fallback)
  let refactor: RefactorOutput;
  let provider = 'local-code-engine';
  let model = 'deterministic-nlo-v1';

  if (engine === 'ai' && hasAnyProvider()) {
    try {
      const prompt = buildRefactorPrompt({
        rawText: (upload.extracted_text || '').slice(0, 30000),
        authorSlug: 'bhoomija-khanna',
        categoryOptions,
        articleType: articleType as 'judgment' | 'policy' | 'research' | 'opinion',
        sourceFilename: upload.original_filename,
        sourceMime: upload.mime_type,
      });

      const resp = await chatWithFallback({
        model: '', // provider default
        messages: [
          { role: 'system', content: 'You are a precise JSON-output assistant. Output only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 8000,
        response_format: { type: 'json_object' },
      });
      provider = resp.provider;
      model = resp.model;
      refactor = safeParseRefactor(resp.text);
    } catch (err) {
      console.warn('AI Refactor failed, falling back to local code refactor:', err);
      refactor = codeRefactor({
        rawText: upload.extracted_text,
        authorSlug: 'bhoomija-khanna',
        categoryOptions,
        articleType: articleType as 'judgment' | 'policy' | 'research' | 'opinion',
        sourceFilename: upload.original_filename,
        sourceMime: upload.mime_type,
      });
      provider = 'local-code-engine (ai-fallback)';
    }
  } else {
    // Pure code refactor: instant, 0 network, 100% reliable
    refactor = codeRefactor({
      rawText: upload.extracted_text,
      authorSlug: 'bhoomija-khanna',
      categoryOptions,
      articleType: articleType as 'judgment' | 'policy' | 'research' | 'opinion',
      sourceFilename: upload.original_filename,
      sourceMime: upload.mime_type,
    });
  }

  // 5) Validate slugs/categories against DB (defense in depth — the prompt already constrains)
  const allowedSlugs = new Set(categoryOptions.map((c) => c.slug));
  refactor.categories = (refactor.categories || []).filter((s) => allowedSlugs.has(s));
  if (refactor.categories.length === 0 && categoryOptions[0]) {
    refactor.categories = [categoryOptions[0].slug];
  }

  // Slug uniqueness check
  let finalSlug = refactor.slug;
  const { count: existing } = await admin
    .from('articles')
    .select('*', { count: 'exact', head: true })
    .eq('slug', finalSlug);
  if (existing && existing > 0) {
    finalSlug = `${refactor.slug}-${Date.now().toString(36)}`;
  }

  // 6) Build the frontmatter + body markdown
  const today = new Date().toISOString().slice(0, 10);
  const articleRow: Record<string, unknown> = {
    slug: finalSlug,
    type: articleType,
    title: refactor.title,
    author_slug: 'bhoomija-khanna',
    date: refactor.date || today,
    categories: refactor.categories,
    tags: refactor.tags || [],
    content: refactor.body,
    raw_content: upload.extracted_text,
    abstract: refactor.abstract,
    citation: refactor.citation,
    coverImage: refactor.coverImage || '',
    format: refactor.format || null,
    publishAt: refactor.publishAt || null,
    cms_status: 'draft',
    cms_source_upload_id: uploadId,
    cms_updated_by: session.email,
    cms_updated_at: new Date().toISOString(),
  };

  // Type-specific extras
  if (articleType === 'judgment') {
    articleRow.case_summary = refactor.case_summary || null;
    articleRow.legal_principles = refactor.legal_principles || [];
    articleRow.statutes_referenced = refactor.statutes_referenced || [];
    articleRow.key_takeaways = refactor.key_takeaways || [];
  } else if (articleType === 'policy') {
    articleRow.policy_overview = refactor.policy_overview || null;
    articleRow.policy_objectives = refactor.policy_objectives || [];
    articleRow.legal_implications = refactor.legal_implications || [];
  } else if (articleType === 'research') {
    articleRow.references = refactor.references || [];
  }

  // 7) Insert
  const { data: article, error: artErr } = await admin
    .from('articles')
    .insert(articleRow)
    .select('slug')
    .single();

  if (artErr || !article) {
    await admin
      .from('cms_uploads')
      .update({
        refactor_status: 'failed',
        error_message: `Article insert failed: ${artErr?.message}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', uploadId);
    return NextResponse.json(
      { error: 'DB_ERROR', detail: artErr?.message },
      { status: 500 },
    );
  }

  // 8) Mark upload as refactored
  await admin
    .from('cms_uploads')
    .update({
      refactor_status: 'refactored',
      refactored_article_id: article.slug,
      updated_at: new Date().toISOString(),
    })
    .eq('id', uploadId);

  return NextResponse.json({
    ok: true,
    articleSlug: article.slug,
    provider,
    model,
    warnings: [],
  });
}
