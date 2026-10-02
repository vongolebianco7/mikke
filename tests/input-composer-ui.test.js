import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mountInputComposer } from '../src/inputComposerUi.js';

function setup() {
  const dom = new JSDOM('<form id="watch-form"><input id="query"><button type="submit">保存</button></form>', { url:'https://example.test' });
  const form = dom.window.document.querySelector('#watch-form');
  const composer = mountInputComposer(form, { Event:dom.window.Event });
  return { dom, form, composer, root:form.querySelector('[data-input-composer]') };
}

test('first state has one obvious entry and no forced domain or giant form', () => {
  const { root } = setup();
  assert.ok(root.querySelector('[data-intent-input]'));
  assert.match(root.textContent, /何を探していますか？/);
  assert.match(root.textContent, /条件から追加/);
  assert.equal(root.querySelectorAll('[data-domain-choice]').length, 0);
  assert.equal(root.querySelectorAll('.fixed-category-form').length, 0);
  assert.equal(root.querySelectorAll('[data-change-panel]').length, 0);
});

test('interpreted input renders target cards unresolved and save action', () => {
  const { dom, root } = setup();
  const input = root.querySelector('[data-intent-input]');
  input.value = '冷蔵庫、500L以上、幅68cm以下、安っぽくない';
  input.dispatchEvent(new dom.window.Event('input', { bubbles:true }));
  assert.ok(root.querySelector('[data-target-summary]'));
  assert.ok(root.querySelectorAll('[data-condition-card]').length >= 1);
  assert.ok(root.querySelector('[data-unresolved-list]'));
  assert.ok(root.querySelector('[data-add-condition]'));
  assert.ok(root.querySelector('[data-composer-save]'));
});

test('condition cards open an editor sheet and role can change', () => {
  const { dom, root, composer } = setup();
  composer.store.upsertCondition({ attributeId:'color', operator:'eq', value:'gray', role:'required', supportState:'supported' });
  composer.render();
  root.querySelector('[data-condition-card]').dispatchEvent(new dom.window.Event('click', { bubbles:true }));
  const sheet = root.querySelector('[data-condition-editor-sheet]');
  assert.ok(sheet);
  assert.ok(sheet.querySelector('[data-role-select]'));
});

test('add-condition sheet is searchable and shows recommendations', () => {
  const { dom, root } = setup();
  root.querySelector('[data-add-condition]').dispatchEvent(new dom.window.Event('click', { bubbles:true }));
  const sheet = root.querySelector('[data-add-condition-sheet]');
  assert.ok(sheet);
  assert.ok(sheet.querySelector('[data-condition-search]'));
  assert.ok(sheet.querySelectorAll('[data-condition-option]').length > 0);
});

test('20+ conditions remain one compact list with summary and filter', () => {
  const { root, composer } = setup();
  for (let i=0;i<22;i+=1) composer.store.upsertCondition({ attributeId:`custom${i}`, operator:'eq', value:i, role:'required', supportState:'supported' });
  composer.render();
  assert.equal(root.querySelectorAll('[data-condition-card]').length, 22);
  assert.ok(root.querySelector('[data-condition-count]'));
  assert.ok(root.querySelector('[data-condition-filter]'));
});

test('Product Promise and accessibility contracts remain truthful', () => {
  const { root } = setup();
  assert.doesNotMatch(root.textContent, /バックグラウンドで監視|プッシュ通知|通知します/);
  assert.ok(root.querySelector('[data-live-status][aria-live="polite"]'));
  assert.ok(root.querySelector('[data-add-condition][aria-label]'));
});
