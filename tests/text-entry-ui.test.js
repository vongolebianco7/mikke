import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(new URL('../src/canonicalComposerUi.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../canonical-composer.css',import.meta.url),'utf8');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('composer exposes exactly one canonical primary text-entry contract',()=>{
  assert.match(source,/何を探していますか？/);
  assert.match(source,/data-composer-text/);
  assert.match(source,/data-composer-interpretation/);
  assert.match(source,/input\.addEventListener\('input',\(\)=>applyText\(input\.value\)\)/);
  assert.doesNotMatch(source,/data-quick-text-input/);
  assert.doesNotMatch(source,/data-text-helper-apply/);
});

test('typing immediately publishes structured state and visible interpretation',()=>{
  assert.match(source,/form\._mikkeDraft=watch/);
  assert.match(source,/form\.dataset\.submitStructured='true'/);
  assert.match(source,/aria-live="polite"/);
  assert.match(source,/interpretation\.textContent=/);
  assert.match(source,/mergeInterpretation\(current,interpretation\)/);
});

test('legacy promotion layer is not part of the loaded app',()=>{
  assert.match(index,/canonicalComposerUi\.js/);
  assert.match(index,/canonical-composer\.css/);
  assert.doesNotMatch(index,/textEntryUi\.js/);
  assert.doesNotMatch(index,/text-entry-ui\.css/);
});

test('primary mobile controls meet the iPhone-first layout contract',()=>{
  assert.match(css,/@media\(max-width:420px\)/);
  assert.match(css,/min-height:44px/);
  assert.match(css,/font-size:16px/);
  assert.match(css,/padding:8px 16px calc\(18px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css,/overflow-x:hidden/);
});
