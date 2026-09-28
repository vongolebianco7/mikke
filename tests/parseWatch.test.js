import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWatchQuery } from '../src/domain/parseWatch.js';

function trigger(raw, type) {
  return parseWatchQuery(raw).conditions.priceTriggers.find((item) => item.type === type);
}

test('parses previous-price relative trigger', () => {
  assert.deepEqual(trigger('New Balance 996、今より安くなったら', 'below_previous'), {
    type: 'below_previous', reference: 'previous', role: 'notification',
  });
});

test('parses initial-price relative trigger', () => {
  assert.deepEqual(trigger('New Balance 996、登録時より安くなったら', 'below_initial'), {
    type: 'below_initial', reference: 'initial', role: 'notification',
  });
});

test('parses percentage drop and observed Watch low triggers', () => {
  const parsed = parseWatchQuery('New Balance 996、10%以上値下がり、登録後最安値になったら');
  assert.deepEqual(parsed.conditions.priceTriggers, [
    { type: 'drop_percent', percent: 10, reference: 'previous', role: 'notification' },
    { type: 'new_watch_low', reference: 'observed_watch', role: 'notification' },
  ]);
});

test('parses explicit required and preferred condition language', () => {
  const parsed = parseWatchQuery('New Balance 996、24.5cmは必須、グレーはできれば');
  assert.equal(parsed.conditions.size, '24.5cm');
  assert.deepEqual(parsed.conditions.colors, ['グレー']);
  assert.ok(parsed.requiredKeys.includes('size'));
  assert.ok(parsed.preferredKeys.includes('colors'));
  assert.ok(!parsed.requiredKeys.includes('colors'));
});
