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

function openCard(ctx,label){
  const card=[...ctx.form.querySelectorAll('[data-condition-card]')].find((item)=>item.textContent.includes(label));
  assert.ok(card,`missing condition card ${label}`);
  card.dispatchEvent(new ctx.Event('click',{bubbles:true}));
  return card;
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

test('primary input is single and immediately updates canonical flight Watch',()=>{
  const ctx=setup();
  assert.equal(ctx.form.querySelectorAll('[data-composer-text]').length,1);
  assert.equal(ctx.form.querySelectorAll('[data-canonical-domain]').length,0);
  typeInto(ctx,'東京からホノルル、往復、直行便、ANAかJAL、12万円以下になったら');
  assert.equal(ctx.form._mikkeDraft.domain,'flight');
  assert.equal(ctx.form._mikkeDraft.travelIntent?.tripPattern,'round_trip');
  assert.ok(ctx.form._mikkeDraft.flightFilters?.some((item)=>item.fieldId==='nonstopOnly'));
  assert.equal(ctx.form.querySelector('#query').value,'東京からホノルル、往復、直行便、ANAかJAL、12万円以下になったら');
  assert.equal(ctx.form.dataset.submitStructured,'true');
});

test('condition-card edit mutates the same Watch draft used by natural language',()=>{
  const ctx=setup();
  typeInto(ctx,'New Balance 996、24.5cm、グレー');
  openCard(ctx,'色');
  change(ctx,'[data-condition-role]','required');
  assert.equal(ctx.form._mikkeDraft.domain,'fashion');
  assert.equal(ctx.form._mikkeDraft.domainConditions.find((item)=>item.fieldId==='color')?.role,'required');
  assert.equal(ctx.form.querySelectorAll('[data-canonical-field]').length,0);
});

test('typing a different domain replaces inferred base semantics without stale flight state',()=>{
  const ctx=setup();
  typeInto(ctx,'東京からホノルル、往復、直行便');
  assert.equal(ctx.form._mikkeDraft.domain,'flight');
  typeInto(ctx,'軽井沢のホテル、2026-10-26、2026-10-27、大人2人');
  assert.equal(ctx.form._mikkeDraft.domain,'hotel');
  assert.equal('travelIntent' in ctx.form._mikkeDraft,false);
  assert.ok(ctx.form._mikkeDraft.domainConditions.some((item)=>item.fieldId==='adults'));
});

test('shopping flight and hotel represent changes as cards instead of a notification form',()=>{
  for(const text of [
    'New Balance 996、10000円以下になったら',
    '東京からホノルル、往復、12万円以下になったら',
    '軽井沢のホテル、合計5万円以下になったら',
  ]){
    const ctx=setup();
    typeInto(ctx,text);
    assert.equal(ctx.form.querySelectorAll('[data-canonical-notification]').length,0);
    const changeCard=[...ctx.form.querySelectorAll('[data-condition-card]')].find((item)=>item.textContent.includes('変化条件'));
    assert.ok(changeCard,`missing change card for ${text}`);
  }
});

test('shopping card edit survives save load and edit remount',()=>{
  const ctx=setup();
  typeInto(ctx,'New Balance 996、24.5cm、グレー、12000円以下');
  openCard(ctx,'サイズ');
  change(ctx,'[data-condition-value]','25.0cm');
  const loaded=saveAndReload(ctx,'watch-shopping');
  assert.equal(loaded.domain,'fashion');
  assert.equal(loaded.domainConditions.find((c)=>c.fieldId==='size')?.value,'25.0cm');
  const edit=setup(loaded.rawQuery||loaded.metadata?.rawQuery||'',loaded);
  assert.equal(edit.form._mikkeDraft.domainConditions.find((c)=>c.fieldId==='size')?.value,'25.0cm');
  assert.ok([...edit.form.querySelectorAll('[data-condition-card]')].some((item)=>item.textContent.includes('25.0cm')));
});

test('flight journey preserves Travel Intent filters and change conditions through save and edit',()=>{
  const ctx=setup();
  typeInto(ctx,'東京からホノルル、往復、直行便、ANAかJAL、2027年1月、5泊、12万円以下になったら');
  const before=structuredClone(ctx.form._mikkeDraft);
  const loaded=saveAndReload(ctx,'watch-flight');
  assert.equal(loaded.domain,'flight');
  assert.equal(loaded.travelIntent.tripPattern,'round_trip');
  assert.deepEqual(loaded.travelIntent.destinationSet,before.travelIntent.destinationSet);
  assert.deepEqual(loaded.flightFilters,before.flightFilters);
  assert.ok(loaded.triggers.some((t)=>t.metric==='price'));
  const edit=setup(loaded.rawQuery||loaded.metadata?.rawQuery||'',loaded);
  assert.deepEqual(edit.form._mikkeDraft.travelIntent,loaded.travelIntent);
  assert.deepEqual(edit.form._mikkeDraft.flightFilters,loaded.flightFilters);
});

test('hotel add-condition card survives save load and edit remount',()=>{
  const ctx=setup();
  typeInto(ctx,'軽井沢のホテル、2026-10-26、2026-10-27、大人2人、駅徒歩10分以内、朝食付き、キャンセル無料');
  ctx.form.querySelector('[data-add-condition]').dispatchEvent(new ctx.Event('click',{bubbles:true}));
  let search=ctx.form.querySelector('[data-condition-search]');
  search.value='部屋数';
  search.dispatchEvent(new ctx.Event('input',{bubbles:true}));
  const rooms=ctx.form.querySelector('[data-condition-option][data-attribute-id="rooms"]');
  assert.ok(rooms,'rooms option should be searchable');
  rooms.dispatchEvent(new ctx.Event('click',{bubbles:true}));
  change(ctx,'[data-condition-value]','2');
  const loaded=saveAndReload(ctx,'watch-hotel');
  assert.equal(loaded.domain,'hotel');
  assert.equal(loaded.domainConditions.find((c)=>c.fieldId==='rooms')?.value,2);
  assert.ok(loaded.domainConditions.some((c)=>c.fieldId==='breakfastIncluded'));
  assert.ok(loaded.domainConditions.some((c)=>c.fieldId==='freeCancellation'));
  const edit=setup(loaded.rawQuery||loaded.metadata?.rawQuery||'',loaded);
  assert.equal(edit.form._mikkeDraft.domainConditions.find((c)=>c.fieldId==='rooms')?.value,2);
});
