import { DocumentDraft } from '../types.ts';
import { escapeHtml } from './parser.ts';

/**
 * Extracts a named file entry (such as "word/document.xml") from a ZIP buffer (.docx)
 * using the ZIP Central Directory and native DecompressionStream('deflate-raw').
 */
async function extractFileFromZip(zipBuffer: ArrayBuffer, targetPath: string): Promise<string | null> {
  const bytes = new Uint8Array(zipBuffer);
  const view = new DataView(zipBuffer);

  // Locate End of Central Directory (EOCD) signature 0x06054b50 scanning backwards from end
  let eocdOffset = -1;
  const minEocdSearch = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= minEocdSearch; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    return null;
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);

  let ptr = cdOffset;
  const decoder = new TextDecoder('utf-8');

  for (let idx = 0; idx < totalEntries; idx++) {
    if (ptr + 46 > bytes.length || view.getUint32(ptr, true) !== 0x02014b50) {
      break;
    }

    const compressionMethod = view.getUint16(ptr + 10, true);
    const compressedSize = view.getUint32(ptr + 20, true);
    const fileNameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localHeaderOffset = view.getUint32(ptr + 42, true);

    const fileNameBytes = bytes.subarray(ptr + 46, ptr + 46 + fileNameLen);
    const fileName = decoder.decode(fileNameBytes);

    if (fileName === targetPath) {
      // Read Local File Header at localHeaderOffset (signature 0x04034b50)
      if (localHeaderOffset + 30 > bytes.length || view.getUint32(localHeaderOffset, true) !== 0x04034b50) {
        return null;
      }
      const localNameLen = view.getUint16(localHeaderOffset + 26, true);
      const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
      const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
      const compressedData = bytes.subarray(dataStart, dataStart + compressedSize);

      if (compressionMethod === 0) {
        return decoder.decode(compressedData);
      } else if (compressionMethod === 8) {
        // Deflate-raw decompression via Web Streams API
        if (typeof DecompressionStream !== 'undefined') {
          const ds = new DecompressionStream('deflate-raw');
          const writer = ds.writable.getWriter();
          writer.write(compressedData);
          writer.close();
          const decompressedBuffer = await new Response(ds.readable).arrayBuffer();
          return decoder.decode(new Uint8Array(decompressedBuffer));
        }
      }
      return null;
    }

    ptr += 46 + fileNameLen + extraLen + commentLen;
  }

  return null;
}

/**
 * Converts OpenXML WordprocessingML (`word/document.xml`) into clean semantic HTML
 * preserving headings, paragraphs, bold, italic, underline, strikethrough, colors, fonts, and tables.
 */
export function parseWordXmlToHtml(
  xmlString: string,
  fallbackTitle: string
): { title: string; html: string } {
  let extractedTitle = fallbackTitle;
  const htmlBlocks: string[] = [];

  // Use DOMParser if available in browser, with regex fallback for Node environments
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
    const body = xmlDoc.getElementsByTagName('w:body')[0] || xmlDoc.getElementsByTagName('body')[0];

    if (body) {
      const children = Array.from(body.childNodes);

      for (const child of children) {
        const nodeName = child.nodeName.replace(/^w:/, '');

        if (nodeName === 'p') {
          const pEl = child as Element;
          let styleVal = '';
          const pStyle =
            pEl.getElementsByTagName('w:pStyle')[0] || pEl.getElementsByTagName('pStyle')[0];
          if (pStyle) {
            styleVal = (pStyle.getAttribute('w:val') || pStyle.getAttribute('val') || '').toLowerCase();
          }

          const innerHtml = parseRunsInParagraph(pEl);
          const plainText = (pEl.textContent || '').trim();

          if (!innerHtml.trim()) continue;

          if (styleVal.includes('title')) {
            if (plainText && extractedTitle === fallbackTitle) {
              extractedTitle = plainText;
            }
            htmlBlocks.push(`<h1>${innerHtml}</h1>`);
          } else if (styleVal.includes('heading1') || styleVal === 'heading 1') {
            if (plainText && extractedTitle === fallbackTitle && htmlBlocks.length === 0) {
              extractedTitle = plainText;
            }
            htmlBlocks.push(`<h1>${innerHtml}</h1>`);
          } else if (styleVal.includes('heading2') || styleVal === 'heading 2') {
            htmlBlocks.push(`<h2>${innerHtml}</h2>`);
          } else if (styleVal.includes('heading3') || styleVal === 'heading 3') {
            htmlBlocks.push(`<h3>${innerHtml}</h3>`);
          } else if (styleVal.includes('quote')) {
            htmlBlocks.push(`<blockquote>${innerHtml}</blockquote>`);
          } else {
            htmlBlocks.push(`<p>${innerHtml}</p>`);
          }
        } else if (nodeName === 'tbl') {
          const tblEl = child as Element;
          const rows = Array.from(tblEl.childNodes).filter(
            (n) => n.nodeName.replace(/^w:/, '') === 'tr'
          ) as Element[];
          if (rows.length > 0) {
            let tableHtml = '<table><tbody>';
            rows.forEach((row, rIdx) => {
              const cells = Array.from(row.childNodes).filter(
                (n) => n.nodeName.replace(/^w:/, '') === 'tc'
              ) as Element[];
              tableHtml += '<tr>';
              cells.forEach((cell) => {
                const cellParagraphs = Array.from(cell.childNodes).filter(
                  (n) => n.nodeName.replace(/^w:/, '') === 'p'
                ) as Element[];
                const cellContent = cellParagraphs.map(parseRunsInParagraph).join('<br/>');
                const tag = rIdx === 0 ? 'th' : 'td';
                tableHtml += `<${tag}>${cellContent}</${tag}>`;
              });
              tableHtml += '</tr>';
            });
            tableHtml += '</tbody></table>';
            htmlBlocks.push(tableHtml);
          }
        }
      }
    }
  }

  // Fallback regex extraction if DOMParser is unavailable or returned no blocks
  if (htmlBlocks.length === 0) {
    const paragraphMatches = xmlString.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) || [];
    for (const pXml of paragraphMatches) {
      const styleMatch = pXml.match(/<w:pStyle\s+w:val="([^"]+)"/i);
      const styleVal = styleMatch ? styleMatch[1].toLowerCase() : '';
      const textParts: string[] = [];
      const tMatches = pXml.matchAll(/<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/g);
      for (const m of tMatches) {
        textParts.push(m[1]);
      }
      const joined = textParts.join('');
      if (!joined.trim()) continue;

      if (styleVal.includes('title') || styleVal.includes('heading1')) {
        if (extractedTitle === fallbackTitle) {
          extractedTitle = joined.trim();
        }
        htmlBlocks.push(`<h1>${ joined }</h1>`);
      } else if (styleVal.includes('heading2')) {
        htmlBlocks.push(`<h2>${ joined }</h2>`);
      } else if (styleVal.includes('heading3')) {
        htmlBlocks.push(`<h3>${ joined }</h3>`);
      } else {
        htmlBlocks.push(`<p>${ joined }</p>`);
      }
    }
  }

  return {
    title: extractedTitle,
    html: htmlBlocks.join('\n') || `<p>${escapeHtml(fallbackTitle)}</p>`,
  };
}

