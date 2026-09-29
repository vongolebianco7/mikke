import test from 'node:test';
import assert from 'node:assert/strict';
import { createComposerDraft, switchComposerDomain, applyParsedWatch, cloneComposerDraft } from '../src/domain/composerDraft.js';

const flightWatch={
  schemaVersion:4,
  domain:'flight',
  target:{title:'旅行候補'},
  travelIntent:{
    tripPattern:'round_trip',
    originSet:{mode:'any_of',places:[{kind:'city',id:'TYO',label:'東京'}]},
    destinationSet:{mode:'any_of',places:[{kind:'city',id:'HNL',label:'ホノルル'},{kind:'city',id:'SYD',label:'シドニー'}]},
    dateSet:{mode:'any_of',options:[{kind:'month',year:2027,month:1},{kind:'month',year:2027,month:3}]},
    travellers:{adults:2,children:[],infantsInSeat:0,infantsOnLap:1},
    cabin:{allowed:['economy'],mixedCabinAllowed:false},
    paymentIntent:{mode:'either'},
    scenarios:[],legs:[]
  },
  flightFilters:[{id:'f1',fieldId:'nonstopOnly',operator:'is_true',value:true,role:'required'}],
  triggers:[{id:'t1',metric:'price',operator:'lte',value:120000,unit:'JPY',role:'notification'}],
  metadata:{inputMode:'text'}
};

test('createComposerDraft keeps one structured Watch as the editable source of truth',()=>{
  const draft=createComposerDraft(flightWatch);
  assert.equal(draft.domain,'flight');
  assert.equal(draft.watch.schemaVersion,4);
  assert.deepEqual(draft.watch.travelIntent.destinationSet.places.map((p)=>p.id),['HNL','SYD']);
  assert.equal(draft.watch.travelIntent.dateSet.options.length,2);
  assert.equal(draft.ui.textHelperOpen,false);
});

test('cloneComposerDraft is non-mutating and preserves structured alternatives',()=>{
  const draft=createComposerDraft(flightWatch);
  const cloned=cloneComposerDraft(draft);
  cloned.watch.travelIntent.destinationSet.places.push({kind:'city',id:'GUM',label:'グアム'});
  assert.deepEqual(draft.watch.travelIntent.destinationSet.places.map((p)=>p.id),['HNL','SYD']);
  assert.deepEqual(cloned.watch.travelIntent.destinationSet.places.map((p)=>p.id),['HNL','SYD','GUM']);
});

test('switchComposerDomain clears incompatible domain state instead of leaking it',()=>{
  const draft=createComposerDraft(flightWatch);
  const hotel=switchComposerDomain(draft,'hotel');
  assert.equal(hotel.domain,'hotel');
  assert.equal(hotel.watch.domain,'hotel');
  assert.equal(hotel.watch.schemaVersion,3);
  assert.deepEqual(hotel.watch.domainConditions,[]);
  assert.deepEqual(hotel.watch.triggers,[]);
  assert.equal(hotel.watch.travelIntent,undefined);
  assert.equal(hotel.watch.flightFilters,undefined);
  assert.deepEqual(draft.watch.travelIntent.destinationSet.places.map((p)=>p.id),['HNL','SYD']);
});

test('applyParsedWatch replaces the draft with parsed structured semantics only when applied',()=>{
  const initial=createComposerDraft({schemaVersion:3,domain:'fashion',target:{title:'996'},domainConditions:[{id:'c1',fieldId:'size',operator:'eq',value:'24.5cm',role:'required'}],triggers:[]});
  const parsed={schemaVersion:3,domain:'appliance',target:{title:'冷蔵庫'},domainConditions:[{id:'c2',fieldId:'totalCapacity',operator:'gte',value:500,unit:'L',role:'required'}],triggers:[{id:'t2',metric:'price',operator:'lte',value:150000,unit:'JPY',role:'notification'}]};
  const applied=applyParsedWatch(initial,parsed);
  assert.equal(initial.domain,'fashion');
  assert.equal(applied.domain,'appliance');
  assert.equal(applied.watch.domainConditions[0].fieldId,'totalCapacity');
  assert.equal(applied.watch.triggers[0].value,150000);
});
