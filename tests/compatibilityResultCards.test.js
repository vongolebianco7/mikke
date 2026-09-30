import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeCompatibilityResult } from '../src/domain/resultEvidence.js';

test('compatibility result summary keeps confirmed, incompatible, unknown, and unsupported visually distinct',()=>{
  const base={condition:{id:'fit',role:'required',target:{type:'device',model:'iPhone 17 Pro'}}};
  assert.deepEqual(summarizeCompatibilityResult({...base,state:'compatible'}),{status:'compatible',label:'対応確認済み',tone:'positive',conditionId:'fit',role:'required'});
  assert.deepEqual(summarizeCompatibilityResult({...base,state:'incompatible'}),{status:'incompatible',label:'非対応',tone:'negative',conditionId:'fit',role:'required'});
  assert.deepEqual(summarizeCompatibilityResult({...base,state:'unknown'}),{status:'unknown',label:'適合未確認',tone:'caution',conditionId:'fit',role:'required'});
  assert.deepEqual(summarizeCompatibilityResult({...base,state:'unsupported'}),{status:'unsupported',label:'このデータ元では適合判定不可',tone:'neutral',conditionId:'fit',role:'required'});
});

test('compatibility result summary never collapses unknown or unsupported into incompatible',()=>{
  for(const state of ['unknown','unsupported']){
    const summary=summarizeCompatibilityResult({state,condition:{id:'fit',role:'required'}});
    assert.notEqual(summary.status,'incompatible');
    assert.notEqual(summary.label,'非対応');
  }
});
