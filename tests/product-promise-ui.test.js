import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');

test('public beta UI does not imply background monitoring or push delivery', () => {
  assert.doesNotMatch(app, /Mikkeが変化を見張ります/);
  assert.doesNotMatch(app, /通知条件/);
  assert.doesNotMatch(app, /監視中/);
  assert.match(app, /変化条件/);
  assert.match(app, /今すぐ確認/);
});

test('core icon-only controls expose accessible names', () => {
  assert.match(app, /aria-label="新しいWatchを作る"/);
  assert.match(app, /aria-label="閉じる"/);
  assert.match(app, /aria-live="polite"/);
});

test('save failure has explicit user-facing copy', () => {
  assert.match(app, /Watchを保存できませんでした/);
});
