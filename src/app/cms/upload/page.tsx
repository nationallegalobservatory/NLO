import { readSession } from '@/lib/cms/session';
import { redirect } from 'next/navigation';
import { UploadClient } from '@/components/cms/UploadClient';

export const dynamic = 'force-dynamic';

export default async function CmsUploadPage() {
  const session = await readSession();
  if (!session) redirect('/cms/login');
  return (
    <div className="p-8 max-w-3xl">
      <header className="mb-6">
        <p className="font-technical-ui text-[10px] uppercase tracking-[0.28em] text-on-surface-variant">
          New article
        </p>
        <h1 className="text-2xl font-semibold mt-1">Upload a source document</h1>
        <p className="text-sm text-on-surface-variant mt-2 max-w-prose">
          Drop a PDF, DOCX, Markdown, or plain-text file. We&apos;ll extract the text and then
          refactor it into NLO article format using the configured LLM provider. You&apos;ll review
          the draft before publishing.
        </p>
      </header>
      <UploadClient />
    </div>
  );
}
