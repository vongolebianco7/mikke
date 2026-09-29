import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getDomainField } from '../src/domain/domainSchemas.js';

const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const modes = readFileSync(new URL('../src/composerModes.js', import.meta.url), 'utf8');
const flightUi = readFileSync(new URL('../src/flightWatchUi.js', import.meta.url), 'utf8');
const flightDisplay = readFileSync(new URL('../src/domain/flightDisplay.js', import.meta.url), 'utf8');
const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const modeCss = readFileSync(new URL('../composer-modes.css', import.meta.url), 'utf8');
const evidenceCss = readFileSync(new URL('../result-evidence.css', import.meta.url), 'utf8');
const evidenceModule = readFileSync(new URL('../src/domain/resultEvidence.js', import.meta.url), 'utf8');

test('Watch composer wires deterministic phrase suggestions into the UI', () => {
  assert.match(app, /suggestWatchPhrases/);
  assert.match(app, /data-suggestion/);
  assert.match(css, /suggestion-strip/);
  assert.match(css, /overflow-x:auto/);
});

test('Watch composer visibly separates required preferred and notification conditions', () => {
  assert.match(app, /必須/);
  assert.match(app, /希望/);
  assert.match(app, /通知条件/);
  assert.match(app, /data-role-toggle/);
});

test('v3 confirmation rendering resolves domain condition labels from the schema', () => {
  assert.match(app, /getDomainField/);
  assert.match(app, /domainConditions/);
  assert.match(app, /fieldId/);
  assert.match(app, /supportsRequired/);
  assert.match(app, /supportsPreferred/);
});

test('v4 flight confirmation renders Travel Intent separately from filters and notifications', () => {
  assert.match(flightDisplay, /flightIntentChips/);
  assert.match(flightDisplay, /flightIntentGroupsHtml/);
  assert.match(flightDisplay, /travelIntent/);
  assert.match(flightDisplay, /flightFilters/);
  assert.match(flightDisplay, /旅程/);
  assert.match(flightDisplay, /日付候補/);
  assert.match(flightUi, /data-flight-v4-summary/);
  assert.match(flightUi, /loadWatches/);
  assert.match(index, /flightWatchUi\.js/);
});

test('v4 flight confirmation hides the superseded legacy condition groups', () => {
  assert.match(flightUi, /data-flight-v4-legacy-groups/);
  assert.match(modeCss, /\[data-flight-v4-legacy-groups="true"\]\s*\{[^}]*display\s*:\s*none/);
});

test('subcategory conditions can resolve labels even from generic result rendering', () => {
  assert.equal(getDomainField('appliance', 'totalCapacity')?.label, '総容量');
  assert.equal(getDomainField('appliance', 'washCapacity')?.label, '洗濯容量');
});

test('result cards distinguish unsupported evidence from temporarily unknown evidence', () => {
  assert.match(app, /summarizeEvidenceState/);
  assert.match(evidenceModule, /このデータ元では判定不可/);
  assert.match(evidenceModule, /未確認/);
  assert.match(evidenceCss, /evidence-state/);
});

test('Watch composer is one domain-aware flow instead of three input modes', () => {
  assert.doesNotMatch(modes, /かんたん/);
  assert.doesNotMatch(modes, /data-composer-mode/);
  assert.doesNotMatch(modes, /\bcomposerMode\b/);
  assert.doesNotMatch(modeCss, /mode-cards/);
  assert.match(modes, /何を探す？/);
  assert.match(modes, /文章から条件を作る/);
  assert.match(modes, /data-composer-domain/);
  assert.match(modeCss, /unified-composer/);
});

test('flight and hotel composer are driven by domain schema groups instead of shallow legacy option tables', () => {
  assert.match(modes, /createComposerModel/);
  assert.match(modes, /basic/);
  assert.match(modes, /common/);
  assert.match(modes, /detailed/);
  assert.match(modes, /advanced/);
  assert.doesNotMatch(modes, /legacyEasyOptions/);
  assert.doesNotMatch(modes, /legacyBuilderOptions/);
});

test('flight composer keeps one structured Travel Intent draft', () => {
  assert.match(modes, /flightTravelDraft/);
  assert.match(modes, /applyFlightTravelIntentEdit/);
  assert.doesNotMatch(modes, /set_input_mode/);
});

test('flight composer uses flight-search ordering and keeps dates and notifications distinct', () => {
  assert.match(modes, /flight-intent-panel/);
  assert.match(modes, /出発地/);
  assert.match(modes, /行き先/);
  assert.match(modes, /いつ行く？/);
  assert.match(modes, /日付指定/);
  assert.match(modes, /月指定/);
  assert.match(modes, /期間指定/);
  assert.match(modes, /いつでも/);
  assert.match(modes, /data-flight-destination-remove/);
  assert.match(modes, /data-flight-date-remove/);
  assert.match(modes, /よく使う条件/);
  assert.match(modes, /通知/);
  assert.match(modeCss, /flight-intent-panel/);
  assert.match(modeCss, /flight-date-modes/);
  assert.match(modeCss, /flight-primary-filters/);
});

test('flight composer publishes the current structured draft on the form for save integration', () => {
  assert.match(modes, /_mikkeFlightDraft/);
  assert.match(modes, /publishFlightDraft/);
});

test('travel composer keeps advanced conditions progressively disclosed on mobile', () => {
  assert.match(modes, /advanced-conditions/);
  assert.match(modeCss, /advanced-conditions/);
  assert.match(modeCss, /condition-family/);
});
