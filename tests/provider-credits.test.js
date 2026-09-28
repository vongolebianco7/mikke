import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { providerCreditsHtml } from '../src/domain/providerCredits.js';

test('provider credits are static and not session-contact dependent', () => {
  const html = providerCreditsHtml();
  assert.match(html, /Supported by Rakuten Developers/);
  assert.match(html, /Yahoo! JAPAN/);
});

test('Mikke CSS does not style provider credit links or text', () => {
  const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  assert.equal(/provider-credit[^}]*color\s*:/.test(css), false);
  assert.equal(/provider-credit[^}]*font-size\s*:/.test(css), false);
});
