# Mikke Watch Intelligence Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Mikke from a static condition-search UI into a watch-oriented decision assistant with phrase suggestions, relative-price triggers, required/preferred conditions, actionable Today prioritization, local decisions/learning, relaxation guidance, and conservative duplicate grouping.

**Architecture:** Keep the existing browser-ES-module architecture and localStorage-first persistence. Add backward-compatible normalization around Watch/history records, keep provider access unchanged, and implement each new capability as deterministic local domain functions before wiring it into `src/app.js`. Relative-price claims must be derived only from Mikke-observed history or explicit numeric targets.

**Tech Stack:** Browser ES modules, vanilla JS/HTML/CSS, Node built-in test runner, localStorage, existing provider adapters.

**Spec:** `docs/superpowers/specs/2026-09-29-watch-intelligence-redesign.md`

## Global Constraints

- Preserve existing Watches and history; no silent data loss.
- No paid or metered AI/API dependency.
- No unauthorized scraping or extra provider access patterns.
- Relative prices use only Mikke-observed history or explicit numeric targets.
- Do not call Mikke-observed lows “market lows”.
- Provider attribution and server-side secret handling remain unchanged.
- iPhone-first interaction and layout.
- Do not merge to `main` or publish publicly without explicit approval.

## Review Focus

- Legacy Watch with only `conditions.maxPrice` must normalize without changing behavior.
- A candidate with one failed required condition must never become a full match because of strong preferred conditions.
- Missing/invalid price history must not fabricate drops, percentages, baselines, or lows.
- Suggestion taps must not duplicate already-applied conditions or silently mutate required/preferred meaning.
- Duplicate grouping must leave uncertain products separate unless a strong identifier matches.

---

### Task 1: Backward-compatible Watch normalization

**Files:**
- Create: `src/domain/normalizeWatch.js`
- Modify: `src/domain/watchStore.js`
- Test: `tests/normalizeWatch.test.js`

**Interfaces:**
- Produces: `normalizeWatch(watch) -> normalizedWatch`
- Produces normalized `conditions.attributes`, `conditions.priceTriggers`, `conditions.stateTriggers`, `baseline`, `behavior`, while preserving legacy fields.

- [ ] Write failing tests for legacy `maxPrice`, missing new fields, and preservation of `requiredKeys`/`preferredKeys`.
- [ ] Run `node --test tests/normalizeWatch.test.js`; expect FAIL.
- [ ] Implement `normalizeWatch(watch)` and apply it when Watches are loaded.
- [ ] Run `node --test tests/normalizeWatch.test.js`; expect PASS.
- [ ] Run full `npm test`; expect PASS.
- [ ] Commit `feat: normalize Watch records for intelligence model`.

### Task 2: Parser support for relative-price and condition-role language

**Files:**
- Modify: `src/domain/parseWatch.js`
- Test: `tests/parseWatch.test.js`

**Interfaces:**
- Extends `parseWatchQuery(raw)` to emit structured price/state triggers and required/preferred roles.

- [ ] Add failing tests for `今より安くなったら`, `登録時より安く`, `10%以上値下がり`, `登録後最安値`, `24.5cmは必須`, `グレーはできれば`.
- [ ] Run parser tests; expect FAIL.
- [ ] Implement deterministic parsing without removing existing syntax support.
- [ ] Run parser tests and full suite; expect PASS.
- [ ] Commit `feat: parse relative price and condition roles`.

### Task 3: Phrase-by-phrase suggestion engine

**Files:**
- Create: `src/domain/suggestWatchPhrases.js`
- Test: `tests/suggestWatchPhrases.test.js`

**Interfaces:**
- Produces: `suggestWatchPhrases(rawQuery, parsedWatch) -> [{ id, label, appendText, kind }]`

- [ ] Write failing tests showing context-aware suggestions after model-only, size-added, color-added, and price-trigger-added inputs.
- [ ] Add tests proving no duplicate suggestions for already-applied conditions.
- [ ] Implement deterministic suggestion families: attribute, role, price trigger, state trigger, completion.
- [ ] Run focused and full tests; expect PASS.
- [ ] Commit `feat: add deterministic Watch phrase suggestions`.

### Task 4: History-derived relative-price evaluation

**Files:**
- Modify: `src/domain/historyStore.js`
- Modify: `src/domain/evaluate.js`
- Test: `tests/evaluate.test.js`
- Test: `tests/historyStore.test.js`

**Interfaces:**
- Add helpers for first observed price, prior observed price, and observed low by candidate.
- Extend `deriveEvents(...)` with `watch_low`, `target_price_reached`, `percent_drop`.

- [ ] Write failing tests for previous-price drop, initial-price drop, 10% threshold, first-observation no-op, new Watch low, and missing-price safety.
- [ ] Implement history helpers and trigger evaluation.
- [ ] Ensure event payloads contain observed evidence only.
- [ ] Run focused and full tests; expect PASS.
- [ ] Commit `feat: evaluate observed relative price triggers`.

### Task 5: Required / preferred / notification-condition editing UI

**Files:**
- Modify: `src/app.js`
- Modify: `styles.css`
- Test: `tests/parseWatch.test.js`

**Interfaces:**
- Create screen shows live parsed chips grouped as 必須 / 希望 / 通知条件.
- Supported attribute chips can toggle between 必須 and 希望 before save.

