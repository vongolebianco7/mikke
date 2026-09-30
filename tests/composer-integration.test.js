import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mountCanonicalComposer } from '../src/canonicalComposerUi.js';
import { createWatchRecord, saveWatches, loadWatches } from '../src/domain/watchStore.js';

function setup(raw='',seedWatch=null){
  const dom=new JSDOM(`<!doctype html><main id="app"><form id="watch-form" class="composer"><textarea id="query">${raw}</textarea><button class="primary" type="submit">この内容で条件を確認</button></form></main>`,{url:'https://example.test/'});
  const {document,Event}=dom.window;
  const form=document.querySelector('#watch-form');
  if(seedWatch)form._mikkeDraft=structuredClone(seedWatch);
  mountCanonicalComposer(form,{Event});
  return {dom,document,form,Event};
}

function typeInto(ctx,text){
  const input=ctx.form.querySelector('[data-composer-text]');
  input.value=text;
  input.dispatchEvent(new ctx.Event('input',{bubbles:true}));
  return input;
}

function change(ctx,selector,value){
  const input=ctx.form.querySelector(selector);
  assert.ok(input,`missing control ${selector}`);
  input.value=value;
  input.dispatchEvent(new ctx.Event('change',{bubbles:true}));
  return input;
}

function saveAndReload(ctx,id){
  const record=createWatchRecord(ctx.form._mikkeDraft,id);
  saveWatches(ctx.dom.window.localStorage,[record]);
  const [loaded]=loadWatches(ctx.dom.window.localStorage);
  assert.ok(loaded);
  return loaded;
}

test('primary input is single, obvious, and immediately updates canonical draft',()=>{
  const ctx=setup();
  assert.equal(ctx.form.querySelectorAll('[data-composer-text]').length,1);
  typeInto(ctx,'東京からホノルル、往復、直行便、ANAかJAL、12万円以下になったら');
  assert.equal(ctx.form._mikkeDraft.domain,'flight');
  assert.match(ctx.form.querySelector('[data-composer-interpretation]').textContent,/航空券として読み取りました/);
  assert.match(ctx.form.querySelector('[data-composer-interpretation]').textContent,/東京/);
  assert.equal(ctx.form.querySelector('#query').value,'東京からホノルル、往復、直行便、ANAかJAL、12万円以下になったら');
  assert.equal(ctx.form.dataset.submitStructured,'true');
});

test('domain controls edit the same draft used by natural language',()=>{
  const ctx=setup();
  typeInto(ctx,'New Balance 996、24.5cm、グレー');
  const before=ctx.form._mikkeDraft;
  const notify=ctx.form.querySelector('[data-canonical-notify="availability"]');
  notify.click();
  assert.equal(ctx.form._mikkeDraft.domain,before.domain);
  assert.ok(ctx.form._mikkeDraft.triggers.some((t)=>t.metric==='availability'));
  assert.match(ctx.form.querySelector('[data-canonical-notification-summary]').textContent,/在庫/);
});

test('switching category removes incompatible prior-domain state',()=>{
  const ctx=setup();
  typeInto(ctx,'東京からホノルル、往復、直行便');
  assert.equal(ctx.form._mikkeDraft.domain,'flight');
  ctx.form.querySelector('[data-canonical-domain="hotel"]').click();
  assert.equal(ctx.form._mikkeDraft.domain,'hotel');
  assert.equal('travelIntent' in ctx.form._mikkeDraft,false);
  assert.deepEqual(ctx.form._mikkeDraft.domainConditions,[]);
});

test('shopping, flight, and hotel all render one shared notification section',()=>{
  const ctx=setup();
  for(const [text,domain] of [
    ['New Balance 996、24.5cm、グレー','fashion'],
    ['東京からホノルル、往復、直行便','flight'],
    ['軽井沢のホテル、2026-10-26、2026-10-27、大人2人','hotel'],
  ]){
    typeInto(ctx,text);
    assert.equal(ctx.form._mikkeDraft.domain,domain);
    assert.equal(ctx.form.querySelectorAll('[data-canonical-notification]').length,1);
    assert.match(ctx.form.querySelector('[data-canonical-notification]').textContent,/いつ知らせる？/);
  }
});

test('shopping journey survives direct edit save load and edit remount',()=>{
  const ctx=setup();
  typeInto(ctx,'New Balance 996、24.5cm、グレー、12000円以下になったら');
  change(ctx,'[data-canonical-field="size"]','25.0cm');
  ctx.form.querySelector('[data-canonical-notify="availability"]').click();
  const loaded=saveAndReload(ctx,'watch-shopping');
  assert.equal(loaded.domain,'fashion');
  assert.equal(loaded.domainConditions.find((c)=>c.fieldId==='size')?.value,'25.0cm');
  assert.ok(loaded.triggers.some((t)=>t.metric==='availability'));
  const edit=setup(loaded.rawQuery||loaded.metadata?.rawQuery||'',loaded);
  assert.equal(edit.form._mikkeDraft.domainConditions.find((c)=>c.fieldId==='size')?.value,'25.0cm');
  assert.match(edit.form.querySelector('[data-canonical-notification-summary]').textContent,/在庫/);
});

test('flight journey preserves Travel Intent filters and notifications through save and edit',()=>{
  const ctx=setup();
  typeInto(ctx,'東京からホノルル、往復、直行便、ANAかJAL、2027年1月、5泊、12万円以下になったら');
  ctx.form.querySelector('[data-canonical-trip="one_way"]').click();
  ctx.form.querySelector('[data-canonical-notify="award"]').click();
  const before=structuredClone(ctx.form._mikkeDraft);
  const loaded=saveAndReload(ctx,'watch-flight');
  assert.equal(loaded.domain,'flight');
  assert.equal(loaded.travelIntent.tripPattern,'one_way');
  assert.deepEqual(loaded.travelIntent.destinationSet,before.travelIntent.destinationSet);
  assert.deepEqual(loaded.flightFilters,before.flightFilters);
  assert.ok(loaded.triggers.some((t)=>t.scope==='award'));
  const edit=setup(loaded.rawQuery||loaded.metadata?.rawQuery||'',loaded);
  assert.deepEqual(edit.form._mikkeDraft.travelIntent,loaded.travelIntent);
  assert.deepEqual(edit.form._mikkeDraft.flightFilters,loaded.flightFilters);
});

test('hotel journey preserves stay conditions notifications and direct edits through save and edit',()=>{
  const ctx=setup();
  typeInto(ctx,'軽井沢のホテル、2026-10-26、2026-10-27、大人2人、駅徒歩10分以内、朝食付き、キャンセル無料');
  change(ctx,'[data-canonical-field="rooms"]','2');
  ctx.form.querySelector('[data-canonical-notify="availability"]').click();
  const loaded=saveAndReload(ctx,'watch-hotel');
  assert.equal(loaded.domain,'hotel');
  assert.equal(loaded.domainConditions.find((c)=>c.fieldId==='rooms')?.value,2);
  assert.ok(loaded.domainConditions.some((c)=>c.fieldId==='breakfastIncluded'));
  assert.ok(loaded.domainConditions.some((c)=>c.fieldId==='freeCancellation'));
  assert.ok(loaded.triggers.some((t)=>t.metric==='availability'));
  const edit=setup(loaded.rawQuery||loaded.metadata?.rawQuery||'',loaded);
  assert.equal(edit.form._mikkeDraft.domainConditions.find((c)=>c.fieldId==='rooms')?.value,2);
  assert.match(edit.form.querySelector('[data-canonical-notification-summary]').textContent,/空室/);
});
