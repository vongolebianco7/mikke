import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWatchQuery } from '../src/domain/parseWatch.js';
import { suggestWatchPhrases } from '../src/domain/suggestWatchPhrases.js';

function ids(raw) {
  const parsed = parseWatchQuery(raw);
  return suggestWatchPhrases(raw, parsed).map((item) => item.id);
}

test('model-only shopping input suggests useful next condition families', () => {
  const result = ids('New Balance 996');
  assert.ok(result.includes('new-only'));
  assert.ok(result.includes('cheaper-than-previous'));
  assert.ok(result.includes('watch-low'));
  assert.ok(result.includes('restock'));
});

test('size-added input offers role refinement without duplicating size text', () => {
  const suggestions = suggestWatchPhrases('New Balance 996、24.5cm', parseWatchQuery('New Balance 996、24.5cm'));
  assert.ok(suggestions.some((item) => item.id === 'size-preferred'));
  assert.ok(suggestions.every((item) => !item.appendText.includes('24.5cmで')));
});

test('color-added input offers role refinement and avoids duplicate color suggestions', () => {
  const suggestions = suggestWatchPhrases('New Balance 996、グレー', parseWatchQuery('New Balance 996、グレー'));
  assert.ok(suggestions.some((item) => item.id === 'color-required'));
  assert.ok(suggestions.every((item) => item.id !== 'gray-color'));
});

test('already-applied price and state triggers are not suggested again', () => {
  const result = ids('New Balance 996、今より安くなったら、在庫復活したら');
  assert.ok(!result.includes('cheaper-than-previous'));
  assert.ok(!result.includes('restock'));
  assert.ok(result.includes('complete'));
});
