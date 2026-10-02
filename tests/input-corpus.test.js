import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { interpretInput } from '../src/domain/interpretInput.js';

const corpus = JSON.parse(readFileSync(new URL('./fixtures/input-composer-corpus.json', import.meta.url), 'utf8'));

test('input composer corpus contains at least 800 diverse scenarios', () => {
  assert.ok(corpus.length >= 800, `expected >=800 scenarios, got ${corpus.length}`);
  assert.ok(new Set(corpus.map((item) => item.family)).size >= 18, 'expected at least 18 domain families');
  assert.equal(new Set(corpus.map((item) => item.input)).size, corpus.length, 'corpus inputs must be unique');

  const counts = Object.fromEntries(['simple','normal','advanced','complex','adversarial'].map((level) => [level, corpus.filter((item) => item.difficulty === level).length]));
  assert.ok(counts.simple >= 160);
  assert.ok(counts.normal >= 240);
  assert.ok(counts.advanced >= 240);
  assert.ok(counts.complex >= 120);
  assert.ok(counts.adversarial >= 40);
});

test('every scenario preserves declared semantic intent or explicitly unresolved text', () => {
  for (const scenario of corpus) {
    const result = interpretInput(scenario.input);
    const attributes = new Set(result.conditionProposals.map((item) => item.attributeId));
    const unresolved = result.unresolvedFragments.map((item) => item.text).join(' / ');

    for (const attributeId of scenario.expectAttributes || []) {
      assert.ok(attributes.has(attributeId), `${scenario.id}: expected attribute ${attributeId} from: ${scenario.input}`);
    }
    for (const token of scenario.expectUnresolved || []) {
      assert.ok(unresolved.includes(token), `${scenario.id}: expected unresolved token ${token} from: ${scenario.input}; got: ${unresolved}`);
    }
    assert.ok(result.targetProposal || result.conditionProposals.length || result.unresolvedFragments.length, `${scenario.id}: intent disappeared entirely`);
  }
});

test('corpus exercises each core condition primitive and ambiguity class', () => {
  const tags = new Set(corpus.flatMap((item) => item.tags || []));
  for (const requiredTag of [
    'exact','minimum','maximum','range','or','exclusion','required','preferred','allowed','dependency',
    'compatibility','comparison','change','stock','relative','vague','contradiction','unknown','typo','model-only','partial-edit','exception',
  ]) assert.ok(tags.has(requiredTag), `missing coverage tag: ${requiredTag}`);
});
