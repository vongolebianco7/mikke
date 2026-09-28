import test from 'node:test';
import assert from 'node:assert/strict';
import { safeOutboundUrl } from '../src/domain/outboundUrl.js';

test('allows ordinary http and https outbound URLs', () => {
  assert.equal(safeOutboundUrl('https://example.com/item'), 'https://example.com/item');
  assert.equal(safeOutboundUrl('http://example.com/item'), 'http://example.com/item');
});

test('rejects dangerous, protocol-relative and malformed outbound URLs', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,x', '//evil.example/x', 'not a url', '']) {
    assert.equal(safeOutboundUrl(value), null);
  }
});
