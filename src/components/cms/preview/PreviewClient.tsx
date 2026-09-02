'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, Check, AlertCircle } from 'lucide-react';
import { Editable } from './Editable';
import type { CmsRole } from '@/lib/cms/session';

interface Article {
  slug: string;
  type: string;
  format?: string | null;
  title: string;
  author_slug: string;
  date: string;
  publishAt?: string | null;
  categories: string[];
  tags: string[];
  content: string;
  abstract?: string | null;
  citation?: string | null;
  coverImage?: string;
  cms_cover_image_path?: string | null;
  case_summary?: string | null;
  legal_principles?: string[];
  statutes_referenced?: string[];
  key_takeaways?: string[];
  policy_overview?: string | null;
  policy_objectives?: string[];
  legal_implications?: string[];
  references?: string[];
  reading_time?: string;
  cms_status: string;
}

interface Category {
  slug: string;
  name: string;
  color: string;
}

interface Author {
  slug: string;
  name: string;
  avatar?: string;
  role?: string;
  bio?: string;
}

interface PreviewClientProps {
  initialArticle: Article;
  categories: Category[];
  authors: Author[];
  viewerRole: CmsRole;
  backHref: string;
}

export function PreviewClient({
  initialArticle,
  categories,
  authors,
  viewerRole,
  backHref,
}: PreviewClientProps) {
  const router = useRouter();
  const [article, setArticle] = React.useState<Article>(initialArticle);
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const canEdit = viewerRole === 'owner' || viewerRole === 'editor';

  const saveField = async (field: keyof Article, value: unknown) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/cms/articles/${encodeURIComponent(article.slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || data.error || 'Save failed');
      setArticle((prev) => ({ ...prev, [field]: value as Article[keyof Article] }));
      setSavedAt(new Date());
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const author = authors.find((a) => a.slug === article.author_slug);

  // Map internal type to NLO public-site category URL
  const typeMapping: Record<string, string> = {
    judgment: 'judgments',
    policy: 'policies',
    research: 'research',
    opinion: 'opinions',
  };
  const publicUrl = `/publications/${typeMapping[article.type] || 'research'}/${article.slug}`;

  const formattedDate = (() => {
    try {
      return new Date(article.date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return article.date;
    }
  })();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* === PREVIEW TOOLBAR === */}
      <div className="sticky top-0 z-50 bg-surface-container-lowest border-b border-outline-variant">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 border border-outline-variant px-3 py-1.5 font-technical-ui uppercase tracking-[0.16em] hover:border-primary hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to editor
            </Link>
            <Link
              href={publicUrl}
              target="_blank"
              className="inline-flex items-center gap-1.5 border border-outline-variant px-3 py-1.5 font-technical-ui uppercase tracking-[0.16em] hover:border-primary hover:text-primary transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Public page
            </Link>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {saving && <span className="text-on-surface-variant">Saving…</span>}
            {!saving && savedAt && (
              <span className="text-primary inline-flex items-center gap-1">
                <Check className="w-3 h-3" />
                Saved {savedAt.toLocaleTimeString()}
              </span>
            )}
            {error && (
              <span className="text-error inline-flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </span>
            )}
            <span
              className={
                'px-2 py-1 border font-technical-ui uppercase tracking-[0.16em] ' +
                (article.cms_status === 'published'
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-outline-variant text-on-surface-variant')
              }
            >
              {article.cms_status}
            </span>
            {!canEdit && (
              <span className="px-2 py-1 border border-outline-variant font-technical-ui uppercase tracking-[0.16em]">
                Read-only
              </span>
            )}
          </div>
        </div>
      </div>

      {/* === NLO ARTICLE PREVIEW (exact public-site theming) === */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-10">
        <div className="space-y-10 py-4">
          {/* Breadcrumb / Back button (mirrors public site) */}
          <div className="flex items-center text-xs text-slate-400 dark:text-slate-500 flex-wrap gap-y-1">
            <Link
              href="/cms/articles"
              className="flex items-center hover:text-indigo-600 dark:hover:text-indigo-400 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to articles
            </Link>
            <span className="mx-2">/</span>
            <span className="capitalize">{article.type}</span>
            <span className="mx-2">/</span>
            <span className="truncate max-w-[300px] text-slate-800 dark:text-slate-300 font-medium">
              {article.title || '(untitled)'}
            </span>
          </div>

          {/* Cover image (editable) */}
          <Editable
            kind="image"
            value={article.coverImage || ''}
            onSave={(v) => saveField('coverImage', v)}
            disabled={!canEdit}
            className="block"
            placeholder="Click to add a cover image"
          />

          {/* Article Header block */}
          <header className="space-y-4 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Type badge (editable) */}
              <Editable
                kind="text"
                value={article.type}
                onSave={(v) => saveField('type', v)}
                disabled={!canEdit}
                className="px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 uppercase tracking-widest text-[9px]"
                placeholder="type"
              />
              {/* Categories (editable as comma list) */}
              <Editable
                kind="list"
                value={article.categories.join(',')}
                onSave={(v) =>
                  saveField(
                    'categories',
                    v.split(',').map((s) => s.trim()).filter(Boolean),
                  )
                }
                disabled={!canEdit}
              />
            </div>

            {/* Title (editable) */}
            <Editable
              as="h1"
              value={article.title}
              onSave={(v) => saveField('title', v)}
              disabled={!canEdit}
              className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight text-slate-900 dark:text-white"
              placeholder="Click to set title"
            />

            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-500 dark:text-slate-400 pt-2 border-b border-slate-200/50 dark:border-slate-800 pb-4">
              <Editable
                kind="date"
                value={article.date}
                onSave={(v) => saveField('date', v)}
                disabled={!canEdit}
                className="inline-flex items-center space-x-1.5"
              />
              <span className="inline-flex items-center space-x-1.5">
                <ClockIcon />
                <span>{article.reading_time || '5 min read'}</span>
              </span>
              {author && (
                <span className="inline-flex items-center space-x-1.5">
                  <UserIcon />
                  <span>{author.name}</span>
                </span>
              )}
            </div>
          </header>

          {/* Main split grid: content + sidebar (matches public site) */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
            <div className="lg:col-span-3 space-y-10">
              {/* Abstract / case_summary / policy_overview panel */}
              {(() => {
                const summaryText =
                  article.type === 'judgment'
                    ? article.case_summary
                    : article.type === 'policy'
                      ? article.policy_overview
                      : article.abstract;
                const summaryLabel =
                  article.type === 'judgment'
                    ? 'Case Summary'
                    : article.type === 'policy'
                      ? 'Policy Overview'
                      : 'Abstract';
                const summaryField: keyof Article =
                  article.type === 'judgment'
                    ? 'case_summary'
                    : article.type === 'policy'
                      ? 'policy_overview'
                      : 'abstract';
                return (
                  <div className="p-6 border border-slate-200/60 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-950 dark:text-white mb-2 font-serif">
                      {summaryLabel}
                    </h3>
                    <Editable
                      kind="multiline"
                      value={summaryText || ''}
                      onSave={(v) => saveField(summaryField, v)}
                      disabled={!canEdit}
                      className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic bg-transparent border-0 p-0 font-sans not-italic w-full"
                      placeholder={`Add ${summaryLabel.toLowerCase()}…`}
                      rows={4}
                    />
                  </div>
                );
              })()}

              {/* Judgment-specific panels */}
              {article.type === 'judgment' && (
                <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl space-y-4 text-xs">
                  <h3 className="font-serif text-sm font-bold text-slate-900 dark:text-white">
                    Legal Research Briefing
                  </h3>
                  <BriefingGrid
                    title="Legal Principles"
                    items={article.legal_principles || []}
                    onSave={(items) => saveField('legal_principles', items)}
                    disabled={!canEdit}
                  />
                  <BriefingGrid
                    title="Statutes Referenced"
                    items={article.statutes_referenced || []}
                    onSave={(items) => saveField('statutes_referenced', items)}
                    disabled={!canEdit}
                  />
                  <BriefingGrid
                    title="Key Takeaways"
                    items={article.key_takeaways || []}
                    onSave={(items) => saveField('key_takeaways', items)}
                    disabled={!canEdit}
                  />
                </div>
              )}

              {/* Policy-specific panels */}
              {article.type === 'policy' && (
                <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl space-y-4 text-xs">
                  <h3 className="font-serif text-sm font-bold text-slate-900 dark:text-white">
                    Policy Research Briefing
                  </h3>
                  <BriefingGrid
                    title="Policy Objectives"
                    items={article.policy_objectives || []}
                    onSave={(items) => saveField('policy_objectives', items)}
                    disabled={!canEdit}
                  />
                  <BriefingGrid
                    title="Legal Implications"
                    items={article.legal_implications || []}
                    onSave={(items) => saveField('legal_implications', items)}
                    disabled={!canEdit}
                  />
                </div>
              )}

              {/* Main article body (editable) */}
              <article className="prose max-w-none dark:prose-invert prose-headings:font-serif prose-h2:text-xl prose-h2:font-extrabold prose-h2:mt-8 prose-h2:pb-1 prose-h2:border-b prose-h2:border-slate-200/50 dark:prose-h2:border-slate-800/50 prose-h3:text-lg prose-h3:font-bold prose-h3:mt-6 prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-a:font-semibold prose-blockquote:border-l-4 prose-blockquote:border-slate-300 dark:prose-blockquote:border-slate-850 prose-blockquote:pl-4 prose-blockquote:italic prose-p:leading-relaxed prose-li:leading-relaxed prose-table:text-xs sm:text-justify">
                <Editable
                  kind="multiline"
                  value={article.content}
                  onSave={(v) => saveField('content', v)}
                  disabled={!canEdit}
                  className="bg-transparent border-0 p-0 w-full font-serif text-base leading-relaxed"
                  placeholder="Start writing the article body (markdown supported)…"
                  rows={20}
                />
              </article>

              {/* References (research) */}
              {article.type === 'research' && (article.references?.length ?? 0) > 0 && (
                <div className="mt-10 pt-6 border-t border-slate-200/50 dark:border-slate-800">
                  <h3 className="font-serif text-lg font-bold text-slate-900 dark:text-white mb-4">
                    References
                  </h3>
                  <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-400 list-decimal pl-5">
                    {(article.references || []).map((ref, i) => (
                      <li key={i}>{ref}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Tags (editable) */}
              <div className="border-t border-slate-200/50 dark:border-slate-800 pt-4">
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  Tags
                </h4>
                <Editable
                  kind="tags"
                  value={article.tags.join(', ')}
                  onSave={(v) =>
                    saveField(
                      'tags',
                      v.split(',').map((s) => s.trim()).filter(Boolean),
                    )
                  }
                  disabled={!canEdit}
                />
              </div>
            </div>

            {/* Right sidebar — citation + author (mirrors public site) */}
            <aside className="lg:col-span-1 space-y-6">
              {article.citation && (
                <div className="p-4 border border-slate-200/60 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-2 border-b border-slate-100 dark:border-slate-850 pb-2">
                    Citation
                  </h4>
                  <Editable
                    kind="multiline"
                    value={article.citation}
                    onSave={(v) => saveField('citation', v)}
                    disabled={!canEdit}
                    className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic bg-transparent border-0 p-0"
                    rows={3}
                    placeholder="Add Chicago-style citation…"
                  />
                </div>
              )}

              {author && (
                <div className="p-4 border border-slate-200/60 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                    Author
                  </h4>
                  <div className="flex items-center space-x-3">
                    {author.avatar && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={author.avatar}
                        alt={author.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {author.name}
                      </p>
                      {author.role && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {author.role}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 border border-slate-200/60 dark:border-slate-800 rounded-xl bg-slate-50/30 dark:bg-slate-900/20">
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  Public URL
                </h4>
                <code className="text-[10px] text-slate-600 dark:text-slate-400 break-all">
                  {publicUrl}
                </code>
                <p className="text-[10px] text-on-surface-variant mt-2">
                  Goes live when status = <strong>published</strong>.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Editable list of short strings (legal principles, statutes, etc.) */
function BriefingGrid({
  title,
  items,
  onSave,
  disabled,
}: {
  title: string;
  items: string[];
  onSave: (items: string[]) => Promise<void> | void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(items.join('\n'));

  React.useEffect(() => {
    if (!editing) setDraft(items.join('\n'));
  }, [items, editing]);

  const commit = async () => {
    const next = draft.split('\n').map((s) => s.trim()).filter(Boolean);
    try {
      await onSave(next);
      setEditing(false);
    } catch {
      // keep editing so user can fix
    }
  };

  return (
    <div>
      <h4 className="font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1.5">
        {title}
      </h4>
      {editing ? (
        <div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') commit();
              if (e.key === 'Escape') {
                setDraft(items.join('\n'));
                setEditing(false);
              }
            }}
            autoFocus
            rows={Math.max(3, items.length + 1)}
            className="w-full border border-primary bg-surface-container-lowest p-2 text-xs font-mono"
            placeholder="One per line"
          />
          <p className="mt-1 text-[10px] text-on-surface-variant">
            Cmd+Enter save · Esc cancel · one item per line
          </p>
        </div>
      ) : (
        <ul
          onClick={() => !disabled && setEditing(true)}
          className={
            'space-y-1 ' +
            (disabled ? '' : 'cursor-text hover:outline hover:outline-1 hover:outline-primary/30 p-1')
          }
        >
          {items.length === 0 ? (
            <li className="text-slate-400 italic">Click to add…</li>
          ) : (
            items.map((item, i) => (
              <li
                key={i}
                className="font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider"
              >
                — {item}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function ClockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="text-indigo-500"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="text-indigo-500"
      aria-hidden
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
