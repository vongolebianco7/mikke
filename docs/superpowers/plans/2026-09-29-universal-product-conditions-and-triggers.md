# Universal Product Conditions and Trigger Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Mikke represent and evaluate fashion, appliances, furniture, food, used cars, and future product categories with one generic condition model and one category-agnostic notification trigger engine.

**Architecture:** Introduce a versioned normalized Watch schema built from generic `Condition` and `Trigger` objects, backed by independent attribute and category-template registries. Existing Watches normalize on read without destructive localStorage migration. Candidate evidence is normalized into a tri-state fact model (`known` / `unknown` / `unsupported`), then generic condition and trigger evaluators operate on those facts without branching on product category.

**Tech Stack:** Browser ES modules, Node.js built-in test runner (`node --test`), localStorage, existing official shopping connectors, static HTML/CSS UI.

**Spec:** `docs/superpowers/specs/2026-09-29-universal-product-conditions-and-triggers-design.md`

## Global Constraints

- Branch: `feat/mikke-mvp`; do not merge to `main` or publish production.
- No paid or metered AI/API dependency for the condition engine.
- Unknown provider data must never be coerced to false, zero, or a confirmed match.
- Triggers must not fire when required evidence or historical reference is missing.
- Existing Watches in `mikke.watches.v1` must remain readable without destructive migration.
- Category templates control suggestions and metadata only; they must not change core evaluation semantics.
- iPhone UI must use progressive disclosure: common conditions first, category-relevant conditions second, advanced/custom conditions last.
- Provider-derived coupon/points/effective-price claims must preserve provenance and eligibility uncertainty.

## Review Focus

1. Legacy Watches with `conditions.maxPrice`, `requiredKeys`, `preferredKeys`, and old `priceTriggers` still normalize into equivalent semantics.
2. A required condition whose provider fact is `unknown` or `unsupported` is not reported as a confirmed match.
3. Coupon, shipping, release, and availability triggers do not fire when their current or reference evidence is missing.
4. Unit-bearing numeric conditions compare normalized values correctly (`500L`, `70cm`, `30000km`) rather than string order.
5. Switching between `かんたん`, `組み立て`, and `文章で入力` preserves one compatible normalized Watch rather than creating mode-specific data shapes.

---

### Task 1: Versioned Generic Watch Schema and Legacy Normalization

**Files:**
- Create: `src/domain/watchSchema.js`
- Modify: `src/domain/normalizeWatch.js`
- Modify: `src/domain/watchStore.js`
- Test: `tests/watchSchema.test.js`
- Test: `tests/watchStore.test.js`

**Interfaces:**
- Produces: `normalizeCondition(condition)`, `normalizeTrigger(trigger)`, `normalizeGenericWatch(watch)` in `watchSchema.js`.
- Produces normalized Watch fields: `schemaVersion`, `target`, `conditions` (array), `triggers` (array), `metadata`, while retaining legacy readable fields needed by the current UI during transition.
- Consumes no later-task interfaces.

- [ ] **Step 1: Write failing schema tests**

Add tests asserting that a generic Watch with one condition and one trigger is normalized without semantic changes, and that malformed arrays become empty arrays rather than throwing.

- [ ] **Step 2: Write failing legacy compatibility tests**

Assert mappings:
- legacy `conditions.maxPrice` + required `maxPrice` -> generic required price condition;
- legacy notification max price -> generic price trigger;
- legacy `size`, `colors`, `excludeUsed` -> generic attribute conditions with the correct required/preferred role;
- legacy `priceTriggers` -> generic Trigger objects.

- [ ] **Step 3: Run focused tests and verify RED**

Run: `node --test tests/watchSchema.test.js tests/watchStore.test.js`
Expected: FAIL because generic schema helpers and fields do not exist.

- [ ] **Step 4: Implement `watchSchema.js` and update `normalizeWatch.js`**

Use `schemaVersion: 2`. Preserve legacy fields in the returned object for current callers, but make `conditions` generic data available under `genericConditions` during the compatibility window and `triggers` under `triggers`. Do not mutate stored raw objects.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node --test tests/watchSchema.test.js tests/watchStore.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `feat: add versioned generic Watch schema`

---

### Task 2: Attribute Registry and Category Templates

**Files:**
- Create: `src/domain/attributeRegistry.js`
- Create: `src/domain/categoryTemplates.js`
- Test: `tests/categoryTemplates.test.js`

