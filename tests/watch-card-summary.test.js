import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeWatchCard } from '../src/domain/watchCardSummary.js';

test('shopping watch summary exposes subject, key conditions and notification', () => {
  const summary=summarizeWatchCard({domain:'fashion',target:{title:'New Balance 996'},domainConditions:[
    {fieldId:'size',value:'24.5cm',operator:'eq',role:'required'},
    {fieldId:'color',value:['グレー'],operator:'in',role:'required'},
    {fieldId:'condition',value:['新品'],operator:'in',role:'required'}
  ],triggers:[{metric:'price',operator:'lte',value:12000,unit:'JPY'}]});
  assert.equal(summary.subject,'New Balance 996');
  assert.deepEqual(summary.conditions,['サイズ 24.5cm','カラー グレー','状態 新品']);
  assert.deepEqual(summary.notifications,['12,000円以下になったら']);
});

test('flight watch summary prioritizes route and travel intent', () => {
  const summary=summarizeWatchCard({domain:'flight',travelIntent:{tripPattern:'round_trip',originSet:{mode:'alternatives',places:[{label:'東京'}]},destinationSet:{mode:'alternatives',places:[{label:'ホノルル'}]},dateSet:{options:[{kind:'month',year:2027,month:1,stayLength:{minNights:5,maxNights:7}}]},cabin:{allowed:['economy']}},flightFilters:[{fieldId:'nonstopOnly',operator:'is_true',value:true},{fieldId:'allowedAirlines',operator:'in',value:['ANA','JAL']}],triggers:[{metric:'availability',operator:'eq',value:true}]});
  assert.equal(summary.subject,'東京 → ホノルル');
  assert.ok(summary.conditions.includes('往復'));
  assert.ok(summary.conditions.includes('2027年1月・5〜7泊'));
  assert.ok(summary.conditions.includes('直行便'));
  assert.deepEqual(summary.notifications,['空席が出たら']);
});

test('hotel watch summary prioritizes destination, dates and stay conditions', () => {
  const summary=summarizeWatchCard({domain:'hotel',target:{title:'軽井沢のホテル'},domainConditions:[
    {fieldId:'destination',value:'軽井沢',operator:'eq'},
    {fieldId:'checkIn',value:'2026-10-26',operator:'eq'},
    {fieldId:'checkOut',value:'2026-10-27',operator:'eq'},
    {fieldId:'breakfastIncluded',value:true,operator:'is_true'},
    {fieldId:'freeCancellation',value:true,operator:'is_true'}
  ],triggers:[{metric:'availability',operator:'eq',value:true}]});
  assert.equal(summary.subject,'軽井沢');
  assert.ok(summary.conditions.includes('10/26〜10/27'));
  assert.ok(summary.conditions.includes('朝食付き'));
  assert.ok(summary.conditions.includes('キャンセル無料'));
  assert.deepEqual(summary.notifications,['空室が出たら']);
});
