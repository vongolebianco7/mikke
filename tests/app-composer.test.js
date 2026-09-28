import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

test('Watch composer wires deterministic phrase suggestions into the UI', () => {
  assert.match(app, /suggestWatchPhrases/);
  assert.match(app, /data-suggestion/);
  assert.match(css, /suggestion-strip/);
  assert.match(css, /overflow-x:auto/);
});

test('Watch composer visibly separates required preferred and notification conditions', () => {
  assert.match(app, /必須/);
  assert.match(app, /希望/);
  assert.match(app, /通知条件/);
  assert.match(app, /data-role-toggle/);
});
