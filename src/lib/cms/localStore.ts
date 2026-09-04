import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface LocalUpload {
  id: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  storagePath: string;
  extractionStatus: 'extracted' | 'failed' | 'pending';
  extractedText: string;
  extractedCharCount: number;
  errorMessage?: string | null;
  uploaderEmail: string;
  createdAt: string;
  updatedAt: string;
}

const LOCAL_DIR = path.join(process.cwd(), '.cms_local');
const UPLOADS_DIR = path.join(LOCAL_DIR, 'uploads');
const UPLOADS_JSON = path.join(LOCAL_DIR, 'uploads.json');

// Ensure directories exist
function ensureDirs() {
  if (!fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function readUploadsIndex(): Record<string, LocalUpload> {
  ensureDirs();
  if (!fs.existsSync(UPLOADS_JSON)) return {};
  try {
    const raw = fs.readFileSync(UPLOADS_JSON, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeUploadsIndex(index: Record<string, LocalUpload>) {
  ensureDirs();
  fs.writeFileSync(UPLOADS_JSON, JSON.stringify(index, null, 2), 'utf8');
}

export function saveLocalUpload(params: {
  originalFilename: string;
  mimeType: string;
  buffer: Buffer;
  extractedText: string;
  extractionStatus: 'extracted' | 'failed';
  errorMessage?: string | null;
  uploaderEmail: string;
}): LocalUpload {
  ensureDirs();
  const id = `local-upload-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const safeName = `${Date.now()}-${params.originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const filePath = path.join(UPLOADS_DIR, safeName);

  fs.writeFileSync(filePath, params.buffer);

  const record: LocalUpload = {
    id,
    originalFilename: params.originalFilename,
    mimeType: params.mimeType,
    byteSize: params.buffer.length,
    storagePath: filePath,
    extractionStatus: params.extractionStatus,
    extractedText: params.extractedText,
    extractedCharCount: params.extractedText.length,
    errorMessage: params.errorMessage || null,
    uploaderEmail: params.uploaderEmail,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const index = readUploadsIndex();
  index[id] = record;
  writeUploadsIndex(index);

  return record;
}

export function getLocalUpload(id: string): LocalUpload | null {
  const index = readUploadsIndex();
  return index[id] || null;
}

export function updateLocalUpload(
  id: string,
  patch: Partial<LocalUpload>,
): LocalUpload | null {
  const index = readUploadsIndex();
  if (!index[id]) return null;
  index[id] = {
    ...index[id],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  writeUploadsIndex(index);
  return index[id];
}

const TYPE_FOLDER_MAP: Record<string, string> = {
  judgment: 'judgments',
  policy: 'policies',
  research: 'research',
  opinion: 'opinions',
};

export function getFolderForType(type: string): string {
  return TYPE_FOLDER_MAP[type] || 'research';
}

export function findArticleFilePath(slug: string): { filePath: string; folder: string } | null {
  const folders = ['judgments', 'policies', 'research', 'opinions'];
  for (const folder of folders) {
    const candidate = path.join(process.cwd(), 'content', folder, `${slug}.md`);
    if (fs.existsSync(candidate)) {
      return { filePath: candidate, folder };
    }
  }
  return null;
}

export function saveLocalArticle(data: {
  slug: string;
  type: string;
  title: string;
  author: string;
  date: string;
  categories: string[];
  tags: string[];
  abstract: string;
  citation?: string;
  coverImage?: string;
  format?: string | null;
  publishAt?: string | null;
  cms_status?: string;
  content: string;
}): { slug: string; filePath: string } {
  const folder = getFolderForType(data.type);
  const targetDir = path.join(process.cwd(), 'content', folder);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const filePath = path.join(targetDir, `${data.slug}.md`);

  const frontmatter: Record<string, unknown> = {
    slug: data.slug,
    type: data.type,
    title: data.title,
    author: data.author || 'bhoomija-khanna',
    date: data.date || new Date().toISOString().slice(0, 10),
    categories: data.categories || [],
    tags: data.tags || [],
    abstract: data.abstract || '',
  };

  if (data.citation) frontmatter.citation = data.citation;
  if (data.coverImage) frontmatter.coverImage = data.coverImage;
  if (data.format) frontmatter.format = data.format;
  if (data.publishAt) frontmatter.publishAt = data.publishAt;
  if (data.cms_status) frontmatter.cms_status = data.cms_status;

  const fileContent = matter.stringify(data.content || '', frontmatter);
  fs.writeFileSync(filePath, fileContent, 'utf8');

  return { slug: data.slug, filePath };
}

export function updateLocalArticle(
  slug: string,
  updates: Record<string, unknown>,
): { slug: string; filePath: string } | null {
  const found = findArticleFilePath(slug);
  if (!found) {
    // If doesn't exist, create it in default folder
    const type = String(updates.type || 'research');
    return saveLocalArticle({
      slug,
      type,
      title: String(updates.title || slug),
      author: String(updates.author || updates.author_slug || 'bhoomija-khanna'),
      date: String(updates.date || new Date().toISOString().slice(0, 10)),
      categories: (updates.categories as string[]) || [],
      tags: (updates.tags as string[]) || [],
      abstract: String(updates.abstract || ''),
      content: String(updates.content || ''),
      citation: updates.citation as string | undefined,
      coverImage: updates.coverImage as string | undefined,
      format: updates.format as string | undefined,
      publishAt: updates.publishAt as string | undefined,
      cms_status: updates.cms_status as string | undefined,
    });
  }

  const raw = fs.readFileSync(found.filePath, 'utf8');
  const parsed = matter(raw);

  const allowedMeta = [
    'title',
    'type',
    'date',
    'author',
    'categories',
    'tags',
    'abstract',
    'citation',
    'coverImage',
    'format',
    'publishAt',
    'cms_status',
  ];

  for (const key of allowedMeta) {
    if (updates[key] !== undefined) {
      parsed.data[key] = updates[key];
    }
  }

  // Handle aliases
  if (updates.author_slug && !updates.author) {
    parsed.data.author = updates.author_slug;
  }
  if (updates.cms_publish_at !== undefined) {
    parsed.data.publishAt = updates.cms_publish_at;
  }

  const newBody = updates.content !== undefined ? String(updates.content) : parsed.content;
  const newFileContent = matter.stringify(newBody, parsed.data);
  fs.writeFileSync(found.filePath, newFileContent, 'utf8');

  return { slug, filePath: found.filePath };
}

const SUBSCRIBERS_JSON = path.join(LOCAL_DIR, 'subscribers.json');
const CAMPAIGNS_JSON = path.join(LOCAL_DIR, 'campaigns.json');

export interface LocalSubscriber {
  email: string;
  source: string;
  active: boolean;
  subscribed_at: string;
}

export function getLocalSubscribers(): LocalSubscriber[] {
  ensureDirs();
  if (!fs.existsSync(SUBSCRIBERS_JSON)) return [];
  try {
    return JSON.parse(fs.readFileSync(SUBSCRIBERS_JSON, 'utf8'));
  } catch {
    return [];
  }
}

export function addLocalSubscribers(emails: string[], source = 'import'): { added: number; total: number } {
  ensureDirs();
  const current = getLocalSubscribers();
  const existingMap = new Map(current.map((s) => [s.email.toLowerCase(), s]));
  let added = 0;

  for (const email of emails) {
    const clean = email.trim().toLowerCase();
    if (!clean) continue;
    if (!existingMap.has(clean)) {
      existingMap.set(clean, {
        email: clean,
        source,
        active: true,
        subscribed_at: new Date().toISOString(),
      });
      added++;
    }
  }

  const updated = Array.from(existingMap.values());
  fs.writeFileSync(SUBSCRIBERS_JSON, JSON.stringify(updated, null, 2), 'utf8');
  return { added, total: updated.length };
}

export function getLocalCampaigns(): any[] {
  ensureDirs();
  if (!fs.existsSync(CAMPAIGNS_JSON)) return [];
  try {
    return JSON.parse(fs.readFileSync(CAMPAIGNS_JSON, 'utf8'));
  } catch {
    return [];
  }
}

export function saveLocalCampaign(campaign: {
  campaign_subject: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  status: string;
  scheduled_for?: string | null;
  finished_at?: string | null;
  sent_by?: string;
}): any {
  ensureDirs();
  const current = getLocalCampaigns();
  const id = `local-campaign-${Date.now()}`;
  const entry = {
    id,
    campaign_id: id,
    created_at: new Date().toISOString(),
    ...campaign,
  };
  current.unshift(entry);
  fs.writeFileSync(CAMPAIGNS_JSON, JSON.stringify(current, null, 2), 'utf8');
  return entry;
}
