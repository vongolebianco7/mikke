import test from 'node:test';
import assert from 'node:assert/strict';
import { prioritizeToday } from '../src/domain/prioritizeToday.js';

const watches=[
  {id:'w1',title:'996',status:'watching',conditions:{maxPrice:10000,attributes:{},priceTriggers:[{type:'below_absolute',value:10000}],stateTriggers:[]},requiredKeys:['maxPrice'],preferredKeys:[]},
  {id:'w2',title:'冷蔵庫',status:'watching',conditions:{attributes:{},priceTriggers:[],stateTriggers:[]},requiredKeys:[],preferredKeys:[]},
];

test('important changes are ordered by actionability before ordinary matches', () => {
  const history={
    w1:{events:[
      {kind:'restock',candidateId:'c1'},
      {kind:'percent_drop',candidateId:'c1',percent:12},
      {kind:'watch_low',candidateId:'c1',currentPrice:9800},
      {kind:'target_price_reached',candidateId:'c1',targetPrice:10000,currentPrice:9800},
    ],observations:[]},
  };
  const results={w1:{candidates:[{id:'c1',price:9800,evaluation:{requiredMatch:true,score:100}}]}};
  const model=prioritizeToday(watches,results,history);
  assert.deepEqual(model.importantChanges.map(x=>x.event.kind),['target_price_reached','watch_low','percent_drop','restock']);
  assert.equal(model.matches.length,1);
});

test('near-target candidates appear when just above explicit target and are not called matches', () => {
  const results={w1:{candidates:[{id:'c2',price:10800,evaluation:{requiredMatch:false,nearMatch:false,score:75}}]}};
  const model=prioritizeToday(watches,results,{});
  assert.equal(model.nearTargets.length,1);
  assert.equal(model.nearTargets[0].distance,800);
  assert.equal(model.matches.length,0);
});

test('conservative near matches are surfaced separately with the failed condition',()=>{
  const results={w1:{candidates:[{id:'c3',price:12000,evaluation:{requiredMatch:false,nearMatch:true,failedRequired:['maxPrice'],score:75}}]}};
  const model=prioritizeToday(watches,results,{});
  assert.equal(model.nearMatches.length,1);
  assert.deepEqual(model.nearMatches[0].candidate.evaluation.failedRequired,['maxPrice']);
  assert.equal(model.matches.length,0);
});

test('stopped Watches are excluded from stagnant guidance', () => {
  const model=prioritizeToday([...watches,{id:'w3',status:'stopped',conditions:{},requiredKeys:[],preferredKeys:[]}],{},{});
  assert.ok(model.stagnant.some(x=>x.watch.id==='w1'));
  assert.ok(model.stagnant.some(x=>x.watch.id==='w2'));
  assert.ok(!model.stagnant.some(x=>x.watch.id==='w3'));
});
