import test from 'node:test';
import assert from 'node:assert/strict';
import { loadHistory, appendCheckHistory, previousByCandidate } from '../src/domain/historyStore.js';

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
