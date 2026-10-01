import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { providerCreditsHtml } from '../src/domain/providerCredits.js';

test('provider credits render only providers contacted in the current session', () => {
  const rakutenOnly = providerCreditsHtml({ rakuten: true, yahoo: false });
  assert.match(rakutenOnly, /Supported by Rakuten Developers/);
  assert.doesNotMatch(rakutenOnly, /Yahoo! JAPAN/);

  const yahooOnly = providerCreditsHtml({ rakuten: false, yahoo: true });
  assert.doesNotMatch(yahooOnly, /Supported by Rakuten Developers/);
  assert.match(yahooOnly, /Yahoo! JAPAN/);

  assert.equal(providerCreditsHtml({ rakuten: false, yahoo: false }), '');
});

test('Mikke CSS does not style provider credit links or text', () => {
  const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  assert.equal(/provider-credit[^}]*color\s*:/.test(css), false);
  assert.equal(/provider-credit[^}]*font-size\s*:/.test(css), false);
});
