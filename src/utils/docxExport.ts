import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Packer,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  convertInchesToTwip,
} from 'docx';
import { stripHtml } from './parser.ts';

interface ParsedInlineChunk {
  text: string;
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
  color?: string;
  highlight?: string;
}

/**
 * Parses inline HTML string into formatted TextRun-ready tokens
 */
function parseInlineHtmlToChunks(html: string): ParsedInlineChunk[] {
  const chunks: ParsedInlineChunk[] = [];
  
  // Use a DOM parser if in browser, or regex fallback
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');

    function walk(node: Node, currentStyles: {
      bold?: boolean;
      italics?: boolean;
      underline?: boolean;
      strike?: boolean;
      code?: boolean;
      color?: string;
    }) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        if (text) {
          chunks.push({
            text,
            ...currentStyles,
          });
        }
        return;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();
        const nextStyles = { ...currentStyles };

        if (tag === 'strong' || tag === 'b') nextStyles.bold = true;
        if (tag === 'em' || tag === 'i') nextStyles.italics = true;
        if (tag === 'u') nextStyles.underline = true;
        if (tag === 'del' || tag === 's' || tag === 'strike') nextStyles.strike = true;
        if (tag === 'code') nextStyles.code = true;

        if (el.style.color) {
          // Clean hex or rgb
          const col = el.style.color.replace(/[^\w#]/g, '');
          if (col) nextStyles.color = col;
        }

        Array.from(el.childNodes).forEach((child) => walk(child, nextStyles));
      }
    }

    walk(doc.body, {});
    return chunks;
  }

  // Fallback: strip tags
  return [{ text: stripHtml(html) }];
}

/**
 * Converts inline HTML chunks to docx TextRun instances
 */
function chunksToTextRuns(chunks: ParsedInlineChunk[]): TextRun[] {
  if (chunks.length === 0) {
    return [new TextRun({ text: '' })];
  }

  return chunks.map((chunk) => {
    return new TextRun({
      text: chunk.text,
      bold: chunk.bold,
      italics: chunk.italics,
      underline: chunk.underline ? {} : undefined,
      strike: chunk.strike,
      font: chunk.code ? 'Consolas' : undefined,
      shading: chunk.code ? { fill: 'F3F4F6' } : undefined,
    });
  });
}

/**
 * Builds a Microsoft Word (.docx) document from HTML/Markdown content
 */