**Interfaces:**
- Produces: `getAttributeDefinition(attributeId)`.
- Produces: `getCategoryTemplate(categoryId)`, `inferProductCategory(text)`, `suggestedAttributesForCategory(categoryId)`.
- Category IDs for Phase 1: `fashion`, `appliances`, `furniture`, `food`, `used_car`, plus subcategory hints such as `refrigerator`, `shoes`, `shirt` where useful.

- [ ] **Step 1: Write failing registry tests**

Cover common attributes (`brand`, `model`, `color`, `size`, `width`, `height`, `depth`, `weight`, `capacity`, `quantity`, `condition`, `material`, `release_year`, `origin_country`, `warranty`, `seller`) and category-specific examples (`mileage`, `repair_history`, `freezer_capacity`, `allergens`).

- [ ] **Step 2: Write failing template tests**

Assert that the five Phase 1 categories expose expected default/recommended attributes and that `inferProductCategory()` recognizes representative Japanese terms such as `冷蔵庫`, `ソファ`, `コーヒー豆`, `ヴェゼル`, `スニーカー`.

- [ ] **Step 3: Run test and verify RED**

Run: `node --test tests/categoryTemplates.test.js`
Expected: FAIL because registries do not exist.

- [ ] **Step 4: Implement registries**

Keep attribute definitions data-only. Category templates may reference attribute IDs and trigger families but must not contain evaluation logic.

- [ ] **Step 5: Run test and verify GREEN**

