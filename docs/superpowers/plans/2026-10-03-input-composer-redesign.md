# Mikke Input Composer Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Mikke’s current stacked fixed-form composer with one iPhone-first canonical input flow that turns free text and direct edits into the same condition-card Watch draft, preserves ambiguity instead of dropping it, and remains usable from 2 to 20+ conditions.

**Architecture:** Introduce a canonical draft store, a condition catalog, an interpretation proposal layer, and deterministic merge rules. The UI becomes a thin shell over those modules: one intent entry, target summary, condition-card list, unresolved list, add-condition sheet, condition editor sheet, and sticky save bar. Existing Watch storage remains unchanged; adapters map legacy Watch fields to and from the new composer model so old Watches reopen without destructive migration.

**Tech Stack:** Vanilla JavaScript ES modules, Node.js built-in test runner, existing DOM/jsdom-style integration harness, existing GitHub Actions release-gates, Vercel Preview.

**Spec:** `docs/superpowers/specs/2026-10-02-input-composer-redesign-design.md`

## Global Constraints

- Validate against a versioned corpus of at least 800 scenarios before the new composer replaces the old one.
- No paid or metered API/service additions.
- Current beta remains manual-check; UI must say `変化条件` / `確認時にこの変化を見つける` and must not imply background monitoring or push delivery.
- iPhone Safari is the primary client; core controls require at least 44px targets and no horizontal scrolling.
- Existing saved Watches must reopen without destructive migration; opening alone must not rewrite storage.
- Unknown, ambiguous, and unsupported intent must remain visible and recoverable; silent loss is forbidden.
- Existing release gates (`test`, `build`, `security`, `compliance-static`, `nonfunctional-static`) must stay green.
- `main` and production/public beta remain untouched without explicit approval.

## Review Focus

- Approximate price wording such as `1万円くらい` must become a reviewable preference, not a hard `<= 10000` filter.
- Exception wording such as `中古は不可、未使用開封品ならOK` must not collapse into contradictory hard filters.
- Partial follow-up edits such as `同じ条件で色だけ黒` must preserve unrelated manual edits and replace only the intended attribute.
- Category switching must preserve still-valid conditions and move invalid ones to review instead of deleting them.
- A 20+ condition Watch must remain operable on a narrow iPhone viewport without exposing a giant permanent form.

---

## File Structure

**New domain modules**
- `src/domain/composerDraftStore.js` — canonical draft state and explicit edit operations.
- `src/domain/conditionCatalog.js` — cross-domain attribute metadata, labels, operators, units, enumerations, recommendations.
- `src/domain/interpretInput.js` — wraps existing parsers and emits proposals with confidence/review/unresolved states.
- `src/domain/mergeInterpretation.js` — deterministic proposal-to-draft merge, conflict detection, manual-edit precedence.
- `src/domain/composerLegacyAdapter.js` — maps existing saved Watch structures to/from the new composer draft without storage migration on open.

**New UI modules**
- `src/inputComposerUi.js` — composer shell/mount lifecycle only.
- `src/inputComposerConditionList.js` — renders target, card list, unresolved list and compact summary.
- `src/inputComposerSheets.js` — add-condition and condition-edit bottom sheets.
- `input-composer.css` — iPhone-first layout, cards, sheets, sticky save bar.

**Corpus and tests**
- `tests/fixtures/input-composer-corpus.json` — 800+ versioned scenario rows.
- `tests/input-composer-corpus.test.js` — semantic corpus assertions.
- `tests/composer-draft-store.test.js`
- `tests/merge-interpretation.test.js`
- `tests/condition-catalog.test.js`
- `tests/composer-legacy-adapter.test.js`
- `tests/input-composer-ui.test.js`
- Existing `tests/product-promise-ui.test.js`, regression suites, and release-gate scripts remain active.

**Modified integration points**
- `index.html` — load new composer CSS/module.
- `src/app.js` — mount/open composer via the new UI shell while preserving existing Watch persistence API.
- `src/canonicalComposerUi.js` — retained initially behind a development fallback, then removed from the active path after replacement gates pass.
- `package.json` — include new tests in existing scripts only if current wildcard/test layout does not already pick them up.

