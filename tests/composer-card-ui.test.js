import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mountInputComposer } from '../src/inputComposerUi.js';

function setup(seedWatch = null) {
  const dom = new JSDOM(`<!doctype html><main id="app"><form id="watch-form" class="composer"><textarea id="query"></textarea><button class="primary" type="submit">保存</button></form></main>`, { url: 'https://example.test/' });
  const { document, Event, KeyboardEvent } = dom.window;
  const form = document.querySelector('#watch-form');
  if (seedWatch) form._mikkeDraft = structuredClone(seedWatch);
  mountInputComposer(form, { Event });
  return { dom, document, form, Event, KeyboardEvent };
}

function type(ctx, text) {
  const input = ctx.form.querySelector('[data-composer-text]');
  input.value = text;
  input.dispatchEvent(new ctx.Event('input', { bubbles: true }));
  return input;
}

test('initial composer is one obvious text entry plus condition-add action, not a category form', () => {
  const ctx = setup();
  assert.equal(ctx.form.querySelectorAll('[data-composer-text]').length, 1);
  assert.ok(ctx.form.querySelector('[data-add-condition]'));
  assert.equal(ctx.form.querySelectorAll('[data-canonical-domain]').length, 0);
  assert.equal(ctx.form.querySelectorAll('[data-canonical-field]').length, 0);
  assert.equal(ctx.form.querySelectorAll('[data-canonical-notification]').length, 0);
  assert.match(ctx.form.textContent, /何を探していますか？/);
  assert.match(ctx.form.textContent, /条件から追加/);
});

test('typing renders editable condition cards from the same canonical draft', () => {
  const ctx = setup();
  type(ctx, 'New Balance 996、24.5cm、白か黒、10000円以下');
  const cards = [...ctx.form.querySelectorAll('[data-condition-card]')];
  assert.ok(cards.length >= 3);
  assert.ok(cards.some((card) => /サイズ/.test(card.textContent)));
  assert.ok(cards.some((card) => /色/.test(card.textContent)));
  assert.ok(cards.some((card) => /価格/.test(card.textContent)));
  assert.ok(ctx.form._mikkeDraft);
  assert.equal(ctx.form.dataset.submitStructured, 'true');
});

test('ambiguous wording stays visibly unresolved instead of disappearing', () => {
  const ctx = setup();
  type(ctx, 'クリスマスツリー、180cm、安っぽくない');
  const unresolved = ctx.form.querySelector('[data-unresolved-list]');
  assert.ok(unresolved);
  assert.match(unresolved.textContent, /安っぽくない/);
  assert.match(unresolved.textContent, /まだ条件にできていません/);
});

test('condition card opens an accessible bottom-sheet editor with role operator value and remove controls', () => {
  const ctx = setup();
  type(ctx, 'ランニングシューズ、26cm、10000円以下');
  const card = ctx.form.querySelector('[data-condition-card]');
  card.click();
  const sheet = ctx.form.querySelector('[data-condition-sheet]');
  assert.ok(sheet);
  assert.equal(sheet.getAttribute('role'), 'dialog');
  assert.equal(sheet.getAttribute('aria-modal'), 'true');
  assert.ok(sheet.querySelector('[data-condition-role]'));
  assert.ok(sheet.querySelector('[data-condition-operator]'));
  assert.ok(sheet.querySelector('[data-condition-value]'));
  assert.ok(sheet.querySelector('[data-remove-condition]'));
  assert.ok(sheet.querySelector('[data-close-sheet]'));
});

test('add-condition opens searchable catalog with recommendations rather than a permanent giant form', () => {
  const ctx = setup();
  type(ctx, '冷蔵庫 500L以上');
  ctx.form.querySelector('[data-add-condition]').click();
  const sheet = ctx.form.querySelector('[data-add-condition-sheet]');
  assert.ok(sheet);
  assert.ok(sheet.querySelector('[data-condition-search]'));
  assert.match(sheet.textContent, /おすすめ/);
  assert.match(sheet.textContent, /容量|幅|価格/);
  assert.ok(sheet.querySelectorAll('[data-condition-option]').length > 0);
});

test('20+ conditions remain a compact card list with summary instead of 20 permanent inputs', () => {
  const seedWatch = {
    type: 'shopping', domain: 'fashion', target: { title: '複雑な商品' }, rawQuery: '複雑な商品',
    domainConditions: Array.from({ length: 22 }, (_, index) => ({ id: `c${index}`, fieldId: `attr${index}`, operator: 'eq', value: `v${index}`, role: 'required' })),
    triggers: [], compatibilityConditions: [], metadata: {},
  };
  const ctx = setup(seedWatch);
  assert.equal(ctx.form.querySelectorAll('[data-condition-card]').length, 22);
  assert.match(ctx.form.querySelector('[data-condition-summary]').textContent, /22/);
  assert.equal(ctx.form.querySelectorAll('[data-condition-card] input').length, 0);
});

test('condition role can be changed in-place and publishes the same Watch draft', () => {
  const ctx = setup();
  type(ctx, 'New Balance 996、白');
  const card = [...ctx.form.querySelectorAll('[data-condition-card]')].find((item) => /色/.test(item.textContent));
  assert.ok(card);
  card.click();
  const role = ctx.form.querySelector('[data-condition-role]');
  role.value = 'required';
  role.dispatchEvent(new ctx.Event('change', { bubbles: true }));
  const updated = [...ctx.form.querySelectorAll('[data-condition-card]')].find((item) => /色/.test(item.textContent));
  assert.match(updated.textContent, /必須/);
});

test('mobile composer exposes 44px targets, bottom-sheet layout, reduced motion and no horizontal core scroll', async () => {
  const css = await import('node:fs').then(({ readFileSync }) => readFileSync(new URL('../input-composer.css', import.meta.url), 'utf8'));
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /position:\s*fixed/);
  assert.match(css, /bottom:\s*0/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /overflow-x:\s*hidden/);
});
