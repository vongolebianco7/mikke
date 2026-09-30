import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const modes=readFileSync(new URL('../src/composerModes.js',import.meta.url),'utf8');
const canonical=readFileSync(new URL('../src/canonicalComposerUi.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../composer-modes.css',import.meta.url),'utf8');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('hotel composer follows a stay-oriented direct-input flow',()=>{
  assert.match(modes,/hotel-stay-editor/);
  for(const field of ['destination','checkIn','checkOut','rooms','adults','maxWalkingMinutes','rating']){
    assert.match(modes,new RegExp(`data-hotel-field=["']${field}["']`));
  }
  for(const field of ['breakfastIncluded','freeCancellation']){
    assert.match(modes,new RegExp(`booleanHotelButton\\(["']${field}["']`));
  }
  const start=modes.indexOf('function hotelStayEditor');
  const end=modes.indexOf('function shoppingDomain',start);
  const hotelSection=modes.slice(start,end);
  const order=['宿泊地','日程','人数・部屋','よく使う条件','その他の条件'].map((label)=>hotelSection.indexOf(label));
  assert.ok(order.every((n)=>n>=0));
  for(let i=1;i<order.length;i++)assert.ok(order[i]>order[i-1]);
  assert.match(hotelSection,/notificationBlock\('hotel'\)/);
  assert.match(modes,/いつ知らせる？/);
  assert.match(css,/hotel-stay-editor/);
  assert.match(css,/hotel-primary-grid/);
});

test('shopping composer uses category-aware direct controls for representative domains',()=>{
  assert.match(modes,/shopping-direct-editor/);
  assert.match(modes,/shoppingPrimaryFields/);
  for(const field of ['totalCapacity','size','width','weight','modelYear','mileage','repairHistory']){
    assert.match(modes,new RegExp(`["']${field}["']`));
  }
  assert.match(modes,/data-shopping-field/);
  assert.match(modes,/shopping-advanced/);
  assert.match(css,/shopping-direct-editor/);
  assert.match(css,/shopping-primary-grid/);
});

test('natural language is the primary canonical entry rather than a secondary helper',()=>{
  assert.match(canonical,/data-composer-text/);
  assert.match(canonical,/controller\.applyText/);
  assert.match(canonical,/form\._mikkeDraft=model\.watch/);
  assert.doesNotMatch(index,/textEntryUi\.js/);
  assert.doesNotMatch(index,/text-entry-ui\.css/);
});

test('all domains use one canonical notification section separated from search conditions',()=>{
  assert.match(canonical,/data-canonical-notification/);
  assert.match(canonical,/いつ知らせる？/);
  assert.match(canonical,/data-canonical-notify-price/);
  assert.match(canonical,/data-canonical-notify="availability"/);
  assert.match(canonical,/data-canonical-notify="award"/);
});
