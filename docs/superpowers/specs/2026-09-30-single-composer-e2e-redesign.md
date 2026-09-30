# Mikke Single Composer + E2E Redesign

Date: 2026-09-30
Status: Design approved in chat; implementation not started

## Goal

Make Mikke understandable and reliable from first input through saved Watch review on iPhone.

The primary success criterion is that a user can complete this flow without guessing where to type or wondering whether anything happened:

1. Enter what they want to watch.
2. Immediately see how Mikke interpreted it.
3. Correct the interpreted conditions if needed.
4. Set notification conditions.
5. Save the Watch.
6. See the saved Watch summarized as “what / conditions / notification”.
7. Reopen and edit the Watch without losing meaning.

The redesign must also prevent regressions where CI is green but the actual interaction is broken.

## Constraints

- iPhone-first UI, with iPhone 15 (393×852) as the primary visual QA viewport.
- Keep Mikke free of mandatory paid or metered APIs.
- Preserve legal/TOS/compliance constraints and existing provider-safety rules.
- Do not add unauthorized scraping.
- Do not merge to `main` or publish production as part of this work.
- Preserve existing structured Watch semantics, including flight Travel Intent, domain conditions, triggers, evidence states, and local persistence.
- Flight and hotel live-provider search remain out of scope for this redesign; their current connector-pending behavior must be represented honestly in UI and tests.

## Problem Summary

The current composer evolved through additive UI layers. In particular, the promoted `quick-text-entry` writes into a separate visible textarea, copies its value into the legacy `#query`, dispatches an artificial input event, and on apply opens and triggers the older text-helper flow.

This creates multiple representations of the same user intent:

- quick text input
- legacy `#query`
- text-helper state
- Structured Watch draft

That duplication makes it possible for one layer to update while another does not. It also makes tests pass while the visible experience remains confusing or inert.

A second problem is test coverage. Several UI tests verify code structure or string presence instead of exercising the complete user journey. That allowed an “input appears to do nothing” regression even though CI stayed green.

A third problem is specification drift: old tests still describe free text as a secondary helper while the intended product direction now makes text input the primary entry.

## Design Decision

Adopt one Composer with one canonical editable state.

There will be one visible primary text input and one Structured Draft. Category-specific controls and natural-language parsing both update that same Structured Draft. No hidden legacy textarea or helper-apply relay may be required for the primary path.

The user-facing flow is:

`What are you looking for? → interpreted conditions → edit conditions → notification → save → Watch list`

## Architecture

### 1. Canonical Composer Controller

Introduce a focused composer controller that owns the current draft and raw text representation.

Responsibilities:

- initialize a draft
- parse natural-language input into a structured Watch
- apply domain-specific edits to the same draft
- expose a deterministic render model
- validate whether the Watch is saveable
- preserve existing domain semantics without reparsing display text on save

The controller is the only source of truth for editable Watch state.

The UI must not keep parallel semantic states that can diverge.

### 2. Primary Text Entry

The initial Composer view shows one obvious text area at the top:

- heading: `何を探していますか？`
- large multiline input
- example text appropriate for Mikke
- immediate interpretation feedback below the field

Typing updates the canonical draft immediately. The feedback is not merely a generic count; it surfaces meaningful interpretation where possible, for example:

- `航空券として読み取りました`
- `東京 → ホノルル`
- `往復 / 直行便 / 1〜3月`
- `12万円以下になったら通知`

If some text cannot be interpreted safely, the UI says so rather than inventing a condition.

There is no separate hidden “real” input behind this field.

### 3. Category Entry

Below the primary input, users may choose `商品 / 航空券 / ホテル` to build or refine conditions directly.

Category selection changes the domain-specific editor but does not switch to a different Composer mode. It edits the same Structured Draft.

Changing domain must clear incompatible domain-specific state while preserving only safe common state.

### 4. Condition Review and Editing

The Composer shows interpreted conditions directly under the input.

Hierarchy:

- what is being watched
- essential search conditions
- optional/advanced conditions behind progressive disclosure
- notification conditions in a distinct final section

Required/preferred semantics remain supported where the domain schema allows them.

Advanced controls stay collapsed by default on mobile.

### 5. Notification Section

Every domain uses the same top-level notification section label: `いつ知らせる？`

Notification conditions remain separate from search/matching conditions.

Examples:

- price threshold
- price drop
- stock/availability restoration
- flight award availability
- hotel availability

The user must be able to see the resulting notification summary before saving.

### 6. Save and Edit

Saving uses the current Structured Draft directly. It must not reparse display text to reconstruct the Watch.

