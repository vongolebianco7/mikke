import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRakutenRequest,
  buildYahooRequest,
  normalizeRakutenItem,
  normalizeYahooItem,
  inferShoppingAttributes,
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

test('inferShoppingAttributes extracts multiple sizes and common colors without guessing', () => {
  const attrs = inferShoppingAttributes('New Balance 996 グレー / ブラック サイズ 23cm 24.5cm 25cm');
  assert.deepEqual(attrs.sizes, ['23cm', '24.5cm', '25cm']);
  assert.deepEqual(attrs.colors, ['グレー', 'ブラック']);
});

test('normalizeRakutenItem preserves legacy fields and attaches evidence metadata', () => {
  const item = normalizeRakutenItem({
    itemCode: 'shop:123', itemName: 'NB 996', itemPrice: 9800,
    itemUrl: 'https://item.example/r', availability: 1,
    mediumImageUrls: ['https://img.example/r.jpg'], shopName: 'Rakuten Shop',
  });
  const { facts, ...legacy } = item;
  assert.deepEqual(legacy, {
    id: 'rakuten:shop:123', source: '楽天市場', title: 'NB 996', price: 9800,
    url: 'https://item.example/r', available: true,
    imageUrl: 'https://img.example/r.jpg', shopName: 'Rakuten Shop', condition: 'new',
    attributes: { sizes: [], colors: [], condition: 'new' },
  });
  assert.equal(facts.price.state, 'known');
  assert.equal(facts.availability.value, 'in_stock');
  assert.equal(facts.shipping_fee.state, 'unsupported');
  assert.equal(facts.coupon_available.state, 'unsupported');
});

test('normalizeYahooItem preserves legacy fields and attaches evidence metadata', () => {
  const item = normalizeYahooItem({
    code: 'store_123', name: 'NB 996', price: 9700, url: 'https://item.example/y',
    inStock: true, condition: 'new', image: { medium: 'https://img.example/y.jpg' },
    seller: { name: 'Yahoo Shop' },
  });
  const { facts, ...legacy } = item;
  assert.deepEqual(legacy, {
    id: 'yahoo:store_123', source: 'Yahoo!ショッピング', title: 'NB 996', price: 9700,
    url: 'https://item.example/y', available: true,
    imageUrl: 'https://img.example/y.jpg', shopName: 'Yahoo Shop', condition: 'new',
    attributes: { sizes: [], colors: [], condition: 'new' },
  });
  assert.equal(facts.price.state, 'known');
  assert.equal(facts.availability.value, 'in_stock');
  assert.equal(facts.shipping_fee.state, 'unsupported');
  assert.equal(facts.coupon_eligibility.state, 'unsupported');
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

test('configured providers start concurrently and preserve successful results when one fails', async () => {
  const started = [];
  let releaseRakuten;
  const rakutenGate = new Promise((resolve) => { releaseRakuten = resolve; });

  const fetchImpl = async (url) => {
    if (url.includes('rakuten')) {
      started.push('rakuten');
      await rakutenGate;
      throw new Error('rakuten down');
    }
    started.push('yahoo');
    releaseRakuten();
    return {
      ok: true,
      json: async () => ({ hits: [{ code: 'y1', name: 'Yahoo item', price: 9000, url: 'https://item.example/y1', inStock: true, condition: 'new' }] }),
    };
  };

  const result = await Promise.race([
    searchShoppingProviders(watch, {
      env: { RAKUTEN_APPLICATION_ID: 'r-app', RAKUTEN_ACCESS_KEY: 'r-key', YAHOO_APP_ID: 'y-app' },
      fetchImpl,
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('providers did not start concurrently')), 100)),
  ]);

  assert.deepEqual(started.sort(), ['rakuten', 'yahoo']);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].source, 'Yahoo!ショッピング');
  assert.deepEqual(result.providers, [
    { name: 'rakuten', status: 'error' },
    { name: 'yahoo', status: 'ok' },
  ]);
});

test('provider telemetry contains outcome metadata without query or request URL', async () => {
  const events = [];
  const logger = { provider: (event) => events.push(event) };
  await searchShoppingProviders(watch, {
    env: { YAHOO_APP_ID: 'yahoo-id' },
    logger,
    fetchImpl: async () => ({ ok: true, json: async () => ({ hits: [] }) }),
  });

  assert.equal(events.length, 2);
  assert.deepEqual(events.map(({ provider, outcome }) => ({ provider, outcome })), [
    { provider: 'rakuten', outcome: 'not_configured' },
    { provider: 'yahoo', outcome: 'success' },
  ]);
  assert.equal(JSON.stringify(events).includes(watch.rawQuery), false);
  assert.equal(JSON.stringify(events).includes('appid='), false);
});
