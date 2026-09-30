# Mikke Single Composer + E2E Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Mikke's layered/duplicated Composer input state with one canonical Structured Draft and verify the complete user journey with unit, integration, and system testing.

**Architecture:** Natural-language input and domain-specific controls will both write to one Composer controller backed by the existing Structured Watch draft. The visible primary textarea will no longer relay through hidden `#query` / legacy helper state. Save/edit/list rendering will consume the same structured state directly, while existing domain parsers, flight Travel Intent, triggers, evidence semantics, and local persistence remain intact.

**Tech Stack:** Vanilla JavaScript ES modules, Node.js 22 `node:test`, existing static HTML/CSS app, `jsdom` as a dev-only DOM integration harness, GitHub Actions, Floot preview for iPhone 15 system/visual QA.

**Spec:** `docs/superpowers/specs/2026-09-30-single-composer-e2e-redesign.md`

## Global Constraints

- iPhone-first UI; iPhone 15 viewport 393×852 is the primary visual QA target.
- No mandatory paid or metered APIs.
- No unauthorized scraping; preserve legal/TOS/compliance/provider-safety constraints.
- Do not merge to `main` or publish production.
- Preserve existing structured Watch semantics, including flight Travel Intent, domain conditions, triggers, evidence states, and local persistence.
- Flight and hotel live-provider search remain out of scope; UI must represent connector-pending state honestly.
- TDD for each implementation task: failing test first, minimal implementation, passing test, then commit.
- Final verification is explicitly three-stage: **unit → integration → system**. A later stage does not substitute for an earlier one.

## Review Focus

1. **Fast typing / rerender churn:** typed text must remain visible and interpreted without duplicate inputs or lost characters; pinned in Task 2 integration tests.
2. **Domain change after parsing:** incompatible flight/hotel/shopping fields must be cleared without leaking stale conditions; pinned in Task 1 unit tests and Task 3 integration tests.
3. **Edit/save round trip:** reopening and resaving must preserve structured semantics, alternatives, filters, and triggers; pinned in Task 4 unit/integration tests.
4. **Partial or ambiguous parsing:** supported meaning is kept while unresolved text is surfaced rather than guessed; pinned in Task 2 unit tests.
5. **Connector-pending domains:** flight/hotel check actions must not imply live search success; pinned in Task 5 integration/system tests.

---

## File Structure

- **Create:** `src/domain/composerController.js` — canonical editable Composer state and public edit/parse/save model operations.
- **Modify:** `src/composerModes.js` — render and bind one visible input plus domain editors against the controller; remove legacy primary-path helper relay.
- **Modify:** `src/domain/composerDraft.js` — retain low-level immutable draft/domain-switch primitives used by controller.
- **Modify:** `src/domain/composerDraftBridge.js` — submit/save bridge reads the canonical structured draft only.
- **Retire or reduce:** `src/textEntryUi.js` — remove quick-input mirroring/MutationObserver promotion from the primary path; keep only compatibility code if an existing non-primary caller still requires it.
- **Modify:** `src/app.js` — create/edit/save flows consume canonical structured draft; connector-pending messaging remains explicit.
- **Modify:** `composer-modes.css`, `text-entry-ui.css`, and/or `styles.css` — iPhone-first hierarchy, touch targets, single-input layout, notification separation, no primary horizontal overflow.
- **Modify:** `index.html` — stop loading obsolete compatibility assets if fully retired.
- **Create:** `tests/composerController.test.js` — unit tests for canonical state.
- **Create:** `tests/composer-integration.test.js` — DOM integration journeys under jsdom.
- **Modify:** `tests/app-composer.test.js`, `tests/text-entry-ui.test.js`, `tests/unified-composer-domains.test.js` — remove contradictory source-string assertions and replace with behavior contracts.
- **Modify:** `tests/domain-watch-e2e.test.js`, `tests/watch-card-summary.test.js`, `tests/watch-list-ui.test.js` — preserve domain round trips and saved-card hierarchy.
- **Modify:** `package.json` and lockfile — add jsdom dev dependency and explicit staged test scripts.

---

### Task 1: Canonical Composer Controller

