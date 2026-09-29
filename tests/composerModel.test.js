import test from 'node:test';
import assert from 'node:assert/strict';
import { buildComposerModel, attributePresetPhrases } from '../src/domain/composerModel.js';

test('refrigerator composer prioritizes category-specific conditions and common triggers',()=>{
  const model=buildComposerModel('冷蔵庫');
  assert.equal(model.categoryId,'appliances');
  assert.equal(model.subcategoryId,'refrigerator');
  assert.ok(model.common.some((x)=>x.id==='price'));
  assert.ok(model.category.some((x)=>x.id==='capacity'));
  assert.ok(model.category.some((x)=>x.id==='installation_width'));
  assert.ok(model.triggers.some((x)=>x.id==='availability'));
  assert.ok(model.triggers.some((x)=>x.id==='shipping'));
});

test('fashion composer prioritizes size color condition price and coupon',()=>{
  const model=buildComposerModel('New Balance スニーカー');
  for(const id of ['size','color','condition'])assert.ok([...model.common,...model.category].some((x)=>x.id===id));
  assert.ok(model.triggers.some((x)=>x.id==='coupon'));
});

test('five phase-1 categories expose progressive groups without dumping the full registry',()=>{
  for(const subject of ['スニーカー','冷蔵庫','ソファ','コーヒー豆','ヴェゼル 中古車']){
    const model=buildComposerModel(subject);
    assert.ok(model.common.length>0);
    assert.ok(model.category.length>0);
    assert.ok(model.advanced.length>0);
    assert.ok(model.common.length<10);
    assert.ok(model.category.length<12);
  }
});

test('preset phrases produce parser-compatible examples for common attributes',()=>{
  assert.ok(attributePresetPhrases('capacity').includes('500L以上'));
  assert.ok(attributePresetPhrases('width').includes('幅70cm以下'));
  assert.ok(attributePresetPhrases('mileage').includes('3万km以下'));
  assert.ok(attributePresetPhrases('repair_history').includes('修復歴なし'));
});
