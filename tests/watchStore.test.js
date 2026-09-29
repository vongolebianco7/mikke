import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWatch } from '../src/domain/normalizeWatch.js';

function byField(watch,id){return watch.domainConditions.find((c)=>c.fieldId===id)}

test('legacy required max price becomes a v3 required price condition while v2 view remains readable', () => {
  const watch = normalizeWatch({
    type:'shopping', title:'冷蔵庫', rawQuery:'冷蔵庫、15万円以下',
    conditions:{ maxPrice:150000, attributes:{}, priceTriggers:[], stateTriggers:[] },
    requiredKeys:['maxPrice'], preferredKeys:[],
  });
  assert.equal(watch.schemaVersion,3);
  assert.equal(watch.domain,'appliance');
  assert.equal(byField(watch,'price').value,150000);
  assert.equal(byField(watch,'price').role,'required');
  assert.ok(watch.genericConditions.some((c)=>c.attributeId==='price'&&c.value===150000));
});

test('legacy product category and snake_case ids map to canonical v3 fields',()=>{
  const watch=normalizeWatch({
    schemaVersion:2,
    target:{categoryId:'appliances',subcategoryId:'refrigerator',title:'冷蔵庫'},
    genericConditions:[
      {attributeId:'installation_width',operator:'lte',value:700,unit:'mm',role:'required',source:'category'},
      {attributeId:'freezer_capacity',operator:'gte',value:100,unit:'L',role:'preferred',source:'subcategory'},
    ],
    triggers:[],conditions:{attributes:{},priceTriggers:[],stateTriggers:[]},requiredKeys:[],preferredKeys:[],
  });
  assert.equal(watch.domain,'appliance');
  assert.equal(byField(watch,'installationWidth').role,'required');
  assert.equal(byField(watch,'freezerCapacity').role,'preferred');
});

test('legacy flight route direct and trip type normalize into v4 Travel Intent plus flight filters',()=>{
  const watch=normalizeWatch({
    type:'flight',title:'東京→ホノルル',
    conditions:{origin:'東京',destination:'ホノルル',directOnly:true,tripType:'roundtrip',attributes:{origin:'東京',destination:'ホノルル',directOnly:true,tripType:'roundtrip'},priceTriggers:[],stateTriggers:[]},
    requiredKeys:['origin','destination','directOnly'],preferredKeys:[],
  });
  assert.equal(watch.domain,'flight');
  assert.equal(watch.schemaVersion,4);
  assert.equal(watch.travelIntent.originSet.places[0].label,'東京');
  assert.equal(watch.travelIntent.destinationSet.places[0].label,'ホノルル');
  assert.equal(watch.travelIntent.tripPattern,'round_trip');
  assert.ok(watch.flightFilters.some((c)=>c.fieldId==='nonstopOnly'&&c.value===true));
});

test('existing v4 flight Travel Intent survives normalization without being reconstructed from legacy fields',()=>{
  const original={schemaVersion:4,domain:'flight',target:{title:'旅行候補'},travelIntent:{tripPattern:'round_trip',originSet:{mode:'any_of',places:[{kind:'city',id:'TYO',label:'東京'},{kind:'city',id:'OSA',label:'大阪'}]},destinationSet:{mode:'any_of',places:[{kind:'city',id:'HNL',label:'ホノルル'},{kind:'city',id:'SYD',label:'シドニー'}]},dateSet:{mode:'any_of',options:[{kind:'month',year:2027,month:1},{kind:'month',year:2027,month:3}]},travellers:{adults:2,children:[],infantsInSeat:0,infantsOnLap:1},cabin:{allowed:['economy'],mixedCabinAllowed:false},paymentIntent:{mode:'either'},scenarios:[],legs:[]},flightFilters:[],triggers:[],metadata:{inputMode:'builder'}};
  const normalized=normalizeWatch(original);
  assert.equal(normalized.schemaVersion,4);
  assert.deepEqual(normalized.travelIntent.originSet.places.map((p)=>p.id),['TYO','OSA']);
  assert.deepEqual(normalized.travelIntent.destinationSet.places.map((p)=>p.id),['HNL','SYD']);
  assert.equal(normalized.travelIntent.dateSet.options.length,2);
  assert.equal(normalized.travelIntent.travellers.infantsOnLap,1);
});

test('legacy notification triggers remain generic notification triggers after v3 normalization', () => {
  const watch = normalizeWatch({
    type:'shopping', title:'996',
    conditions:{ maxPrice:10000, attributes:{}, priceTriggers:[{type:'below_absolute',value:10000,reference:'explicit',role:'notification'}], stateTriggers:[] },
    requiredKeys:[], preferredKeys:[],
  });
  assert.ok(watch.triggers.some((t)=>t.metric==='price'&&t.operator==='lte'&&t.value===10000&&t.role==='notification'));
});
