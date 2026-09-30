import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mountCanonicalComposer } from '../src/canonicalComposerUi.js';

function setup(raw=''){
  const dom=new JSDOM(`<!doctype html><main id="app"><form id="watch-form" class="composer"><textarea id="query">${raw}</textarea><button class="primary" type="submit">この内容で条件を確認</button></form></main>`,{url:'https://example.test/'});
  const {document,Event}=dom.window;
  const form=document.querySelector('#watch-form');
  mountCanonicalComposer(form,{Event});
  return {dom,document,form,Event};
}

function typeInto(ctx,text){
  const input=ctx.form.querySelector('[data-composer-text]');
  input.value=text;
  input.dispatchEvent(new ctx.Event('input',{bubbles:true}));
  return input;
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
