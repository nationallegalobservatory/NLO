'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CmsRole } from '@/lib/cms/session';

interface Article {
  slug: string;
  type: string;
  title: string;
  author_slug: string;
  date: string;
  categories: string[];
  tags: string[];
  content: string;
  abstract: string;
  citation: string;
  coverImage: string;
  format: string | null;
  publishAt: string | null;
  cms_status: string;
  cms_publish_at: string | null;
  cms_cover_image_path: string | null;
}

interface Category {
  slug: string;
  name: string;
  color: string;
}

const STATUSES = ['draft', 'review', 'scheduled', 'published', 'archived'] as const;

export function ArticleEditor({
  initialArticle,
  categories,
  viewerRole,
}: {
  initialArticle: Article;
  categories: Category[];
  viewerRole: CmsRole;
}) {
  const router = useRouter();
  const [article, setArticle] = useState<Article>(initialArticle);
  const [tab, setTab] = useState<'content' | 'meta' | 'cover' | 'publish'>('content');
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [generatedIndex, setGeneratedIndex] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const canEdit = viewerRole === 'owner' || viewerRole === 'editor';
  const isReadOnly = !canEdit;

  const update = <K extends keyof Article>(key: K, value: Article[K]) =>
    setArticle((prev) => ({ ...prev, [key]: value }));

  const onAutofill = async () => {
    if (!article.content || article.content.trim().length < 50) {
      setError('Article body needs at least 50 characters before AI can autofill metadata.');
      return;
    }
    setAiBusy(true);
    setError(null);
    setAiNotice(null);
    try {
      const res = await fetch('/api/cms/autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: article.content,
          currentTitle: article.title,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'AI Autofill failed.');
        return;
      }
      const { title, abstract, citation, tags, category, index } = json.data;
      setArticle((prev) => ({
        ...prev,
        title: prev.title.trim() ? prev.title : title,
        abstract: abstract || prev.abstract,
        citation: citation || prev.citation,
        tags: tags && tags.length > 0 ? tags : prev.tags,
        categories:
          category && !prev.categories.includes(category)
            ? [...prev.categories, category]
            : prev.categories,
      }));
      if (index) {
        setGeneratedIndex(index);
      }
      setAiNotice('⚡ AI Autofill complete! Abstract, citation, tags, and category updated.');
    } catch {
      setError('Network error during AI autofill.');
    } finally {
      setAiBusy(false);
    }
  };

  const insertIndexIntoBody = () => {
    if (!generatedIndex) return;
    const tocBlock = `## Contents\n\n${generatedIndex}\n\n---\n\n`;
    setArticle((prev) => ({
      ...prev,
      content: `${tocBlock}${prev.content}`,
    }));
    setGeneratedIndex(null);
    setAiNotice('Table of Contents inserted into Markdown body.');
  };

  const onSave = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/cms/articles/${encodeURIComponent(article.slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          content: article.content,
          abstract: article.abstract,
          citation: article.citation,
          coverImage: article.coverImage,
          cms_cover_image_path: article.cms_cover_image_path,
          categories: article.categories,
          tags: article.tags,
          format: article.format,
          publishAt: article.publishAt,
          cms_publish_at: article.cms_publish_at,
          cms_status: article.cms_status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || data.message || data.error || 'Save failed.');
        return;
      }
      setSavedAt(new Date());
      startTransition(() => router.refresh());
    } catch (err) {
      setError('Network error.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl">
      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="font-technical-ui text-[10px] uppercase tracking-[0.28em] text-on-surface-variant">
            {article.cms_status ?? 'published'} · {article.type}
          </p>
          <h1 className="text-2xl font-semibold mt-1 truncate">{article.title}</h1>
          <p className="text-xs font-mono text-on-surface-variant mt-1">{article.slug}</p>
        </div>
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {savedAt && <span className="text-on-surface-variant">Saved {savedAt.toLocaleTimeString()}</span>}
          {isReadOnly && (
            <span className="px-2 py-1 border border-outline-variant font-technical-ui uppercase tracking-[0.16em]">
              Read-only
            </span>
          )}
          <button
            type="button"
            onClick={onAutofill}
            disabled={aiBusy || isReadOnly}
            title="Analyze article body with NVIDIA NIM and autofill Title, Abstract, Citation, Tags & Categories"
            className="border border-primary/60 bg-primary/10 text-primary px-3 py-1.5 font-technical-ui uppercase tracking-[0.18em] hover:bg-primary/20 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {aiBusy ? (
              <>
                <span className="inline-block animate-spin">⟳</span>
                <span>Analyzing…</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>AI Autofill & Index</span>
              </>
            )}
          </button>
          <Link
            href={`/cms/articles/${encodeURIComponent(article.slug)}/preview`}
            target="_blank"
            className="border border-outline-variant px-3 py-1.5 font-technical-ui uppercase tracking-[0.18em] hover:border-primary hover:text-primary"
          >
            Preview
          </Link>
          <button
            onClick={onSave}
            disabled={busy || isReadOnly}
            className="border border-oxblood bg-oxblood text-white px-3 py-1.5 font-technical-ui uppercase tracking-[0.18em] hover:bg-on-background disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </header>

      {aiNotice && (
        <div className="border border-primary/40 bg-primary/10 px-4 py-2.5 text-xs text-primary mb-4 flex items-center justify-between gap-2 flex-wrap">
          <span>{aiNotice}</span>
          {generatedIndex && (
            <button
              type="button"
              onClick={insertIndexIntoBody}
              className="underline font-semibold hover:opacity-80 ml-auto"
            >
              + Insert Table of Contents into Markdown
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="border border-error/40 bg-error/10 px-4 py-3 text-sm text-error mb-4">
          {error}
        </div>
      )}

      <nav className="flex border-b border-outline-variant mb-4">
        {(['content', 'meta', 'cover', 'publish'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              'px-4 py-2 text-xs font-technical-ui uppercase tracking-[0.18em] border-b-2 -mb-px ' +
              (tab === t
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-background')
            }
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === 'content' && (
        <div className="space-y-4">
          <label className="block">
            <span className="block text-xs font-technical-ui uppercase tracking-[0.18em] text-on-surface-variant mb-2">
              Title
            </span>
            <input
              type="text"
              value={article.title}
              onChange={(e) => update('title', e.target.value)}
              disabled={isReadOnly}
              className="w-full border border-outline/50 bg-surface-container-lowest dark:bg-[#0c0f17] text-foreground dark:text-[#f1f5f9] placeholder:text-on-surface-variant/50 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-technical-ui uppercase tracking-[0.18em] text-on-surface-variant mb-2">
              Body (markdown)
            </span>
            <textarea
              value={article.content}
              onChange={(e) => update('content', e.target.value)}
              disabled={isReadOnly}
              rows={28}
              className="w-full border border-outline/50 bg-surface-container-lowest dark:bg-[#0c0f17] text-foreground dark:text-[#f1f5f9] placeholder:text-on-surface-variant/50 px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
            />
          </label>
        </div>
      )}

      {tab === 'meta' && (
        <div className="space-y-4">
          <label className="block">
            <span className="block text-xs font-technical-ui uppercase tracking-[0.18em] text-on-surface-variant mb-2">
              Abstract
            </span>
            <textarea
              value={article.abstract ?? ''}
              onChange={(e) => update('abstract', e.target.value)}
              disabled={isReadOnly}
              rows={4}
              className="w-full border border-outline/50 bg-surface-container-lowest dark:bg-[#0c0f17] text-foreground dark:text-[#f1f5f9] placeholder:text-on-surface-variant/50 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-technical-ui uppercase tracking-[0.18em] text-on-surface-variant mb-2">
              Citation
            </span>
            <input
              type="text"
              value={article.citation ?? ''}
              onChange={(e) => update('citation', e.target.value)}
              disabled={isReadOnly}
              className="w-full border border-outline/50 bg-surface-container-lowest dark:bg-[#0c0f17] text-foreground dark:text-[#f1f5f9] placeholder:text-on-surface-variant/50 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-technical-ui uppercase tracking-[0.18em] text-on-surface-variant mb-2">
              Tags (comma-separated)
            </span>
            <input
              type="text"
              value={article.tags?.join(', ') ?? ''}
              onChange={(e) =>
                update(
                  'tags',
                  e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                )
              }
              disabled={isReadOnly}
              className="w-full border border-outline/50 bg-surface-container-lowest dark:bg-[#0c0f17] text-foreground dark:text-[#f1f5f9] placeholder:text-on-surface-variant/50 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>
          <div>
            <span className="block text-xs font-technical-ui uppercase tracking-[0.18em] text-on-surface-variant mb-2">
              Categories
            </span>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const active = article.categories?.includes(c.slug);
                return (
                  <button
                    key={c.slug}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() =>
                      update(
                        'categories',
                        active
                          ? (article.categories ?? []).filter((s) => s !== c.slug)
                          : [...(article.categories ?? []), c.slug],
                      )
                    }
                    className={
                      'px-3 py-1.5 text-xs border font-technical-ui uppercase tracking-[0.14em] ' +
                      (active
                        ? 'border-primary text-primary bg-primary/10'
                        : 'border-outline-variant text-on-surface-variant hover:border-primary')
                    }
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="block">
            <span className="block text-xs font-technical-ui uppercase tracking-[0.18em] text-on-surface-variant mb-2">
              Publish date
            </span>
            <input
              type="date"
              value={article.date ?? ''}
              onChange={(e) => update('date', e.target.value)}
              disabled={isReadOnly}
              className="border border-outline/50 bg-surface-container-lowest dark:bg-[#0c0f17] text-foreground dark:text-[#f1f5f9] px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>
        </div>
      )}

      {tab === 'cover' && (
        <div className="space-y-4">
          <label className="block">
            <span className="block text-xs font-technical-ui uppercase tracking-[0.18em] text-on-surface-variant mb-2">
              Cover image URL or /public path
            </span>
            <input
              type="text"
              value={article.coverImage ?? ''}
              onChange={(e) => update('coverImage', e.target.value)}
              disabled={isReadOnly}
              placeholder="/images/my-cover.png or https://..."
              className="w-full border border-outline/50 bg-surface-container-lowest dark:bg-[#0c0f17] text-foreground dark:text-[#f1f5f9] placeholder:text-on-surface-variant/50 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>
          <p className="text-xs text-on-surface-variant">
            Direct upload (drag-drop image to a future version) is queued. For now, paste a URL or
            drop the file into <code className="font-mono">public/</code> and reference it.
          </p>
        </div>
      )}

      {tab === 'publish' && (
        <div className="space-y-4 max-w-md">
          <label className="block">
            <span className="block text-xs font-technical-ui uppercase tracking-[0.18em] text-on-surface-variant mb-2">
              Status
            </span>
            <select
              value={article.cms_status ?? 'published'}
              onChange={(e) => update('cms_status', e.target.value)}
              disabled={isReadOnly}
              className="w-full border border-outline/50 bg-surface-container-lowest dark:bg-[#0c0f17] text-foreground dark:text-[#f1f5f9] px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-technical-ui uppercase tracking-[0.18em] text-on-surface-variant mb-2">
              Scheduled publish time (ISO)
            </span>
            <input
              type="datetime-local"
              value={
                article.cms_publish_at
                  ? new Date(article.cms_publish_at).toISOString().slice(0, 16)
                  : ''
              }
              onChange={(e) =>
                update(
                  'cms_publish_at',
                  e.target.value ? new Date(e.target.value).toISOString() : null,
                )
              }
              disabled={isReadOnly}
              className="w-full border border-outline/50 bg-surface-container-lowest dark:bg-[#0c0f17] text-foreground dark:text-[#f1f5f9] px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>
          <p className="text-xs text-on-surface-variant">
            Monthly Reviews must publish on the 27th at 18:30 IST per NLO editorial rules. The
            save call will snap non-conforming dates for <code>format = &quot;monthly-report&quot;</code>.
          </p>
        </div>
      )}
    </div>
  );
}
