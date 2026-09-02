'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface ArticleRef {
  slug: string;
  title: string;
  date: string;
  type: string;
  abstract: string | null;
  citation: string | null;
  coverImage: string | null;
}

export function ComposeClient({
  articles,
  subscriberCount,
  viewerName,
}: {
  articles: ArticleRef[];
  subscriberCount: number;
  viewerName: string;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [intro, setIntro] = useState('');
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now');
  const [scheduleAt, setScheduleAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const toggle = (slug: string) => {
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (selectedSlugs.size === 0) {
      setError('Select at least one article.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/cms/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          intro,
          articleSlugs: [...selectedSlugs],
          scheduleFor:
            scheduleMode === 'later' && scheduleAt
              ? new Date(scheduleAt).toISOString()
              : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || data.message || data.error || 'Send failed.');
        return;
      }
      startTransition(() => router.push('/cms/newsletter'));
    } catch (err) {
      setError('Network error.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSend} className="p-8 max-w-4xl space-y-6">
      <header>
        <p className="font-technical-ui text-[10px] uppercase tracking-[0.28em] text-on-surface-variant">
          Newsletter
        </p>
        <h1 className="text-2xl font-semibold mt-1">Compose campaign</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Sending to {subscriberCount.toLocaleString()} active subscribers.
        </p>
      </header>

      <label className="block">
        <span className="block text-xs font-technical-ui uppercase tracking-[0.18em] text-on-surface-variant mb-2">
          Subject
        </span>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          placeholder="NLO Monthly Review — August 2026"
          className="w-full border border-outline bg-surface-container-lowest px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="block text-xs font-technical-ui uppercase tracking-[0.18em] text-on-surface-variant mb-2">
          Intro (optional)
        </span>
        <textarea
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          rows={5}
          placeholder={`Dear subscriber,\n\nThis month at the Observatory…`}
          className="w-full border border-outline bg-surface-container-lowest px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </label>

      <div>
        <p className="text-xs font-technical-ui uppercase tracking-[0.18em] text-on-surface-variant mb-2">
          Articles ({selectedSlugs.size} selected)
        </p>
        <div className="border border-outline-variant divide-y divide-outline-variant max-h-80 overflow-y-auto">
          {articles.length === 0 ? (
            <p className="p-4 text-sm text-on-surface-variant">No published articles to attach.</p>
          ) : (
            articles.map((a) => {
              const active = selectedSlugs.has(a.slug);
              return (
                <button
                  type="button"
                  key={a.slug}
                  onClick={() => toggle(a.slug)}
                  className={
                    'w-full text-left px-4 py-2 text-sm flex items-start gap-3 hover:bg-surface-container-low ' +
                    (active ? 'bg-primary/5' : '')
                  }
                >
                  <span
                    className={
                      'mt-0.5 w-4 h-4 border flex items-center justify-center text-[10px] ' +
                      (active ? 'border-primary bg-primary text-white' : 'border-outline-variant')
                    }
                  >
                    {active ? '✓' : ''}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium truncate">{a.title}</span>
                    <span className="block text-xs text-on-surface-variant font-mono">
                      {a.slug} · {a.date} · {a.type}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-technical-ui uppercase tracking-[0.18em] text-on-surface-variant">
          Delivery
        </legend>
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={scheduleMode === 'now'}
              onChange={() => setScheduleMode('now')}
            />
            Send now
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={scheduleMode === 'later'}
              onChange={() => setScheduleMode('later')}
            />
            Schedule for later
          </label>
        </div>
        {scheduleMode === 'later' && (
          <input
            type="datetime-local"
            value={scheduleAt}
            onChange={(e) => setScheduleAt(e.target.value)}
            className="border border-outline bg-surface-container-lowest px-3 py-2 text-sm"
          />
        )}
        {scheduleMode === 'later' && (
          <p className="text-xs text-on-surface-variant">
            Scheduled sends require the cron route <code>/api/cron/send-newsletter</code> to be
            configured (every minute) — see README.
          </p>
        )}
      </fieldset>

      {error && (
        <div className="border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">{error}</div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="border border-oxblood bg-oxblood text-white px-4 py-2 text-xs font-technical-ui uppercase tracking-[0.18em] hover:bg-on-background disabled:opacity-50"
        >
          {busy
            ? 'Sending…'
            : scheduleMode === 'now'
              ? `Send to ${subscriberCount.toLocaleString()} subscribers`
              : 'Schedule campaign'}
        </button>
        <p className="text-xs text-on-surface-variant">From: {viewerName}</p>
      </div>
    </form>
  );
}
