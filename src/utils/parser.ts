/**
 * Lightweight, dependency-free Markdown parser, sanitizer, outline extractor,
 * and text metrics calculator. Operates purely client-side with zero external libraries.
 */

export interface HeadingItem {
  id: string;
  level: number;
  text: string;
  lineIndex: number;
}

export interface DocumentMetrics {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  paragraphs: number;
  readingTimeMinutes: number;
  readingTimeText: string;
}

/**
 * Escapes unsafe HTML characters to prevent XSS.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generates an accessible, URL-safe slug ID for a heading.
 */
export function slugify(text: string, index?: number): string {
  const clean = text
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return clean ? `${clean}${index !== undefined ? `-${index}` : ''}` : `section-${index ?? 0}`;
}

/**
 * Strips HTML tags, leaving clean readable text.
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/(p|div|h[1-6]|li|blockquote|pre)>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Converts rich HTML content into clean standard Markdown.
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return '';

  let md = html;

  // Code blocks with language badge
  md = md.replace(/<div[^>]*class="[^"]*code-block-wrapper[^"]*"[^>]*>[\s\S]*?<pre[^>]*><code(?: class="language-([a-zA-Z0-9_-]+)")?[^>]*>([\s\S]*?)<\/code><\/pre><\/div>/gi, (_, lang, code) => {
    const unescaped = code
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    return `\n\n\`\`\`${lang || ''}\n${unescaped.trim()}\n\`\`\`\n\n`;
  });

  // Standard code blocks: <pre><code ...>...</code></pre>
  md = md.replace(/<pre[^>]*><code(?: class="language-([a-zA-Z0-9_-]+)")?[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_, lang, code) => {
    const unescaped = code
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    return `\n\n\`\`\`${lang || ''}\n${unescaped.trim()}\n\`\`\`\n\n`;
  });

  // Inline code: <code>...</code>
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

  // Headings: <h1> to <h6>
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n# $1\n\n');
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n');
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n');
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n\n#### $1\n\n');
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '\n\n##### $1\n\n');
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '\n\n###### $1\n\n');

  // Blockquotes: <blockquote>...</blockquote>
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
    const clean = content.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n').trim();
    const lines = clean.split(/\r?\n/).map((l: string) => `> ${l.trim()}`).join('\n');
    return `\n\n${lines}\n\n`;
  });

  // Horizontal rules
  md = md.replace(/<hr\s*\/?>/gi, '\n\n---\n\n');

  // Bold & Italic
  md = md.replace(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, '**$1**');
  md = md.replace(/<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, '*$1*');
  md = md.replace(/<(?:del|s|strike)[^>]*>([\s\S]*?)<\/(?:del|s|strike)>/gi, '~~$1~~');

  // Links: <a href="url">text</a>
  md = md.replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');

  // Task list items
  md = md.replace(/<li[^>]*class="[^"]*task-list-item[^"]*"[^>]*>\s*<input[^>]*type="checkbox"[^>]*checked[^>]*>\s*(?:<span>)?([\s\S]*?)(?:<\/span>)?<\/li>/gi, '- [x] $1\n');
  md = md.replace(/<li[^>]*class="[^"]*task-list-item[^"]*"[^>]*>\s*<input[^>]*type="checkbox"[^>]*>\s*(?:<span>)?([\s\S]*?)(?:<\/span>)?<\/li>/gi, '- [ ] $1\n');

  // List items
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<\/(?:ul|ol)>/gi, '\n');

  // Paragraphs & Divs
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n\n$1\n\n');
  md = md.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, '\n$1\n');
  md = md.replace(/<br\s*\/?>/gi, '\n');

  // Preserve safe inline styling tags (<span style="...">, <font ...>, <mark ...>, <u>, <sub>, <sup>)
  const keptInlineTags: string[] = [];
  md = md.replace(/<(\/?(?:span|font|mark|u|sub|sup)\b[^>]*)>/gi, (fullTag) => {
    const token = `\u0001KEPTTAG${keptInlineTags.length}\u0001`;
    keptInlineTags.push(fullTag);
    return token;
  });

  // Strip remaining structural HTML tags
  md = md.replace(/<[^>]+>/g, '');

  // Restore preserved inline styling tags
  keptInlineTags.forEach((tag, idx) => {
    md = md.replace(`\u0001KEPTTAG${idx}\u0001`, tag);
  });

  // Decode common HTML entities
  md = md
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Normalize excessive newlines
  md = md.replace(/\n{3,}/g, '\n\n').trim();

  return md;
}

/**
 * Extract headings (# through ###### or <h1-6>) for outline and jump-list navigation.
 */