**Files:**
- Create: `src/domain/composerController.js`
- Modify: `src/domain/composerDraft.js`
- Test: `tests/composerController.test.js`

**Interfaces:**
- Consumes: `createComposerDraft(initialWatch)`, `switchComposerDomain(draft, domain)`, `applyParsedWatch(draft, parsed)`, `parseWatchQuery(raw)`, existing immutable domain edit helpers.
- Produces:
  - `createComposerController(initialWatch?) -> controller`
  - `controller.getWatch() -> StructuredWatch`
  - `controller.getRawText() -> string`
  - `controller.applyText(raw) -> { watch, interpretation, unresolvedText }`
  - `controller.switchDomain(domain) -> StructuredWatch`
  - `controller.replaceWatch(watch) -> StructuredWatch`
  - `controller.applyWatchEdit(updater) -> StructuredWatch`
  - `controller.getRenderModel() -> { domain, rawText, watch, interpretation, saveable }`

- [ ] **Step 1: Write failing unit tests for one canonical state**

Add tests asserting that text parsing, direct edits, domain switching, and replacing an existing Watch all mutate/replace the same controller-owned structured Watch and never require display-text reparsing on save.

- [ ] **Step 2: Run Task 1 unit tests and verify RED**

Run: `node --test tests/composerController.test.js`

Expected: FAIL because `composerController.js` does not yet exist / required behavior is absent.

- [ ] **Step 3: Implement the controller with immutable Watch updates**

Keep parsing deterministic via `parseWatchQuery`; keep domain switching delegated to existing draft primitives; surface ambiguous/unparsed material in metadata/interpretation without inventing conditions.

- [ ] **Step 4: Run Task 1 unit tests and verify GREEN**

Run: `node --test tests/composerController.test.js`

Expected: all Task 1 tests PASS.

- [ ] **Step 5: Commit**

Commit message: `refactor: add canonical composer controller`

---

### Task 2: Replace Layered Text Entry With One Primary Input

**Files:**
- Modify: `src/composerModes.js`
- Retire/reduce: `src/textEntryUi.js`
- Modify: `index.html`
- Modify: `composer-modes.css`
- Modify/remove: `text-entry-ui.css`
- Modify: `tests/text-entry-ui.test.js`
- Modify: `tests/app-composer.test.js`
- Create/extend: `tests/composer-integration.test.js`

**Interfaces:**
- Consumes: Task 1 controller.
- Produces: one visible `[data-composer-text]` textarea bound directly to `controller.applyText(raw)`; one interpretation region `[data-composer-interpretation]`; no hidden helper relay needed for the primary path.

- [ ] **Step 1: Write failing tests for single-input behavior**

Unit/source contract assertions:
- exactly one primary Composer text input contract exists;
- no primary-path call chain depends on `data-text-helper-toggle` → `data-text-helper-apply`;
- obsolete assertion “free text is a secondary helper” is removed/replaced.

Integration assertions:
- typing updates the visible value and interpretation immediately;
- rerender does not create a second visible textarea;
- empty input disables save/progression;
- partial parse shows unresolved state instead of fabricated meaning.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test tests/text-entry-ui.test.js tests/app-composer.test.js tests/composer-integration.test.js`

Expected: FAIL against the current quick-text/legacy-helper relay.

- [ ] **Step 3: Render/bind the primary textarea directly in `composerModes.js`**

Use the controller as the only semantic state. Remove `syncQuickText()` / `applyQuickText()` relay behavior from the primary path. If compatibility code remains temporarily, it must not render a second user-facing primary input.

- [ ] **Step 4: Render meaningful interpretation feedback**

Show domain plus human-readable subject/route/stay and key recognized conditions/triggers. Unsupported/ambiguous content is labeled unresolved rather than silently dropped.

- [ ] **Step 5: Apply iPhone input hierarchy CSS**

Primary textarea visually dominates category controls; tap targets approximately ≥44px; no cramped two-column primary input at 393px.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `node --test tests/text-entry-ui.test.js tests/app-composer.test.js tests/composer-integration.test.js`

Expected: all focused tests PASS.

- [ ] **Step 7: Commit**

Commit message: `refactor: make text entry the canonical composer input`

---

### Task 3: Bind Shopping, Flight, Hotel Editors to the Same Draft

**Files:**
- Modify: `src/composerModes.js`
- Modify: `src/domain/composerDraftBridge.js`
- Modify: `tests/unified-composer-domains.test.js`
- Extend: `tests/composerController.test.js`
- Extend: `tests/composer-integration.test.js`

**Interfaces:**
- Consumes: controller from Task 1 and single-input Composer from Task 2.
- Produces: domain-specific editor actions that call controller edits and republish the same Watch draft.

- [ ] **Step 1: Write failing tests for shared state across domain controls**

Cover representative edits:
- shopping: size/color/condition plus notification;
- flight: route/trip/date/nonstop/airline plus notification;
- hotel: destination/dates/party/access/breakfast/cancellation plus notification;
- switching domains removes incompatible prior-domain state.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test tests/composerController.test.js tests/unified-composer-domains.test.js tests/composer-integration.test.js`

