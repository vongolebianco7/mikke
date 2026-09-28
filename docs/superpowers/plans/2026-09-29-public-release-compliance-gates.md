# Mikke Public Release Compliance Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement deterministic, auditable release gates for Mikke's shopping-monitoring MVP so PUBLIC_BETA is possible only after automated CI, manual compliance, and production smoke checks all pass.

**Architecture:** Keep the current dependency-light Node/browser architecture. Add small focused modules for abuse protection, URL safety, deletion, and display policy; add repository-level compliance artifacts and static validation scripts; split GitHub Actions into four required jobs. Do not add paid services, scraping, accounts, analytics, or automatic production publishing.

**Tech Stack:** Vanilla JavaScript ES modules, Node 22 built-in test runner, GitHub Actions, Vercel-style serverless API route, Markdown compliance artifacts.

**Spec:** `docs/superpowers/specs/2026-09-29-public-release-compliance-gates-design.md`

## Global Constraints

- Free-first: no required paid or metered AI/API service.
- Official APIs / explicitly permitted sources first.
- No scraping/crawling is added by this work.
- Provider credentials remain server-side only.
- iPhone/Safari is the primary manual visual target.
- Provider terms are external and mutable; manual review dates must be recorded.
- New providers/categories do not inherit approval from existing providers.
- `merge != publish`.

## Review Focus

- Repeated or concurrent `/api/shopping-search` requests must not multiply provider traffic beyond the defined limits.
- Provider-controlled titles, URLs, shop names, and images must not create XSS or dangerous navigation paths.
- Missing provider metadata must degrade conservatively: no invented discounts, attributes, or live status.
- Clearing Mikke data must remove only Mikke-owned localStorage keys and leave unrelated origin storage untouched.
- Provider attribution must remain present and unstyled by Mikke-specific selectors in release mode.

---

### Task 1: Release governance artifacts

**Files:**
- Create: `docs/PUBLIC_RELEASE_GATE.md`
- Create: `docs/PROVIDER_REGISTRY.md`
- Create: `PRIVACY.md`
- Create: `TERMS.md`
- Create: `.github/pull_request_template.md`
- Modify: `docs/COMPLIANCE.md`

**Interfaces:**
- Consumes: approved design spec.
- Produces: machine-checkable release artifacts and manual evidence fields used by Task 7.

- [ ] **Step 1: Write failing static artifact test**
  - Test required files, required gate headings, provider states, review-date fields, `merge != publish`, and privacy/terms topics.
- [ ] **Step 2: Run the static test**
  - Run: `node --test tests/compliance-static.test.js`
  - Expected: FAIL because release artifacts do not yet exist.
- [ ] **Step 3: Add the five release artifacts and update COMPLIANCE.md**
  - Initial provider states: Rakuten=`Review Required`, Yahoo=`Review Required`, others=`Disabled`.
  - Manual gate must record provider, date, API/version, official references, reviewer, decision, notes.
- [ ] **Step 4: Re-run test**
  - Expected: PASS.
- [ ] **Step 5: Commit**
  - `docs: add public release compliance governance`

### Task 2: Abuse controls for shopping API

**Files:**
- Create: `src/server/requestGuard.js`
- Modify: `api/shopping-search.js`
- Test: `tests/request-guard.test.js`
- Test: `tests/api-shopping.test.js`

**Interfaces:**
- Produces: `createRateLimiter({ limit, windowMs, now })`, `callerBucket(req)`, `withInFlightDedup(key, fn)`, `searchKey(watch)`.
- `api/shopping-search.js` consumes these before any provider request.

- [ ] **Step 1: Write failing tests**
  - First requests allowed; over-limit request returns blocked state with Retry-After seconds.
  - Same concurrent normalized Watch shares one provider promise.
  - Different Watches do not deduplicate.
  - Blocked requests never call provider search.
- [ ] **Step 2: Run tests**
  - Expected: FAIL because requestGuard module is missing.
- [ ] **Step 3: Implement dependency-free in-memory limiter and in-flight map**
  - Conservative caller bucket from common platform IP headers; fallback bucket when absent.
  - Dedup key from normalized search inputs only, never secrets/IP.
- [ ] **Step 4: Integrate route**
  - Return HTTP 429 + `Retry-After` before upstream calls when limited.
- [ ] **Step 5: Run full suite**
  - Run: `npm test`
  - Expected: PASS.
- [ ] **Step 6: Commit**
  - `feat: guard shopping api from abuse and duplicate traffic`

### Task 3: Safe external data rendering and pricing guardrails

**Files:**
- Create: `src/domain/outboundUrl.js`
- Create: `src/domain/pricing.js`
- Modify: `src/app.js`
- Modify: `src/server/shoppingProviders.js`
- Test: `tests/outbound-url.test.js`
- Test: `tests/pricing.test.js`

**Interfaces:**
- Produces: `safeOutboundUrl(value) -> string|null`, `displayPriceModel(candidate) -> { currentPrice, referencePrice, percentOff, note }`.
- UI consumes only sanitized outbound URLs and documented price fields.

- [ ] **Step 1: Write failing URL tests**
  - Allow `https:` and explicitly accepted `http:` if needed; reject `javascript:`, `data:`, malformed values, protocol-relative surprises.
- [ ] **Step 2: Write failing pricing tests**
  - Live item without provider-defined reference semantics never shows percent-off.
  - Sample fixtures may show discount only when explicitly marked as sample/reference-defined.
  - Never claim `cheapest`.
- [ ] **Step 3: Run tests**
  - Expected: FAIL.
