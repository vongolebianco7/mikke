import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const modes=readFileSync(new URL('../src/composerModes.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../composer-modes.css',import.meta.url),'utf8');

test('hotel composer follows a stay-oriented direct-input flow',()=>{
  assert.match(modes,/hotel-stay-editor/);
  for(const field of ['destination','checkIn','checkOut','rooms','adults','maxWalkingMinutes','rating']){
    assert.match(modes,new RegExp(`data-hotel-field=["']${field}["']`));
  }
  for(const field of ['breakfastIncluded','freeCancellation']){
    assert.match(modes,new RegExp(`booleanHotelButton\\(["']${field}["']`));
  }
  const order=['宿泊地','日程','人数・部屋','よく使う条件','その他の条件','いつ知らせる？'].map((label)=>modes.indexOf(label));
  assert.ok(order.every((n)=>n>=0));
  for(let i=1;i<order.length;i++)assert.ok(order[i]>order[i-1]);
  assert.match(css,/hotel-stay-editor/);
  assert.match(css,/hotel-primary-grid/);
});
