# Flight Travel Intent Watch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the shallow flight condition-list model with a structured Flight Travel Intent capable of multiple places, multiple date alternatives, flexible dates, scenarios, travellers, cabin, payment intent, filters, and common triggers.

**Architecture:** Flight Watches move to schemaVersion 4 with a `travelIntent` source of truth. Existing v3 flight conditions are normalized into v4 in memory. The three composer modes edit the same structured draft; text parsing compiles into that draft. Common evidence/trigger logic remains reusable, while live flight provider access stays explicitly out of scope.

**Tech Stack:** Vanilla JavaScript ES modules, Node.js built-in test runner, existing Mikke DOM UI/CSS.

**Spec:** `docs/superpowers/specs/2026-09-29-flight-travel-intent-watch-design.md`

## Global Constraints

- No live Google Flights / Skyscanner / KAYAK scraping.
- No paid or metered API dependency.
- No production publish.
- No merge to `main`.
- Existing v1-v3 Watches remain readable.
- Ambiguous natural-language dates remain unresolved metadata rather than fabricated exact dates.
- `any_of` destination alternatives must never be represented as `multi_city`.
- Unknown and unsupported evidence remain distinct and never become confirmed required matches.
- iPhone is the primary layout target.

## Review Focus

- Multiple destinations combined with multiple date options should mean Cartesian alternatives unless explicit scenarios couple them.
- `anywhere` must not invent a destination place or silently collapse to an empty specific destination.
- Exact/flexible/month/range/anytime date options must coexist in one Watch without overwriting each other.
- Existing v3 flight Watches must migrate in memory without destructive storage mutation.
- Switching composer modes must preserve the structured Travel Intent rather than reconstructing it from display text.

---

### Task 1: Travel Intent schema and normalization

**Files:**
- Create: `src/domain/flightTravelIntent.js`
- Modify: `src/domain/watchSchema.js`
- Test: `tests/flightTravelIntent.test.js`

**Interfaces:**
- Produces: `createFlightTravelIntent()`, `normalizeFlightTravelIntent(value)`, `migrateV3FlightWatch(watch)`.
- Produces canonical `schemaVersion: 4`, `domain: 'flight'`, `travelIntent`, `flightFilters`, and `triggers`.

- [ ] Write failing tests for empty canonical intent, multiple origin/destination sets, all DateOption kinds, scenarios, and v3 migration.
- [ ] Run `npm test` and confirm RED in the new tests.
- [ ] Implement minimal schema helpers and v3-to-v4 in-memory migration.
- [ ] Run `npm test` and confirm GREEN.
- [ ] Commit.

### Task 2: Natural-language parser compiles to Travel Intent

**Files:**
- Modify: `src/domain/parseFlightWatch.js`
- Modify: `src/domain/parseWatch.js`
- Test: `tests/parseFlightWatch.test.js`
- Test: `tests/domain-watch-e2e.test.js`

**Interfaces:**
- Consumes Task 1 Travel Intent helpers.
- Produces v4 Flight Watches from text while retaining compatibility views where needed.

- [ ] Add RED tests for multiple destinations, multiple exact date alternatives, month/range/anytime wording, flexible dates, stay length, and destination/date scenarios.
- [ ] Confirm RED.
- [ ] Implement deterministic parsing only; unresolved relative dates go to metadata.
- [ ] Confirm GREEN and commit.

### Task 3: Flight composer structured draft

**Files:**
- Modify: `src/domain/composerModel.js`
- Modify: `src/composerModes.js`
- Test: `tests/composerModel.test.js`
- Test: `tests/app-composer.test.js`

**Interfaces:**
- Consumes v4 `travelIntent`.
- Produces non-mutating structured edit operations for places, date options, travellers, cabin, payment intent, and filters.

- [ ] Add RED tests proving add/remove does not replace existing destination/date alternatives and mode switches preserve the same draft.
- [ ] Confirm RED.
- [ ] Implement structured edit helpers and wire all three modes to the same draft.
- [ ] Confirm GREEN and commit.

### Task 4: iPhone flight-search layout

**Files:**
- Modify: `src/app.js`
- Modify: `composer-modes.css`
- Modify: `styles.css`
- Test: `tests/app-composer.test.js`

**Interfaces:**
- Consumes Task 3 structured draft.
- Produces flight-specific composer layout: trip/cabin, origin, destination alternatives, date mode/options, travellers, primary filters, advanced filters, notification.

- [ ] Add RED structural UI tests for flight-search ordering, removable place/date tokens, progressive filters, and notification separation.
- [ ] Confirm RED.
- [ ] Implement mobile-first flight composer without generic condition-chip registry for origin/destination/date.
- [ ] Confirm GREEN and commit.

### Task 5: Travel Intent evaluation semantics

**Files:**
- Modify: `src/domain/evaluate.js`
- Test: `tests/conditionEngine.test.js`
- Test: `tests/flightTravelIntent.test.js`

**Interfaces:**
- Consumes v4 Travel Intent plus candidate itinerary facts.
- Produces scenario/alternative matching with required/preferred evidence semantics.

- [ ] Add RED tests for Cartesian alternatives, explicit scenarios, required unknown/unsupported, and preferred ranking-only behavior.
- [ ] Confirm RED.
- [ ] Implement Travel Intent matching while preserving existing product/hotel evaluation paths.
- [ ] Confirm GREEN and commit.

### Task 6: Compatibility, persistence, and rendering

**Files:**
- Modify: `src/domain/watchStore.js`
- Modify: `src/app.js`
- Test: `tests/watchStore.test.js`
- Test: `tests/app-composer.test.js`

**Interfaces:**
- Consumes Task 1 migration.
- Produces readable v3/v4 storage compatibility and human-readable v4 confirmation/Watch summaries.

- [ ] Add RED tests for mixed v1-v4 loads and no destructive rewrite requirement.
- [ ] Confirm RED.
- [ ] Implement in-memory migration and v4 rendering summaries.
- [ ] Confirm GREEN and commit.

### Task 7: Regression gates and preview

**Files:**
- Test: `tests/domain-watch-e2e.test.js`
- Modify only if defects are found by tests.

**Interfaces:**
- Consumes all prior tasks.
- Produces verified branch state and updated temporary Floot preview at the exact verified commit.

- [ ] Add/extend E2E cases for exact, flexible, month, range, anytime, multiple destinations, multiple date alternatives, and scenarios.
- [ ] Run full `npm test`, build, security, and compliance gates.
- [ ] Fix only evidence-backed failures using RED→GREEN.
- [ ] Update temporary Floot preview to the exact verified commit and inspect iPhone layout.
- [ ] Do not merge or publish production.