export function extractHeadings(content: string): HeadingItem[] {
  const headings: HeadingItem[] = [];

  // Check if content is primarily HTML
  if (/<h[1-6][^>]*>/i.test(content)) {
    const headingRegex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
    let match;
    let index = 0;
    while ((match = headingRegex.exec(content)) !== null) {
      index++;
      const level = parseInt(match[1], 10);
      const cleanText = stripHtml(match[2]);
      const id = slugify(cleanText, index);
      headings.push({
        id,
        level,
        text: cleanText,
        lineIndex: index,
      });
    }
    return headings;
  }

  // Fallback to Markdown line-based parser
  const lines = content.split(/\r?\n/);
  let inCodeBlock = false;

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      return;
    }
    if (inCodeBlock) return;

    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const rawText = match[2].trim();
      const cleanText = rawText.replace(/\*\*|__|\*|_|~~|`|\[(.*?)\]\(.*?\)/g, '$1');
      const id = slugify(cleanText, headings.length + 1);
      headings.push({
        id,
        level,
        text: cleanText,
        lineIndex,
      });
    }
  });

  return headings;
}

/**
 * Calculates real-time document metrics.
 * Works on raw markdown or rich HTML.
 */
export function calculateMetrics(textOrHtml: string): DocumentMetrics {
  const plainText = /<[a-z][\s\S]*>/i.test(textOrHtml)
    ? stripHtml(textOrHtml)
    : textOrHtml;

  const trimmed = plainText.trim();
  const characters = plainText.length;
  const charactersNoSpaces = plainText.replace(/\s/g, '').length;

  if (!trimmed) {
    return {
      words: 0,
      characters,
      charactersNoSpaces: 0,
      paragraphs: 0,
      readingTimeMinutes: 0,
      readingTimeText: '0 min read',
    };
  }

  // Word count: split on whitespace sequences
  const wordsArray = trimmed.match(/\S+/g) || [];
  const words = wordsArray.length;

  // Paragraph count
  const paragraphsArray = textOrHtml
    .split(/(?:<\/p>|<\/div>|\r?\n\s*\r?\n)/i)
    .map((p) => stripHtml(p).trim())
    .filter((p) => p.length > 0);
  const paragraphs = Math.max(1, paragraphsArray.length);

  const readingTimeMinutes = words === 0 ? 0 : Math.max(1, Math.ceil(words / 210));
  const readingTimeText =
    words === 0
      ? '0 min read'
      : readingTimeMinutes === 1
      ? '1 min read'
      : `${readingTimeMinutes} mins read`;

  return {
    words,
    characters,
    charactersNoSpaces,
    paragraphs,
    readingTimeMinutes,
    readingTimeText,
  };
}

/**
 * Sanitizes URLs to prevent javascript: or unsafe protocol execution.
 */
function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('/')
  ) {
    return escapeHtml(trimmed);
  }
  return '#unsafe-link';
}

/**
 * Parses inline markdown: bold, italic, strikethrough, inline code, links, images,
 * while preserving safe inline HTML styling tags (e.g. highlights, custom colors, local fonts).
 */
function parseInline(inlineText: string): string {
  // 1. Extract inline code snippets so their inner content isn't parsed
  const codePlaceholders: string[] = [];
  let processed = inlineText.replace(/`([^`]+)`/g, (_, code) => {
    const placeholder = `\u0001INLCODE${codePlaceholders.length}\u0001`;
    codePlaceholders.push(`<code>${escapeHtml(code)}</code>`);
    return placeholder;
  });

  // 2. Extract safe inline HTML tags (<mark>, <span style="...">, <font>, <u>, <del>, <sub>, <sup>)
  const safeTagPlaceholders: string[] = [];
  processed = processed.replace(
    /<(mark|span|font|u|del|sub|sup)\b([^>]*)>([\s\S]*?)<\/\1>/gi,
    (match, tag, attrs, inner) => {
      // Disallow any inline event handlers
      if (/on\w+=/i.test(attrs)) return match;
      const placeholder = `\u0001INLTAG${safeTagPlaceholders.length}\u0001`;
      safeTagPlaceholders.push(`<${tag}${attrs}>${parseInline(inner)}</${tag}>`);
      return placeholder;
    }
  );

  // Escape raw HTML in the remaining text
  processed = escapeHtml(processed);

  // Images: ![alt](url)
  processed = processed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    return `<img src="${sanitizeUrl(url)}" alt="${escapeHtml(alt)}" loading="lazy" />`;
  });

  // Links: [text](url)
  processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    return `<a href="${sanitizeUrl(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });

  // Bold & Italic combined: ***text*** or ___text___
  processed = processed.replace(/(\*\*\*|___)(.*?)\1/g, '<strong><em>$2</em></strong>');

  // Bold: **text** or __text__
  processed = processed.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');

  // Italic: *text* or _text_
  processed = processed.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');

  // Strikethrough: ~~text~~
  processed = processed.replace(/~~(.*?)~~/g, '<del>$1</del>');

  // Restore safe inline tag placeholders
  safeTagPlaceholders.forEach((tagHtml, idx) => {
    processed = processed.replace(`\u0001INLTAG${idx}\u0001`, tagHtml);
  });

  // Restore inline code placeholders
  codePlaceholders.forEach((codeHtml, idx) => {
    processed = processed.replace(`\u0001INLCODE${idx}\u0001`, codeHtml);
  });

  return processed;
}

/**
 * Full line-by-line Markdown to clean, sanitized HTML parser.
 * Supports:
 * - Code blocks with language labels
 * - Headings 1-6 with slug IDs
 * - Blockquotes (including multi-line)
 * - Ordered & unordered lists
 * - Task lists with interactive-ready checkboxes
 * - Horizontal rules (--- or ***)
 * - Paragraphs
 */
export function parseMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';

  // If content is already valid HTML (from visual contenteditable editing)
  const isHtml =
    /^\s*<(?:h[1-6]|p|div|table|ul|ol|blockquote|figure|article|section)/i.test(markdown) ||
    (/<[a-z][\s\S]*>/i.test(markdown) && !/(?:^#{1,6}\s+|^\s*[-*+]\s+)/m.test(markdown));

  if (isHtml) {
    return markdown
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/\son\w+="[^"]*"/gi, '')
      .replace(/\son\w+='[^']*'/gi, '');
  }

  const lines = markdown.split(/\r?\n/);
  const output: string[] = [];
  let headingCount = 0;

  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockBuffer: string[] = [];

  let inUl = false;
  let inTaskList = false;
  let inOl = false;
  let inBlockquote = false;
  let blockquoteBuffer: string[] = [];

  function closeCodeBlock() {
    if (inCodeBlock) {
      const codeContent = escapeHtml(codeBlockBuffer.join('\n'));
      const langClass = codeBlockLang ? ` class="language-${escapeHtml(codeBlockLang)}"` : '';
      const langBadge = codeBlockLang
        ? `<div class="code-block-header"><span class="code-lang">${escapeHtml(codeBlockLang)}</span></div>`
        : '';
      output.push(`<div class="code-block-wrapper">${langBadge}<pre><code${langClass}>${codeContent}</code></pre></div>`);
      inCodeBlock = false;
      codeBlockLang = '';
      codeBlockBuffer = [];
    }
  }

  function closeUl() {
    if (inUl) {
      output.push('</ul>');
      inUl = false;
    }
    if (inTaskList) {
      output.push('</ul>');
      inTaskList = false;
    }
  }

  function closeOl() {
    if (inOl) {
      output.push('</ol>');
      inOl = false;
    }
  }

  function closeBlockquote() {
    if (inBlockquote) {
      const quoteContent = blockquoteBuffer.map((line) => parseInline(line)).join('<br />');
      output.push(`<blockquote><p>${quoteContent}</p></blockquote>`);
      inBlockquote = false;
      blockquoteBuffer = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check for Code Block delimiters
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        closeCodeBlock();
      } else {
        closeUl();
        closeOl();
        closeBlockquote();
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
        codeBlockBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(rawLine);
      continue;
    }

    // Blank line closes lists and blockquotes
    if (!trimmed) {
      closeUl();
      closeOl();
      closeBlockquote();
      continue;
    }

    // Horizontal Rule: ---, ***, ___
    if (/^(?:---|\*\*\*|___)$/.test(trimmed)) {
      closeUl();
      closeOl();
      closeBlockquote();
      output.push('<hr />');
      continue;
    }

    // Headings: # to ######
    const headingMatch = rawLine.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      closeUl();
      closeOl();
      closeBlockquote();
      const level = headingMatch[1].length;
      headingCount++;
      const headingContent = headingMatch[2].trim();
      const id = slugify(headingContent, headingCount);
      output.push(`<h${level} id="${id}">${parseInline(headingContent)}</h${level}>`);
      continue;
    }

    // Blockquote: > content
    if (rawLine.startsWith('>')) {
      closeUl();
      closeOl();
      inBlockquote = true;
      blockquoteBuffer.push(rawLine.replace(/^>\s?/, ''));
      continue;
    } else if (inBlockquote) {
      closeBlockquote();
    }

    // Task list items: - [ ] or - [x]
    const taskMatch = rawLine.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.+)$/);
    if (taskMatch) {
      if (inUl) {
        output.push('</ul>');
        inUl = false;
      }
      closeOl();
      if (!inTaskList) {
        output.push('<ul class="task-list">');
        inTaskList = true;
      }
      const checked = taskMatch[2].toLowerCase() === 'x';
      const itemContent = parseInline(taskMatch[3]);
      output.push(
        `<li class="task-list-item"><input type="checkbox" disabled ${checked ? 'checked' : ''} /> <span>${itemContent}</span></li>`
      );
      continue;
    }

    // Unordered list item: - item or * item
    const ulMatch = rawLine.match(/^(\s*)[-*+]\s+(.+)$/);
    if (ulMatch) {
      if (inTaskList) {
        output.push('</ul>');
        inTaskList = false;
      }
      closeOl();
      if (!inUl) {
        output.push('<ul>');
        inUl = true;
      }
      output.push(`<li>${parseInline(ulMatch[2])}</li>`);
      continue;
    }

    // Ordered list item: 1. item
    const olMatch = rawLine.match(/^(\s*)\d+\.\s+(.+)$/);
    if (olMatch) {
      closeUl();
      if (!inOl) {
        output.push('<ol>');
        inOl = true;
      }
      output.push(`<li>${parseInline(olMatch[2])}</li>`);
      continue;
    }

    // Standard paragraph line
    closeUl();
    closeOl();
    closeBlockquote();
    output.push(`<p>${parseInline(rawLine)}</p>`);
  }

  // Close any lingering open blocks
  closeCodeBlock();
  closeUl();
  closeOl();
  closeBlockquote();

  return output.join('\n');
}

/**
 * Builds a standalone, publication-grade, self-contained HTML document
 * ready for export, opening in any browser, or sending to print.
 */
export function buildStandaloneHtml(
  title: string,
  content: string,
  fontName: string = 'Source Serif 4'
): string {
  const bodyHtml = /<[a-z][\s\S]*>/i.test(content)
    ? content
    : parseMarkdownToHtml(content);
  const metrics = calculateMetrics(content);
  const safeTitle = escapeHtml(title || 'Untitled Document');
  const safeFontName = escapeHtml(fontName);

  // Collect active font plus any local font families specified in the document
  const fontsToLoad = new Set<string>();
  fontsToLoad.add(fontName);
  const fontMatches = content.matchAll(/font-family:\s*['"]?([^'";,>]+)/gi);
  for (const match of fontMatches) {
    if (match[1] && match[1].trim()) {
      const parsed = match[1].replace(/^['"]+|['"]+$/g, '').trim();
      if (!['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'inherit'].includes(parsed.toLowerCase())) {
        fontsToLoad.add(parsed);
      }
    }
  }
  const faceMatches = content.matchAll(/\bface=["']([^"']+)["']/gi);
  for (const match of faceMatches) {
    if (match[1] && match[1].trim()) {
      fontsToLoad.add(match[1].trim());
    }
  }

  const fontLinkTags = Array.from(fontsToLoad)
    .map((f) => {
      const enc = encodeURIComponent(f).replace(/%20/g, '+');
      return `<link href="https://fonts.googleapis.com/css?family=${enc}:400,400i,500,600,700,700i&display=swap" rel="stylesheet" />`;
    })
    .join('\n  ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="generator" content="Docs Document Studio" />
  <title>${safeTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  ${fontLinkTags}
  <style>
    /* Standalone publication-grade CSS typography reset and design system */
    :root {
      --bg-color: #faf9f6;
      --surface-color: #ffffff;
      --text-main: #1f2421;
      --text-muted: #6b7280;
      --border-color: #e5e7eb;
      --accent: #2563eb;
      --code-bg: #f3f4f6;
      --font-body: "${safeFontName}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Georgia, serif;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      --max-measure: 72ch;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg-color: #121316;
        --surface-color: #1a1c20;
        --text-main: #f3f4f6;
        --text-muted: #9ca3af;
        --border-color: #2e3238;
        --accent: #60a5fa;
        --code-bg: #22252a;
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg-color);
      color: var(--text-main);
      font-family: var(--font-body);
      font-size: 17px;
      line-height: 1.75;
      padding: 3rem 1.5rem 6rem;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }

    .document-container {
      max-width: var(--max-measure);
      margin: 0 auto;
    }

    .document-header {
      margin-bottom: 2.5rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--border-color);
    }

    .document-header h1 {
      font-size: 2.4rem;
      line-height: 1.25;
      margin-bottom: 0.75rem;
      letter-spacing: -0.02em;
    }

    .document-meta {
      font-size: 0.85rem;
      color: var(--text-muted);
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }

    .document-meta span.separator {
      opacity: 0.4;
    }

    /* Content Typography */
    h1, h2, h3, h4, h5, h6 {
      color: var(--text-main);
      font-weight: 700;
      letter-spacing: -0.015em;
      margin-top: 2rem;
      margin-bottom: 0.85rem;
      line-height: 1.3;
    }

    h1 { font-size: 2rem; }
    h2 { font-size: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.35rem; }
    h3 { font-size: 1.25rem; }
    h4 { font-size: 1.1rem; }

    p {
      margin-bottom: 1.35rem;
    }

    a {
      color: var(--accent);
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    strong { font-weight: 600; }
    em { font-style: italic; }
    del { text-decoration: line-through; opacity: 0.7; }

    blockquote {
      border-left: 3px solid var(--border-color);
      padding: 0.5rem 0 0.5rem 1.25rem;
      margin: 1.5rem 0;
      color: var(--text-muted);
      font-style: italic;
    }

    blockquote p {
      margin-bottom: 0;
    }

    ul, ol {
      margin-bottom: 1.35rem;
      padding-left: 1.5rem;
    }

    li {
      margin-bottom: 0.4rem;
    }

    ul.task-list {
      list-style-type: none;
      padding-left: 0;
    }

    li.task-list-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    hr {
      border: 0;
      height: 1px;
      background-color: var(--border-color);
      margin: 2.5rem 0;
    }

    code {
      font-family: var(--font-mono);
      font-size: 0.88em;
      background-color: var(--code-bg);
      padding: 0.2em 0.4em;
      border-radius: 4px;
    }

    .code-block-wrapper {
      margin: 1.5rem 0;
      background-color: var(--code-bg);
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid var(--border-color);
    }

    .code-block-header {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.4rem 1rem;
      background: rgba(0, 0, 0, 0.04);
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-color);
    }

    pre {
      padding: 1rem;
      overflow-x: auto;
      font-family: var(--font-mono);
      font-size: 0.9rem;
      line-height: 1.5;
    }

    pre code {
      background: transparent;
      padding: 0;
      border-radius: 0;
    }

    img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      margin: 1.5rem 0;
    }

    /* Print Optimization Rules */
    @media print {
      body {
        background-color: #ffffff !important;
        color: #000000 !important;
        font-size: 11pt !important;
        line-height: 1.6 !important;
        padding: 0 !important;
      }

      .document-container {
        max-width: 100% !important;
        margin: 0 !important;
      }

      .document-header {
        border-bottom: 1pt solid #ccc !important;
        margin-bottom: 1.5cm !important;
      }

      a {
        text-decoration: none !important;
        color: #000000 !important;
      }

      h1, h2, h3, h4 {
        page-break-after: avoid;
      }

      pre, blockquote {
        page-break-inside: avoid;
        border: 1pt solid #ccc !important;
      }

      @page {
        margin: 2cm;
        size: auto;
      }
    }
  </style>
</head>
<body>
  <article class="document-container">
    <header class="document-header">
      <h1>${safeTitle}</h1>
      <div class="document-meta">
        <span>${metrics.words} words</span>
        <span class="separator">·</span>
        <span>${metrics.characters} characters</span>
        <span class="separator">·</span>
        <span>${metrics.readingTimeText}</span>
        <span class="separator">·</span>
        <span>Exported ${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
      </div>
    </header>
    <main class="document-body">
      ${bodyHtml}
    </main>
  </article>
</body>
</html>`;
}

