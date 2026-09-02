'use client';

import { useState, useTransition, useRef, useCallback } from 'react';
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

const ACCEPTED_EXTS = ['.pdf', '.docx', '.md', '.markdown', '.txt'];
const ACCEPTED_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/markdown',
  'text/x-markdown',
  'text/plain',
]);
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

function validateFile(file: File): { ok: true } | { ok: false; reason: string } {
  const lower = file.name.toLowerCase();
  const extOk = ACCEPTED_EXTS.some((e) => lower.endsWith(e));
  const mimeOk = ACCEPTED_MIMES.has(file.type) || file.type === '' || file.type === 'application/octet-stream';
  if (!extOk && !mimeOk) {
    return {
      ok: false,
      reason: `Unsupported file type. Accepted: ${ACCEPTED_EXTS.join(', ')}`,
    };
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      reason: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 25 MB.`,
    };
  }
  if (file.size === 0) {
    return { ok: false, reason: 'File is empty.' };
  }
  return { ok: true };
}

export function UploadClient() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [articleType, setArticleType] = useState<ArticleType>('research');
  const [phase, setPhase] = useState<
    'idle' | 'validating' | 'uploading' | 'refactoring' | 'done' | 'error'
  >('idle');
  const [upload, setUpload] = useState<UploadResult | null>(null);
  const [refactor, setRefactor] = useState<RefactorResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [, startTransition] = useTransition();

  const acceptFile = useCallback((f: File | undefined | null) => {
    if (!f) {
      setFile(null);
      setValidationError(null);
      return;
    }
    const v = validateFile(f);
    if (!v.ok) {
      setValidationError(v.reason);
      setFile(null);
      return;
    }
    setValidationError(null);
    setFile(f);
  }, []);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    acceptFile(e.target.files?.[0]);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    acceptFile(e.dataTransfer.files?.[0]);
  };

  const reset = () => {
    setFile(null);
    setUpload(null);
    setRefactor(null);
    setPhase('idle');
    setError(null);
    setValidationError(null);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onUpload = async () => {
    if (!file) return;
    setError(null);
    setPhase('uploading');
    setProgress(0);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('articleType', articleType);

    try {
      // Use XHR for progress events (fetch doesn't expose upload progress).
      const result = await new Promise<UploadResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/cms/upload');
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(data.upload);
            } else {
              reject(new Error(data.detail || data.message || data.error || 'Upload failed.'));
            }
          } catch (e) {
            reject(new Error('Invalid response from server.'));
          }
        };
        xhr.onerror = () => reject(new Error('Network error during upload.'));
        xhr.send(fd);
      });
      setUpload(result);
      setProgress(100);
    } catch (err) {
      setError((err as Error).message);
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
          Redirecting to <code className="font-mono break-all">{refactor.articleSlug}</code> for review…
        </div>
      ) : (
        <>
          {/* === Drag & drop zone === */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            className={
              'border-2 border-dashed rounded-md p-6 sm:p-10 text-center cursor-pointer transition-colors min-h-[180px] flex flex-col items-center justify-center ' +
              (dragging
                ? 'border-primary bg-primary/10'
                : file
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-outline-variant hover:border-primary/50 hover:bg-surface-container-low')
            }
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.md,.markdown,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={onPick}
              className="sr-only"
            />
            {file ? (
              <>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  {(file.size / 1024).toFixed(1)} KB · click to change
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">Drop file here, or tap to browse</p>
                <p className="text-xs text-on-surface-variant mt-2">
                  PDF, DOCX, MD, or TXT · up to 25 MB
                </p>
              </>
            )}
          </div>

          {validationError && (
            <div className="border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
              {validationError}
            </div>
          )}

          {/* === Article type picker === */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-technical-ui uppercase tracking-[0.18em] text-on-surface-variant">
              Article type
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['judgment', 'policy', 'research', 'opinion'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setArticleType(t)}
                  className={
                    'border px-3 py-2 min-h-[44px] text-xs font-technical-ui uppercase tracking-[0.14em] ' +
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

          {/* === Progress bar (during upload) === */}
          {phase === 'uploading' && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-on-surface-variant">
                <span>Uploading + extracting…</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-surface-container-low overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* === Action buttons === */}
          <div className="flex flex-wrap gap-2">
            {!upload ? (
              <button
                type="button"
                onClick={onUpload}
                disabled={!file || phase === 'uploading'}
                className="border border-oxblood bg-oxblood text-white px-4 py-2.5 min-h-[44px] text-xs font-technical-ui uppercase tracking-[0.18em] hover:bg-on-background disabled:opacity-50"
              >
                {phase === 'uploading' ? 'Uploading…' : 'Upload + extract'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onRefactor}
                disabled={upload.extractionStatus !== 'extracted' || phase === 'refactoring'}
                className="border border-oxblood bg-oxblood text-white px-4 py-2.5 min-h-[44px] text-xs font-technical-ui uppercase tracking-[0.18em] hover:bg-on-background disabled:opacity-50"
              >
                {phase === 'refactoring' ? 'Refactoring…' : 'Refactor into NLO format'}
              </button>
            )}
            {(upload || error || file) && (
              <button
                type="button"
                onClick={reset}
                className="border border-outline-variant px-4 py-2.5 min-h-[44px] text-xs font-technical-ui uppercase tracking-[0.18em] hover:border-primary"
              >
                Start over
              </button>
            )}
          </div>

          {/* === Upload status === */}
          {upload && (
            <div className="border border-outline-variant p-4 text-sm">
              <p className="text-xs font-technical-ui uppercase tracking-[0.18em] text-on-surface-variant mb-1">
                Upload status
              </p>
              <p>
                <span className="font-mono break-all">{upload.originalFilename}</span> ·{' '}
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