Expected: FAIL where UI edits still depend on module-global parallel state or bridge reparsing.

- [ ] **Step 3: Rewire domain event handlers to controller edits**

Preserve existing flight Travel Intent helpers and schema-driven domain condition functions; only the ownership/state path changes.

- [ ] **Step 4: Rewire draft bridge to export canonical structured state**

Submit/save integration reads the current structured Watch directly and never reparses display text to reconstruct it.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node --test tests/composerController.test.js tests/unified-composer-domains.test.js tests/composer-integration.test.js`

Expected: all focused tests PASS.

- [ ] **Step 6: Commit**

Commit message: `refactor: unify domain editors on one composer draft`

---

### Task 4: Save, Edit, and Saved Watch Round Trip

**Files:**
- Modify: `src/app.js`
- Modify: `tests/domain-watch-e2e.test.js`
- Modify: `tests/watch-card-summary.test.js`
- Modify: `tests/watch-list-ui.test.js`
- Extend: `tests/composer-integration.test.js`

**Interfaces:**
- Consumes: canonical structured Watch from Tasks 1–3, existing `createWatchRecord`, `loadWatches`, `saveWatches`, and watch-summary helpers.
- Produces: direct structured save/edit flow and common saved-card skeleton: category/status → what → key conditions → notification → actions.

- [ ] **Step 1: Write failing round-trip tests**

For shopping, flight, and hotel: create from text, modify via direct control, set notification, save, reload from storage, reopen edit, resave, and compare normalized structured semantics before/after.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test tests/domain-watch-e2e.test.js tests/watch-card-summary.test.js tests/watch-list-ui.test.js tests/composer-integration.test.js`

Expected: FAIL on any path still reconstructing from raw/display text or losing structured fields.

- [ ] **Step 3: Update `app.js` create/edit/save handoff**

Use the canonical structured draft as save input. Editing seeds the controller from the stored Watch. Preserve `id`, status, timestamps, baseline/behavior fields exactly as current update semantics require.

- [ ] **Step 4: Keep saved-card hierarchy common and summaries domain-specific**

Do not dump `rawQuery`; cap visible key conditions and expose remaining count as `＋N条件`; keep notification visually distinct.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node --test tests/domain-watch-e2e.test.js tests/watch-card-summary.test.js tests/watch-list-ui.test.js tests/composer-integration.test.js`

Expected: all focused tests PASS.

- [ ] **Step 6: Commit**

Commit message: `feat: preserve structured watch state through save and edit`

---

### Task 5: Honest Result/Connector States and Mobile Interaction Polish

**Files:**
- Modify: `src/app.js`
- Modify: `composer-modes.css` / `styles.css` as applicable
- Extend: `tests/composer-integration.test.js`
- Extend existing connector/result UI tests if needed.

**Interfaces:**
- Consumes: existing `runWatchCheck` result statuses and evidence semantics.
- Produces: user-visible connector-pending/unavailable states that do not imply a live flight/hotel check happened.

- [ ] **Step 1: Write failing tests for connector-pending messaging and mobile action availability**

Assert flight/hotel pending status is explicit; product unavailable/provider errors remain non-throwing; primary actions and bottom navigation remain present in the full flow.

- [ ] **Step 2: Run focused tests and verify RED where current copy/flow is insufficient**

Run: `node --test tests/connectors.test.js tests/result-evidence.test.js tests/composer-integration.test.js`

- [ ] **Step 3: Implement honest pending/unavailable UI and final mobile spacing fixes**

Do not change provider behavior or add new providers.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test tests/connectors.test.js tests/result-evidence.test.js tests/composer-integration.test.js`

