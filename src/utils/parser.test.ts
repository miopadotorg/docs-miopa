import test from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeHtml,
  slugify,
  extractHeadings,
  calculateMetrics,
  parseMarkdownToHtml,
  buildStandaloneHtml,
  stripHtml,
  htmlToMarkdown,
  cleanUpDocumentContent,
} from './parser.ts';

test('escapeHtml prevents XSS injection', () => {
  const unsafe = '<script>alert("hack")</script>';
  assert.equal(escapeHtml(unsafe), '&lt;script&gt;alert(&quot;hack&quot;)&lt;/script&gt;');
});

test('slugify produces valid URL anchors', () => {
  assert.equal(slugify('The Architecture of Notes', 1), 'the-architecture-of-notes-1');
  assert.equal(slugify('Special !@# Characters & Stuff'), 'special-characters-stuff');
});

test('extractHeadings extracts headers with level and slug id', () => {
  const md = `# Title One
Some introductory text.

## Section Alpha
Body text here.

### Nested Subsection
More text.

\`\`\`
# Not a real heading
\`\`\`
`;
  const headings = extractHeadings(md);
  assert.equal(headings.length, 3);
  assert.equal(headings[0].level, 1);
  assert.equal(headings[0].text, 'Title One');
  assert.equal(headings[1].level, 2);
  assert.equal(headings[1].text, 'Section Alpha');
  assert.equal(headings[2].level, 3);
  assert.equal(headings[2].text, 'Nested Subsection');
});

test('calculateMetrics calculates words, characters, and reading time accurately', () => {
  const sample = `This is a test paragraph with seven words.

And a second paragraph with six words.`;
  const metrics = calculateMetrics(sample);
  assert.equal(metrics.words, 15);
  assert.equal(metrics.paragraphs, 2);
  assert.equal(metrics.readingTimeMinutes, 1);
  assert.equal(metrics.readingTimeText, '1 min read');
  assert.ok(metrics.characters > metrics.charactersNoSpaces);
});

test('calculateMetrics handles empty text cleanly', () => {
  const metrics = calculateMetrics('   ');
  assert.equal(metrics.words, 0);
  assert.equal(metrics.characters, 3);
  assert.equal(metrics.charactersNoSpaces, 0);
  assert.equal(metrics.paragraphs, 0);
  assert.equal(metrics.readingTimeMinutes, 0);
  assert.equal(metrics.readingTimeText, '0 min read');
});

test('parseMarkdownToHtml parses core markdown tokens correctly and securely', () => {
  const md = `# Master Document
Paragraph with **bold**, *italic*, ~~strike~~, and \`inline code\`.

- Item 1
- Item 2
- [ ] Todo unchecked
- [x] Todo checked

> A thoughtful quote

\`\`\`ts
const x = 42;
\`\`\`

---
`;
  const html = parseMarkdownToHtml(md);

  assert.ok(html.includes('<h1 id="master-document-1">Master Document</h1>'));
  assert.ok(html.includes('<strong>bold</strong>'));
  assert.ok(html.includes('<em>italic</em>'));
  assert.ok(html.includes('<del>strike</del>'));
  assert.ok(html.includes('<code>inline code</code>'));
  assert.ok(html.includes('<li>Item 1</li>'));
  assert.ok(html.includes('<ul class="task-list">'));
  assert.ok(html.includes('<blockquote><p>A thoughtful quote</p></blockquote>'));
  assert.ok(html.includes('<pre><code class="language-ts">const x = 42;</code></pre>'));
  assert.ok(html.includes('<hr />'));
});

test('buildStandaloneHtml outputs complete standalone HTML with meta and styles', () => {
  const html = buildStandaloneHtml('My Essay', '# Title\nHello world', 'Playfair Display');
  assert.ok(html.includes('<!DOCTYPE html>'));
  assert.ok(html.includes('<title>My Essay</title>'));
  assert.ok(html.includes('family=Playfair+Display'));
  assert.ok(html.includes('@media print'));
  assert.ok(html.includes('<main class="document-body">'));
});

