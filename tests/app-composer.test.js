import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const modes = readFileSync(new URL('../src/composerModes.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const modeCss = readFileSync(new URL('../composer-modes.css', import.meta.url), 'utf8');
const evidenceCss = readFileSync(new URL('../result-evidence.css', import.meta.url), 'utf8');

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

test('v3 confirmation rendering resolves domain condition labels from the schema', () => {
  assert.match(app, /getDomainField/);
  assert.match(app, /domainConditions/);
  assert.match(app, /fieldId/);
  assert.match(app, /supportsRequired/);
  assert.match(app, /supportsPreferred/);
});

test('result cards distinguish unsupported evidence from temporarily unknown evidence', () => {
  assert.match(app, /summarizeEvidenceState/);
  assert.match(app, /このデータ元では判定不可/);
  assert.match(app, /未確認/);
  assert.match(evidenceCss, /evidence-state/);
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

test('flight and hotel composer are driven by domain schema groups instead of shallow legacy option tables', () => {
  assert.match(modes, /createComposerModel/);
  assert.match(modes, /basic/);
  assert.match(modes, /common/);
  assert.match(modes, /detailed/);
  assert.match(modes, /advanced/);
  assert.doesNotMatch(modes, /legacyEasyOptions/);
  assert.doesNotMatch(modes, /legacyBuilderOptions/);
});

test('travel composer keeps advanced conditions progressively disclosed on mobile', () => {
  assert.match(modes, /advanced-conditions/);
  assert.match(modeCss, /advanced-conditions/);
  assert.match(modeCss, /condition-family/);
});
