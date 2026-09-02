/**
 * Text extraction for uploaded files. PDF / DOCX / MD / TXT.
 * No native deps for DOCX — uses `mammoth` (already a NLO dep? let's add it).
 * PDF: pdf-parse (small, server-only). MD/TXT: pass-through.
 */

import mammoth from 'mammoth';
// @ts-ignore -- pdf-parse has no types but is widely used
import pdfParse from 'pdf-parse';

export interface ExtractResult {
  text: string;
  warnings: string[];
}

export async function extractText(
  buffer: Buffer,
  filename: string,
  mime: string,
): Promise<ExtractResult> {
  const lower = filename.toLowerCase();
  const warnings: string[] = [];

  if (lower.endsWith('.pdf') || mime === 'application/pdf') {
    try {
      const data = await pdfParse(buffer);
      return { text: data.text || '', warnings };
    } catch (err) {
      return {
        text: '',
        warnings: [`PDF parse failed: ${(err as Error).message}`],
      };
    }
  }

  if (
    lower.endsWith('.docx') ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return { text: result.value || '', warnings: result.messages.map((m) => m.message) };
    } catch (err) {
      return {
        text: '',
        warnings: [`DOCX parse failed: ${(err as Error).message}`],
      };
    }
  }

  if (lower.endsWith('.md') || lower.endsWith('.markdown')) {
    return { text: buffer.toString('utf8'), warnings };
  }

  if (lower.endsWith('.txt') || mime.startsWith('text/')) {
    return { text: buffer.toString('utf8'), warnings };
  }

  return {
    text: '',
    warnings: [
      `Unsupported file type: ${filename} (${mime}). Accepted: PDF, DOCX, MD, TXT.`,
    ],
  };
}
