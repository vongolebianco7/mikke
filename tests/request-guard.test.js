import test from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter, callerBucket, withInFlightDedup, searchKey } from '../src/server/requestGuard.js';

test('rate limiter allows up to limit then blocks with retry-after seconds', () => {
  let t = 1000;
  const limiter = createRateLimiter({ limit: 2, windowMs: 1000, now: () => t });
  assert.deepEqual(limiter.check('a'), { allowed: true, retryAfter: 0 });
  assert.deepEqual(limiter.check('a'), { allowed: true, retryAfter: 0 });
  const blocked = limiter.check('a');
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfter, 1);
  t = 2001;
  assert.equal(limiter.check('a').allowed, true);
});

test('caller bucket prefers platform IP headers and has a safe fallback', () => {
  assert.equal(callerBucket({ headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' } }), 'ip:203.0.113.7');
  assert.equal(callerBucket({ headers: {} }), 'anonymous');
});

test('identical concurrent searches share one in-flight promise', async () => {
  let calls = 0;
  let resolve;
  const task = () => { calls += 1; return new Promise((r) => { resolve = r; }); };
  const a = withInFlightDedup('same', task);
  const b = withInFlightDedup('same', task);
  assert.equal(calls, 1);
  resolve('ok');
  assert.equal(await a, 'ok');
  assert.equal(await b, 'ok');
});

test('different search keys do not deduplicate', async () => {
  let calls = 0;
  const task = async () => { calls += 1; return 'ok'; };
  await Promise.all([withInFlightDedup('a', task), withInFlightDedup('b', task)]);
  assert.equal(calls, 2);
});

test('search key is stable for equivalent structured searches and contains no caller data', () => {
  const a = searchKey({ rawQuery: '  New Balance 996 ', conditions: { maxPrice: 10000, colors: ['グレー'] } });
  const b = searchKey({ rawQuery: 'New Balance 996', conditions: { colors: ['グレー'], maxPrice: 10000 } });
  assert.equal(a, b);
  assert.equal(a.includes('203.0.113.7'), false);
});
