import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CURATED_GOOGLE_FONTS,
  DEFAULT_DRAFT_FONT,
  getFontFamilyCss,
} from './fonts.ts';

test('CURATED_GOOGLE_FONTS contains popular serif, sans, and mono fonts', () => {
  assert.ok(CURATED_GOOGLE_FONTS.length >= 15);
  const categories = new Set(CURATED_GOOGLE_FONTS.map((f) => f.category));
  assert.ok(categories.has('serif'));
  assert.ok(categories.has('sans'));
  assert.ok(categories.has('mono'));

  const fontNames = CURATED_GOOGLE_FONTS.map((f) => f.name);
  assert.ok(fontNames.includes('Playfair Display'));
  assert.ok(fontNames.includes('Source Serif 4'));
  assert.ok(fontNames.includes('Lora'));
  assert.ok(fontNames.includes('Inter'));
  assert.ok(fontNames.includes('JetBrains Mono'));
});

test('DEFAULT_DRAFT_FONT is defined and valid', () => {
  assert.equal(DEFAULT_DRAFT_FONT, 'Source Serif 4');
});

test('getFontFamilyCss handles undefined gracefully', () => {
  const css = getFontFamilyCss();
  assert.ok(css.includes('Source Serif 4'));
});

test('getFontFamilyCss formats custom Google Font name with fallbacks', () => {
  const css = getFontFamilyCss('Playfair Display');
  assert.ok(css.startsWith('"Playfair Display"'));
  assert.ok(css.includes('serif'));
});
