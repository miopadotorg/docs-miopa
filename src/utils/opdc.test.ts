import test from 'node:test';
import assert from 'node:assert/strict';
import { parseImportedFileContent } from './opdc.ts';
import { generateDocxBlob } from './docxExport.ts';
import { parseDocxArrayBuffer } from './docxImport.ts';

test('parseImportedFileContent correctly parses .opdc json package', () => {
  const jsonContent = JSON.stringify({
    format: 'opendc',
    version: '1.0',
    title: 'Custom Philosophy Note',
    content: '<h1>Deep Thoughts</h1><p>Writing in <strong>Opendc</strong>.</p>',
    fontFamily: 'Playfair Display',
    fontSize: 'lg',
  });

  const draft = parseImportedFileContent(jsonContent, 'Custom Philosophy Note.opdc');

  assert.equal(draft.title, 'Custom Philosophy Note');
  assert.equal(draft.fontFamily, 'Playfair Display');
  assert.equal(draft.fontSize, 'lg');
  assert.ok(draft.content.includes('Deep Thoughts'));
  assert.ok(draft.id.startsWith('doc_'));
});

test('parseImportedFileContent correctly parses raw Markdown file', () => {
  const mdContent = `# Engineering Spec

This is an imported markdown document with **bold text** and lists:
- Feature A
- Feature B
`;

  const draft = parseImportedFileContent(mdContent, 'engineering-spec.md');

  assert.equal(draft.title, 'Engineering Spec');
  assert.ok(draft.content.includes('Feature A'));
  assert.equal(draft.fontFamily, 'Source Serif 4');
});

test('parseImportedFileContent gracefully parses plain text file without heading', () => {
  const txtContent = 'Quick memo written on the go without any markdown tokens.';
  const draft = parseImportedFileContent(txtContent, 'grocery_list.txt');

  assert.equal(draft.title, 'grocery_list');
  assert.equal(draft.content, txtContent);
});

test('parseDocxArrayBuffer imports .docx archive and extracts title and paragraphs', async () => {
  const blob = await generateDocxBlob(
    'Mobile Reader Guide',
    '# Overview\n\nWelcome to the mobile reader for .docx and .opdc files.'
  );
  const buffer = await blob.arrayBuffer();
  const imported = await parseDocxArrayBuffer(buffer, 'Mobile Reader Guide.docx');

  assert.equal(imported.title, 'Mobile Reader Guide');
  assert.ok(imported.content.includes('Overview'));
  assert.ok(imported.content.includes('Welcome to the mobile reader'));
});
