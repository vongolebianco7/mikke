import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWatchQuery } from '../src/domain/parseWatch.js';
import { getDomainField } from '../src/domain/domainSchemas.js';

function byField(watch, fieldId) {
  return watch.domainConditions.find((condition) => condition.fieldId === fieldId);
}

function assertSchemaBacked(watch) {
  assert.equal(watch.schemaVersion, 3);
  assert.ok(watch.domain);
  assert.ok(Array.isArray(watch.domainConditions));
  for (const condition of watch.domainConditions) {
    assert.ok(getDomainField(watch.domain, condition.fieldId), `${watch.domain}.${condition.fieldId} must exist in its Domain Schema`);
  }
}

test('flight journey preserves route, round trip, nonstop, airline, time and infant constraints', () => {
  const watch = parseWatchQuery('東京からホノルル、往復、直行便、ANAかJAL、午前発、乳児1人、12万円以下になったら');
  assertSchemaBacked(watch);
  assert.equal(watch.domain, 'flight');
  assert.equal(byField(watch, 'origin')?.value, '東京');
  assert.equal(byField(watch, 'destination')?.value, 'ホノルル');
  assert.equal(byField(watch, 'tripType')?.value, 'round_trip');
  assert.equal(byField(watch, 'nonstopOnly')?.value, true);
  assert.deepEqual(byField(watch, 'allowedAirlines')?.value, ['ANA', 'JAL']);
  assert.deepEqual(byField(watch, 'departureTimeRange')?.value, ['00:00', '11:59']);
  assert.equal(byField(watch, 'infants')?.value, 1);
  assert.ok(watch.triggers.some((trigger) => trigger.metric === 'price' && trigger.operator === 'lte' && trigger.value === 120000));
});

test('hotel journey preserves stay, party, access, breakfast and cancellation constraints', () => {
  const watch = parseWatchQuery('軽井沢のホテル、2026-10-26、2026-10-28、大人2人、駅徒歩10分以内、朝食付き、キャンセル無料');
  assertSchemaBacked(watch);
  assert.equal(watch.domain, 'hotel');
  assert.equal(byField(watch, 'destination')?.value, '軽井沢');
  assert.equal(byField(watch, 'checkIn')?.value, '2026-10-26');
  assert.equal(byField(watch, 'checkOut')?.value, '2026-10-28');
  assert.equal(byField(watch, 'adults')?.value, 2);
  assert.equal(byField(watch, 'maxWalkingMinutes')?.value, 10);
  assert.equal(byField(watch, 'breakfastIncluded')?.value, true);
  assert.equal(byField(watch, 'freeCancellation')?.value, true);
});

test('fashion journey keeps size, color, condition and price as fashion Domain conditions', () => {
  const watch = parseWatchQuery('New Balance 996、24.5cm、グレー、新品、12000円以下');
  assertSchemaBacked(watch);
  assert.equal(watch.domain, 'fashion');
  assert.equal(byField(watch, 'size')?.value, '24.5cm');
  assert.deepEqual(byField(watch, 'color')?.value, ['gray']);
  assert.equal(byField(watch, 'condition')?.value, 'new');
  assert.equal(byField(watch, 'price')?.value, 12000);
});

test('appliance journey keeps refrigerator capacity, width, color and price', () => {
  const watch = parseWatchQuery('500L以上の冷蔵庫、幅70cm以下、白、15万円以下');
  assertSchemaBacked(watch);
  assert.equal(watch.domain, 'appliance');
  assert.equal(byField(watch, 'totalCapacity')?.value, 500);
  assert.equal(byField(watch, 'width')?.value, 700);
  assert.deepEqual(byField(watch, 'color')?.value, ['white']);
  assert.equal(byField(watch, 'price')?.value, 150000);
});

test('furniture journey keeps dimensions, color and price in furniture schema', () => {
  const watch = parseWatchQuery('ソファ、幅180cm以下、グレー、8万円以下');
  assertSchemaBacked(watch);
  assert.equal(watch.domain, 'furniture');
  assert.equal(byField(watch, 'width')?.value, 1800);
  assert.deepEqual(byField(watch, 'color')?.value, ['gray']);
  assert.equal(byField(watch, 'price')?.value, 80000);
});

test('food journey keeps weight and price while free shipping remains a common trigger', () => {
  const watch = parseWatchQuery('コーヒー豆、1kg以上、3000円以下、送料無料');
  assertSchemaBacked(watch);
  assert.equal(watch.domain, 'food');
  assert.equal(byField(watch, 'weight')?.value, 1000);
  assert.equal(byField(watch, 'price')?.value, 3000);
  assert.ok(watch.triggers.some((trigger) => trigger.metric === 'shipping_fee' && trigger.operator === 'eq' && trigger.value === 0));
});

test('used car journey keeps year, mileage, repair history and total price', () => {
  const watch = parseWatchQuery('VEZEL 中古車、2027年式以降、3万km以下、修復歴なし、300万円以下');
  assertSchemaBacked(watch);
  assert.equal(watch.domain, 'used_car');
  assert.equal(byField(watch, 'modelYear')?.value, 2027);
  assert.equal(byField(watch, 'mileage')?.value, 30000);
  assert.equal(byField(watch, 'repairHistory')?.value, false);
  assert.equal(byField(watch, 'totalPrice')?.value, 3000000);
});
