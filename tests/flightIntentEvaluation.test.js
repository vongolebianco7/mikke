import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateFlightTravelIntent } from '../src/domain/flightIntentEvaluation.js';
import { normalizeFlightTravelIntent } from '../src/domain/flightTravelIntent.js';

function place(id,label=id){return {kind:'city',id,label}}
function baseIntent(){return normalizeFlightTravelIntent({
  tripPattern:'round_trip',
  originSet:{mode:'specific',places:[place('TYO','東京')]},
  destinationSet:{mode:'any_of',places:[place('HNL','ホノルル'),place('SYD','シドニー')]},
  dateSet:{mode:'any_of',options:[
    {kind:'exact',outboundDate:'2027-01-10',returnDate:'2027-01-14'},
    {kind:'month',year:2027,month:2,stayLength:{minNights:5,maxNights:7}},
  ]},
});}

test('default alternatives behave as a Cartesian set',()=>{
  const result=evaluateFlightTravelIntent(baseIntent(),{origin:place('TYO','東京'),destination:place('SYD','シドニー'),outboundDate:'2027-02-08',returnDate:'2027-02-14',tripPattern:'round_trip'});
  assert.equal(result.requiredMatch,true);
  assert.equal(result.destination.state,'pass');
  assert.equal(result.date.state,'pass');
});

test('explicit scenarios couple destination and date instead of allowing Cartesian mixing',()=>{
  const intent=normalizeFlightTravelIntent({...baseIntent(),scenarios:[
    {destinationSet:{mode:'specific',places:[place('HNL','ホノルル')]},dateSet:{mode:'month',options:[{kind:'month',year:2027,month:1}]}},
    {destinationSet:{mode:'specific',places:[place('SYD','シドニー')]},dateSet:{mode:'month',options:[{kind:'month',year:2027,month:3}]}},
  ]});
  const wrongPair=evaluateFlightTravelIntent(intent,{origin:place('TYO','東京'),destination:place('SYD','シドニー'),outboundDate:'2027-01-10',returnDate:'2027-01-15',tripPattern:'round_trip'});
  assert.equal(wrongPair.requiredMatch,false);
  assert.equal(wrongPair.scenario.state,'fail');
  const rightPair=evaluateFlightTravelIntent(intent,{origin:place('TYO','東京'),destination:place('SYD','シドニー'),outboundDate:'2027-03-10',returnDate:'2027-03-15',tripPattern:'round_trip'});
  assert.equal(rightPair.requiredMatch,true);
});

test('missing itinerary evidence stays unknown and never confirms a required match',()=>{
  const result=evaluateFlightTravelIntent(baseIntent(),{origin:place('TYO','東京')});
  assert.equal(result.requiredMatch,false);
  assert.equal(result.destination.state,'unknown');
  assert.equal(result.date.state,'unknown');
  assert.ok(result.unknownRequired.includes('destinationSet'));
});

test('flexible range and anytime date options are deterministic',()=>{
  const flexible=normalizeFlightTravelIntent({...baseIntent(),dateSet:{mode:'flexible',options:[{kind:'flexible',outboundDate:'2027-04-10',returnDate:'2027-04-15',outboundFlexDays:2,returnFlexDays:2}]}});
  assert.equal(evaluateFlightTravelIntent(flexible,{origin:place('TYO'),destination:place('HNL'),outboundDate:'2027-04-12',returnDate:'2027-04-16',tripPattern:'round_trip'}).requiredMatch,true);
  const anytime=normalizeFlightTravelIntent({...baseIntent(),dateSet:{mode:'anytime',options:[{kind:'anytime',stayLength:{minNights:4,maxNights:6}}]}});
  assert.equal(evaluateFlightTravelIntent(anytime,{origin:place('TYO'),destination:place('HNL'),outboundDate:'2027-08-01',returnDate:'2027-08-06',tripPattern:'round_trip'}).requiredMatch,true);
});
