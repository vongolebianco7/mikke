import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mountCanonicalComposer } from '../src/canonicalComposerUi.js';
import { createComposerDraftStore } from '../src/domain/composerDraftStore.js';

function setup(seedWatch) {
  const dom = new JSDOM(`<!doctype html><main><form class="composer"><textarea id="query"></textarea><button class="primary" type="submit">保存</button></form></main>`, { url: 'https://example.test/' });
  const { document, Event } = dom.window;
  const form = document.querySelector('form');
  form._mikkeDraft = structuredClone(seedWatch);
  mountCanonicalComposer(form, { Event });
  return { document, Event, form };
}

const flightWatch = {
  type: 'flight', domain: 'flight', target: { title: '東京からホノルル' }, rawQuery: '東京からホノルル',
  domainConditions: [], compatibilityConditions: [], triggers: [], metadata: {},
};

const hotelWatch = {
  type: 'hotel', domain: 'hotel', target: { title: '軽井沢のホテル' }, rawQuery: '軽井沢のホテル',
  domainConditions: [], compatibilityConditions: [], triggers: [], metadata: {},
};

function openAdd(ctx, label) {
  ctx.form.querySelector('[data-add-condition]').click();
  const option = [...ctx.form.querySelectorAll('[data-condition-option]')].find((node) => node.textContent.includes(label));
  assert.ok(option, `missing option: ${label}`);
  option.click();
}

test('adding an enum condition never silently chooses the first allowed value', () => {
  const ctx = setup(flightWatch);
  openAdd(ctx, '片道・往復');
  const select = ctx.form.querySelector('[data-condition-value]');
  assert.equal(select?.tagName, 'SELECT');
  assert.equal(select.value, '');
  assert.match(select.textContent, /選択してください/);
  assert.equal(ctx.form.querySelector('button[type="submit"]').disabled, true);

  select.value = 'round_trip';
  select.dispatchEvent(new ctx.Event('change', { bubbles: true }));
  assert.equal(ctx.form.querySelector('button[type="submit"]').disabled, false);
});

test('boolean conditions use an explicit yes/no selector rather than free text', () => {
  const ctx = setup(hotelWatch);
  openAdd(ctx, 'キャンセル無料');
  const select = ctx.form.querySelector('[data-condition-value]');
  assert.equal(select?.tagName, 'SELECT');
  assert.match(select.textContent, /はい/);
  assert.match(select.textContent, /いいえ/);
  assert.equal(ctx.form.querySelector('[data-condition-sheet] input[data-condition-value]'), null);
});

test('range operator renders separate min and max value controls and stores both ends', () => {
  const seed = {
    type: 'shopping', domain: 'fashion', target: { title: 'ジャケット' }, rawQuery: 'ジャケット',
    domainConditions: [{ id: 'price-1', fieldId: 'price', operator: 'between', value: [10000, 20000], unit: 'JPY', role: 'required' }],
    compatibilityConditions: [], triggers: [], metadata: {},
  };
  const ctx = setup(seed);
  ctx.form.querySelector('[data-condition-card]').click();
  const operator = ctx.form.querySelector('[data-condition-operator]');
  operator.value = 'range';
  operator.dispatchEvent(new ctx.Event('change', { bubbles: true }));

  const min = ctx.form.querySelector('[data-condition-range-min]');
  const max = ctx.form.querySelector('[data-condition-range-max]');
  assert.ok(min && max);
  min.value = '12000';
  min.dispatchEvent(new ctx.Event('change', { bubbles: true }));
  max.value = '18000';
  max.dispatchEvent(new ctx.Event('change', { bubbles: true }));

  const condition = ctx.form._canonicalController.getDraft().conditions.find((item) => item.attributeId === 'price');
  assert.deepEqual(condition.value, [12000, 18000]);
});

test('draft validation blocks empty manual conditions instead of saving meaningless constraints', () => {
  const store = createComposerDraftStore({ target: { title: '冷蔵庫' }, domain: 'appliance', conditions: [] });
  store.upsertCondition({ id: 'manual-price', attributeId: 'price', operator: 'lte', value: '', unit: 'JPY', role: 'required', source: 'manual' });
  const validation = store.validate();
  assert.equal(validation.saveable, false);
  assert.ok(validation.conflicts.some((item) => item.type === 'incomplete_condition' && item.attributeId === 'price'));
});