- [ ] Add a pure helper or testable formatter if needed rather than embedding all role logic in DOM handlers.
- [ ] Render phrase suggestions below composer as horizontally scrollable chips.
- [ ] On suggestion tap, append/update text and re-parse immediately.
- [ ] Render editable condition chips before confirmation.
- [ ] Preserve route endpoints and notification triggers as fixed semantic roles.
- [ ] Verify existing example input still creates a Watch.
- [ ] Run `npm test` and `npm run build`; expect PASS.
- [ ] Commit `feat: build assisted Watch composer`.

### Task 6: Strictness and relaxation engine

**Files:**
- Create: `src/domain/watchGuidance.js`
- Test: `tests/watchGuidance.test.js`
- Modify: `src/app.js`
- Modify: `styles.css`

**Interfaces:**
- Produces: `estimateStrictness(watch) -> { level, label, isEstimate }`
- Produces: `suggestRelaxations(watch, history, latestResult) -> suggestions[]`

- [ ] Write failing tests for 広め / ちょうどよい / 厳しめ / かなり厳しい heuristics.
- [ ] Add tests that relaxation suggestions require repeated no-match observations and never mutate Watch data.
- [ ] Implement conservative suggestions: required→preferred, price-limit relaxation, preferred-color broadening where evidence exists.
- [ ] Show “推定” when based only on heuristic rather than live volume evidence.
- [ ] Run focused and full tests; expect PASS.
- [ ] Commit `feat: add Watch strictness and relaxation guidance`.

### Task 7: Today actionability redesign

**Files:**
- Create: `src/domain/prioritizeToday.js`
- Test: `tests/prioritizeToday.test.js`
- Modify: `src/app.js`
- Modify: `styles.css`

**Interfaces:**
- Produces: `prioritizeToday(watches, resultsByWatch, history) -> { importantChanges, nearTargets, matches, stagnant, relaxations }`

- [ ] Write failing tests pinning priority order: target reached > Watch low > percent drop > restock > near target > normal match.
- [ ] Implement prioritization independent of rendering.
- [ ] Replace Today’s match-count-first layout with actionable sections; keep aggregate stats secondary.
- [ ] Use event wording that clearly says “Mikkeで観測した登録後最安値”.
- [ ] Run focused and full tests plus build; expect PASS.
- [ ] Commit `feat: prioritize actionable Watch changes on Today`.

### Task 8: Post-notification decisions and local learning

**Files:**
- Create: `src/domain/decisionStore.js`
- Create: `src/domain/learning.js`
- Test: `tests/decisionStore.test.js`
- Test: `tests/learning.test.js`
- Modify: `src/app.js`

**Interfaces:**
- `recordDecision(storage, watchId, decision) -> state`
- `suggestLearnedPriceTrigger(watches, decisions, candidateContext) -> suggestion | null`

- [ ] Write failing persistence tests for `buy`, `wait`, `edit`, `stop` decisions.
- [ ] Write learning tests where repeated wait signals above a later buy price yield a rounded suggested target, and sparse/conflicting evidence returns null.
- [ ] Implement local-only decision history and conservative price suggestion.
- [ ] Add result/event actions: 買う / もう少し待つ / 条件変更 / 監視終了.
- [ ] Require confirmation before stopping/archive-like state change; keep history.
- [ ] Run focused and full tests; expect PASS.
- [ ] Commit `feat: add local decision actions and learning`.

### Task 9: Conservative duplicate grouping

**Files:**
- Create: `src/domain/groupProducts.js`
- Test: `tests/groupProducts.test.js`
- Modify: `src/app.js`

**Interfaces:**
- Produces: `groupProducts(candidates) -> groups[]`
- Strong keys only: exact JAN/EAN/UPC, exact manufacturer model, clearly provider-supplied same-SKU identifier.

- [ ] Write failing tests for exact identifier grouping across providers.
- [ ] Add tests proving title-only similarity does not group.
- [ ] Implement strong-identifier grouping and cheapest-offer ordering.
- [ ] Render one product card with provider offers underneath where grouped.
- [ ] Run focused and full tests; expect PASS.
- [ ] Commit `feat: group identical products conservatively`.

### Task 10: Compliance, regression, and iPhone preview verification

**Files:**
- Modify only where failures require fixes.
- Update: `docs/PUBLIC_RELEASE_GATE.md` only with truthful evidence; do not mark manual/public gates complete without evidence.

**Interfaces:**
- No new public API.

- [ ] Run `npm test`; expect PASS.
- [ ] Run `npm run security`; expect PASS.
- [ ] Run `npm run compliance`; expect PASS.
- [ ] Run `npm run build`; expect PASS.
- [ ] Verify no provider access pattern, attribution, secret handling, or pricing wording regressed.
- [ ] Refresh the temporary iPhone preview with the latest feature-branch commit.
- [ ] Verify composer, phrase chips, required/preferred toggles, Today priority, relative-price wording, actions, and long/empty states at iPhone width.
- [ ] Record Gate A evidence from the latest HEAD only after CI completes.
- [ ] Do not merge or publish; leave Gate B/C blocked until their real prerequisites are completed.
- [ ] Commit any verification-only documentation changes separately.
