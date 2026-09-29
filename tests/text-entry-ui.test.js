import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/textEntryUi.js', import.meta.url), 'utf8');

test('text entry promotion is idempotent under MutationObserver rescans', () => {
  assert.match(source, /if\(button\.classList\.contains\('text-entry-cta'\)\)continue/);
});
