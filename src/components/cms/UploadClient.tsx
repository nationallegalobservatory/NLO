'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type ArticleType = 'judgment' | 'policy' | 'research' | 'opinion';

interface UploadResult {
  id: string;
  originalFilename: string;
  byteSize: number;
  extractionStatus: 'pending' | 'extracting' | 'extracted' | 'failed';
  extractedCharCount: number;
  errorMessage: string | null;
}

interface RefactorResult {
  articleSlug: string;
  provider: string;
  model: string;
}

export function UploadClient() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [articleType, setArticleType] = useState<ArticleType>('research');
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'refactoring' | 'done' | 'error'>(
    'idle',
  );
  const [upload, setUpload] = useState<UploadResult | null>(null);
  const [refactor, setRefactor] = useState<RefactorResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const reset = () => {
    setFile(null);
    setUpload(null);
    setRefactor(null);
    setPhase('idle');
    setError(null);
  };

  const onUpload = async () => {
    if (!file) return;
    setError(null);
    setPhase('uploading');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('articleType', articleType);
    try {
      const res = await fetch('/api/cms/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || data.message || data.error || 'Upload failed.');
        setPhase('error');
        return;
      }
      setUpload(data.upload);
    } catch (err) {
      setError('Network error during upload.');
      setPhase('error');
    }
  };

  const onRefactor = async () => {
    if (!upload) return;
    setError(null);
    setPhase('refactoring');
    try {
      const res = await fetch('/api/cms/refactor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId: upload.id, articleType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || data.message || data.error || 'Refactor failed.');
        setPhase('error');
        return;
      }
      setRefactor(data);
      setPhase('done');
      startTransition(() => {
        router.push(`/cms/articles/${encodeURIComponent(data.articleSlug)}`);
      });
    } catch (err) {
      setError('Network error during refactor.');
      setPhase('error');
    }
  };

  return (
    <div className="space-y-6">
      {phase === 'done' && refactor ? (
        <div className="border border-primary/40 bg-primary/5 px-4 py-4 text-sm">
          <strong className="block mb-1">Refactor complete.</strong>
          Redirecting to <code className="font-mono">{refactor.articleSlug}</code> for review…
        </div>
      ) : (
        <>
          <fieldset className="space-y-4">
            <legend className="text-xs font-technical-ui uppercase tracking-[0.18em] text-on-surface-variant mb-2">
              1. Choose file
            </legend>
            <label className="block">
              <input
                type="file"
                accept=".pdf,.docx,.md,.markdown,.txt"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:border file:border-outline-variant file:bg-surface-container-lowest file:text-xs file:font-technical-ui file:uppercase file:tracking-[0.16em] file:cursor-pointer hover:file:bg-surface-container-low"
              />
              {file && (
                <p className="mt-2 text-xs text-on-surface-variant">
                  {file.name} · {(file.size / 1024).toFixed(1)} KB
                </p>
              )}
            </label>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-xs font-technical-ui uppercase tracking-[0.18em] text-on-surface-variant">
              2. Article type
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['judgment', 'policy', 'research', 'opinion'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setArticleType(t)}
                  className={
                    'border px-3 py-2 text-xs font-technical-ui uppercase tracking-[0.14em] ' +
                    (articleType === t
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-outline-variant bg-surface-container-lowest hover:border-primary')
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          </fieldset>

          {error && (
            <div className="border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            {!upload ? (
              <button
                onClick={onUpload}
                disabled={!file || phase === 'uploading'}
                className="border border-oxblood bg-oxblood text-white px-4 py-2 text-xs font-technical-ui uppercase tracking-[0.18em] hover:bg-on-background disabled:opacity-50"
              >
                {phase === 'uploading' ? 'Uploading…' : 'Upload + extract'}
              </button>
            ) : (
              <button
                onClick={onRefactor}
                disabled={upload.extractionStatus !== 'extracted' || phase === 'refactoring'}
                className="border border-oxblood bg-oxblood text-white px-4 py-2 text-xs font-technical-ui uppercase tracking-[0.18em] hover:bg-on-background disabled:opacity-50"
              >
                {phase === 'refactoring' ? 'Refactoring…' : 'Refactor into NLO format'}
              </button>
            )}
            {(upload || error) && (
              <button
                onClick={reset}
                className="border border-outline-variant px-4 py-2 text-xs font-technical-ui uppercase tracking-[0.18em] hover:border-primary"
              >
                Start over
              </button>
            )}
          </div>

          {upload && (
            <div className="border border-outline-variant p-4 text-sm">
              <p className="text-xs font-technical-ui uppercase tracking-[0.18em] text-on-surface-variant mb-1">
                Upload status
              </p>
              <p>
                <span className="font-mono">{upload.originalFilename}</span> ·{' '}
                {upload.extractionStatus === 'extracted'
                  ? `Extracted ${upload.extractedCharCount.toLocaleString()} characters.`
                  : `Extraction ${upload.extractionStatus}.`}
              </p>
              {upload.errorMessage && (
                <p className="text-error text-xs mt-2">{upload.errorMessage}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