Run: `node --test tests/categoryTemplates.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `feat: add universal category templates`

---

### Task 3: Candidate Fact Normalization and Unit-Aware Condition Engine

**Files:**
- Create: `src/domain/candidateFacts.js`
- Create: `src/domain/conditionEngine.js`
- Modify: `src/domain/evaluate.js`
- Test: `tests/conditionEngine.test.js`

**Interfaces:**
- Produces: `factKnown(value, meta?)`, `factUnknown(meta?)`, `factUnsupported(meta?)`, `factsFromCandidate(candidate)`.
- Produces: `evaluateCondition(condition, facts)` returning `{ state: 'pass'|'fail'|'unknown', evidence }`.
- Produces: `evaluateGenericConditions(conditions, facts)` returning required/preferred outcomes and score inputs.
- `evaluateCandidate(watch, candidate)` delegates to generic conditions when present, otherwise keeps current legacy behavior.

- [ ] **Step 1: Write failing tests for equality/list/boolean operators**

Cover `eq`, `neq`, `in`, `not_in`, `contains`, `contains_all`, `is_true`, `is_false`, and text fallback operators.

- [ ] **Step 2: Write failing numeric/unit tests**

Cover `capacity >= 500 L`, `width <= 700 mm` with a candidate exposing `70cm`, and `mileage <= 30000 km`.

- [ ] **Step 3: Write failing unknown/unsupported tests**

Required unknown/unsupported evidence must yield `requiredMatch: false` plus an explicit unknown reason, never a false positive. Preferred unknown evidence must not count as passed.

- [ ] **Step 4: Run test and verify RED**

Run: `node --test tests/conditionEngine.test.js`
Expected: FAIL because generic fact/evaluation helpers do not exist.

- [ ] **Step 5: Implement candidate facts and condition engine**

Normalize only safe, deterministic units required by Phase 1 (`mm/cm/m`, `g/kg`, `mL/L`, `km`, `JPY`, `%`). Unknown units remain unknown rather than guessed.

- [ ] **Step 6: Integrate with `evaluateCandidate()`**

Prefer `watch.genericConditions` when present. Preserve current score and near-match behavior, but expose unknown required condition IDs in evaluation output.

- [ ] **Step 7: Run focused and regression tests**

Run: `node --test tests/conditionEngine.test.js tests/evaluate.test.js`
Expected: PASS.

- [ ] **Step 8: Commit**

Commit message: `feat: add generic condition evaluator`

---

### Task 4: Generic Trigger Engine and Derived Purchase Metrics

**Files:**
- Create: `src/domain/triggerEngine.js`
- Create: `src/domain/purchaseMetrics.js`
- Modify: `src/domain/evaluate.js`
- Modify: `src/connectors/runWatchCheck.js`
- Test: `tests/triggerEngine.test.js`
- Test: `tests/purchaseMetrics.test.js`

**Interfaces:**
- Produces: `derivePurchaseMetrics(facts)` with provenance-bearing facts for `landed_price`, `coupon_adjusted_price`, `effective_price_after_points`, and `unit_price` only when inputs are known.
- Produces: `evaluateTrigger(trigger, currentFacts, previousFacts, historyContext)` returning zero or one semantic event.
- Trigger metrics supported in Phase 1: `price`, `discount_percent`, `availability`, `shipping_fee`, `coupon_available`, `coupon_discount_amount`, `coupon_discount_percent`, `release_status`, `preorder_status`, plus Watch-low comparison.

- [ ] **Step 1: Write failing derived-metric tests**

Assert `landed_price = item_price + shipping_fee`, verified coupon subtraction only when eligibility/value are known, points kept distinct from cash price, and missing inputs produce unknown metrics.

- [ ] **Step 2: Write failing trigger tests**

Cover absolute price, previous-price drop, percentage drop, Watch low, restock, free shipping, coupon detection/discount, release/preorder transitions, and missing-reference suppression.

- [ ] **Step 3: Run tests and verify RED**

Run: `node --test tests/triggerEngine.test.js tests/purchaseMetrics.test.js`
Expected: FAIL because generic trigger/metric helpers do not exist.

- [ ] **Step 4: Implement generic trigger evaluation**

Do not branch on category. Branch only on `metric`, `operator`, and `reference`. Emit current semantic event kinds used by Today/History where compatible; add precise kinds for shipping/coupon/release where needed.

- [ ] **Step 5: Integrate `runWatchCheck()`**

Build current facts from each candidate, derive purchase metrics, obtain previous/history evidence, evaluate generic triggers, and retain legacy `deriveEvents()` fallback until all existing Watches normalize.

- [ ] **Step 6: Run focused and regression tests**

Run: `node --test tests/triggerEngine.test.js tests/purchaseMetrics.test.js tests/evaluate.test.js tests/runWatchCheck.test.js`
Expected: PASS.

- [ ] **Step 7: Commit**

Commit message: `feat: add category-agnostic trigger engine`

---

### Task 5: Free-Text Parser Compiles to Generic Conditions and Triggers

**Files:**
- Modify: `src/domain/parseWatch.js`
- Create: `src/domain/parseGenericCondition.js`
- Test: `tests/parseGenericCondition.test.js`
- Modify: `tests/parseWatch.test.js`

**Interfaces:**
- Produces: `parseGenericConditionClauses(raw, category)` returning `{ target, conditions, triggers }`.
- `parseWatchQuery(raw)` continues returning legacy-compatible fields and additionally returns `schemaVersion`, `target`, `genericConditions`, and `triggers`.

- [ ] **Step 1: Write failing category-spanning parser tests**

Representative sentences:
- Fashion: `New Balance 996、24.5cm、グレー、新品、1万円以下になったら`.
- Appliance: `冷蔵庫、500L以上、幅70cm以下、白かグレー、15万円以下`.
- Furniture: `ソファ、幅180cm以下、グレー、送料込み8万円以下`.
- Food: `コーヒー豆、1kg以上、送料無料、3000円以下`.
- Used car: `ヴェゼル、2027年式以降、3万km以下、修復歴なし、300万円以下`.

- [ ] **Step 2: Write failing trigger-language tests**

Cover `在庫復活`, `送料無料`, `10%OFFクーポン`, `予約開始`, `発売されたら`, and ensure unsupported evidence is only represented as a trigger request, not as satisfied.

- [ ] **Step 3: Run tests and verify RED**

Run: `node --test tests/parseGenericCondition.test.js tests/parseWatch.test.js`
Expected: FAIL on missing generic outputs.

- [ ] **Step 4: Implement parser compiler**

Use attribute aliases and category templates. Preserve unknown clauses as optional custom text conditions only when they can be represented without inventing meaning; otherwise keep them in raw metadata for later editing.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node --test tests/parseGenericCondition.test.js tests/parseWatch.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `feat: compile free text into generic Watch rules`

---

### Task 6: Category-Aware Three-Mode Composer with Progressive Disclosure

**Files:**
- Modify: `src/app.js`
- Modify: `styles.css`
- Create: `src/domain/composerModel.js`
- Modify: `tests/app-composer.test.js`
- Test: `tests/composerModel.test.js`

**Interfaces:**
- Produces: `createComposerModel({ mode, raw, categoryId, watch })` describing common, category, advanced condition groups.
- Produces: `applyComposerCondition(model, draft)` that updates the same normalized Watch structure regardless of input mode.
- Existing modes remain `かんたん`, `組み立て`, `文章で入力`.

- [ ] **Step 1: Write failing composer-model tests**

Assert that refrigerator suggestions include capacity/dimensions/price/availability/shipping, fashion suggestions include size/color/condition/price/coupon, and all modes produce compatible generic Watch shapes.

- [ ] **Step 2: Write failing UI structure tests**

Assert copy/markup for progressive disclosure sections: `よく使う条件`, `この商品でよく使う条件`, `その他の条件`, and category-aware trigger chips.

- [ ] **Step 3: Run tests and verify RED**

Run: `node --test tests/composerModel.test.js tests/app-composer.test.js`
Expected: FAIL because category-aware progressive disclosure is not wired.

- [ ] **Step 4: Implement `composerModel.js`**

Use registries only; no category-specific evaluation code. Keep user-entered conditions when switching modes.

- [ ] **Step 5: Update `app.js` and CSS**

Easy mode: ask only the next high-value question. Build mode: show common/category groups and collapsed advanced group. Free-text mode: show parsed generic rules immediately. Avoid rendering the entire attribute registry at once.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `node --test tests/composerModel.test.js tests/app-composer.test.js`
Expected: PASS.

- [ ] **Step 7: Commit**

Commit message: `feat: add category-aware universal Watch composer`

---

### Task 7: Provider Evidence Mapping Without Fabrication

**Files:**
- Modify: `src/connectors/officialShopping.js`
- Modify: `src/connectors/sampleShopping.js`
- Modify: `src/connectors/runWatchCheck.js`
- Test: `tests/providerEvidence.test.js`

**Interfaces:**
- Provider candidates may expose `facts` or source fields that `factsFromCandidate()` understands.
- Every mapped field includes provenance metadata where it affects notification wording.

- [ ] **Step 1: Write failing provider-evidence tests**

Assert that known price/availability fields become known facts, absent shipping/coupon/release fields remain unknown/unsupported, and coupon eligibility is never defaulted to eligible.

- [ ] **Step 2: Run test and verify RED**

Run: `node --test tests/providerEvidence.test.js`
Expected: FAIL because provider evidence metadata is incomplete.

- [ ] **Step 3: Map currently available official fields**

Only map fields actually returned by each existing adapter. Do not add scraping or extra upstream calls. Keep sample data explicit and labeled as sample.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test tests/providerEvidence.test.js tests/runWatchCheck.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: normalize provider evidence for universal rules`

