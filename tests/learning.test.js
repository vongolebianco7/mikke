import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestLearnedPriceTrigger } from '../src/domain/learning.js';

const watches=[{id:'w1',type:'shopping',title:'New Balance 996'}];

test('suggests a rounded price trigger when repeated waits sit above a later buy',()=>{
  const decisions={w1:[
    {type:'wait',price:12000,at:'t1'},
    {type:'wait',price:10800,at:'t2'},
    {type:'buy',price:9900,at:'t3'},
  ]};
  assert.deepEqual(suggestLearnedPriceTrigger(watches,decisions,{type:'shopping',title:'New Balance 996'}),{
    type:'below_absolute',value:10000,reference:'learned_local',role:'notification',label:'10,000円以下を候補にする',evidenceCount:3,
  });
});

test('sparse conflicting or unrelated decisions do not create a learned suggestion',()=>{
  assert.equal(suggestLearnedPriceTrigger(watches,{w1:[{type:'buy',price:9900}]},{type:'shopping',title:'New Balance 996'}),null);
  assert.equal(suggestLearnedPriceTrigger(watches,{w1:[{type:'wait',price:9000},{type:'wait',price:9500},{type:'buy',price:10000}]},{type:'shopping',title:'New Balance 996'}),null);
  assert.equal(suggestLearnedPriceTrigger(watches,{w1:[{type:'wait',price:12000},{type:'wait',price:10800},{type:'buy',price:9900}]},{type:'shopping',title:'別の商品'}),null);
});
