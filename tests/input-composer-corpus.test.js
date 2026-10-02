import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { interpretInput } from '../src/domain/interpretInput.js';

const corpus = JSON.parse(readFileSync(new URL('./fixtures/input-composer-corpus.json', import.meta.url), 'utf8'));

test('corpus contains at least 800 unique scenarios with required difficulty distribution', () => {
  assert.ok(corpus.length >= 800, `expected >=800, got ${corpus.length}`);
  assert.equal(new Set(corpus.map((row) => row.input)).size, corpus.length, 'inputs must be unique');
  const counts = corpus.reduce((acc, row) => ((acc[row.difficulty] = (acc[row.difficulty] || 0) + 1), acc), {});
  assert.ok((counts.simple || 0) >= 160);
  assert.ok((counts.normal || 0) >= 240);
  assert.ok((counts.advanced || 0) >= 240);
  assert.ok((counts.complex || 0) >= 120);
  assert.ok((counts.adversarial || 0) >= 40);
});

test('every corpus input preserves user intent as structured or unresolved output', () => {
  for (const row of corpus) {
    const result = interpretInput(row.input);
    const represented = [
      result.targetProposal?.sourceText,
      ...result.conditionProposals.map((item) => item.sourceText),
      ...result.unresolvedFragments.map((item) => item.text),
    ].filter(Boolean).join(' ');
    for (const token of row.mustPreserve || []) assert.ok(represented.includes(token), `${row.id}: missing ${token}`);
  }
});

test('approximate price is reviewable preference, not a hard maximum', () => {
  const result = interpretInput('996のグレー、24.5cm、1万円くらい');
  const price = result.conditionProposals.find((item) => item.attributeId === 'price');
  assert.ok(price);
  assert.equal(price.role, 'preferred');
  assert.equal(price.state, 'needs_review');
  assert.notEqual(price.operator, 'lte');
});

test('white or black is represented as one OR condition', () => {
  const result = interpretInput('シャツ、白か黒、Lサイズ');
  const color = result.conditionProposals.find((item) => item.attributeId === 'color');
  assert.equal(color.operator, 'one_of');
  assert.deepEqual(color.value, ['white','black']);
});

test('exception wording is preserved for review instead of becoming contradictory hard filters', () => {
  const result = interpretInput('中古不可だが未使用開封品ならOK');
  assert.ok(result.conditionProposals.some((item) => item.attributeId === 'condition' && item.state === 'needs_review'));
  assert.ok(result.unresolvedFragments.some((item) => item.text.includes('未使用開封品')));
});

test('vague qualitative language stays unresolved', () => {
  const result = interpretInput('クリスマスツリー、180cm、安っぽくないもの');
  assert.ok(result.unresolvedFragments.some((item) => item.text.includes('安っぽくない')));
});

test('URL and model-number-only inputs are preserved', () => {
  for (const input of ['https://example.com/item/abc123','WH-1000XM6']) {
    const result = interpretInput(input);
    assert.equal(result.targetProposal.sourceText, input);
  }
});

test('relative price-change language becomes a change condition', () => {
  const result = interpretInput('ヴェゼル、今より10%安くなったら確認したい');
  assert.ok(result.conditionProposals.some((item) => item.role === 'change' && item.operator === 'relative_change'));
});

test('unsupported provider attributes remain visible', () => {
  const result = interpretInput('ランニングシューズ、実店舗で試着可能なもの');
  assert.ok(result.conditionProposals.some((item) => item.state === 'unsupported') || result.unresolvedFragments.length > 0);
});
