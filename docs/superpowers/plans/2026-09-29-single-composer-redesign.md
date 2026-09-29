# Mikke Single Composer Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three-mode Watch composer with a single domain-aware iPhone-first composer backed by one structured Watch draft.

**Architecture:** Keep existing parsers and Watch schemas, but remove UI-level duplicated easy/builder phrase state. Introduce one composer controller that owns a structured draft and renders domain-specific editors for flight, hotel, and shopping. Free text becomes a secondary helper that updates the same draft rather than a parallel mode.

**Tech Stack:** Vanilla ES modules, DOM rendering, existing Domain Schema/normalizers/parsers, node:test, CSS, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-29-single-composer-redesign.md`

## Global Constraints
- Remove the `かんたん` mode and the three-card mode picker.
- Structured Watch is the single source of truth.
- Free text is a secondary helper only.
- Preserve schemaVersion 4 Flight Travel Intent and schemaVersion 3 hotel/shopping compatibility.
- Existing saved Watches must remain loadable.
- Unsupported provider fields remain `unsupported`; absent supported evidence remains `unknown`.
- No paid/metered AI/API, unauthorized scraping, live flight/hotel provider integration, production publish, or merge to main.
- iPhone-first layout; primary controls should use practical ~44px touch targets.

## Review Focus
- Switching domain after entering structured conditions should not leak incompatible fields into the new draft.
- Text-assisted parsing must not overwrite already-edited structured fields unless the user explicitly applies the parsed result.
- Multiple flight destinations and multiple date alternatives must survive rerender/save/load.
- Legacy Watches created before the redesign must still normalize and render.
- Required conditions with unknown/unsupported evidence must never be presented as confirmed matches.

---

### Task 1: Remove three-mode composer shell

**Files:**
- Modify: `src/composerModes.js`
- Modify: `composer-modes.css`
- Test: `tests/app-composer.test.js`

**Interfaces:**
- Consumes: existing form element and `parseWatchQuery`.
- Produces: one composer root with domain selector, domain editor, optional text helper, and notification section.

- [ ] **Step 1: Write failing tests** asserting no `かんたん`, no three-card mode picker, and presence of one domain selector plus `文章から条件を作る` helper.
- [ ] **Step 2: Run `npm test -- tests/app-composer.test.js` and verify RED.**
- [ ] **Step 3: Remove `easyType/easySubject/easyPhrases`, mode-card rendering, and mode persistence; render the unified shell.**
- [ ] **Step 4: Update CSS to remove mode-card styling and establish unified vertical sections with primary controls >= ~44px.**
- [ ] **Step 5: Run tests and commit `feat: replace composer modes with unified shell`.**

### Task 2: Introduce one structured composer draft controller

**Files:**
- Create: `src/domain/composerDraft.js`
- Modify: `src/composerModes.js`
- Test: `tests/composerDraft.test.js`

**Interfaces:**
- Produces: `createComposerDraft(input)`, `switchComposerDomain(draft, domain)`, `applyParsedWatch(draft, parsed)`, `cloneComposerDraft(draft)`.
- Consumes: existing normalized Watch shapes.

- [ ] **Step 1: Write failing tests** for one draft surviving rerenders, domain switches clearing incompatible domain data, and parsed Watch application producing a structured draft.
- [ ] **Step 2: Run focused test and verify RED.**
- [ ] **Step 3: Implement immutable draft helpers; preserve compatible metadata/triggers only where semantics remain valid.**
- [ ] **Step 4: Wire composer UI to this draft instead of `builderPhrases`/raw display text.**
- [ ] **Step 5: Run focused + full tests and commit `feat: add structured composer draft controller`.**

### Task 3: Rebuild flight editor around Travel Intent

**Files:**
- Modify: `src/composerModes.js`
- Modify: `src/domain/composerModel.js`
- Modify: `composer-modes.css`
- Test: `tests/app-composer.test.js`
- Test: `tests/composerModel.test.js`

**Interfaces:**
- Consumes: schemaVersion 4 `travelIntent`, `flightFilters`, `triggers`.
- Produces: edits through `applyFlightTravelIntentEdit` and structured filter updates only.

- [ ] **Step 1: Write failing tests** for order: trip/cabin -> origins -> destinations -> dates -> travellers -> common filters -> advanced -> notify.
- [ ] **Step 2: Add regression tests** that multiple destinations and date options persist after rerender and that anywhere is distinct from multi-city.
- [ ] **Step 3: Verify RED.**
- [ ] **Step 4: Recompose the flight UI with fewer card boundaries, larger touch targets, and no duplicate mode/type framing.**
- [ ] **Step 5: Keep common filters directly accessible and move the rest under `その他の条件`.**
- [ ] **Step 6: Run tests and commit `feat: refine flight Travel Intent composer`.**

### Task 4: Build hotel-specific stay editor

**Files:**
- Modify: `src/composerModes.js`
- Modify: `src/domain/composerModel.js`
- Test: `tests/app-composer.test.js`
- Test: `tests/composerModel.test.js`

**Interfaces:**
- Consumes: hotel schemaVersion 3 `domainConditions` and `triggers`.
- Produces: direct field edits for stay, guests/rooms, common room/location filters, advanced policies/facilities, notification.

- [ ] **Step 1: Write failing tests** for hotel order and direct field controls for destination, dates, guests/rooms, walking distance, breakfast, free cancellation, rating.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Render hotel controls from Domain Schema groups, but map high-priority fields to dedicated primary controls rather than generic phrase chips.**
- [ ] **Step 4: Keep facilities/policies progressively disclosed.**
- [ ] **Step 5: Run tests and commit `feat: add stay-oriented hotel composer`.**

### Task 5: Rebuild shopping editor as category-aware direct controls

**Files:**
- Modify: `src/composerModes.js`
- Modify: `src/domain/composerModel.js`
- Test: `tests/app-composer.test.js`
- Test: `tests/composerModel.test.js`

**Interfaces:**
- Consumes: shopping schemaVersion 3 Domain Schema metadata.
- Produces: category-specific structured `domainConditions` and common `triggers`.

- [ ] **Step 1: Write failing tests** for refrigerator, fashion, furniture, food, and used-car primary controls.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Replace condition-name -> phrase-choice interaction with direct category-relevant controls for high-priority fields.**
- [ ] **Step 4: Generate lower-priority refinements from Domain Schema and keep advanced fields collapsed.**
- [ ] **Step 5: Run tests and commit `feat: add category-aware shopping composer`.**

### Task 6: Convert free text into a secondary helper

**Files:**
- Modify: `src/composerModes.js`
- Test: `tests/app-composer.test.js`
- Test: `tests/composerDraft.test.js`

**Interfaces:**
- Consumes: `parseWatchQuery(text)` and `applyParsedWatch(draft, parsed)`.
- Produces: optional text sheet/panel that applies parsed results into the unified composer.

- [ ] **Step 1: Write failing tests** that text helper is not a mode tab, parsed results return to the main form, and un-applied text does not mutate the draft.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement open/apply/cancel behavior and structured preview of what will change.**
- [ ] **Step 4: Run tests and commit `feat: turn text entry into composer helper`.**

### Task 7: Redesign notification section

**Files:**
- Modify: `src/composerModes.js`
- Modify: `composer-modes.css`
- Test: `tests/app-composer.test.js`

**Interfaces:**
- Consumes: domain draft `triggers`.
- Produces: dedicated `いつ知らせる？` block separated from search/filter conditions.

- [ ] **Step 1: Write failing tests** for visible separation and domain-specific trigger examples.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement final notification block with one primary action and concise current-trigger summary.**
- [ ] **Step 4: Run tests and commit `feat: separate Watch notification composer`.**

### Task 8: Compatibility and save/load regression

**Files:**
- Modify: `src/domain/watchStore.js` only if required by failing tests
- Modify: `src/domain/normalizeWatch.js` only if required by failing tests
- Test: `tests/normalizeWatch.test.js`
- Test: `tests/watchStore.test.js`
- Test: `tests/endToEndDomains.test.js`

**Interfaces:**
- Consumes: existing v1-v4 saved Watches and new unified drafts.
- Produces: normalized saved records with no semantic loss.

- [ ] **Step 1: Add failing regression tests** covering legacy flight, hotel, refrigerator, fashion, furniture, food, and used-car saved Watches rendered through the new composer draft path.
- [ ] **Step 2: Verify RED only where compatibility gaps exist.**
- [ ] **Step 3: Make minimal normalization/store fixes; do not change persisted semantics unnecessarily.**
- [ ] **Step 4: Run full test suite and commit `test: protect unified composer compatibility`.**

### Task 9: iPhone polish and visual verification

**Files:**
- Modify: `composer-modes.css`
- Modify: `styles.css` only if shared spacing variables are required
- Test: `tests/app-composer.test.js`

**Interfaces:**
- Produces: compact but touch-friendly iPhone layout; no functional schema changes.

- [ ] **Step 1: Add static regression assertions** for removed mode-card styling, primary-control sizing, reduced horizontal-scroll families, and progressive disclosure.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Refine spacing, hierarchy, typography, and touch areas without changing Mikke's established visual language.**
- [ ] **Step 4: Run `npm test`, `npm run build`, `npm run security`, and `npm run compliance`.**
- [ ] **Step 5: Update Floot temporary preview to the exact green commit and verify required assets return HTTP 200.**
- [ ] **Step 6: Create final commit/checkpoint. Do not merge or publish production.**