/**
 * Cleans up document content (both Rich HTML and Markdown):
 * 1. Fixes spacing (collapses multiple spaces, removes spaces before punctuation, trims blocks)
 * 2. Removes extra line breaks (removes empty <p><br></p> spacers, collapses repeated <br> and 3+ newlines)
 * 3. Standardizes list markers (normalizes *, +, •, ◦, 1) to standard '-' or '1.' in Markdown,
 *    converts manual bullet/numbered paragraphs into proper <ul>/<ol> lists in HTML, and strips duplicate bullets inside <li>)
 */
export function cleanUpDocumentContent(content: string, isMarkdown: boolean = false): string {
  if (!content || !content.trim()) return '';

  const isHtmlContent = !isMarkdown && /<(?:p|div|h[1-6]|ul|ol|li|blockquote|table|pre|span|strong|em|br)\b/i.test(content);

  if (!isHtmlContent) {
    // Markdown / Plain Text Cleanup
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    let inCodeBlock = false;
    let orderedCounter = 0;

    const cleanedLines = lines.map((line) => {
      const trimmedStart = line.trimStart();
      if (trimmedStart.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        orderedCounter = 0;
        return line.trimEnd();
      }
      if (inCodeBlock) {
        return line;
      }

      const trimmed = line.trim();
      if (!trimmed) {
        orderedCounter = 0;
        return '';
      }

      // Preserve leading indentation (in multiples of 2 spaces) for nested lists
      const indentMatch = line.match(/^(\s*)/);
      const rawIndent = indentMatch ? indentMatch[1].replace(/\t/g, '  ') : '';
      const normalizedIndent = ' '.repeat(Math.floor(rawIndent.length / 2) * 2);

      // Standardize task list markers: * [ ] or + [x] -> - [ ] / - [x]
      const taskMatch = trimmed.match(/^(?:[-*+•◦▪])\s+\[([ xX])\]\s+(.*)$/);
      if (taskMatch) {
        orderedCounter = 0;
        const check = taskMatch[1].toLowerCase() === 'x' ? 'x' : ' ';
        const body = normalizeInlineSpacing(taskMatch[2]);
        return `${normalizedIndent}- [${check}] ${body}`;
      }

      // Standardize unordered list markers: *, +, •, ◦, ▪, – -> -
      const bulletMatch = trimmed.match(/^(?:[*+•◦▪–—]|-)\s+(.*)$/);
      if (bulletMatch && !/^---+$/.test(trimmed)) {
        orderedCounter = 0;
        const body = normalizeInlineSpacing(bulletMatch[1]);
        return `${normalizedIndent}- ${body}`;
      }

      // Standardize ordered list markers: 1) or 1. -> sequential 1., 2., 3.
      const orderedMatch = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
      if (orderedMatch) {
        orderedCounter++;
        const body = normalizeInlineSpacing(orderedMatch[2]);
        return `${normalizedIndent}${orderedCounter}. ${body}`;
      }

      orderedCounter = 0;

      // Standardize headings: #Heading or ##   Heading -> # Heading
      const headingMatch = trimmed.match(/^(#{1,6})\s*(.+)$/);
      if (headingMatch) {
        return `${headingMatch[1]} ${normalizeInlineSpacing(headingMatch[2])}`;
      }

      return normalizeInlineSpacing(trimmed);
    });

    return cleanedLines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // Rich HTML Cleanup
  let html = content.replace(/\r\n/g, '\n');

  // Protect <pre> blocks so code formatting is untouched
  const protectedPreBlocks: string[] = [];
  html = html.replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, (match) => {
    const token = `\u0002PREBLOCK${protectedPreBlocks.length}\u0002`;
    protectedPreBlocks.push(match);
    return token;
  });

  // 1. Remove empty spacer paragraphs and divs (<p><br></p>, <p>&nbsp;</p>, <p></p>)
  html = html.replace(/<(?:p|div)\b[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/(?:p|div)>/gi, '');

  // 2. Collapse 2+ consecutive <br> tags into a single <br/>
  html = html.replace(/(?:<br\s*\/?>\s*){2,}/gi, '<br/>');

  // 3. Convert manual bullet paragraphs (<p>• item</p>, <p>* item</p>, <p>- item</p>, <p>+ item</p>) into <ul><li>item</li></ul>
  html = html.replace(
    /<(p|div)\b[^>]*>\s*(?:[•◦▪*+–—]|-)\s+([\s\S]*?)<\/\1>/gi,
    '<ul><li>$2</li></ul>'
  );

  // 4. Convert manual numbered paragraphs (<p>1. item</p>, <p>1) item</p>) into <ol><li>item</li></ol>
  html = html.replace(
    /<(p|div)\b[^>]*>\s*\d+[.)]\s+([\s\S]*?)<\/\1>/gi,
    '<ol><li>$2</li></ol>'
  );

  // 5. Merge adjacent <ul>...</ul><ul>...</ul> and <ol>...</ol><ol>...</ol>
  html = html.replace(/<\/ul>\s*<ul\b[^>]*>/gi, '');
  html = html.replace(/<\/ol>\s*<ol\b[^>]*>/gi, '');

  // 6. Strip redundant manual bullet or number prefixes inside <li> tags
  html = html.replace(
    /(<li\b[^>]*>)\s*(?:(?:[•◦▪*+–—]|-|\d+[.)])\s+)+/gi,
    '$1'
  );

  // 7. Normalize spacing in text nodes (outside HTML tags)
  html = html.replace(/(>|^)([^<]+)(<|$)/g, (_, open, text, close) => {
    if (!text) return `${open}${text}${close}`;
    const cleaned = text
      .replace(/&nbsp;/gi, ' ')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\s+([,.;:!?])/g, '$1');
    return `${open}${cleaned}${close}`;
  });

  // 8. Trim leading/trailing spaces inside block tags (<p>, <li>, <h1-6>, <blockquote>)
  html = html.replace(
    /(<(?:p|li|h[1-6]|blockquote)\b[^>]*>)\s+/gi,
    '$1'
  );
  html = html.replace(
    /\s+(<\/(?:p|li|h[1-6]|blockquote)>)/gi,
    '$1'
  );

  // 9. Collapse excessive blank lines between HTML elements
  html = html.replace(/\n{3,}/g, '\n\n').trim();

  // Restore protected <pre> blocks
  protectedPreBlocks.forEach((block, idx) => {
    html = html.replace(`\u0002PREBLOCK${idx}\u0002`, block);
  });

  return html;
}

function normalizeInlineSpacing(str: string): string {
  return str
    .replace(/&nbsp;/gi, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