- [ ] **Step 5: Commit**

Commit message: `fix: make pending provider states explicit in composer flow`

---

### Task 6: Three-Stage Verification Gate

**Files:**
- Modify: `package.json`
- Modify lockfile after adding jsdom dev dependency
- Modify: `.github/workflows/release-gates.yml` only if needed to expose the three stages clearly
- Test: all test files

**Interfaces:**
- Consumes: all completed implementation tasks.
- Produces: reproducible staged verification commands and evidence.

#### Stage 1 — Unit Test / 単体テスト

Scope: pure parsers, controller state transitions, schema/domain edits, triggers, persistence normalization, summaries, evidence logic.

- [ ] **Step 1: Add/confirm `test:unit` script**

It must run the pure unit suites including `composerController.test.js` and existing parser/model/store/evidence suites, excluding DOM integration/system checks.

- [ ] **Step 2: Run unit stage fresh**

Run: `npm run test:unit`

Pass criterion: exit code 0; zero failed tests.

#### Stage 2 — Integration Test / 連結テスト

Scope: Composer UI + controller + parser + domain editors + draft bridge + local storage/save/list rendering in jsdom.

Required journeys:
- shopping full compose/edit/notify/save/reopen flow;
- flight full compose/edit/notify/save/reopen flow;
- hotel full compose/edit/notify/save/reopen flow.

- [ ] **Step 3: Add/confirm `test:integration` script**

It must run `tests/composer-integration.test.js` plus domain round-trip suites that cross module boundaries.

- [ ] **Step 4: Run integration stage fresh**

Run: `npm run test:integration`

Pass criterion: exit code 0; all three domain journeys pass; zero failed tests.

#### Stage 3 — System Test / 総合テスト

Scope: whole repository gates plus live rendered preview behavior.

- [ ] **Step 5: Add/confirm `test:system` script**

It must run the complete Node test suite, syntax/build, security, and compliance gates.

- [ ] **Step 6: Run system stage fresh**

Run: `npm run test:system`

Pass criterion: exit code 0 for full tests, build, security, compliance.

- [ ] **Step 7: Pin Floot temporary preview to the verified commit**

Do not publish production.

- [ ] **Step 8: Perform iPhone 15 (393×852) rendered-system QA**

Verify in the real preview:
- one obvious text input;
- typing causes visible interpretation feedback;
- category direct edits update the same displayed conditions;
- notification is separately legible;
- save produces the expected Watch card;
- edit/re-save works;
- no primary horizontal overflow;
- bottom navigation and primary actions are reachable;
- flight/hotel pending state is honest.

- [ ] **Step 9: Capture system-test evidence**

Record tested commit SHA, unit/integration/system command results, CI run status, and iPhone screenshot/interaction observations in the final report.

- [ ] **Step 10: Commit any test-script/workflow-only changes**

Commit message: `test: add three-stage composer verification gates`

---

## Final Acceptance Gate

Do not report the redesign complete unless all of these are true on the same final commit:

- **単体テスト:** PASS, zero failures.
- **連結テスト:** PASS for shopping / flight / hotel end-to-end module integration, zero failures.
- **総合テスト:** full suite + build + security + compliance PASS, zero failures.
- iPhone 15 preview QA completed with no blocking usability issue in the primary flow.
- One primary natural-language input only.
- No hidden helper relay required for primary input.
- Text and direct controls update the same canonical Structured Draft.
- Search conditions and notification conditions remain distinct.
- Save/edit round trip preserves structured semantics.
- Saved Watch list communicates what / conditions / notification with domain-specific summaries.
- Flight/hotel connector-pending behavior is not misrepresented as live search.
- No merge to `main` and no production publish.
