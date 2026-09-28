import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const modes = readFileSync(new URL('../src/composerModes.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const modeCss = readFileSync(new URL('../composer-modes.css', import.meta.url), 'utf8');

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

test('Watch composer offers three distinct input modes before showing free text', () => {
  assert.match(modes, /かんたん/);
  assert.match(modes, /組み立て/);
  assert.match(modes, /文章で入力/);
  assert.match(modes, /data-composer-mode/);
  assert.match(modes, /composerMode/);
  assert.match(modeCss, /composer-mode/);
  assert.match(modeCss, /composer-awaiting-mode>textarea/);
});
