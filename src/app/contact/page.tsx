'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle, ChevronDown, Info, Landmark, Mail, Send } from 'lucide-react';
import { saveContactSubmissionLocalFirst } from '@/lib/api/offlineActions';

type SubmissionCategory = 'general' | 'judgment-review' | 'policy-brief' | 'research-article' | 'essay' | 'blog-post';

const fieldClass =
  'w-full border border-outline-variant/65 bg-surface-container-lowest px-3 py-2.5 font-technical-ui text-sm text-on-background transition-colors placeholder:text-on-surface-variant focus:border-oxblood focus:outline-none dark:border-primary/25 dark:bg-surface-container-low dark:text-on-background dark:placeholder:text-on-background/35 dark:focus:border-primary';

const labelClass = 'font-technical-ui text-[11px] font-bold uppercase tracking-[0.14em] text-on-background dark:text-on-background';
const sectionLabelClass = 'font-technical-ui text-xs font-bold uppercase tracking-[0.2em] text-oxblood dark:text-primary';

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    category: 'general' as SubmissionCategory,
    subject: '',
    message: '',
    title: '',
    caseName: '',
    court: '',
    policyArea: '',
    keywords: '',
    abstract: '',
    editorNotes: '',
    draftText: '',
  });

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  const updateForm = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (status === 'error') setStatus('idle');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.email) {
      setStatus('error');
      setStatusMessage('Please fill in all required fields marked with an asterisk (*).');
      return;
    }

    const { category } = form;

    if (category === 'general') {
      if (!form.subject || !form.message) {
        setStatus('error');
        setStatusMessage('Please include a subject and message.');
        return;
      }
    } else {
      if (!form.title || !form.abstract) {
        setStatus('error');
        setStatusMessage('Please include a submission title and abstract.');
        return;
      }
    }

    setStatus('loading');
    try {
      const result = await saveContactSubmissionLocalFirst(form, attachedFiles);
      setStatus('success');
      setStatusMessage(result.message);
      setAttachedFiles([]);
    } catch (error) {
      console.error(error);
      setStatus('error');
      setStatusMessage('Could not save this submission locally.');
    }
  };

  const isEditorial = form.category !== 'general';

  const renderInput = (label: string, field: keyof typeof form, placeholder: string, required = false) => (
    <div className="space-y-2">
      <label className={labelClass}>
        {label} {required && <span className="text-oxblood dark:text-primary">*</span>}
      </label>
      <input
        type="text"
        required={required}
        value={form[field] as string}
        onChange={(e) => updateForm(field, e.target.value)}
        placeholder={placeholder}
        className={fieldClass}
      />
    </div>
  );

  const renderTextarea = (
    label: string,
    field: keyof typeof form,
    placeholder: string,
    rows: number,
    required = false
  ) => (
    <div className="space-y-2">
      <label className={labelClass}>
        {label} {required && <span className="text-oxblood dark:text-primary">*</span>}
      </label>
      <textarea
        required={required}
        rows={rows}
        value={form[field] as string}
        onChange={(e) => updateForm(field, e.target.value)}
        placeholder={placeholder}
        className={`${fieldClass} leading-7`}
      />
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl py-6 sm:py-10">
      <header className="border-b border-outline-variant/45 pb-8 text-center dark:border-primary/20">
        <p className={sectionLabelClass}>Editorial Desk</p>
        <h1 className="mt-5 font-serif text-3xl font-bold leading-tight text-on-background dark:text-on-background sm:text-5xl lg:text-6xl">
          Contact the Editors
        </h1>
        <div className="mx-auto mt-6 h-px w-28 bg-oxblood dark:bg-primary" />
        <p className="mx-auto mt-6 max-w-3xl font-body-md text-base leading-8 text-on-surface-variant dark:text-on-background/70 sm:text-lg">
          Submit publication drafts, request citation reproduction clearances, or contact the editorial advisory board regarding corrections.
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
        {/* Sidebar — pushed below form on portrait, stays left on desktop */}
        <aside className="order-last space-y-6 lg:order-first lg:sticky lg:top-28 lg:col-span-4">
          <section className="border border-outline-variant/45 bg-surface-container-lowest p-5 dark:border-primary/20 dark:bg-surface-container">
            <h2 className="border-b border-outline-variant/40 pb-3 font-technical-ui text-xs font-bold uppercase tracking-[0.2em] text-on-background dark:border-primary/20 dark:text-on-background">
              Observatory Office
            </h2>
            <div className="mt-4 space-y-4 font-body-md text-sm leading-7 text-on-surface-variant dark:text-on-background/65">
              <div className="flex items-start gap-3">
                <Landmark className="mt-1 h-4 w-4 shrink-0 text-oxblood dark:text-primary" />
                <span>Alliance University, Bengaluru - 562 106, Karnataka, India</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0 text-oxblood dark:text-primary" />
                <a
                  href="mailto:Nationallegalobservatory@gmail.com"
                  className="break-all font-semibold text-on-background transition hover:text-oxblood dark:text-on-background dark:hover:text-primary"
                >
                  Nationallegalobservatory@gmail.com
                </a>
              </div>
            </div>
          </section>

          <section className="border border-outline-variant/45 bg-surface-container-low p-5 dark:border-primary/20 dark:bg-surface-container">
            <h2 className="border-b border-outline-variant/40 pb-3 font-technical-ui text-xs font-bold uppercase tracking-[0.2em] text-on-background dark:border-primary/20 dark:text-on-background">
              Submission Guidelines
            </h2>
            <div className="mt-4 space-y-4 font-body-md text-sm leading-7 text-on-surface-variant dark:text-on-background/65">
              <p>We welcome original, unpublished work across the following formats:</p>
              <ul className="space-y-2 border-l border-oxblood/25 pl-4 dark:border-primary/25">
                <li><strong className="text-on-background dark:text-on-background">Judgment Reviews</strong> - 1,500-3,000 words</li>
                <li><strong className="text-on-background dark:text-on-background">Policy Briefs</strong> - 2,000-3,500 words</li>
                <li><strong className="text-on-background dark:text-on-background">Research Articles</strong> - 5,000-12,000 words</li>
                <li><strong className="text-on-background dark:text-on-background">Essays</strong> - 1,000-3,000 words</li>
                <li><strong className="text-on-background dark:text-on-background">Blog Posts</strong> - 500-1,200 words</li>
              </ul>
              <p>All submissions must be original work and not simultaneously under review elsewhere. Citations should conform to Bluebook formatting guidelines.</p>
            </div>
          </section>
        </aside>

        {/* Form — appears first on portrait, right column on desktop */}
        <section className="order-first border border-outline-variant/45 bg-surface-container-lowest p-5 dark:border-primary/20 dark:bg-surface-container sm:p-8 lg:order-last lg:col-span-8">
          <div className="border-b border-outline-variant/40 pb-5 dark:border-primary/20">
            <h2 className="font-serif text-3xl font-bold text-on-background dark:text-on-background">
              Editorial Submission Portal
            </h2>
            <p className="mt-2 font-technical-ui text-xs text-on-surface-variant dark:text-on-background/50">
              Select a category below to view the relevant submission fields.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-7 text-sm">
            <div className="space-y-4">
              <h3 className={sectionLabelClass}>1. Author Information</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {renderInput('Your Name', 'name', 'Prof. Jane Doe', true)}
                {renderInput('Your Email', 'email', 'j.doe@university.edu', true)}
              </div>
            </div>

            <div className="space-y-4 border-t border-outline-variant/35 pt-6 dark:border-primary/20">
              <h3 className={sectionLabelClass}>2. Submission Category</h3>
              <div className="relative">
                <select
                  value={form.category}
                  onChange={(e) => updateForm('category', e.target.value as SubmissionCategory)}
                  className={`${fieldClass} cursor-pointer appearance-none pr-10 font-semibold`}
                >
                  <option value="general">General Inquiry / Feedback</option>
                  <option value="judgment-review">Judgment Review</option>
                  <option value="policy-brief">Policy Brief</option>
                  <option value="research-article">Research Article</option>
                  <option value="essay">Essay</option>
                  <option value="blog-post">Blog Post</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-oxblood dark:text-primary" />
              </div>
              
              {form.category !== 'general' && (
                <div className="mt-2 font-technical-ui text-[11px] uppercase tracking-wider text-on-surface-variant dark:text-on-background/60 flex items-center gap-2 animate-fade-in bg-surface-container-low/50 px-3 py-2 border-l border-oxblood dark:border-primary">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-oxblood dark:bg-primary" />
                  <span>
                    Allowed length: <strong className="text-on-background dark:text-on-background">
                      {form.category === 'judgment-review' && '1,500 - 3,000 words'}
                      {form.category === 'policy-brief' && '2,000 - 3,500 words'}
                      {form.category === 'research-article' && '5,000 - 12,000 words'}
                      {form.category === 'essay' && '1,000 - 3,000 words'}
                      {form.category === 'blog-post' && '500 - 1,200 words'}
                    </strong>
                  </span>
                </div>
              )}
            </div>

            <div className="animate-fade-in space-y-4 border-t border-outline-variant/35 pt-6 dark:border-primary/20">
              <h3 className={sectionLabelClass}>3. Details & Content</h3>

              {form.category === 'general' && (
                <div className="space-y-4">
                  {renderInput('Subject / Topic', 'subject', 'What is this regarding?', true)}
                  {renderTextarea('Message', 'message', 'How can we help you?', 6, true)}
                </div>
              )}

              {isEditorial && (
                <div className="space-y-5">
                  {renderInput('Submission Title', 'title', 'Full title of your work', true)}

                  {form.category === 'judgment-review' && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {renderInput('Case Name', 'caseName', 'e.g., Roe v. Wade', true)}
                      {renderInput('Court / Jurisdiction', 'court', 'e.g., Supreme Court of India', true)}
                    </div>
                  )}

                  {form.category === 'policy-brief' && renderInput('Policy Area', 'policyArea', 'e.g., Data Privacy, Climate Change', true)}
                  {form.category === 'research-article' && renderInput('Keywords', 'keywords', 'e.g., AI Law, Human Rights (comma separated)', true)}

                  {renderTextarea('Abstract / Summary', 'abstract', 'A brief summary of your work (150-250 words)...', 3, true)}
                  {renderTextarea('Editor Notes (Optional)', 'editorNotes', 'Special instructions or context for the editorial board...', 2)}

                  <div className="border border-outline-variant/45 bg-surface-container-low p-5 dark:border-primary/20 dark:bg-surface-container-low">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="font-serif text-lg font-semibold text-on-background dark:text-on-background">Draft Submission</h4>
                      <span className="font-technical-ui text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant dark:text-on-background/45">
                        Paste Text
                      </span>
                    </div>
                    <div className="mt-4">
                      {renderTextarea('Full Draft Text (Optional)', 'draftText', 'Paste your full draft text here...', 8)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {status === 'success' && (
              <div className="flex items-start gap-3 border border-emerald-700/25 bg-emerald-700/10 p-4 text-emerald-800 dark:text-emerald-300">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="text-sm">
                  <span className="block font-bold">Submission saved.</span>
                  <span>{statusMessage}</span>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="flex items-start gap-3 border border-rose-700/25 bg-rose-700/10 p-4 text-rose-700 dark:text-rose-300">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <span className="font-semibold">
                  {statusMessage || 'Please fill in all required fields marked with an asterisk (*).'}
                </span>
              </div>
            )}

            <div className="space-y-5 border-t border-outline-variant/35 pt-6 dark:border-primary/20">
              {isEditorial && (
                <div className="flex items-start gap-3 border border-oxblood/25 bg-oxblood/10 p-4 text-oxblood dark:border-primary/25 dark:bg-primary/10 dark:text-primary">
                  <Info className="mt-0.5 h-5 w-5 shrink-0" />
                  <div className="text-sm leading-7">
                    <span className="block font-bold">Document Upload</span>
                    <span>
                      PDF and Word drafts are stored locally first and uploaded when sync is available.
                    </span>
                  </div>
                </div>
              )}

              {isEditorial && (
                <div className="space-y-2">
                  <label className={labelClass}>Attach Draft Files</label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.rtf,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(event) =>
                      setAttachedFiles(Array.from(event.currentTarget.files || []))
                    }
                    className={`${fieldClass} cursor-pointer file:mr-3 file:border-0 file:bg-oxblood file:px-3 file:py-1.5 file:font-technical-ui file:text-[10px] file:font-bold file:uppercase file:tracking-[0.14em] file:text-white dark:file:bg-primary dark:file:text-background`}
                  />
                  {attachedFiles.length > 0 && (
                    <p className="font-technical-ui text-[11px] uppercase tracking-[0.14em] text-on-surface-variant dark:text-on-background/50">
                      {attachedFiles.length} file{attachedFiles.length === 1 ? '' : 's'} staged
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="inline-flex w-full items-center justify-center gap-2 border border-oxblood bg-oxblood px-8 py-3.5 font-technical-ui text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-on-background disabled:opacity-50 dark:border-primary dark:bg-primary dark:text-background dark:hover:bg-tertiary-fixed sm:w-auto"
              >
                {status === 'loading' ? (
                  <span className="h-5 w-5 animate-spin border-2 border-current border-t-transparent" />
                ) : (
                  <>
                    <span>Save Submission</span>
                    <Send className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>

            {/* Below-form guidelines reminder — portrait only */}
            <div className="mt-6 border-t border-dashed border-outline-variant/30 pt-5 dark:border-primary/15 lg:hidden">
              <p className="font-technical-ui text-[10px] uppercase tracking-[0.18em] text-on-surface-variant/55 dark:text-on-background/35">
                Submissions must be original, unpublished work not under simultaneous review. All citations must conform to Bluebook format. Full guidelines and word-count requirements are listed below.
              </p>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
