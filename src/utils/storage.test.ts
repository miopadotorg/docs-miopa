import { test } from 'node:test';
import assert from 'node:assert';
import {
  createNewDraft,
  loadAllDocuments,
  saveAllDocuments,
  loadSettings,
  saveSettings,
  loadActiveDocumentId,
  saveActiveDocumentId,
  DEFAULT_SETTINGS,
} from './storage.ts';

test('createNewDraft creates a valid draft with unique id and title', () => {
  const draft = createNewDraft('Test Proposal', 'Lora');
  assert.ok(draft.id.startsWith('doc_'));
  assert.strictEqual(draft.title, 'Test Proposal');
  assert.strictEqual(draft.fontFamily, 'Lora');
  assert.ok(draft.content.includes('# Test Proposal'));
});

test('saveAllDocuments and loadAllDocuments persist and retrieve documents in memory', () => {
  const customDraft = createNewDraft('Memory Draft', 'Inter');
  saveAllDocuments([customDraft]);
  const loaded = loadAllDocuments();
  assert.ok(Array.isArray(loaded));
  assert.strictEqual(loaded[0].title, 'Memory Draft');
  assert.strictEqual(loaded[0].fontFamily, 'Inter');
});

test('saveSettings and loadSettings maintain user preferences', () => {
  saveSettings({
    fontFamily: 'serif',
    fontSize: 'lg',
    viewMode: 'zen',
    theme: 'dark',
    showOutline: false,
  });
  const settings = loadSettings();
  assert.strictEqual(settings.fontSize, 'lg');
  assert.strictEqual(settings.viewMode, 'zen');
  assert.strictEqual(settings.theme, 'dark');
});

test('saveActiveDocumentId and loadActiveDocumentId track current active draft', () => {
  saveActiveDocumentId('doc_test_123');
  assert.strictEqual(loadActiveDocumentId(), 'doc_test_123');
});
