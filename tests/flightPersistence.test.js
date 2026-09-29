import test from 'node:test';
import assert from 'node:assert/strict';
import { createWatchRecord, loadWatches, saveWatches } from '../src/domain/watchStore.js';

function memoryStorage(){
  const values=new Map();
  return {
    getItem:(key)=>values.has(key)?values.get(key):null,
    setItem:(key,value)=>values.set(key,String(value)),
  };
}

function draft(){
  return {
    schemaVersion:4,
    domain:'flight',
    type:'flight',
    title:'東京からリゾート候補',
    rawQuery:'東京からホノルルかグアム、2027-01-02〜2027-01-07か2027年2月に5日間',
    target:{title:'東京からリゾート候補'},
    travelIntent:{
      tripPattern:'round_trip',
      originSet:{mode:'specific',places:[{kind:'city',id:'東京',label:'東京'}]},
      destinationSet:{mode:'any_of',places:[{kind:'city',id:'ホノルル',label:'ホノルル'},{kind:'city',id:'グアム',label:'グアム'}]},
      dateSet:{mode:'any_of',options:[{kind:'exact',outbound:'2027-01-02',return:'2027-01-07'},{kind:'month',month:'2027-02',stayLengthDays:5}]},
      travellers:{adults:2,children:[],infantsInSeat:0,infantsOnLap:1},
      cabin:{allowed:['economy'],mixedCabinAllowed:false},
      paymentIntent:{mode:'cash'},
      scenarios:[],legs:[],
    },
    flightFilters:[{fieldId:'nonstopOnly',operator:'is_true',value:true,role:'required',evidencePolicy:'known_required'}],
    triggers:[{metric:'price',operator:'lte',value:120000,unit:'JPY',role:'notification'}],
    metadata:{inputMode:'builder'},
  };
}

test('saving and loading a v4 flight Watch preserves alternatives filters and triggers',()=>{
  const storage=memoryStorage();
  const created=createWatchRecord(draft(),'flight-v4');
  saveWatches(storage,[created]);
  const [loaded]=loadWatches(storage);
  assert.equal(loaded.id,'flight-v4');
  assert.equal(loaded.schemaVersion,4);
  assert.deepEqual(loaded.travelIntent.destinationSet.places.map((place)=>place.label),['ホノルル','グアム']);
  assert.equal(loaded.travelIntent.dateSet.options.length,2);
  assert.equal(loaded.travelIntent.travellers.infantsOnLap,1);
  assert.ok(loaded.flightFilters.some((condition)=>condition.fieldId==='nonstopOnly'&&condition.role==='required'));
  assert.ok(loaded.triggers.some((trigger)=>trigger.metric==='price'&&trigger.value===120000));
});