function parseRunsInParagraph(pEl: Element): string {
  const chunks: string[] = [];
  const children = Array.from(pEl.childNodes);

  for (const child of children) {
    const name = child.nodeName.replace(/^w:/, '');
    if (name === 'r') {
      chunks.push(parseSingleRun(child as Element));
    } else if (name === 'hyperlink') {
      const linkRuns = Array.from(child.childNodes)
        .filter((n) => n.nodeName.replace(/^w:/, '') === 'r')
        .map((n) => parseSingleRun(n as Element))
        .join('');
      chunks.push(linkRuns);
    }
  }

  return chunks.join('');
}

function parseSingleRun(rEl: Element): string {
  const textNodes = Array.from(rEl.childNodes).filter((n) => {
    const nm = n.nodeName.replace(/^w:/, '');
    return nm === 't' || nm === 'br' || nm === 'tab';
  });

  if (textNodes.length === 0) return '';

  let rawText = '';
  for (const tn of textNodes) {
    const nm = tn.nodeName.replace(/^w:/, '');
    if (nm === 'br') {
      rawText += '\n';
    } else if (nm === 'tab') {
      rawText += '  ';
    } else {
      rawText += tn.textContent || '';
    }
  }

  if (!rawText) return '';

  let html = escapeHtml(rawText).replace(/\n/g, '<br/>');

  const rPr = rEl.getElementsByTagName('w:rPr')[0] || rEl.getElementsByTagName('rPr')[0];
  if (!rPr) return html;

  const hasBold =
    rPr.getElementsByTagName('w:b').length > 0 || rPr.getElementsByTagName('b').length > 0;
  const hasItalic =
    rPr.getElementsByTagName('w:i').length > 0 || rPr.getElementsByTagName('i').length > 0;
  const hasUnderline =
    rPr.getElementsByTagName('w:u').length > 0 || rPr.getElementsByTagName('u').length > 0;
  const hasStrike =
    rPr.getElementsByTagName('w:strike').length > 0 ||
    rPr.getElementsByTagName('strike').length > 0;

  const colorEl =
    rPr.getElementsByTagName('w:color')[0] || rPr.getElementsByTagName('color')[0];
  const colorVal = colorEl?.getAttribute('w:val') || colorEl?.getAttribute('val') || '';

  const rFontsEl =
    rPr.getElementsByTagName('w:rFonts')[0] || rPr.getElementsByTagName('rFonts')[0];
  const fontVal =
    rFontsEl?.getAttribute('w:ascii') || rFontsEl?.getAttribute('ascii') || '';

  if (hasStrike) html = `<s>${html}</s>`;
  if (hasUnderline) html = `<u>${html}</u>`;
  if (hasItalic) html = `<em>${html}</em>`;
  if (hasBold) html = `<strong>${html}</strong>`;

  if (colorVal && colorVal !== 'auto') {
    const hex = colorVal.startsWith('#') ? colorVal : `#${colorVal}`;
    html = `<span style="color: ${hex}">${html}</span>`;
  }

  if (fontVal && fontVal !== 'Consolas') {
    html = `<span data-local-font="${escapeHtml(fontVal)}" style="font-family: '${escapeHtml(fontVal)}', sans-serif;">${html}</span>`;
  } else if (fontVal === 'Consolas') {
    html = `<code>${html}</code>`;
  }

  return html;
}

/**
 * Parses a binary .docx File or ArrayBuffer into a DocumentDraft.
 */
export async function parseDocxArrayBuffer(
  buffer: ArrayBuffer,
  fileName: string = 'Imported Word Document.docx'
): Promise<DocumentDraft> {
  const now = Date.now();
  const cleanBaseName = fileName.replace(/\.[^/.]+$/, '').trim() || 'Imported Document';

  const xmlString = await extractFileFromZip(buffer, 'word/document.xml');
  if (!xmlString) {
    throw new Error('Invalid or unsupported .docx file');
  }

  const { title, html } = parseWordXmlToHtml(xmlString, cleanBaseName);

  return {
    id: `doc_${now}_${Math.random().toString(36).substring(2, 7)}`,
    title,
    content: html,
    fontFamily: 'Source Serif 4',
    fontSize: 'base',
    createdAt: now,
    updatedAt: now,
  };
}
