import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGenericConditionClauses } from '../src/domain/parseGenericCondition.js';
import { parseWatchQuery } from '../src/domain/parseWatch.js';

const byField=(r,id)=>r.domainConditions.find((c)=>c.fieldId===id);

test('fashion product parser exposes canonical v3 domain conditions',()=>{
  const r=parseGenericConditionClauses('New Balance 996、24.5cm、グレー、新品、1万円以下になったら');
  assert.equal(r.domain,'fashion');
  assert.equal(byField(r,'size').value,'24.5cm');
  assert.deepEqual(byField(r,'color').value,['gray']);
  assert.equal(byField(r,'condition').value,'new');
});

test('appliance furniture food and used car use camelCase v3 field IDs',()=>{
  const appliance=parseGenericConditionClauses('冷蔵庫、500L以上、設置幅70cm以下、15万円以下');
  assert.equal(appliance.domain,'appliance');
  assert.equal(byField(appliance,'totalCapacity').value,500);
  assert.equal(byField(appliance,'installationWidth').value,700);
  const furniture=parseGenericConditionClauses('ソファ、幅180cm以下、グレー、送料込み8万円以下');
  assert.equal(furniture.domain,'furniture');
  assert.equal(byField(furniture,'width').value,1800);
  const food=parseGenericConditionClauses('コーヒー豆、1kg以上、3000円以下');
  assert.equal(food.domain,'food');
  assert.equal(byField(food,'weight').value,1000);
  const car=parseGenericConditionClauses('ヴェゼル、2027年式以降、3万km以下、修復歴なし、300万円以下');
  assert.equal(car.domain,'used_car');
  assert.equal(byField(car,'modelYear').value,2027);
  assert.equal(byField(car,'repairHistory').operator,'is_false');
  assert.equal(byField(car,'totalPrice').value,3000000);
});

test('parseWatchQuery creates schemaVersion 3 shopping Watches while retaining v2 compatibility fields',()=>{
  const r=parseWatchQuery('冷蔵庫、500L以上、設置幅70cm以下、15万円以下');
  assert.equal(r.schemaVersion,3);
  assert.equal(r.domain,'appliance');
  assert.ok(r.domainConditions.some((c)=>c.fieldId==='totalCapacity'));
  assert.ok(Array.isArray(r.genericConditions));
  assert.equal(r.type,'shopping');
});
