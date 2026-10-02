import test from 'node:test';
import assert from 'node:assert/strict';
import { interpretInput } from '../src/domain/interpretInput.js';
import { mergeInterpretation } from '../src/domain/mergeInterpretation.js';

function manualCondition(attributeId, value, extras = {}) {
  return {
    id: `manual-${attributeId}`,
    attributeId,
    operator: 'eq',
    value,
    role: 'required',
    supportState: 'confirmed',
    source: 'manual',
    manuallyEdited: true,
    ...extras,
  };
}

test('OR color wording becomes one one_of condition instead of two required filters', () => {
  const result = interpretInput('ニューバランス996、白か黒、24.5cm');
  const color = result.conditionProposals.find((item) => item.attributeId === 'color');
  assert.ok(color);
  assert.equal(color.operator, 'one_of');
  assert.deepEqual(color.value.sort(), ['black', 'white']);
  assert.notEqual(color.role, 'required');
});

test('approximate price is reviewable preference rather than a hard maximum', () => {
  const result = interpretInput('ランニングシューズ、1万円くらい');
  const price = result.conditionProposals.find((item) => item.attributeId === 'price');
  assert.ok(price);
  assert.equal(price.value, 10000);
  assert.equal(price.role, 'preferred');
  assert.equal(price.supportState, 'needs_review');
  assert.notEqual(price.operator, 'lte');
});

test('vague qualitative language is preserved visibly when no safe attribute threshold exists', () => {
  const result = interpretInput('クリスマスツリー、安っぽくない、180cm');
  assert.ok(result.unresolvedFragments.some((item) => item.text === '安っぽくない'));
  assert.equal(result.unresolvedFragments.find((item) => item.text === '安っぽくない').state, 'unresolved');
});

test('unsupported but understood wording is not silently dropped', () => {
  const result = interpretInput('電動自転車、バッテリー大きめ、後ろ子乗せ');
  assert.ok(result.unresolvedFragments.some((item) => item.text.includes('バッテリー大きめ')));
});

test('merge keeps unrelated manual edits and adds new parser proposals', () => {
  const draft = {
    domain: 'fashion',
    conditions: [manualCondition('color', ['white'], { operator: 'one_of' })],
    unresolvedFragments: [],
  };
  const interpretation = interpretInput('ランニングシューズ、26cm、1万円以下');
  const merged = mergeInterpretation(draft, interpretation);
  assert.deepEqual(merged.conditions.find((item) => item.attributeId === 'color').value, ['white']);
  assert.ok(merged.conditions.some((item) => item.attributeId === 'size'));
  assert.ok(merged.conditions.some((item) => item.attributeId === 'price'));
});

test('merge keeps search and change conditions on the same attribute in separate lanes', () => {
  const draft = {
    domain: 'fashion',
    conditions: [{ id: 'hard-price', attributeId: 'price', operator: 'lte', value: 10000, role: 'required', supportState: 'confirmed', source: 'text', manuallyEdited: false }],
    unresolvedFragments: [],
  };
  const interpretation = {
    conditionProposals: [{ id: 'price-change', attributeId: 'price', operator: 'relative_change', value: undefined, role: 'change', supportState: 'confirmed', source: 'text', manuallyEdited: false }],
    unresolvedFragments: [],
  };
  const merged = mergeInterpretation(draft, interpretation);
  const prices = merged.conditions.filter((item) => item.attributeId === 'price');
  assert.equal(prices.length, 2);
  assert.ok(prices.some((item) => item.role === 'required'));
  assert.ok(prices.some((item) => item.role === 'change'));
});

test('low-confidence parser proposal cannot overwrite a manually edited condition', () => {
  const draft = {
    domain: 'fashion',
    conditions: [manualCondition('price', 8000, { operator: 'lte' })],
    unresolvedFragments: [],
  };
  const interpretation = interpretInput('ランニングシューズ、1万円くらい');
  const merged = mergeInterpretation(draft, interpretation);
  const price = merged.conditions.find((item) => item.attributeId === 'price');
  assert.equal(price.value, 8000);
  assert.equal(price.operator, 'lte');
  assert.equal(price.manuallyEdited, true);
});

test('high-confidence same-attribute parser update replaces prior non-manual interpretation without duplication', () => {
  const draft = {
    domain: 'fashion',
    conditions: [{ id: 'parsed-size', attributeId: 'size', operator: 'eq', value: '24.5cm', role: 'required', supportState: 'confirmed', source: 'text', manuallyEdited: false }],
    unresolvedFragments: [],
  };
  const interpretation = interpretInput('ランニングシューズ、26cm');
  const merged = mergeInterpretation(draft, interpretation);
  const sizes = merged.conditions.filter((item) => item.attributeId === 'size');
  assert.equal(sizes.length, 1);
  assert.equal(sizes[0].value, '26cm');
  assert.equal(sizes[0].id, 'parsed-size');
});

test('parser exceptions degrade to visible unresolved text rather than erasing the draft', () => {
  const result = interpretInput('%%% ???');
  assert.ok(Array.isArray(result.conditionProposals));
  assert.ok(Array.isArray(result.unresolvedFragments));
  assert.ok(result.unresolvedFragments.length >= 1);
});
