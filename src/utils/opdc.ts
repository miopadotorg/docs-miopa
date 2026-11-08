import { DocumentDraft, FontSize } from '../types.ts';
import { calculateMetrics } from './parser.ts';

export interface OpdcPackage {
  format: 'opendc';
  version: '1.0';
  id?: string;
  title: string;
  content: string;
  fontFamily?: string;
  fontSize?: FontSize;
  createdAt?: number;
  updatedAt?: number;
  metadata?: {
    generator?: string;
    wordCount?: number;
    characterCount?: number;
    exportedAt?: string;
  };
}

/**
 * Serializes a DocumentDraft to custom .opdc format and initiates browser download
 */
export function exportOpdcFile(doc: DocumentDraft): void {
  const metrics = calculateMetrics(doc.content);
  const pkg: OpdcPackage = {
    format: 'opendc',
    version: '1.0',
    id: doc.id,
    title: doc.title,
    content: doc.content,
    fontFamily: doc.fontFamily,
    fontSize: doc.fontSize,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    metadata: {
      generator: 'Opendc Minimalist Document Studio',
      wordCount: metrics.words,
      characterCount: metrics.characters,
      exportedAt: new Date().toISOString(),
    },
  };

  const jsonString = JSON.stringify(pkg, null, 2);
  const blob = new Blob([jsonString], {
    type: 'application/x-opendc+json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeTitle = doc.title.replace(/[^\w\s-]/g, '').trim() || 'document';
  a.download = `${safeTitle}.opdc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parses raw text content from an imported file (.opdc, .md, .txt, or JSON)
 * and turns it into a valid DocumentDraft.
 */
export function parseImportedFileContent(
  rawText: string,
  fileName: string = 'Imported Document'
): DocumentDraft {
  const now = Date.now();
  const cleanBaseName = fileName.replace(/\.[^/.]+$/, '').trim() || 'Imported Document';

  // 1. Try parsing as JSON / .opdc package
  try {
    const parsed = JSON.parse(rawText);
    if (parsed && typeof parsed === 'object') {
      if (typeof parsed.content === 'string') {
        return {
          id: `doc_${now}_${Math.random().toString(36).substring(2, 7)}`,
          title: parsed.title || cleanBaseName,
          content: parsed.content,
          fontFamily: parsed.fontFamily || 'Source Serif 4',
          fontSize: (parsed.fontSize as FontSize) || 'base',
          createdAt: parsed.createdAt || now,
          updatedAt: now,
        };
      }
    }
  } catch {
    // Not valid JSON, continue to Markdown/plaintext parsing
  }

  // 2. Parse as Markdown or plain text
  // Try to extract title from the first heading if present (# Title)
  let docTitle = cleanBaseName;
  const headingMatch = rawText.match(/^\s*#\s+(.+)$/m);
  if (headingMatch && headingMatch[1].trim()) {
    docTitle = headingMatch[1].trim().replace(/\*\*|__|\*|_|~~|`/g, '');
  }

  return {
    id: `doc_${now}_${Math.random().toString(36).substring(2, 7)}`,
    title: docTitle,
    content: rawText,
    fontFamily: 'Source Serif 4',
    fontSize: 'base',
    createdAt: now,
    updatedAt: now,
  };
}
