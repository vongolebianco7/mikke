import test from 'node:test';
import assert from 'node:assert/strict';
import { flightIntentChips, flightIntentGroupsHtml } from '../src/domain/flightDisplay.js';

function watch(overrides={}){
  return {
    schemaVersion:4,
    domain:'flight',
    travelIntent:{
      tripPattern:'round_trip',
      originSet:{mode:'specific',places:[{kind:'city',id:'TYO',label:'東京'}]},
      destinationSet:{mode:'any_of',places:[{kind:'city',id:'HNL',label:'ホノルル'},{kind:'city',id:'GUM',label:'グアム'}]},
      dateSet:{mode:'any_of',options:[
        {kind:'exact',outbound:'2027-01-02',return:'2027-01-07'},
        {kind:'month',month:'2027-02',stayLengthDays:5},
      ]},
      travellers:{adults:2,children:[],infantsInSeat:0,infantsOnLap:1},
      cabin:{allowed:['economy'],mixedCabinAllowed:false},
      paymentIntent:{mode:'cash'},
      scenarios:[],
      legs:[],
    },
    flightFilters:[
      {fieldId:'nonstopOnly',operator:'is_true',value:true,role:'required'},
      {fieldId:'allowedAirlines',operator:'in',value:['ANA','JAL'],role:'preferred'},
    ],
    triggers:[{metric:'price',operator:'lte',value:120000,unit:'JPY',role:'notification'}],
    ...overrides,
  };
}

test('flight chips preserve multiple destinations and date alternatives',()=>{
  const chips=flightIntentChips(watch());
  assert.ok(chips.includes('東京 → ホノルル・グアム'));
  assert.ok(chips.includes('往復'));
  assert.ok(chips.some((chip)=>chip.includes('2027-01-02 → 2027-01-07')));
  assert.ok(chips.some((chip)=>chip.includes('2027-02・5日間')));
  assert.ok(chips.includes('大人2・乳児1'));
  assert.ok(chips.includes('エコノミー'));
});

test('flight confirmation keeps journey required preferred and notification sections separate',()=>{
  const html=flightIntentGroupsHtml(watch());
  assert.match(html,/旅程/);
  assert.match(html,/東京/);
  assert.match(html,/ホノルル・グアム/);
  assert.match(html,/日付候補/);
  assert.match(html,/直行便/);
  assert.match(html,/ANA・JAL/);
  assert.match(html,/通知条件/);
  assert.match(html,/¥120,000以下になったら/);
});

test('anytime intent stays explicitly anytime instead of fabricating dates',()=>{
  const w=watch({travelIntent:{...watch().travelIntent,dateSet:{mode:'anytime',options:[{kind:'anytime'}]}}});
  const chips=flightIntentChips(w);
  assert.ok(chips.includes('いつでも'));
  const html=flightIntentGroupsHtml(w);
  assert.match(html,/日付候補 いつでも/);
});
