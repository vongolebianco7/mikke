import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/textEntryUi.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../text-entry-ui.css', import.meta.url), 'utf8');

test('text entry promotion is idempotent under MutationObserver rescans', () => {
  assert.match(source, /if\(button\.classList\.contains\('text-entry-cta'\)\)continue/);
});

test('composer exposes one obvious primary text input before category choices', () => {
  assert.match(source, /quick-text-entry/);
  assert.match(source, /何を探していますか？/);
  assert.match(source, /data-quick-text-input/);
  assert.match(source, /data-quick-text-apply/);
  assert.match(source, /条件を作る/);
  assert.match(css, /\.quick-text-entry/);
  assert.match(css, /min-height:\s*104px/);
});

test('typing in the primary text entry immediately gives parsing feedback', () => {
  assert.match(source, /parseWatchQuery/);
  assert.match(source, /data-quick-text-feedback/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /addEventListener\('input'/);
  assert.match(source, /dispatchEvent\(new Event\('input'/);
  assert.match(source, /条件\s*\$\{conditionCount\}件/);
});
