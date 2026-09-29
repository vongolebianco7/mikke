import test from 'node:test';
import assert from 'node:assert/strict';
import { buildComposerModel, attributePresetPhrases, createComposerModel, applyComposerCondition } from '../src/domain/composerModel.js';

test('refrigerator composer prioritizes category-specific conditions and common triggers',()=>{
  const model=buildComposerModel('冷蔵庫');
  assert.equal(model.categoryId,'appliances');assert.equal(model.subcategoryId,'refrigerator');assert.ok(model.common.some((x)=>x.id==='price'));assert.ok(model.category.some((x)=>x.id==='capacity'));assert.ok(model.category.some((x)=>x.id==='installation_width'));assert.ok(model.triggers.some((x)=>x.id==='availability'));assert.ok(model.triggers.some((x)=>x.id==='shipping'));
});

test('fashion composer prioritizes size color condition price and coupon',()=>{
  const model=buildComposerModel('New Balance スニーカー');for(const id of ['size','color','condition'])assert.ok([...model.common,...model.category].some((x)=>x.id===id));assert.ok(model.triggers.some((x)=>x.id==='coupon'));
});

test('domain composer exposes deep flight conditions by progressive disclosure',()=>{
  const model=createComposerModel({type:'flight',raw:'東京からホノルル'});
  assert.equal(model.domain,'flight');
  assert.ok(model.basic.some((x)=>x.id==='origin'));
  assert.ok(model.basic.some((x)=>x.id==='destination'));
  assert.ok(model.common.some((x)=>x.id==='maxStops'));
  assert.ok(model.common.some((x)=>x.id==='allowedAirlines'));
  assert.ok(model.detailed.some((x)=>x.id==='checkedBaggageIncluded'));
  assert.ok(model.advanced.some((x)=>x.id==='maxMiles'));
});

test('hotel composer exposes stay room and policy conditions without dumping advanced fields',()=>{
  const model=createComposerModel({type:'hotel',raw:'軽井沢ホテル'});
  assert.equal(model.domain,'hotel');
  assert.ok(model.basic.some((x)=>x.id==='checkIn'));
  assert.ok(model.common.some((x)=>x.id==='maxWalkingMinutes'));
  assert.ok(model.common.some((x)=>x.id==='freeCancellation'));
  assert.ok(model.basic.length<12);
});

test('structured composer edits preserve existing conditions across mode changes',()=>{
  const watch={schemaVersion:3,domain:'flight',domainConditions:[{fieldId:'origin',operator:'eq',value:'東京',role:'required',evidencePolicy:'known_required'}],triggers:[],metadata:{inputMode:'text'}};
  const updated=applyComposerCondition(watch,{fieldId:'allowedAirlines',operator:'in',value:['ANA','JAL'],role:'preferred'});
  assert.equal(updated.domainConditions.length,2);
  assert.equal(updated.domainConditions[0].fieldId,'origin');
  assert.equal(updated.domainConditions[1].role,'preferred');
  assert.equal(watch.domainConditions.length,1);
});

test('five phase-1 categories expose progressive groups without dumping the full registry',()=>{
  for(const subject of ['スニーカー','冷蔵庫','ソファ','コーヒー豆','ヴェゼル 中古車']){const model=buildComposerModel(subject);assert.ok(model.common.length>0);assert.ok(model.category.length>0);assert.ok(model.advanced.length>0);assert.ok(model.common.length<10);assert.ok(model.category.length<12);}
});

test('preset phrases produce parser-compatible examples for common attributes',()=>{
  assert.ok(attributePresetPhrases('capacity').includes('500L以上'));assert.ok(attributePresetPhrases('width').includes('幅70cm以下'));assert.ok(attributePresetPhrases('mileage').includes('3万km以下'));assert.ok(attributePresetPhrases('repair_history').includes('修復歴なし'));
});
