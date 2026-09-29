# Domain-Specific Watch Conditions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Mikke’s shallow generic product-condition model with a versioned Watch model that supports deep domain-specific conditions for flights, hotels, fashion, appliances, furniture, food, and used cars while retaining a shared trigger engine and backward compatibility.

**Architecture:** Keep the existing Watch core, tri-state evidence model, condition evaluator, and trigger engine, but introduce a domain schema registry as the source of truth for field definitions and progressive-disclosure UI. Migrate Watches to `schemaVersion: 3` with `domainConditions` while preserving v1/v2 fields through compatibility adapters. Prioritize complete flight/hotel condition representation and UI; live flight/hotel provider connectors remain out of scope and must not be fabricated.

**Tech Stack:** Browser ES modules, Node.js built-in test runner (`node --test`), localStorage, static HTML/CSS/JavaScript, existing official shopping connectors, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-29-domain-specific-watch-conditions-design.md`

## Global Constraints

- Work only on `feat/mikke-mvp`; do not merge to `main` or publish production.
- No paid or metered AI/API dependency.
- Do not add unauthorized scraping or unsupported provider access.
- `schemaVersion: 3` uses `domain` plus `domainConditions`; v1/v2 Watches remain readable without destructive localStorage migration.
- New v3 domain IDs use the spec names: `flight`, `hotel`, `fashion`, `appliance`, `furniture`, `food`, `used_car`; map legacy `appliances` to `appliance` only in compatibility code.
- New v3 field IDs use the spec’s camelCase names; legacy snake_case product fields remain readable through adapters.
- New flight `tripType` values are exactly `one_way`, `round_trip`, `multi_city`; legacy `oneway` / `roundtrip` must normalize safely.
- Required conditions with `unknown` or `unsupported` evidence must never be confirmed matches; preferred unknown evidence remains neutral.
- Flight/hotel live connectors are not part of this plan. Their Watches must save, render, parse, and evaluate with injected facts while `runWatchCheck()` continues to return a clear pending state when no approved connector exists.
- The iPhone UI uses progressive disclosure and must not dump the full domain schema at once.
- Three input modes remain `かんたん`, `組み立て`, `文章で入力`, and switching modes must preserve structured condition state rather than relying only on text round-tripping.

## Review Focus

1. **Legacy v1/v2 Watches:** `conditions.maxPrice`, `requiredKeys`, `preferredKeys`, generic `attributeId` conditions, legacy flight fields, and old `appliances` IDs preserve their meaning after v3 normalization.
2. **Flight route ambiguity:** text such as `東京からホノルル`, `羽田のみ`, `成田除外`, and `どこからでも` must not swallow later clauses or invent airport constraints.
3. **Structured mode switching:** required/preferred roles, excluded values, and fields that do not have an exact text phrase survive switching among all three composer modes.
4. **Evidence gaps:** missing baggage/refund/hotel-facility/product-domain facts remain unknown/unsupported and cannot satisfy required conditions or fire triggers.
5. **Domain-specific value types:** dates, time ranges, durations, lists, booleans, and numeric measurements compare deterministically; ambiguous or incomparable values yield unknown instead of guesses.

---

### Task 1: Domain Schema Registry for Seven Initial Domains

**Files:**
- Create: `src/domain/domainSchemas.js`
- Modify: `src/domain/categoryTemplates.js`
- Test: `tests/domainSchemas.test.js`
- Modify: `tests/categoryTemplates.test.js`

**Interfaces:**
- Produces: `getDomainSchema(domainId)` returning a defensive copy of a domain schema.
- Produces: `getDomainField(domainId, fieldId)` returning one field definition or `null`.
- Produces: `listDomainFields(domainId, level?)` returning fields ordered by disclosure level and priority.
- Produces: `inferWatchDomain(text)` returning `{ domain, subcategoryId? }`.
- Produces: `getDomainTriggerSuggestions(domainId)` returning trigger-family metadata only, never evaluation logic.
- `categoryTemplates.js` remains as a v2 compatibility adapter for product callers and maps `appliances` to v3 `appliance`.

- [ ] **Step 1: Write failing domain-registry tests**

Add `tests/domainSchemas.test.js` asserting all seven domains exist and that representative deep fields are present. At minimum assert flight includes `origin`, `destination`, `tripType`, `maxStops`, `allowedAirlines`, `checkedBaggageIncluded`, `refundable`, `maxMiles`, `maxTaxesAndFees`; hotel includes `checkIn`, `checkOut`, `maxWalkingMinutes`, `minRoomArea`, `breakfastIncluded`, `freeCancellation`; appliance refrigerator inheritance includes `totalCapacity`, `freezerCapacity`, `installationWidth`.

- [ ] **Step 2: Add tests for disclosure levels and field metadata**

Assert every field has `id`, `label`, `type`, `operators`, `group`, `priority`, `supportsRequired`, and `supportsPreferred`; assert flight fields span `basic`, `common`, `detailed`, `advanced`, and `listDomainFields('flight','basic')` does not contain advanced award fields.

- [ ] **Step 3: Add inference/compatibility tests**

Assert `inferWatchDomain('東京からホノルルの航空券') -> flight`, `軽井沢のホテル -> hotel`, `冷蔵庫 -> appliance/refrigerator`, and legacy `getCategoryTemplate('appliances')` still returns an appliance-compatible template.

- [ ] **Step 4: Run focused tests and verify RED**

Run: `node --test tests/domainSchemas.test.js tests/categoryTemplates.test.js`
Expected: FAIL because `domainSchemas.js` and v3 domain definitions do not exist.

- [ ] **Step 5: Implement `domainSchemas.js` as data-first definitions**

Define the seven initial schemas from the spec. Keep evaluation logic out of the registry. Use subcategory inheritance for appliance types and product subtypes where needed; only promote fields relevant to the selected subtype.

- [ ] **Step 6: Adapt `categoryTemplates.js`**

Make existing product-template functions delegate to domain schemas while preserving existing function signatures and legacy category IDs.

- [ ] **Step 7: Run focused tests and verify GREEN**

Run: `node --test tests/domainSchemas.test.js tests/categoryTemplates.test.js`
Expected: PASS.

- [ ] **Step 8: Commit**

Commit message: `feat: add domain schema registry`

---

### Task 2: Watch Schema v3 and Backward-Compatible Normalization

**Files:**
- Modify: `src/domain/watchSchema.js`
- Modify: `src/domain/normalizeWatch.js`
- Modify: `src/domain/watchStore.js`
- Modify: `tests/watchSchema.test.js`
- Modify: `tests/watchStore.test.js`
- Modify: `tests/normalizeWatch.test.js`

**Interfaces:**
- Produces: `normalizeDomainCondition(condition)` returning `{ id, fieldId, operator, value, unit, role, evidencePolicy }`.
- Produces: `normalizeDomainWatch(watch)` returning a v3 Watch with `domain`, `target`, `domainConditions`, `triggers`, and `metadata`.
- Existing `normalizeCondition()` / `normalizeGenericWatch()` remain compatibility helpers for v2 callers until migration finishes.
- `normalizeWatch()` becomes the single adapter from v1/v2/v3 into the v3 runtime shape, while retaining legacy readable fields required by current UI/connectors.

- [ ] **Step 1: Write failing v3 normalization tests**

Assert a flight Watch retains `domain:'flight'`, a `maxStops` DomainCondition, trigger objects, and `schemaVersion:3`; malformed `domainConditions` and `triggers` normalize to empty arrays.

- [ ] **Step 2: Write failing v2-to-v3 compatibility tests**

Assert old product `target.categoryId:'appliances'` becomes `domain:'appliance'`; old `attributeId:'installation_width'` becomes v3 `fieldId:'installationWidth'`; old required/preferred roles are preserved; legacy flight `origin`, `destination`, `directOnly`, `tripType:'roundtrip'` become v3 conditions with `tripType:'round_trip'`.

- [ ] **Step 3: Write non-destructive storage tests**

Use `loadWatches()` with mixed v1/v2/v3 records. Assert no record is dropped, custom legacy fields survive, and the stored localStorage key remains `mikke.watches.v1` during this compatibility phase.

- [ ] **Step 4: Run focused tests and verify RED**

Run: `node --test tests/watchSchema.test.js tests/watchStore.test.js tests/normalizeWatch.test.js`
Expected: FAIL on absent v3 shape and adapters.

- [ ] **Step 5: Implement v3 schema helpers and compatibility maps**

Add explicit maps for legacy category IDs and snake_case field IDs. Never infer unsupported semantics during migration; unmapped legacy generic conditions remain available through a compatibility field rather than being silently discarded.

- [ ] **Step 6: Update `normalizeWatch()` and `watchStore.js`**

Return v3 runtime Watches without rewriting localStorage just because they were read. New records created by `createWatchRecord()` use v3.

- [ ] **Step 7: Run focused tests and verify GREEN**

Run: `node --test tests/watchSchema.test.js tests/watchStore.test.js tests/normalizeWatch.test.js`
Expected: PASS.

- [ ] **Step 8: Commit**

Commit message: `feat: normalize Watches to domain schema v3`

---

### Task 3: Domain Condition Evaluation and Value Types

**Files:**
- Modify: `src/domain/conditionEngine.js`
- Modify: `src/domain/evaluate.js`
- Modify: `src/domain/candidateFacts.js`
- Modify: `tests/conditionEngine.test.js`
- Modify: `tests/domain.test.js`

**Interfaces:**
- `evaluateCondition(condition, facts)` accepts v3 `fieldId` and v2 `attributeId` through one field-key adapter.
- Produces deterministic comparisons for numbers/measurements, dates, time ranges, durations, enums/lists, booleans, and text.
- `evaluateDomainConditions(conditions, facts)` returns the same required/preferred result shape currently consumed by `evaluateCandidate()`.
- `evaluateCandidate(watch,candidate)` prefers `domainConditions`, then falls back to v2 generic and v1 legacy logic.

- [ ] **Step 1: Add failing tests for v3 field IDs and unknown evidence**

Assert required `checkedBaggageIncluded=true` with unknown evidence is not a confirmed match, preferred unknown is neutral, and unsupported hotel `parking` behaves the same way.

- [ ] **Step 2: Add failing date/time/duration/list tests**

Cover `checkIn` date comparison, `departureTimeRange` against a known departure time, `maxTotalDuration <= 720 min`, and `allowedAirlines in ['ANA','JAL']`. Invalid dates, malformed ranges, and incompatible units must return `unknown`.

- [ ] **Step 3: Add regression tests for existing units/operators**

Retain current `500L`, `70cm`, `30000km`, list, boolean, and text operator coverage.

- [ ] **Step 4: Run focused tests and verify RED**

Run: `node --test tests/conditionEngine.test.js tests/domain.test.js`
Expected: FAIL on v3 field IDs and new value types.

- [ ] **Step 5: Extend the condition engine minimally**

Resolve the condition key as `fieldId ?? attributeId`. Add only deterministic parsers/comparators required by the spec; do not guess locale dates or natural-language times inside the evaluator.

- [ ] **Step 6: Update candidate fact normalization**

Allow candidate `facts` keyed by v3 field IDs and preserve source/unit/confidence metadata. Keep legacy attribute aliases for current shopping candidates.

- [ ] **Step 7: Integrate `evaluateCandidate()` with v3**

Keep existing score and near-match semantics; include `unknownRequired` IDs for v3 fields.

- [ ] **Step 8: Run focused tests and verify GREEN**

Run: `node --test tests/conditionEngine.test.js tests/domain.test.js`
Expected: PASS.

- [ ] **Step 9: Commit**

Commit message: `feat: evaluate domain-specific conditions`

---

### Task 4: Deep Flight and Hotel Deterministic Parsers

**Files:**
- Create: `src/domain/parseFlightWatch.js`
- Create: `src/domain/parseHotelWatch.js`
- Modify: `src/domain/parseWatch.js`
- Create: `tests/parseFlightWatch.test.js`
- Create: `tests/parseHotelWatch.test.js`
- Modify: `tests/domain.test.js`

**Interfaces:**
- Produces: `parseFlightWatch(text)` returning `{ domain:'flight', target, domainConditions, triggers }`.
- Produces: `parseHotelWatch(text)` returning `{ domain:'hotel', target, domainConditions, triggers }`.
- `parseWatchQuery(raw)` routes to the domain parser and returns v3 plus legacy-compatible summary fields where current UI needs them.

- [ ] **Step 1: Write failing flight route/journey tests**

Cover `東京からホノルル、往復、直行便` -> origin/destination/tripType/nonstop conditions; `羽田のみ、成田除外` -> explicit airport include/exclude constraints; `どこからでもホノルル` -> no invented origin restriction.

- [ ] **Step 2: Write failing flight preference tests**

Cover `ANAかJAL`, `LCC除外`, `乗り換え1回まで`, `午前発`, `エコノミー`, `受託手荷物込み`, `変更可`, `払い戻し可`, adults/children/infants, `10万マイル以下`, and `諸費用3万円以下`. Use required/preferred wording where present.

- [ ] **Step 3: Write failing flight price-trigger tests**

Cover cash price threshold, percentage drop, Watch low, and award-seat availability requests without claiming current availability.

- [ ] **Step 4: Write failing hotel tests**

Cover area/dates/rooms/passengers, station walking minutes, nonsmoking, room size, breakfast, onsen/public bath, parking, free cancellation, rating, and total/nightly price when wording is explicit.

- [ ] **Step 5: Add ambiguity tests from Review Focus**

Assert route parsing stops at delimiters and never consumes `往復`/`直行便` as destination text. Ambiguous date wording stays in raw metadata instead of becoming a fabricated date.

- [ ] **Step 6: Run parser tests and verify RED**

Run: `node --test tests/parseFlightWatch.test.js tests/parseHotelWatch.test.js tests/domain.test.js`
Expected: FAIL because deep domain parsers do not exist.

- [ ] **Step 7: Implement `parseFlightWatch()`**

Use explicit regex/dictionaries for supported Japanese phrases and canonical v3 values. Do not call external AI/services and do not infer hidden itinerary facts.

- [ ] **Step 8: Implement `parseHotelWatch()`**

Use the same deterministic principle. Store unparsed clauses in metadata rather than inventing semantics.

- [ ] **Step 9: Route `parseWatchQuery()` through the new parsers**

Return schemaVersion 3 for flight/hotel and preserve enough legacy summary fields for current rendering during the transition.

- [ ] **Step 10: Run focused tests and verify GREEN**

Run: `node --test tests/parseFlightWatch.test.js tests/parseHotelWatch.test.js tests/domain.test.js`
Expected: PASS.

- [ ] **Step 11: Commit**

Commit message: `feat: parse deep flight and hotel Watch conditions`

---

### Task 5: Migrate Product Parsers to Domain Conditions

**Files:**
- Modify: `src/domain/parseGenericCondition.js`
- Modify: `src/domain/parseWatch.js`
- Modify: `tests/parseGenericCondition.test.js`
- Modify: `tests/domain.test.js`

**Interfaces:**
- Existing product parsing keeps working, but the canonical output becomes `{ domain, target, domainConditions, triggers }` with v3 camelCase `fieldId` values.
- v2 `{ target, conditions, triggers }` may remain as a compatibility return for old direct callers until the UI migration is complete.

- [ ] **Step 1: Write failing v3 product-output tests**

For fashion, appliance, furniture, food, and used car, assert `domain` and representative camelCase `fieldId` values: `size`, `installationWidth`, `shippingFee`/landed-price trigger, `minimumRemainingShelfLife` where parsed, `modelYear`, `repairHistory`.

- [ ] **Step 2: Add compatibility tests for v2 callers**

Ensure current parser tests can still access existing generic outputs during the transition and no previously supported phrase loses meaning.

- [ ] **Step 3: Run focused tests and verify RED**

Run: `node --test tests/parseGenericCondition.test.js tests/domain.test.js`
Expected: FAIL because product parser still emits v2 `attributeId` rules.

- [ ] **Step 4: Add a product v2-to-v3 compile layer**

Reuse current deterministic parsing instead of rewriting it. Translate known legacy field IDs to v3 fields and preserve unknown clauses as raw metadata.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node --test tests/parseGenericCondition.test.js tests/domain.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `feat: compile product Watches to domain schema v3`

---

### Task 6: Domain-Aware Composer Model and Structured Mode State

**Files:**
- Modify: `src/domain/composerModel.js`
- Modify: `src/composerModes.js`
- Modify: `composer-modes.css`
- Modify: `tests/composerModel.test.js`
- Modify: `tests/app-composer.test.js`

**Interfaces:**
- Produces: `buildComposerModel(subjectOrWatch, explicitDomain?)` with `{ domain, subcategoryId, basic, common, detailed, advanced, triggers }`.
- Produces a structured composer draft containing `domain`, `target`, `domainConditions`, and `triggers` shared by all three input modes.
- Existing phrase helpers remain only as UI shortcuts; they are no longer the source of truth for mode state.

- [ ] **Step 1: Write failing flight composer tests**

Assert flight `basic` contains route/trip/dates/passengers, `common` contains stops/airline/cabin/time, `detailed` contains baggage/refund/change/duration, and `advanced` contains award/miles/taxes/alliance.

- [ ] **Step 2: Write failing hotel and product composer tests**

Assert hotel groups reflect the schema and current product categories still expose relevant fields without dumping the full registry.

- [ ] **Step 3: Write failing mode-preservation tests**

Create a structured flight draft with required `HND`, excluded `NRT`, preferred `ANA/JAL`, and baggage/refund fields. Switch simulated mode serialization paths and assert the structured conditions remain identical even if display phrases differ.

- [ ] **Step 4: Run focused tests and verify RED**

Run: `node --test tests/composerModel.test.js tests/app-composer.test.js`
Expected: FAIL because flight/hotel use hard-coded shallow options and state is text-hydrated.

- [ ] **Step 5: Make `composerModel.js` schema-driven**

Remove product-only grouping assumptions. Build field groups directly from `domainSchemas.js` and return domain-relevant trigger suggestions.

- [ ] **Step 6: Replace flight/hotel legacy option tables in `composerModes.js`**

Render the same progressive groups for every domain. Keep iPhone-first disclosure: basic visible, common next, detailed/advanced collapsed or secondary.

- [ ] **Step 7: Introduce one structured composer draft**

Mode changes update presentation only. Text input reparses into the draft when the user edits text; easy/builder edits mutate structured conditions directly and regenerate display text only as a convenience.

- [ ] **Step 8: Update CSS for four disclosure levels**

Preserve current visual language and touch targets; do not create a separate mobile page.

- [ ] **Step 9: Run focused tests and verify GREEN**

Run: `node --test tests/composerModel.test.js tests/app-composer.test.js`
Expected: PASS.

- [ ] **Step 10: Commit**

Commit message: `feat: make composer domain-aware`

---

### Task 7: App Rendering, Role Editing, and Guidance for v3 Conditions

**Files:**
- Modify: `src/app.js`
- Modify: `src/domain/watchGuidance.js`
- Modify: `tests/app-composer.test.js`
- Modify: `tests/watchGuidance.test.js`

**Interfaces:**
- `app.js` resolves v3 condition labels through `getDomainField()` instead of a hard-coded product/flight map.
- Role editing addresses a DomainCondition by stable condition ID or field ID and respects `supportsRequired` / `supportsPreferred`.
- `estimateStrictness(watch)` counts v3 required/preferred DomainConditions, with legacy fallback.

- [ ] **Step 1: Write failing v3 confirmation-render tests**

Assert a flight Watch confirmation can display route, round trip, one-stop maximum, ANA/JAL, baggage, and price trigger labels; assert hotel fields render human-readable labels.

- [ ] **Step 2: Write failing role-edit tests**

Assert any schema field supporting both roles can move required↔preferred without changing its operator/value; unsupported role toggles are not offered.

- [ ] **Step 3: Write failing guidance tests**

Assert strictness is derived from v3 condition roles and unknown-result relaxation suggestions reference human-readable domain labels rather than raw field IDs where possible.

- [ ] **Step 4: Run focused tests and verify RED**

Run: `node --test tests/app-composer.test.js tests/watchGuidance.test.js`
Expected: FAIL because rendering/guidance is legacy-key based.

- [ ] **Step 5: Add small rendering helpers instead of expanding hard-coded maps**

Keep `src/app.js` changes narrow: resolve field definition, format value by type, render required/preferred/notification groups, and retain legacy fallback.

- [ ] **Step 6: Update guidance for v3**

Count DomainConditions and generate safe relaxation proposals without mutating the Watch automatically.

- [ ] **Step 7: Run focused tests and verify GREEN**

Run: `node --test tests/app-composer.test.js tests/watchGuidance.test.js`
Expected: PASS.

- [ ] **Step 8: Commit**

Commit message: `feat: render domain-specific Watch conditions`

---

### Task 8: Connector Boundary and Evidence Safety

**Files:**
- Modify: `src/connectors/runWatchCheck.js`
- Modify: `src/domain/candidateFacts.js`
- Modify: `tests/connectors.test.js`
- Modify: `tests/conditionEngine.test.js`
- Modify: `tests/server-shopping.test.js`

**Interfaces:**
- Product-domain Watches continue through approved shopping connectors.
- Flight/hotel Watches return `connector_pending` until an approved source exists; no sample flight/hotel facts are fabricated.
- Injected candidates/facts in tests can still exercise v3 evaluation independently of live connectors.

- [ ] **Step 1: Write failing connector-domain tests**

Assert v3 `fashion`/`appliance`/other product domains route to the shopping connector compatibility path, while `flight` and `hotel` remain pending and make zero provider calls.

- [ ] **Step 2: Write failing evidence-safety tests**

Assert missing `checkedBaggageIncluded`, `refundable`, hotel `parking`, or appliance `warrantyYears` facts remain unknown/unsupported and cannot produce a required match. Preserve current coupon eligibility and shipping evidence tests.

- [ ] **Step 3: Run focused tests and verify RED**

Run: `node --test tests/connectors.test.js tests/conditionEngine.test.js tests/server-shopping.test.js`
Expected: FAIL where connector routing still depends only on `watch.type === 'shopping'`.

- [ ] **Step 4: Add a domain-to-connector compatibility adapter**

Treat product domains as shopping-backed only where existing approved providers apply. Keep unsupported domains pending; do not add network calls.

- [ ] **Step 5: Preserve provider evidence metadata**

Do not derive domain-specific facts from titles unless an existing deterministic inference is explicitly safe and marked inferred. Empty arrays are not evidence that a value is false/absent.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `node --test tests/connectors.test.js tests/conditionEngine.test.js tests/server-shopping.test.js`
Expected: PASS.

- [ ] **Step 7: Commit**

Commit message: `feat: route v3 Watches through safe connector boundaries`

---

### Task 9: Full Regression, CI, and iPhone Preview

**Files:**
- Modify only files required by regressions discovered during verification.
- Update Floot preview wrapper after branch verification; no production publish.

**Interfaces:**
- No new public code interface; this task verifies the integrated branch.

- [ ] **Step 1: Run the complete local-equivalent test suite**

Run: `npm test`
Expected: exit 0, zero failed tests.

- [ ] **Step 2: Run build/security/compliance gates**

Run: `npm run build && npm run security && npm run compliance`
Expected: all commands exit 0.

- [ ] **Step 3: Verify representative end-to-end parses in tests**

Ensure these scenarios are covered and green:
- flight: `羽田からホノルル、往復、直行便、ANAかJAL、午前発、乳児1人、12万円以下になったら`;
- hotel: destination/date/occupancy plus station distance and cancellation;
- refrigerator: capacity/install width/color/condition/price;
- used car: year/mileage/repair history/equipment/total price.

- [ ] **Step 4: Push/observe fresh GitHub Actions for the current HEAD**

Verify `test`, `build`, `security`, and `compliance-static` complete successfully. Do not infer success from an older commit.

- [ ] **Step 5: Update the temporary Floot preview to the verified commit**

Change only the CDN commit in the existing temporary preview project. Do not call production publish.

- [ ] **Step 6: Capture an iPhone 15 preview**

Use the existing Floot preview and verify no horizontal page overflow, domain condition groups are legible, flight conditions are deep rather than the old four hard-coded options, and advanced fields are progressively disclosed.

- [ ] **Step 7: If visual/runtime defects appear, fix with regression coverage and rerun all gates**

Do not claim completion until the fresh full verification is green.

- [ ] **Step 8: Create a final coherent commit/checkpoint**

Commit message if fixes are needed: `fix: finish domain Watch condition migration`
Create a Floot checkpoint named `Domain-specific Watch conditions` after the preview is verified.
