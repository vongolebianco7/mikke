import test from 'node:test';
import assert from 'node:assert/strict';
import { createFlightTravelIntent, normalizeFlightTravelIntent, migrateV3FlightWatch } from '../src/domain/flightTravelIntent.js';

test('creates an empty canonical flight Travel Intent', () => {
  const intent = createFlightTravelIntent();
  assert.equal(intent.tripPattern, 'round_trip');
  assert.deepEqual(intent.originSet, { mode:'specific', places:[], airportPolicy:{ includeNearby:true, includedAirports:[], excludedAirports:[] } });
  assert.deepEqual(intent.destinationSet, { mode:'specific', places:[], airportPolicy:{ includeNearby:true, includedAirports:[], excludedAirports:[] } });
  assert.deepEqual(intent.dateSet, { mode:'anytime', options:[] });
  assert.deepEqual(intent.travellers, { adults:1, children:[], infantsInSeat:0, infantsOnLap:0 });
});

test('normalizes multiple origins destinations date options and scenarios without collapsing alternatives', () => {
  const intent = normalizeFlightTravelIntent({
    tripPattern:'round_trip',
    originSet:{ mode:'any_of', places:[{kind:'airport',id:'HND',label:'羽田'},{kind:'airport',id:'NRT',label:'成田'}] },
    destinationSet:{ mode:'any_of', places:[{kind:'city',id:'HNL',label:'ホノルル'},{kind:'city',id:'SYD',label:'シドニー'}] },
    dateSet:{ mode:'any_of', options:[
      {kind:'exact',outboundDate:'2027-01-10',returnDate:'2027-01-14'},
      {kind:'flexible',outboundDate:'2027-02-10',returnDate:'2027-02-15',outboundFlexDays:2,returnFlexDays:2},
      {kind:'month',year:2027,month:3,stayLength:{minNights:5,maxNights:7}},
      {kind:'range',startDate:'2027-04-01',endDate:'2027-04-30',stayLength:{minNights:3,maxNights:5}},
      {kind:'anytime',stayLength:{minNights:4,maxNights:8}},
    ] },
    scenarios:[
      { destinationSet:{mode:'specific',places:[{kind:'city',id:'HNL',label:'ホノルル'}]}, dateSet:{mode:'month',options:[{kind:'month',year:2027,month:1}]} },
      { destinationSet:{mode:'specific',places:[{kind:'city',id:'SYD',label:'シドニー'}]}, dateSet:{mode:'month',options:[{kind:'month',year:2027,month:3}]} },
    ],
  });
  assert.equal(intent.originSet.places.length, 2);
  assert.equal(intent.destinationSet.places.length, 2);
  assert.equal(intent.dateSet.options.length, 5);
  assert.deepEqual(intent.dateSet.options.map((x)=>x.kind), ['exact','flexible','month','range','anytime']);
  assert.equal(intent.scenarios.length, 2);
});

test('migrates a v3 flight Watch into v4 Travel Intent in memory', () => {
  const migrated = migrateV3FlightWatch({
    schemaVersion:3,
    domain:'flight',
    target:{title:'東京からホノルル'},
    domainConditions:[
      {fieldId:'origin',operator:'eq',value:'東京',role:'required'},
      {fieldId:'destination',operator:'eq',value:'ホノルル',role:'required'},
      {fieldId:'tripType',operator:'eq',value:'round_trip',role:'required'},
      {fieldId:'outboundDate',operator:'eq',value:'2027-01-10',role:'required'},
      {fieldId:'returnDate',operator:'eq',value:'2027-01-14',role:'required'},
      {fieldId:'adults',operator:'eq',value:2,role:'required'},
      {fieldId:'infants',operator:'eq',value:1,role:'required'},
      {fieldId:'cabinClass',operator:'eq',value:'economy',role:'required'},
      {fieldId:'nonstopOnly',operator:'is_true',value:true,role:'required'},
    ],
    triggers:[{metric:'price',operator:'lte',value:120000,unit:'JPY',reference:'current',scope:'candidate',role:'notification'}],
    metadata:{rawQuery:'東京からホノルル'},
  });
  assert.equal(migrated.schemaVersion, 4);
  assert.equal(migrated.domain, 'flight');
  assert.equal(migrated.travelIntent.tripPattern, 'round_trip');
  assert.equal(migrated.travelIntent.originSet.places[0].label, '東京');
  assert.equal(migrated.travelIntent.destinationSet.places[0].label, 'ホノルル');
  assert.deepEqual(migrated.travelIntent.dateSet.options[0], {kind:'exact',outboundDate:'2027-01-10',returnDate:'2027-01-14'});
  assert.equal(migrated.travelIntent.travellers.adults, 2);
  assert.equal(migrated.travelIntent.travellers.infantsOnLap, 1);
  assert.deepEqual(migrated.travelIntent.cabin.allowed, ['economy']);
  assert.equal(migrated.flightFilters[0].fieldId, 'nonstopOnly');
  assert.equal(migrated.triggers[0].metric, 'price');
});
