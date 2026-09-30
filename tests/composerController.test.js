import test from 'node:test';
import assert from 'node:assert/strict';
import { createComposerController } from '../src/domain/composerController.js';
import { applyComposerCondition, applyFlightFilterEdit } from '../src/domain/composerModel.js';

test('text input becomes the canonical structured watch', () => {
  const controller=createComposerController();
  const result=controller.applyText('New Balance 996、24.5cm、グレー、12000円以下になったら');
  assert.equal(controller.getRawText(),'New Balance 996、24.5cm、グレー、12000円以下になったら');
  assert.equal(result.watch.domain,'fashion');
  assert.equal(controller.getWatch().domain,'fashion');
  assert.equal(controller.getRenderModel().saveable,true);
  assert.match(controller.getRenderModel().interpretation.summary,/商品/);
});

test('direct edits update the same controller-owned watch without reparsing text', () => {
  const controller=createComposerController();
  controller.applyText('New Balance 996、24.5cm、グレー');
  const beforeRaw=controller.getRawText();
  controller.applyWatchEdit((watch)=>applyComposerCondition(watch,{id:'test-size',fieldId:'size',operator:'eq',value:'25.0cm',role:'required'}));
  assert.equal(controller.getRawText(),beforeRaw);
  assert.equal(controller.getWatch().domainConditions.find((c)=>c.fieldId==='size')?.value,'25.0cm');
});

test('switching domain clears incompatible state', () => {
  const controller=createComposerController();
  controller.applyText('東京からホノルル、往復、直行便、12万円以下になったら');
  assert.equal(controller.getWatch().domain,'flight');
  assert.ok(controller.getWatch().travelIntent);
  const next=controller.switchDomain('hotel');
  assert.equal(next.domain,'hotel');
  assert.equal('travelIntent' in next,false);
  assert.deepEqual(next.domainConditions,[]);
  assert.deepEqual(next.triggers,[]);
});

test('replaceWatch seeds edit state and preserves structured flight semantics', () => {
  const source=createComposerController();
  source.applyText('東京からホノルル、往復、直行便、ANAかJAL、12万円以下になったら');
  source.applyWatchEdit((watch)=>applyFlightFilterEdit(watch,{fieldId:'departureTimeRange',operator:'between',value:['00:00','11:59'],role:'preferred'}));
  const saved=source.getWatch();
  const edit=createComposerController();
  edit.replaceWatch(saved);
  assert.deepEqual(edit.getWatch().travelIntent,saved.travelIntent);
  assert.deepEqual(edit.getWatch().flightFilters,saved.flightFilters);
  assert.deepEqual(edit.getWatch().triggers,saved.triggers);
});

test('empty text is not saveable and does not fabricate meaning', () => {
  const controller=createComposerController();
  const result=controller.applyText('   ');
  assert.equal(result.watch.target?.title||'','');
  assert.equal(controller.getRenderModel().saveable,false);
  assert.equal(controller.getRenderModel().interpretation.summary,'入力すると条件を読み取ります');
});