Editing an existing Watch restores the structured Watch into the same Composer and allows round-trip save without semantic loss.

Local persistence behavior remains unchanged unless a migration is required to preserve compatibility.

### 7. Saved Watch List

All saved cards use the same visual skeleton:

1. category + status
2. what
3. key conditions
4. notification
5. actions

Content within the skeleton is domain-specific.

Examples:

- Shopping: model/product, size, color, condition, price
- Flight: route, trip pattern, date/stay, nonstop, airline
- Hotel: destination, dates, party/rooms, major stay conditions

The card must avoid dumping `rawQuery` and avoid excessive chips. Show the most important conditions and collapse extras as `＋N条件`.

## Error Handling

### Parsing

- Empty text: no draft interpretation; save remains unavailable.
- Partially understood text: keep supported conditions and surface unparsed/ambiguous text as unresolved rather than guessing.
- Unsupported condition: clearly label as unsupported or unresolved depending on evidence semantics.

### Persistence

- Malformed stored data continues to degrade safely via existing normalization logic.
- Editing legacy Watches must preserve readable meaning and migrate in memory where existing normalization already supports it.

### Provider Availability

- Flight and hotel live checks must not imply they are operating if connectors are pending.
- Product provider failure must preserve existing safe fallback/unavailable behavior.

## UI Rules

- iPhone-first vertical flow.
- One primary action per screen region.
- Input areas must look unmistakably editable.
- Touch targets should be at least approximately 44px high.
- Reduce decorative pills and border noise.
- Keep category controls visually secondary to the primary text entry.
- Keep notification visually distinct from search conditions.
- Avoid horizontal scrolling for primary controls.
- At 393px width, shopping and hotel primary grids must not become cramped two-column layouts if labels or values cannot fit comfortably.

## Testing Strategy

### 1. Unit Tests

Preserve and update existing parser, model, schema, trigger, persistence, evidence, security, and compliance tests.

Replace obsolete tests that assert free text is a secondary helper.

Add focused tests for the canonical Composer controller:

- text input updates the same draft used by direct controls
- domain switches clear incompatible state
- notification edits remain distinct from matching conditions
- save uses current structured state without reparsing display text
- edit/save round trip preserves semantics

### 2. DOM / Interaction Tests

Add browser-like DOM tests for the real Composer journey rather than only checking source strings.

Required scenarios:

#### Shopping

- open create
- type natural-language query
- see immediate interpreted conditions
- edit a structured condition
- set notification
- save
- verify Watch list summary
- reopen edit
- save again
- verify no semantic loss

#### Flight

- type route/trip/date/nonstop/airline/price intent
- verify Travel Intent and filters shown correctly
- edit via direct controls
- save and reopen
- verify alternatives and filters preserved

#### Hotel

- type destination/dates/party/access/breakfast/cancellation intent
- edit via direct controls
- save and reopen
- verify conditions preserved

### 3. Regression Gates

After implementation, run all of the following fresh:

- full unit test suite
- syntax/build checks
- security checks
- compliance checks
- Composer DOM/E2E journey tests

A green source-string test alone is not sufficient evidence of working UI.

### 4. Visual QA

After automated tests pass, inspect the actual preview at iPhone 15 viewport (393×852).

Verify at minimum:

- primary input is immediately obvious
- typing produces visible feedback
- no duplicate visible text-input path
- category controls remain secondary
- no horizontal overflow in primary flow
- condition hierarchy is understandable
- notification section is visually distinct
- saved Watch cards communicate what / conditions / notification within a quick scan
- bottom navigation and primary actions remain reachable

Desktop may be checked secondarily, but mobile is the release-quality reference for this change.

## Acceptance Criteria

The redesign is complete only when all of the following are true:

- Exactly one primary natural-language input is visible in the Composer.
- That input directly updates the canonical Structured Draft.
- No hidden helper relay is required for the primary flow.
- Parsed meaning is visibly reflected while typing.
- Product, flight, and hotel direct controls update the same draft.
- Search conditions and notification conditions remain distinct.
- Saving persists the current structured state directly.
- Editing and resaving a Watch preserves meaning.
- Saved Watch cards use the common hierarchy with domain-specific summaries.
- Full automated suite passes with zero failures.
- Build, security, and compliance checks pass.
- The three required interaction journeys pass.
- iPhone 15 visual QA shows no blocking usability issue in the primary flow.

## Out of Scope

- Adding paid or metered AI services.
- Implementing live flight provider search.
- Implementing live hotel provider search.
- Merging to `main`.
- Production publication.
- Unrelated redesign of provider integrations or back-end policy.
