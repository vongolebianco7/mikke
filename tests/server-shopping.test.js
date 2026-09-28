import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRakutenRequest,
  buildYahooRequest,
  normalizeRakutenItem,
  normalizeYahooItem,
  searchShoppingProviders,
} from '../src/server/shoppingProviders.js';

const watch = {
  type: 'shopping',
  rawQuery: 'New Balance 996、24.5cm、グレー、1万円以下',
  conditions: { maxPrice: 10000, excludeUsed: true },
};

test('buildRakutenRequest keeps credentials server-side and applies conservative limits', () => {
  const request = buildRakutenRequest(watch, {
    applicationId: 'app-id',
    accessKey: 'access-key',
  });
  assert.equal(request.headers.accessKey, 'access-key');
  assert.match(request.url, /applicationId=app-id/);
  assert.match(request.url, /hits=20/);
  assert.match(request.url, /maxPrice=10000/);
  assert.match(request.url, /availability=1/);
  assert.match(request.url, /formatVersion=2/);
});

test('buildYahooRequest requests new items and caps result count', () => {
  const request = buildYahooRequest(watch, { appId: 'yahoo-id' });
  assert.match(request.url, /appid=yahoo-id/);
  assert.match(request.url, /condition=new/);
  assert.match(request.url, /results=20/);
  assert.match(request.url, /price_to=10000/);
});

test('normalizeRakutenItem maps only documented response fields', () => {
  const item = normalizeRakutenItem({
    itemCode: 'shop:123', itemName: 'NB 996', itemPrice: 9800,
    itemUrl: 'https://item.example/r', availability: 1,
    mediumImageUrls: ['https://img.example/r.jpg'], shopName: 'Rakuten Shop',
  });
  assert.deepEqual(item, {
    id: 'rakuten:shop:123', source: '楽天市場', title: 'NB 996', price: 9800,
    url: 'https://item.example/r', available: true,
    imageUrl: 'https://img.example/r.jpg', shopName: 'Rakuten Shop', condition: 'new',
  });
});

test('normalizeYahooItem maps price, stock, seller and image fields', () => {
  const item = normalizeYahooItem({
    code: 'store_123', name: 'NB 996', price: 9700, url: 'https://item.example/y',
    inStock: true, condition: 'new', image: { medium: 'https://img.example/y.jpg' },
    seller: { name: 'Yahoo Shop' },
  });
  assert.deepEqual(item, {
    id: 'yahoo:store_123', source: 'Yahoo!ショッピング', title: 'NB 996', price: 9700,
    url: 'https://item.example/y', available: true,
    imageUrl: 'https://img.example/y.jpg', shopName: 'Yahoo Shop', condition: 'new',
  });
});

test('searchShoppingProviders skips unconfigured providers and does not retry failures', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; throw new Error('network down'); };
  const result = await searchShoppingProviders(watch, {
    env: { YAHOO_APP_ID: 'yahoo-id' }, fetchImpl,
  });
  assert.equal(calls, 1);
  assert.equal(result.items.length, 0);
  assert.deepEqual(result.providers, [
    { name: 'rakuten', status: 'not_configured' },
    { name: 'yahoo', status: 'error' },
  ]);
});