- [ ] **Step 4: Implement utilities and wire UI**
  - Current live price remains visible; unsupported comparison price/discount omitted.
  - Add concise final-price/stock verification disclaimer.
- [ ] **Step 5: Run full suite**
  - Expected: PASS.
- [ ] **Step 6: Commit**
  - `fix: harden outbound links and price claims`

### Task 4: Delete-all local data flow

**Files:**
- Modify: `src/domain/watchStore.js`
- Modify: `src/domain/historyStore.js`
- Create: `src/domain/localData.js`
- Modify: `src/app.js`
- Modify: `styles.css`
- Test: `tests/local-data.test.js`

**Interfaces:**
- Produces: `MIKKE_LOCAL_KEYS`, `clearMikkeLocalData(storage)`.
- UI exposes `Watchと履歴をすべて削除` with explicit confirmation.

- [ ] **Step 1: Write failing tests**
  - Clears every Mikke-owned key.
  - Does not clear unrelated localStorage keys.
  - Returns cleared key list/count for UI state refresh.
- [ ] **Step 2: Run tests**
  - Expected: FAIL.
- [ ] **Step 3: Implement data utility and settings UI**
  - Explicit confirmation required; after deletion reset in-memory Watch/history/result state immediately.
- [ ] **Step 4: Run full suite**
  - Expected: PASS.
- [ ] **Step 5: Commit**
  - `feat: add complete local data deletion`

### Task 5: Provider attribution compliance

**Files:**
- Create: `src/domain/providerCredits.js`
- Modify: `src/app.js`
- Modify: `styles.css`
- Test: `tests/provider-credits.test.js`

**Interfaces:**
- Produces: provider-prescribed static credit snippets and release visibility rules.
- UI must not wrap provider snippets in selectors that change provider text/link color or font size.

- [ ] **Step 1: Write failing tests**
  - Required provider credit source is exact static content.
  - CSS contains no selector targeting provider credit markup/link styling.
  - Credits are not dependent solely on whether provider was contacted in current session.
- [ ] **Step 2: Run tests**
  - Expected: FAIL against current runtime-only/styled footer.
- [ ] **Step 3: Implement credits module and neutral placement**
  - Runtime source labels remain separate from provider credit requirement.
- [ ] **Step 4: Run full suite**
  - Expected: PASS.
- [ ] **Step 5: Commit**
  - `fix: make provider attribution release compliant`

### Task 6: Static security and compliance scripts

**Files:**
- Create: `scripts/security-check.mjs`
- Create: `scripts/compliance-check.mjs`
- Test: `tests/security-script.test.js`
- Test: `tests/compliance-script.test.js`
- Modify: `package.json`

**Interfaces:**
- Produces CLI commands `npm run security` and `npm run compliance` returning nonzero on failure.

- [ ] **Step 1: Write failing script tests**
  - Detect obvious committed credential assignments/patterns in tracked source fixtures.
  - Verify `.env` ignore rule.
  - Verify required release artifacts, provider registry states, rate guard import/use, delete-data action, demo label, and provider-credit invariants.
- [ ] **Step 2: Run tests**
  - Expected: FAIL because scripts do not exist.
- [ ] **Step 3: Implement dependency-free scanners**
  - Exclude harmless placeholder/example values and documentation examples conservatively.
- [ ] **Step 4: Add package scripts and run**
  - Run: `npm run security && npm run compliance`
  - Expected: PASS on the branch.
- [ ] **Step 5: Commit**
  - `chore: add security and compliance static gates`

### Task 7: Four-job GitHub Actions release gate

**Files:**
- Modify: `.github/workflows/test.yml`
- Test: `tests/workflow-policy.test.js`

**Interfaces:**
- Produces clearly named jobs: `test`, `security`, `compliance-static`, `build`.

- [ ] **Step 1: Write failing workflow policy test**
  - Parse workflow text and assert all four jobs exist and call the expected package commands.
- [ ] **Step 2: Run test**
  - Expected: FAIL against the current single `test` job.
- [ ] **Step 3: Split workflow into four jobs**
  - `test`: syntax + unit suite.
  - `security`: `npm run security`.
  - `compliance-static`: `npm run compliance`.
  - `build`: dependency-free deployability checks and required artifact presence.
- [ ] **Step 4: Run full suite locally-equivalent**
  - Run: `npm test && npm run security && npm run compliance && npm run build`
  - Expected: PASS.
- [ ] **Step 5: Commit**
  - `ci: enforce four-stage public release gate`

### Task 8: Final verification and PR release status

**Files:**
- Modify: `docs/PUBLIC_RELEASE_GATE.md`
- Modify: PR #1 description.

**Interfaces:**
- Consumes all prior task outputs.
- Produces auditable release state: automated PASS evidence plus manual/production items still BLOCKED until operator review and deployment smoke test.

- [ ] **Step 1: Run complete verification**
  - `npm test`
  - `npm run security`
  - `npm run compliance`
  - `npm run build`
  - Expected: all PASS.
- [ ] **Step 2: Verify GitHub Actions on final branch HEAD**
  - Expected: `test`, `security`, `compliance-static`, `build` all success.
- [ ] **Step 3: Update release gate evidence**
  - Mark only machine-proven items complete.
  - Keep provider terms registration/review, production secrets, iPhone visual verification, contact-path verification, and production smoke items unchecked unless actually completed.
- [ ] **Step 4: Update PR #1 body**
  - State automated gates and remaining manual blockers explicitly.
- [ ] **Step 5: Do not merge or publish**
  - Final expected release state remains `INTERNAL_BETA / PUBLIC_BETA BLOCKED` until Gate B + Gate C pass.