---

### Task 8: End-to-End Regression, Event Copy, and iPhone Preview

**Files:**
- Modify: `src/app.js`
- Modify: `tests/prioritizeToday.test.js`
- Modify: `tests/app-composer.test.js`
- Modify: `docs/PUBLIC_RELEASE_GATE.md` only to record fresh automated evidence; do not change release decision.

**Interfaces:**
- Consumes all prior tasks.
- Produces no new core interfaces.

- [ ] **Step 1: Add end-to-end regression tests**

Cover one Watch from each Phase 1 category, a legacy Watch, an unknown required fact, a missing-history trigger, and a mode switch preserving conditions.

- [ ] **Step 2: Add Today/History copy tests**

Ensure shipping, coupon, release, restock, and generic price events have user-readable labels that do not overstate coupon eligibility or point value.

- [ ] **Step 3: Run complete local test command**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 4: Run all automated release gates**

Run via GitHub Actions on the final branch head and verify `test`, `security`, `compliance-static`, and `build` all conclude `success`.

- [ ] **Step 5: Refresh temporary Floot preview to the exact final commit SHA**

Do not publish Floot production. Capture/check iPhone 15 layout for the Watch composer. Verify the advanced condition area is collapsed by default and the three modes remain obvious.

- [ ] **Step 6: Record Gate A evidence without changing release status**

Keep `INTERNAL_BETA` / `PUBLIC_BETA = BLOCKED` unless the existing manual provider and production-smoke gates are independently satisfied.

- [ ] **Step 7: Commit**

Commit message: `test: verify universal product condition engine`