---

### Task 1: Canonical Draft Store

**Files:**
- Create: `src/domain/composerDraftStore.js`
- Test: `tests/composer-draft-store.test.js`

**Interfaces:**
- Consumes: existing Watch-like objects from current parser/storage code.
- Produces: `createComposerDraftStore(initialDraft?)`, returning `{ getDraft, setTarget, upsertCondition, removeCondition, setConditionRole, setUnresolved, removeUnresolved, setCategory, validate }`.
- Canonical visible condition shape: `{ id, attributeId, operator, value, unit?, role, supportState, sourceText?, source, manuallyEdited }`.

- [ ] **Step 1: Write failing tests** for id-stable upsert, role change without recreation, removal, unresolved preservation, category change preservation, contradiction reporting, and 20-condition storage without truncation.
- [ ] **Step 2: Run** `node --test tests/composer-draft-store.test.js`; expect FAIL because `composerDraftStore.js` does not exist.
- [ ] **Step 3: Implement** `createComposerDraftStore(initialDraft = {})` with immutable returned snapshots and explicit mutation methods; `validate()` returns `{ saveable, conflicts, unresolvedCount }`.
- [ ] **Step 4: Re-run** `node --test tests/composer-draft-store.test.js`; expect PASS.
- [ ] **Step 5: Commit** `feat: add canonical composer draft store`.

### Task 2: Condition Catalog and Primitive Coverage

**Files:**
- Create: `src/domain/conditionCatalog.js`
- Test: `tests/condition-catalog.test.js`

**Interfaces:**
- Consumes: domain/category/subcategory identifiers.
- Produces: `getConditionDefinition(domain, attributeId)`, `searchConditionDefinitions(domain, query)`, `recommendedConditions({ domain, categoryId, subcategoryId, targetText })`.
- Definition shape: `{ attributeId, label, valueType, operators, unit?, values?, defaultRole?, keywords?, categories? }`.

- [ ] **Step 1: Write failing tests** proving coverage for refrigerator, running shoes, used cars, baby, furniture/storage, electronics, beauty, pet, flights, hotels, plus operator primitives `eq`, `neq`, `gte`, `lte`, `range`, `one_of`, `contains`, `not_contains`, `boolean`, `compatible_with`, `changed_to`, `relative_change`, `rank`.
- [ ] **Step 2: Run** `node --test tests/condition-catalog.test.js`; expect FAIL for missing module.
- [ ] **Step 3: Implement** catalog metadata and search/recommendation functions; do not put rendering logic here.
- [ ] **Step 4: Re-run** test; expect PASS.
- [ ] **Step 5: Commit** `feat: add cross-domain condition catalog`.

### Task 3: Interpretation Proposal Layer + 800-Scenario Corpus

**Files:**
- Create: `src/domain/interpretInput.js`
- Create: `tests/fixtures/input-composer-corpus.json`
- Create: `tests/input-composer-corpus.test.js`
- Modify only when required: `src/domain/parseWatch.js`, `src/domain/parseGenericCondition.js`, `src/domain/parseFlightWatch.js`, `src/domain/parseHotelWatch.js`

**Interfaces:**
- Consumes: raw text and optional current draft context.
- Produces: `interpretInput(rawText, context = {}) -> { targetProposal?, conditionProposals, unresolvedFragments, inferredDomain?, inferredCategory?, confidence }`.
- Each proposal includes `state: 'confirmed' | 'needs_review' | 'unsupported'`, semantic primitive fields, source text, and confidence.

