import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compatibilityEvidenceLabel } from '../src/domain/resultEvidence.js';
import { parseWatchQuery } from '../src/domain/parseWatch.js';
import { normalizeWatch } from '../src/domain/normalizeWatch.js';

const compatibilityUi = readFileSync(new URL('../src/compatibilityComposerUi.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../compatibility-composer.css', import.meta.url), 'utf8');
const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('composer renders compatibility conditions in a dedicated fit section', () => {
  assert.match(compatibilityUi, /適合条件/);
  assert.match(compatibilityUi, /data-canonical-compatibility/);
  assert.match(compatibilityUi, /compatibilityConditions/);
  assert.match(compatibilityUi, /data-compatibility-role/);
  assert.match(compatibilityUi, /data-compatibility-remove/);
  assert.match(css, /canonical-compatibility/);
  assert.match(index, /compatibilityComposerUi\.js/);
  assert.match(index, /compatibility-composer\.css/);
});

test('compatibility evidence has explicit Japanese labels for all four states', () => {
  assert.equal(compatibilityEvidenceLabel('compatible'), '対応確認済み');
  assert.equal(compatibilityEvidenceLabel('incompatible'), '非対応');
  assert.equal(compatibilityEvidenceLabel('unknown'), '適合未確認');
  assert.equal(compatibilityEvidenceLabel('unsupported'), 'このデータ元では適合判定不可');
});

test('natural-language compatibility survives normalization for save and edit', () => {
  const parsed = parseWatchQuery('iPhone 17 Pro対応のワイヤレスイヤホン、1万円以下');
  const normalized = normalizeWatch(parsed);
  assert.equal(normalized.compatibilityConditions.length, 1);
  assert.equal(normalized.compatibilityConditions[0].target.model, 'iPhone 17 Pro');
  assert.equal(normalized.compatibilityConditions[0].role, 'required');
});

test('baby compatibility survives normalization separately from ordinary conditions', () => {
  const parsed = parseWatchQuery('0ヶ月から使えて15kgまでのベビーカー');
  const normalized = normalizeWatch(parsed);
  assert.equal(normalized.domain, 'baby');
  assert.ok(normalized.compatibilityConditions.length >= 2);
  assert.ok(normalized.compatibilityConditions.some((c) => c.target?.type === 'age_range'));
  assert.ok(normalized.compatibilityConditions.some((c) => c.target?.type === 'weight_range'));
});
