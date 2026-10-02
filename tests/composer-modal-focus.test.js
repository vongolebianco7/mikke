import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mountCanonicalComposer } from '../src/canonicalComposerUi.js';

function setup(seedWatch) {
  const dom = new JSDOM(`<!doctype html><main><form class="composer"><textarea id="query"></textarea><button class="primary" type="submit">保存</button></form></main>`, { url: 'https://example.test/' });
  const { document, Event, KeyboardEvent } = dom.window;
  const form = document.querySelector('form');
  form._mikkeDraft = structuredClone(seedWatch);
  mountCanonicalComposer(form, { Event });
  return { document, Event, KeyboardEvent, form };
}

const seed = {
  type: 'shopping', domain: 'fashion', target: { title: 'ジャケット' }, rawQuery: 'ジャケット 1万円以下',
  domainConditions: [{ id: 'price-1', fieldId: 'price', operator: 'lte', value: 10000, unit: 'JPY', role: 'required' }],
  compatibilityConditions: [], triggers: [], metadata: {},
};

test('opening a condition sheet moves focus into the dialog and closing restores the condition card', async () => {
  const ctx = setup(seed);
  const card = ctx.form.querySelector('[data-condition-card]');
  card.focus();
  card.click();
  await Promise.resolve();
  assert.equal(ctx.document.activeElement?.matches('[data-condition-role]'), true);

  ctx.form.querySelector('[data-close-sheet]').click();
  await Promise.resolve();
  assert.equal(ctx.document.activeElement?.matches('[data-condition-card]'), true);
  assert.equal(ctx.document.activeElement?.dataset.conditionId, 'price-1');
});

test('opening add-condition sheet focuses search and closing restores add button', async () => {
  const ctx = setup(seed);
  const add = ctx.form.querySelector('[data-add-condition]');
  add.focus();
  add.click();
  await Promise.resolve();
  assert.equal(ctx.document.activeElement?.matches('[data-condition-search]'), true);

  ctx.form.querySelector('[data-close-sheet]').click();
  await Promise.resolve();
  assert.equal(ctx.document.activeElement?.matches('[data-add-condition]'), true);
});

test('Tab and Shift+Tab stay inside an open composer sheet', async () => {
  const ctx = setup(seed);
  ctx.form.querySelector('[data-add-condition]').click();
  await Promise.resolve();
  const sheet = ctx.form.querySelector('[data-add-condition-sheet]');
  const focusable = [...sheet.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')];
  assert.ok(focusable.length > 2);
  const first = focusable[0];
  const last = focusable.at(-1);

  last.focus();
  last.dispatchEvent(new ctx.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
  assert.equal(ctx.document.activeElement, first);

  first.focus();
  first.dispatchEvent(new ctx.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
  assert.equal(ctx.document.activeElement, last);
});

test('Escape closes the sheet and returns focus to its origin control', async () => {
  const ctx = setup(seed);
  const add = ctx.form.querySelector('[data-add-condition]');
  add.click();
  await Promise.resolve();
  ctx.form.querySelector('[data-add-condition-sheet]').dispatchEvent(new ctx.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  await Promise.resolve();
  assert.equal(ctx.form.querySelector('[data-add-condition-sheet]'), null);
  assert.equal(ctx.document.activeElement, add);
});