- [ ] **Step 1: Add a corpus generator/data file with at least 800 non-duplicate semantic scenarios** spanning all spec domain families and the required 20/30/30/15/5 difficulty distribution; each row declares semantic expectations, not whole-object snapshots.
- [ ] **Step 2: Write the corpus runner test** that asserts no input text disappears: every meaningful clause must map to a proposal or unresolved/unsupported fragment.
- [ ] **Step 3: Add focused RED tests** for `1万円くらい`, `白か黒`, `中古不可だが未使用開封品ならOK`, `安っぽくない`, typo/model-number-only, URL input, relative price-change language, provider-unsupported attributes, and ambiguous units.
- [ ] **Step 4: Run** `node --test tests/input-composer-corpus.test.js`; expect broad failures against the current regex parser.
- [ ] **Step 5: Implement** `interpretInput()` as an adapter over current parsers plus new clause classification; only extend old parsers where the interpretation layer cannot safely express the result.
- [ ] **Step 6: Re-run corpus test**; acceptance for this task is: all 800+ rows preserve intent, with supported cases structured and unsupported/ambiguous cases explicitly retained rather than silently dropped.
- [ ] **Step 7: Run existing parser/regression tests** to ensure no old Watch behavior regresses.
- [ ] **Step 8: Commit** `feat: add coverage-driven input interpretation`.

### Task 4: Deterministic Interpretation Merge

**Files:**
- Create: `src/domain/mergeInterpretation.js`
- Test: `tests/merge-interpretation.test.js`

**Interfaces:**
- Consumes: canonical draft from Task 1 and proposal object from Task 3.
- Produces: `mergeInterpretation(draft, interpretation, options = {}) -> { draft, changes, conflicts }`.
- Manual conditions (`manuallyEdited: true`) outrank low-confidence parser proposals unless explicit replacement intent is detected.

- [ ] **Step 1: Write failing tests** for same-attribute replacement, OR merge, unrelated manual-edit preservation, `同じ条件で色だけ黒`, exception wording, conflict detection, category-switch preservation/review, and unresolved retention.
- [ ] **Step 2: Run** `node --test tests/merge-interpretation.test.js`; expect FAIL.
- [ ] **Step 3: Implement** deterministic merge rules with no UI dependencies.
- [ ] **Step 4: Re-run** test; expect PASS.
- [ ] **Step 5: Commit** `feat: merge input interpretations without losing edits`.

### Task 5: Legacy Watch Adapter and Round-Trip Safety

**Files:**
- Create: `src/domain/composerLegacyAdapter.js`
- Test: `tests/composer-legacy-adapter.test.js`

**Interfaces:**
- Consumes: existing saved Watch with `domainConditions`, `compatibilityConditions`, `triggers`, legacy `conditions` and metadata.
- Produces: `draftFromWatch(watch)` and `watchFromDraft(draft, originalWatch?)`.
- Opening a Watch must not write storage; saving uses the existing Watch storage contract and preserves unknown legacy fields.

- [ ] **Step 1: Write failing round-trip tests** for shopping, used car, flight, hotel, compatibility conditions, triggers/change conditions, unknown legacy fields, and reopen-without-write behavior.
- [ ] **Step 2: Run** `node --test tests/composer-legacy-adapter.test.js`; expect FAIL.
- [ ] **Step 3: Implement** adapters with explicit schema translation and unknown-field preservation.
- [ ] **Step 4: Re-run** test; expect PASS.
- [ ] **Step 5: Commit** `feat: adapt legacy Watches to new composer`.

### Task 6: Condition-Card Composer UI

**Files:**
- Create: `src/inputComposerUi.js`
- Create: `src/inputComposerConditionList.js`
- Create: `src/inputComposerSheets.js`
- Create: `input-composer.css`
- Test: `tests/input-composer-ui.test.js`

**Interfaces:**
- Consumes: Tasks 1–5 APIs.
- Produces: `mountInputComposer(form, options = {})` and focused render/sheet helpers.
- No category-specific permanent form sections; attribute-specific controls come from `conditionCatalog` only.

- [ ] **Step 1: Write RED DOM tests** for the simple first state: one prominent `何を探していますか？` entry, secondary `条件から追加`, no forced domain buttons, no full fixed form, no always-visible change-condition panel.
- [ ] **Step 2: Add RED tests** for interpreted target + card list + unresolved strip + add-condition action + save action.
- [ ] **Step 3: Add RED tests** for condition edit sheet, add-condition search/recommendations, role switch, range/enum/boolean editors, focus return, and delete not being the primary visible card action.
- [ ] **Step 4: Add RED 20+ condition narrow-viewport test**: one-column list, no horizontal core-control overflow, compact summary, searchable/filterable list.
- [ ] **Step 5: Add Product Promise/accessibility RED assertions**: `変化条件` wording, no push/background claim, 44px minimum class contract, labels for role/attribute/value, live region limited to concise interpretation status.
- [ ] **Step 6: Run** `node --test tests/input-composer-ui.test.js`; expect FAIL.
- [ ] **Step 7: Implement** the UI modules and CSS using bottom sheets on narrow screens and a sticky save bar that remains keyboard-safe.
- [ ] **Step 8: Re-run** UI tests; expect PASS.
- [ ] **Step 9: Commit** `feat: build condition-card input composer`.

