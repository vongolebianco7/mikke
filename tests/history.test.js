import test from 'node:test';
import assert from 'node:assert/strict';
import * as historyStore from '../src/domain/historyStore.js';

const { loadHistory, appendCheckHistory, previousByCandidate } = historyStore;

function memoryStorage(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,v)}}

test('appendCheckHistory stores newest observations and events per watch', () => {
  const storage=memoryStorage();
  appendCheckHistory(storage,'w1',{candidates:[{observation:{candidateId:'c1',price:100,available:true,observedAt:'t1'}}],events:[{kind:'new_result',candidateId:'c1'}]});
  const history=loadHistory(storage);
  assert.equal(history.w1.observations.length,1);
  assert.equal(history.w1.events[0].kind,'new_result');
});

test('previousByCandidate returns latest prior observation for diffing', () => {
  const history={w1:{observations:[{candidateId:'c1',price:120,observedAt:'t1'},{candidateId:'c1',price:100,observedAt:'t2'}],events:[]}};
  assert.equal(previousByCandidate(history,'w1').c1.price,100);
});

test('priceContextByCandidate exposes first, previous and observed-low prices without inventing data', () => {
  assert.equal(typeof historyStore.priceContextByCandidate, 'function');
  const history={w1:{observations:[
    {candidateId:'c1',price:12000,observedAt:'t1'},
    {candidateId:'c1',price:10000,observedAt:'t2'},
    {candidateId:'c1',price:11000,observedAt:'t3'},
    {candidateId:'c2',available:true,observedAt:'t4'},
  ],events:[]}};
  const context=historyStore.priceContextByCandidate(history,'w1');
  assert.deepEqual(context.c1,{previous:history.w1.observations[2],initialPrice:12000,observedLow:10000,observationCount:3});
  assert.deepEqual(context.c2,{previous:history.w1.observations[3],initialPrice:undefined,observedLow:undefined,observationCount:1});
});
