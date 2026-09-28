import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDecisions, recordDecision } from '../src/domain/decisionStore.js';

function memoryStorage(){const data=new Map();return{getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,v)}}

test('records local Watch decisions with price context and preserves prior decisions',()=>{
  const storage=memoryStorage();
  recordDecision(storage,'w1',{type:'wait',price:12000,at:'t1'});
  recordDecision(storage,'w1',{type:'buy',price:9900,at:'t2'});
  assert.deepEqual(loadDecisions(storage).w1,[
    {type:'wait',price:12000,at:'t1'},
    {type:'buy',price:9900,at:'t2'},
  ]);
});

test('malformed local decision data degrades to an empty object',()=>{
  const storage=memoryStorage();storage.setItem('mikke.decisions.v1','{broken');
  assert.deepEqual(loadDecisions(storage),{});
});
