import test from 'node:test';
import assert from 'node:assert/strict';
import { groupProducts } from '../src/domain/groupProducts.js';

const item=(id,price,attrs={})=>({id,title:'New Balance 996 グレー',source:id.split(':')[0],price,attributes:attrs});

test('groups exact strong product identifiers and sorts provider offers by price',()=>{
  const groups=groupProducts([
    item('rakuten:1',12000,{jan:'4901234567890'}),
    item('yahoo:2',10800,{jan:'4901234567890'}),
    item('other:3',11500,{modelNumber:'CM996GR2'}),
    item('other:4',10900,{modelNumber:'CM996GR2'}),
  ]);
  assert.equal(groups.length,2);
  assert.deepEqual(groups[0].offers.map(x=>x.price),[10800,12000]);
  assert.equal(groups[0].identity.kind,'jan');
  assert.deepEqual(groups[1].offers.map(x=>x.price),[10900,11500]);
});

test('title similarity alone never merges uncertain products',()=>{
  const groups=groupProducts([item('rakuten:1',12000),item('yahoo:2',10800)]);
  assert.equal(groups.length,2);
  assert.ok(groups.every(group=>group.offers.length===1));
});

test('different strong identifiers remain separate even with identical titles',()=>{
  const groups=groupProducts([item('a:1',10000,{upc:'111'}),item('b:2',9000,{upc:'222'})]);
  assert.equal(groups.length,2);
});
