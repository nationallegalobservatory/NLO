'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function SubscriberUpload() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [source, setSource] = useState('import');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ added: number; skipped: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/cms/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, source }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || data.message || data.error || 'Upload failed.');
        return;
      }
      setResult(data);
      setText('');
      startTransition(() => router.refresh());
    } catch (err) {
      setError('Network error.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 max-w-2xl">
      <p className="text-xs text-on-surface-variant">
        Paste one email per line. Comma- and semicolon-separated also work. Invalid lines are
        skipped silently.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder="alice@example.com&#10;bob@example.com, carol@example.com"
        className="w-full border border-outline bg-surface-container-lowest px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
      />
      <div className="flex items-center gap-3">
        <label className="text-xs font-technical-ui uppercase tracking-[0.18em] text-on-surface-variant">
          Source
        </label>
        <input
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="border border-outline bg-surface-container-lowest px-2 py-1 text-sm"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="ml-auto border border-oxblood bg-oxblood text-white px-3 py-1.5 text-xs font-technical-ui uppercase tracking-[0.18em] hover:bg-on-background disabled:opacity-50"
        >
          {busy ? 'Uploading…' : 'Add subscribers'}
        </button>
      </div>
      {error && (
        <div className="border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">{error}</div>
      )}
      {result && (
        <div className="border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
          Added {result.added}, skipped {result.skipped}. Total active: {result.total}.
        </div>
      )}
    </form>
  );
}