test('stripHtml removes HTML tags cleanly without losing words', () => {
  const html = '<p>Hello <strong>bold world</strong>! Welcome to <em>Opendc</em>.</p>';
  const stripped = stripHtml(html);
  assert.equal(stripped, 'Hello bold world! Welcome to Opendc.');
});

test('htmlToMarkdown converts rich HTML back to clean standard Markdown', () => {
  const html = '<h1>Opendc Draft</h1><p>Here is <strong>bold text</strong> and <em>italic prose</em>.</p><ul><li>Point one</li><li>Point two</li></ul>';
  const md = htmlToMarkdown(html);
  assert.ok(md.includes('# Opendc Draft'));
  assert.ok(md.includes('**bold text**'));
  assert.ok(md.includes('*italic prose*'));
  assert.ok(md.includes('- Point one'));
  assert.ok(md.includes('- Point two'));
});

test('parseMarkdownToHtml preserves local font and color styling spans', () => {
  const md = 'Hello <span style="font-family: \'Lora\', sans-serif;">custom font</span> and <span style="color: #2563eb;">blue</span>';
  const html = parseMarkdownToHtml(md);
  assert.ok(html.includes('style="font-family: \'Lora\', sans-serif;"'));
  assert.ok(html.includes('style="color: #2563eb;"'));
});

test('buildStandaloneHtml includes local Google Fonts specified in content', () => {
  const md = 'Draft with <span style="font-family: \'Lora\', serif;">special quote</span>';
  const html = buildStandaloneHtml('Title', md, 'Source Serif 4');
  assert.ok(html.includes('family=Source+Serif+4'));
  assert.ok(html.includes('family=Lora'));
});

test('htmlToMarkdown preserves local sentence font spans and highlights', () => {
  const html = '<p>Normal sentence. <span data-local-font="Playfair Display" style="font-family: &quot;Playfair Display&quot;, sans-serif;">Styled sentence in Playfair Display.</span></p>';
  const md = htmlToMarkdown(html);
  assert.ok(md.includes('data-local-font="Playfair Display"'));
  assert.ok(md.includes('Styled sentence in Playfair Display.'));
});

test('cleanUpDocumentContent fixes spacing, extra line breaks, and list markers in Markdown', () => {
  const messyMd = `#   Heading   With   Extra   Spaces  \n\n\n\nFirst   paragraph  with   extra   spaces ,  and   punctuation . \n\n\n*   First bullet\n+    Second bullet\n•   Third bullet\n\n\n5)   First numbered\n9)    Second numbered`;
  const cleaned = cleanUpDocumentContent(messyMd, true);

  assert.ok(cleaned.includes('# Heading With Extra Spaces'));
  assert.ok(cleaned.includes('First paragraph with extra spaces, and punctuation.'));
  assert.ok(!cleaned.includes('\n\n\n'));
  assert.ok(cleaned.includes('- First bullet\n- Second bullet\n- Third bullet'));
  assert.ok(cleaned.includes('1. First numbered\n2. Second numbered'));
});

test('cleanUpDocumentContent fixes spacing, empty spacer paragraphs, and manual list paragraphs in HTML', () => {
  const messyHtml = `<p>  Hello    world ,   this   is   a   test !  </p><p><br></p><p>&nbsp;</p><p>•   Bullet one  </p><p>*   Bullet two</p><ul><li>•   Already in list</li></ul>`;
  const cleaned = cleanUpDocumentContent(messyHtml, false);

  assert.ok(cleaned.includes('<p>Hello world, this is a test!</p>'));
  assert.ok(!cleaned.includes('<p><br></p>'));
  assert.ok(cleaned.includes('<ul><li>Bullet one</li><li>Bullet two</li><li>Already in list</li></ul>'));
});



