import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/cms/session';
import { getSupabaseAdmin, isCmsBackendConfigured } from '@/lib/cms/supabaseAdmin';
import { extractText } from '@/lib/cms/extract';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const ACCEPTED_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/markdown',
  'text/x-markdown',
  'text/plain',
]);
const ACCEPTED_EXTS = ['.pdf', '.docx', '.md', '.markdown', '.txt'];

/**
 * POST /api/cms/upload
 * multipart/form-data: file=<file>, articleType=judgment|policy|research|opinion
 *
 * Saves the file to Supabase storage, extracts text synchronously, creates a
 * cms_uploads row. The client then calls /api/cms/refactor with the upload id.
 */
export async function POST(req: NextRequest) {
  if (!isCmsBackendConfigured()) {
    return NextResponse.json({ error: 'CMS_NOT_CONFIGURED' }, { status: 503 });
  }
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get('file');
  const articleType = String(form.get('articleType') || 'research');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'NO_FILE' }, { status: 400 });
  }
  if (!['judgment', 'policy', 'research', 'opinion'].includes(articleType)) {
    return NextResponse.json({ error: 'BAD_TYPE' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'TOO_LARGE', maxBytes: MAX_BYTES, fileSize: file.size },
      { status: 413 },
    );
  }

  const lower = file.name.toLowerCase();
  const extOk = ACCEPTED_EXTS.some((e) => lower.endsWith(e));
  if (!extOk && !ACCEPTED_MIMES.has(file.type)) {
    return NextResponse.json(
      { error: 'UNSUPPORTED_TYPE', accepted: [...ACCEPTED_EXTS, ...ACCEPTED_MIMES] },
      { status: 415 },
    );
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'CMS_NOT_CONFIGURED' }, { status: 503 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // 1) Upload to Supabase Storage (bucket: cms-uploads)
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${session.email}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await admin.storage
    .from('cms-uploads')
    .upload(storagePath, bytes, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: 'STORAGE_ERROR', detail: uploadError.message },
      { status: 500 },
    );
  }

  // 2) Create the cms_uploads row in pending state
  const { data: row, error: rowError } = await admin
    .from('cms_uploads')
    .insert({
      uploader_email: session.email,
      original_filename: file.name,
      storage_path: storagePath,
      mime_type: file.type || 'application/octet-stream',
      byte_size: bytes.length,
      extraction_status: 'pending',
      refactor_status: 'pending',
    })
    .select()
    .single();

  if (rowError || !row) {
    return NextResponse.json(
      { error: 'DB_ERROR', detail: rowError?.message },
      { status: 500 },
    );
  }

  // 3) Extract text synchronously (most files are small)
  let extractedText = '';
  let extractionStatus: 'extracted' | 'failed' = 'extracted';
  let errorMessage: string | null = null;

  try {
    const result = await extractText(bytes, file.name, file.type);
    extractedText = result.text;
    if (!extractedText) {
      extractionStatus = 'failed';
      errorMessage = result.warnings.join('; ') || 'No text extracted.';
    }
  } catch (err) {
    extractionStatus = 'failed';
    errorMessage = (err as Error).message;
  }

  await admin
    .from('cms_uploads')
    .update({
      extracted_text: extractedText.slice(0, 200_000), // cap at 200k chars
      extraction_status: extractionStatus,
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id);

  return NextResponse.json({
    ok: true,
    upload: {
      id: row.id,
      originalFilename: file.name,
      byteSize: bytes.length,
      extractionStatus,
      extractedCharCount: extractedText.length,
      errorMessage,
      suggestedNext:
        extractionStatus === 'extracted' ? 'refactor' : 'review',
    },
  });
}
