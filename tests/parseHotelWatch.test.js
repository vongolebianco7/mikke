import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHotelWatch } from '../src/domain/parseHotelWatch.js';

const byField=(r,id)=>r.domainConditions.find((c)=>c.fieldId===id);

test('parses stay target occupancy and explicit dates',()=>{
  const r=parseHotelWatch('軽井沢のホテル、2026-10-26から2026-10-27、大人2人、乳児1人、1室');
  assert.equal(r.domain,'hotel');
  assert.equal(byField(r,'destination').value,'軽井沢');
  assert.equal(byField(r,'checkIn').value,'2026-10-26');
  assert.equal(byField(r,'checkOut').value,'2026-10-27');
  assert.equal(byField(r,'adults').value,2);
  assert.equal(byField(r,'infants').value,1);
  assert.equal(byField(r,'rooms').value,1);
});

test('parses location room meal facilities policy and rating',()=>{
  const r=parseHotelWatch('軽井沢ホテル、駅徒歩5分以内、禁煙、25㎡以上、朝食付き、温泉、大浴場、駐車場あり、キャンセル無料、評価4.2以上');
  assert.equal(byField(r,'maxWalkingMinutes').value,5);
  assert.equal(byField(r,'nonsmoking').value,true);
  assert.equal(byField(r,'minRoomArea').value,25);
  assert.equal(byField(r,'breakfastIncluded').value,true);
  assert.equal(byField(r,'onsen').value,true);
  assert.equal(byField(r,'publicBath').value,true);
  assert.equal(byField(r,'parking').value,true);
  assert.equal(byField(r,'freeCancellation').value,true);
  assert.equal(byField(r,'rating').value,4.2);
});

test('distinguishes total and nightly price trigger wording',()=>{
  const total=parseHotelWatch('軽井沢ホテル、合計4万円以下になったら');
  assert.ok(total.triggers.some((t)=>t.metric==='price'&&t.value===40000&&t.scope==='stay_total'));
  const nightly=parseHotelWatch('軽井沢ホテル、1泊2万円以下になったら');
  assert.ok(nightly.triggers.some((t)=>t.metric==='price'&&t.value===20000&&t.scope==='nightly'));
});

test('ambiguous dates are not fabricated',()=>{
  const r=parseHotelWatch('軽井沢ホテル、来月の週末');
  assert.equal(byField(r,'checkIn'),undefined);
  assert.match(r.metadata.unparsedClauses.join(' '),/来月/);
});
