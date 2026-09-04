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

  const [refactorSeconds, setRefactorSeconds] = useState(0);
  const [engine, setEngine] = useState<'code' | 'ai'>('code');

  const onRefactor = async () => {
    if (!upload) return;
    setError(null);
    setPhase('refactoring');
    setRefactorSeconds(0);

    const timer = setInterval(() => {
      setRefactorSeconds((s) => s + 1);
    }, 1000);

    try {
      const res = await fetch('/api/cms/refactor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId: upload.id, articleType, engine }),
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
      setError('Network error during refactor. Please retry.');
      setPhase('error');
    } finally {
      clearInterval(timer);
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
            <legend className="text-xs font-technical-ui uppercase tracking-[0.18em] text-on-surface-variant font-medium">
              Article type
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['judgment', 'policy', 'research', 'opinion'] as const).map((t) => {
                const isActive = articleType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setArticleType(t)}
                    className={
                      'border px-3 py-2.5 min-h-[44px] text-xs font-technical-ui uppercase tracking-[0.14em] font-medium transition-all ' +
                      (isActive
                        ? 'border-primary bg-primary/20 text-primary ring-1 ring-primary/50'
                        : 'border-outline-variant/60 bg-surface text-on-surface hover:border-primary/50 hover:bg-surface-container')
                    }
                  >
                    {t}
                  </button>
                );
              })}
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
                <span>Uploading + extracting text…</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-surface-container-low overflow-hidden rounded-full">
                <div
                  className="h-full bg-primary transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* === Action buttons === */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {!upload ? (
              <button
                type="button"
                onClick={onUpload}
                disabled={!file || phase === 'uploading'}
                style={{ backgroundColor: '#5c1d24', color: '#ffffff' }}
                className="border border-[#782930] px-5 py-2.5 min-h-[44px] text-xs font-technical-ui uppercase tracking-[0.18em] font-medium hover:brightness-110 disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer transition-all shadow-sm"
              >
                {phase === 'uploading' ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Extracting ({progress}%)…
                  </>
                ) : (
                  'Upload + Extract'
                )}
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
                <button
                  type="button"
                  onClick={onRefactor}
                  disabled={upload.extractionStatus !== 'extracted' || phase === 'refactoring'}
                  style={{ backgroundColor: '#c5a059', color: '#090D14' }}
                  className="border border-[#d4b068] px-5 py-2.5 min-h-[44px] text-xs font-technical-ui uppercase tracking-[0.18em] font-bold hover:brightness-110 disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer shadow-md transition-all"
                >
                  {phase === 'refactoring' ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#090D14]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {engine === 'code' ? 'Refactoring in Code…' : `Refactoring with NIM (${refactorSeconds}s)…`}
                    </>
                  ) : engine === 'code' ? (
                    '⚡ Instant Refactor (Local Code Engine)'
                  ) : (
                    '🤖 Refactor with NVIDIA NIM'
                  )}
                </button>

                <div className="flex items-center gap-2 text-xs font-technical-ui tracking-wider border border-outline-variant bg-[#0c0f17] p-1 rounded">
                  <button
                    type="button"
                    onClick={() => setEngine('code')}
                    className={
                      'px-2.5 py-1 text-[11px] uppercase transition-all ' +
                      (engine === 'code'
                        ? 'bg-primary/20 text-primary font-bold border border-primary/40'
                        : 'text-on-surface-variant hover:text-foreground')
                    }
                  >
                    ⚡ Code (Instant)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEngine('ai')}
                    className={
                      'px-2.5 py-1 text-[11px] uppercase transition-all ' +
                      (engine === 'ai'
                        ? 'bg-primary/20 text-primary font-bold border border-primary/40'
                        : 'text-on-surface-variant hover:text-foreground')
                    }
                  >
                    🤖 NIM AI
                  </button>
                </div>
              </div>
            )}
            {(upload || error || file) && (
              <button
                type="button"
                onClick={reset}
                className="border border-outline-variant text-on-surface px-4 py-2.5 min-h-[44px] text-xs font-technical-ui uppercase tracking-[0.18em] hover:border-primary hover:text-primary transition-colors cursor-pointer"
              >
                Start over
              </button>
            )}
          </div>

          {phase === 'refactoring' && (
            <div className="border border-primary/40 bg-primary/10 p-3.5 text-xs text-primary font-technical-ui animate-pulse">
              {engine === 'code'
                ? `⚡ Local Code Engine is structuring ${upload?.extractedCharCount.toLocaleString()} characters into canonical NLO format (headers, citations, abstracts, tags)…`
                : `🤖 NVIDIA NIM is processing ${upload?.extractedCharCount.toLocaleString()} characters (fallback to Code Engine active)… (${refactorSeconds}s)`}
            </div>
          )}

          {/* === Upload status === */}
          {upload && (
            <div className="border border-primary/30 bg-primary/5 p-4 text-sm space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-technical-ui uppercase tracking-[0.18em] text-primary font-medium">
                  {upload.extractionStatus === 'extracted' ? '✓ Text Extracted Successfully' : 'Extraction Status'}
                </p>
                <span className="text-xs font-mono text-on-surface-variant">
                  {(upload.byteSize / 1024).toFixed(1)} KB
                </span>
              </div>
              <p className="text-sm text-on-surface">
                <span className="font-semibold break-all">{upload.originalFilename}</span>
                {upload.extractionStatus === 'extracted' && (
                  <span className="text-on-surface-variant ml-2">
                    · {upload.extractedCharCount.toLocaleString()} characters extracted.
                  </span>
                )}
              </p>
              {upload.extractionStatus === 'extracted' && phase !== 'refactoring' && (
                <p className="text-xs text-primary/90 font-technical-ui tracking-wide pt-1">
                  Click <strong>&quot;⚡ Refactor into NLO Format&quot;</strong> above to generate executive summary, citations, and structured markdown.
                </p>
              )}
              {upload.errorMessage && (
                <p className="text-error text-xs mt-2 border-t border-error/20 pt-2">{upload.errorMessage}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