export async function generateDocxBlob(
  title: string,
  content: string,
  fontName: string = 'Source Serif 4'
): Promise<Blob> {
  const children: (Paragraph | Table)[] = [];

  // Document Title Header
  children.push(
    new Paragraph({
      text: title || 'Untitled Document',
      heading: HeadingLevel.TITLE,
      spacing: { after: 300 },
    })
  );

  // If in browser, parse DOM structure directly
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    // Normalize content
    const isHtml = /<[a-z][\s\S]*>/i.test(content);
    const htmlToParse = isHtml ? content : content.replace(/\n\n/g, '<p></p>');
    const doc = parser.parseFromString(`<body>${htmlToParse}</body>`, 'text/html');

    const topElements = Array.from(doc.body.children);

    if (topElements.length === 0) {
      // Plain text or markdown
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('# ')) {
          children.push(
            new Paragraph({
              text: trimmed.slice(2).trim(),
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 240, after: 120 },
            })
          );
        } else if (trimmed.startsWith('## ')) {
          children.push(
            new Paragraph({
              text: trimmed.slice(3).trim(),
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 },
            })
          );
        } else if (trimmed.startsWith('### ')) {
          children.push(
            new Paragraph({
              text: trimmed.slice(4).trim(),
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 160, after: 80 },
            })
          );
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          children.push(
            new Paragraph({
              text: trimmed.slice(2).trim(),
              bullet: { level: 0 },
              spacing: { after: 80 },
            })
          );
        } else if (/^\d+\.\s/.test(trimmed)) {
          const itemText = trimmed.replace(/^\d+\.\s+/, '');
          children.push(
            new Paragraph({
              text: itemText,
              numbering: { reference: 'numbered-list', level: 0 },
              spacing: { after: 80 },
            })
          );
        } else {
          children.push(
            new Paragraph({
              text: trimmed,
              spacing: { after: 140 },
            })
          );
        }
      }
    } else {
      for (const el of topElements) {
        const tag = el.tagName.toLowerCase();

        if (tag === 'h1') {
          children.push(
            new Paragraph({
              children: chunksToTextRuns(parseInlineHtmlToChunks(el.innerHTML)),
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 280, after: 120 },
            })
          );
        } else if (tag === 'h2') {
          children.push(
            new Paragraph({
              children: chunksToTextRuns(parseInlineHtmlToChunks(el.innerHTML)),
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 240, after: 100 },
            })
          );
        } else if (tag === 'h3') {
          children.push(
            new Paragraph({
              children: chunksToTextRuns(parseInlineHtmlToChunks(el.innerHTML)),
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 200, after: 80 },
            })
          );
        } else if (tag === 'blockquote') {
          children.push(
            new Paragraph({
              children: chunksToTextRuns(parseInlineHtmlToChunks(el.innerHTML)),
              indent: { left: convertInchesToTwip(0.4) },
              spacing: { before: 140, after: 140 },
            })
          );
        } else if (tag === 'ul') {
          const items = Array.from(el.querySelectorAll('li'));
          for (const li of items) {
            children.push(
              new Paragraph({
                children: chunksToTextRuns(parseInlineHtmlToChunks(li.innerHTML)),
                bullet: { level: 0 },
                spacing: { after: 80 },
              })
            );
          }
        } else if (tag === 'ol') {
          const items = Array.from(el.querySelectorAll('li'));
          items.forEach((li, idx) => {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `${idx + 1}. `, bold: true }),
                  ...chunksToTextRuns(parseInlineHtmlToChunks(li.innerHTML)),
                ],
                spacing: { after: 80 },
              })
            );
          });
        } else if (tag === 'pre' || el.classList.contains('code-block-wrapper')) {
          const codeEl = el.querySelector('code') || el;
          const codeLines = (codeEl.textContent || '').split('\n');
          for (const codeLine of codeLines) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: codeLine || ' ',
                    font: 'Consolas',
                    size: 20, // 10pt
                  }),
                ],
                spacing: { after: 40 },
              })
            );
          }
        } else if (tag === 'table') {
          const trs = Array.from(el.querySelectorAll('tr'));
          if (trs.length > 0) {
            const docxRows: TableRow[] = [];
            trs.forEach((tr) => {
              const cells = Array.from(tr.querySelectorAll('th, td'));
              const docxCells = cells.map((cell) => {
                const isHeader = cell.tagName.toLowerCase() === 'th';
                return new TableCell({
                  children: [
                    new Paragraph({
                      children: chunksToTextRuns(parseInlineHtmlToChunks(cell.innerHTML)),
                      spacing: { before: 60, after: 60 },
                    }),
                  ],
                  shading: isHeader ? { fill: 'F3F4F6' } : undefined,
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
                    left: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
                    right: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
                  },
                });
              });
              docxRows.push(new TableRow({ children: docxCells }));
            });

            children.push(
              new Table({
                rows: docxRows,
                width: { size: 100, type: WidthType.PERCENTAGE },
              })
            );
          }
        } else {
          // Paragraph or div
          const innerHtml = el.innerHTML.trim();
          if (innerHtml) {
            let align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT;
            const htmlEl = el as HTMLElement;
            if (htmlEl.style?.textAlign === 'center') align = AlignmentType.CENTER;
            if (htmlEl.style?.textAlign === 'right') align = AlignmentType.RIGHT;
            if (htmlEl.style?.textAlign === 'justify') align = AlignmentType.JUSTIFIED;

            children.push(
              new Paragraph({
                children: chunksToTextRuns(parseInlineHtmlToChunks(innerHtml)),
                alignment: align,
                spacing: { after: 140 },
              })
            );
          }
        }
      }
    }
  } else {
    children.push(
      new Paragraph({
        text: stripHtml(content),
        spacing: { after: 140 },
      })
    );
  }

  // Create document
  const doc = new Document({
    title: title || 'Docs Document',
    description: 'Generated by Docs Document Studio',
    styles: {
      default: {
        document: {
          run: {
            font: fontName || 'Calibri',
            size: 24, // 12pt
            color: '18191B',
          },
          paragraph: {
            spacing: { line: 360 }, // 1.5 line spacing
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