### Task 7: App Integration and Old Composer Fallback

**Files:**
- Modify: `index.html`
- Modify: `src/app.js`
- Modify: `src/canonicalComposerUi.js` only to remove it from the active mount path, not to rewrite it.
- Modify: `canonical-composer.css` only if needed to ensure inactive legacy styles do not affect the new composer.
- Test: existing full-system tests + `tests/input-composer-ui.test.js`

**Interfaces:**
- Consumes: `mountInputComposer()` and existing Watch save/open APIs.
- Produces: active Preview create/edit flow using the new composer; legacy composer retained as code fallback until release gates and device checks pass.

- [ ] **Step 1: Write/adjust integration test** proving the active create flow mounts exactly one composer and does not load both old and new input UIs.
- [ ] **Step 2: Run integration/full-system suite** and verify RED because the old canonical composer is still active.
- [ ] **Step 3: Wire the new composer into `index.html`/`app.js`**, preserve existing save failure UX, and disable the old composer mount path without deleting the fallback module.
- [ ] **Step 4: Re-run** integration/full-system suite; expect PASS.
- [ ] **Step 5: Commit** `feat: make condition-card composer the active input flow`.

### Task 8: Release-Gate Verification and Preview RC

**Files:**
- Modify only if assertions are missing: `scripts/nonfunctional-check.mjs`, `scripts/compliance-check.mjs`, `docs/PUBLIC_RELEASE_GATE.md`, PR #1 body.

**Interfaces:**
- Consumes: integrated branch from Tasks 1–7.
- Produces: green integrated SHA and a Vercel Preview URL pinned to that SHA; does not merge `main` or publish production.

- [ ] **Step 1: Run targeted tests** for corpus, draft store, merge, adapter, UI.
- [ ] **Step 2: Run all release gates** and require `test`, `build`, `security`, `compliance-static`, `nonfunctional-static` = SUCCESS.
- [ ] **Step 3: Verify the integrated SHA**, update PR #1 release status, and create/retrigger a Vercel Preview for exactly that SHA.
- [ ] **Step 4: Smoke the Preview** for simple input, 20-condition input, unresolved text, card edit, save/reopen, and Product Promise wording.
- [ ] **Step 5: Perform real/narrow viewport checks available in-session; record remaining real-device-only iPhone Safari/VoiceOver checks as release blockers rather than claiming them complete.
- [ ] **Step 6: Keep `main` and production untouched; final status remains INTERNAL_BETA unless all external/manual gates are separately satisfied and explicitly approved.
- [ ] **Step 7: Commit docs/gate updates** `docs: record input composer RC verification`.

## Plan Self-Review Results

- **Spec coverage:** Tasks map to corpus, canonical draft, catalog, interpretation/confidence, merge semantics, cards/sheets, iPhone constraints, Product Promise, legacy migration, testing, and RC integration. No spec section is intentionally left without an owning task.
- **Type consistency:** `composerDraftStore` owns canonical condition shape; `interpretInput` only emits proposals; `mergeInterpretation` is the only proposal-to-draft merge; UI consumes the store/catalog and does not duplicate parser logic.
- **Review Focus coverage:** approximate price and exception language are Task 3/4 tests; partial edits and category switches are Task 4 tests; 20+ condition iPhone layout is Task 6.
- **Proportion:** plan defines interfaces, RED/GREEN checks and boundaries without embedding implementation bodies.
- **Scope:** one coherent subsystem (Watch input/composer). URL/image input remain extension points, not first-release implementation scope.
