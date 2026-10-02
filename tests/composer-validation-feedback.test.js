import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mountCanonicalComposer } from '../src/canonicalComposerUi.js';

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

function addTripType(ctx) {
  ctx.form.querySelector('[data-add-condition]').click();
  const option = [...ctx.form.querySelectorAll('[data-condition-option]')].find((node) => node.textContent.includes('片道・往復'));
  assert.ok(option);
  option.click();
}

test('an incomplete manual condition explains why save is disabled', () => {
  const ctx = setup(flightWatch);
  addTripType(ctx);
  const feedback = ctx.form.querySelector('[data-composer-validation]');
  assert.ok(feedback);
  assert.equal(feedback.getAttribute('aria-live'), 'polite');
  assert.match(feedback.textContent, /未設定の条件/);
  assert.match(feedback.textContent, /入力|選択|削除/);
  assert.equal(ctx.form.querySelector('button[type="submit"]').disabled, true);
});

test('completing the value clears validation feedback immediately', () => {
  const ctx = setup(flightWatch);
  addTripType(ctx);
  const select = ctx.form.querySelector('[data-condition-value]');
  select.value = 'round_trip';
  select.dispatchEvent(new ctx.Event('change', { bubbles: true }));
  assert.equal(ctx.form.querySelector('[data-composer-validation]').textContent.trim(), '');
  assert.equal(ctx.form.querySelector('button[type="submit"]').disabled, false);
});

test('removing an incomplete condition clears the warning and restores save', () => {
  const ctx = setup(flightWatch);
  addTripType(ctx);
  ctx.form.querySelector('[data-remove-condition]').click();
  assert.equal(ctx.form.querySelector('[data-composer-validation]').textContent.trim(), '');
  assert.equal(ctx.form.querySelector('button[type="submit"]').disabled, false);
});

test('contradictory bounds have a distinct actionable message', () => {
  const seed = {
    type: 'shopping', domain: 'fashion', target: { title: 'ジャケット' }, rawQuery: 'ジャケット',
    domainConditions: [
      { id: 'price-min', fieldId: 'price', operator: 'gte', value: 20000, unit: 'JPY', role: 'required' },
      { id: 'price-max', fieldId: 'price', operator: 'lte', value: 10000, unit: 'JPY', role: 'required' },
    ],
    compatibilityConditions: [], triggers: [], metadata: {},
  };
  const ctx = setup(seed);
  const feedback = ctx.form.querySelector('[data-composer-validation]');
  assert.match(feedback.textContent, /矛盾/);
  assert.match(feedback.textContent, /下限|上限/);
  assert.equal(ctx.form.querySelector('button[type="submit"]').disabled, true);
});
