# Mikke Input Composer Redesign

Date: 2026-10-02
Status: Design for review
Scope: Input, condition editing, interpretation, and save flow for Mikke Watches

## 1. Goal

Mikke must let a user describe, refine, and save a Watch without first learning a search form.

The same interaction model must work when the Watch has two simple conditions or more than twenty detailed conditions, and it must work across very different domains such as fashion, appliances, furniture, food, baby products, sports gear, electronics, daily goods, beauty, pet products, hobby products, used cars, flights, and hotels.

The redesign is not a visual restyle of the current composer. It replaces the current input information architecture, where natural-language input, category buttons, fixed fields, and change conditions are stacked as separate form sections.

Primary success criteria:

1. A new user can start with one obvious action.
2. Natural language, direct structured entry, and later manual edits all produce the same Watch model.
3. The UI remains usable with 2, 10, or 20+ conditions.
4. Required, preferred, excluded, allowed, comparison, compatibility, and change conditions are distinguishable and editable.
5. Category-specific conditions are available without permanently exposing large forms.
6. Ambiguous or unsupported conditions are visible instead of silently discarded.
7. The complete create/edit flow is designed for iPhone first.

## 2. Coverage corpus

The design must be validated against a minimum corpus of 800 input scenarios before it replaces the current composer.

The corpus is coverage-driven rather than a collection of near-duplicate phrases.

### 2.1 Domain families

The corpus must include at least the following families:

- shirts / outerwear / suits / general fashion
- shoes / running shoes
- refrigerators / washing machines / TVs / air conditioners / kitchen appliances
- PCs / smartphones / tablets / accessories
- furniture / desks / chairs / storage
- food / beverages / bulk food
- daily goods / consumables
- beauty / cosmetics
- baby clothing / baby gear / child seats
- bicycles / electric bicycles
- running / sports / outdoor gear
- pet food / pet goods
- hobby / collectibles / games
- used cars / new-car discovery / vehicle accessories
- tickets / event goods where applicable
- flights
- hotels

Some of these may map to an existing broader Mikke domain. The corpus tests user intent, not implementation taxonomy.

### 2.2 Condition structures

The corpus must intentionally cover:

- exact match
- minimum / maximum
- closed and open ranges
- multiple accepted values (OR)
- exclusions
- required conditions
- preferred conditions
- allowed exceptions
- conditional dependencies (A only if B)
- compatibility / fit
- ranking / comparison conditions
- price-change conditions
- stock / availability changes
- release / reservation changes
- relative comparisons to initial, previous, and observed-low values
- vague qualitative language
- contradictory conditions
- unknown attributes
- provider-unavailable attributes
- typo / shorthand / model-number-only input
- URL input
- partial edits such as “same as before, only black”
- exception phrases such as “used is normally excluded, but unused-open-box is okay”

### 2.3 Difficulty distribution

At minimum:

- 20%: 1–2-condition simple inputs
- 30%: 3–5-condition normal inputs
- 30%: 6–10-condition advanced inputs
- 15%: 11–20-condition complex inputs
- 5%: adversarial / contradictory / highly ambiguous inputs

A design does not pass because the parser recognizes the sentence. The full path is evaluated:

input -> interpretation -> condition representation -> correction -> save -> reopen/edit

## 3. Core interaction model

The new composer uses one canonical interaction model:

**Intent input -> interpreted condition cards -> direct condition editing -> save**

There is no separate “natural language mode” and “structured mode”. They are two ways to change the same Watch draft.

### 3.1 Initial state

The first screen shows only the essentials:

- page purpose / short title
- one prominent input field: “何を探していますか？”
- contextual examples that rotate by domain, not a permanent long list
- a secondary “条件から追加” action

The user must not be forced to choose 商品 / 航空券 / ホテル before typing. Domain inference can occur after input. Domain selection becomes a correction control if inference is wrong.

The first screen must not show a full category form or change-condition panel.

### 3.2 After interpretation

As soon as text is interpreted, the composer shows:

1. **Target card** — what is being looked for.
2. **Condition card stack** — interpreted constraints.
3. **Unresolved strip** — text Mikke could not confidently map.
4. **Add condition** action.
5. **Save Watch** primary action.

The original text remains editable, but it is not the only source of truth. Structured edits modify the canonical Watch draft directly.

## 4. Condition primitive model

All visible conditions are represented by a small set of interaction primitives rather than category-specific forms.

Each condition has:

- attribute
- operator
- value
- unit if applicable
- role
- evidence / support state
- optional source text

### 4.1 Operators

The UI must support at least:

- equals
- not equals / excludes
- greater than / at least
- less than / at most
- range
- one of
- contains / does not contain
- boolean yes/no
- compatible with
- changed to
- increased/decreased relative to reference
- rank / sort preference

Operators are presented using domain-friendly Japanese labels; raw operator codes are never exposed to the user.

### 4.2 Roles

The canonical roles are:

- **必須** — candidate must satisfy the condition.
- **できれば** — contributes to ranking but does not block a candidate.
- **除外** — candidate is rejected when the exclusion matches.
- **許容** — explicitly permits an otherwise uncertain or exceptional state.
- **比較** — determines ranking/comparison but not eligibility.
- **変化条件** — describes when a meaningful change is surfaced during a manual check; while background monitoring is not implemented, wording must not imply push delivery.

A card may change role without recreating the condition.

## 5. Condition cards

Cards are the primary editing surface after interpretation.

Example:

- 必須 · 容量 · 500L以上
- 必須 · 幅 · 68cm以下
- できれば · 色 · 白
- 許容 · 展示品
- 除外 · 中古
- 変化条件 · 価格 · 150,000円以下

### 5.1 Collapsed card

A collapsed card displays:

- role
- human-readable attribute label
- human-readable value / expression
- support state when relevant

The entire card is tappable. Delete is not the primary visible action to reduce accidental removal on iPhone.

### 5.2 Expanded card editor

Tapping opens a bottom sheet on iPhone.

The sheet contains only controls relevant to that attribute:

- role selector
- operator selector
- value editor
- unit when necessary
- remove action

For enumerations, use choices/search instead of a free text box. Numeric fields use appropriate keyboard types. Ranges use two values. Boolean attributes use two-state choices.

### 5.3 Long lists

When there are many conditions:

- cards remain one compact vertical list
- conditions may be grouped by role or semantic section when >8 cards
- a sticky summary shows the total and unresolved count
- the user can search/filter existing conditions

The UI must never turn into a 20-field permanent form.

## 6. Adding conditions

“＋ 条件を追加” opens a searchable bottom sheet.

The first section contains **Recommended for this target**, derived from the inferred category/subcategory.

Examples:

Refrigerator:
- capacity
- installation width
- body width
- height/depth
- door orientation
- freezer capacity
- color
- energy use
- release year
- new/display/used condition
- price

Running shoes:
- size
- width
- road/trail
- cushioning/stability
- color
- model/series
- condition
- price

Used car:
- model
- grade
- model year
- mileage
- repair history
- color
- drivetrain
- total price
- region
- warranty

The second section provides attribute search across the domain.

The third option is “文章で追加”, allowing a phrase such as “黒以外、できれば白”.

Adding a condition never replaces existing conditions unless Mikke can identify it as an edit to the same attribute and asks/indicates the replacement clearly.

## 7. Interpretation and confidence

The parser must stop pretending that every phrase has been fully understood.

Each extracted item has an interpretation state:

- **confirmed** — high-confidence structured mapping
- **needs_review** — plausible mapping but ambiguous value/operator/role
- **unresolved** — text preserved but no safe structured mapping
- **unsupported** — understood concept, but the current Watch schema/provider cannot evaluate it

### 7.1 Unresolved text

Unresolved text is shown directly below the condition list, for example:

“まだ条件にできていません: 安っぽくない / バッテリー大きめ”

The user can:

- tap the phrase and map it to an attribute
- leave it as a note
- remove it

Silent loss is not allowed.

### 7.2 Ambiguity

Mikke should prefer a small review prompt over a wrong hard filter.

Examples:

- “軽め” -> suggest weight preference, but needs review unless a threshold is known.
- “1万円くらい” -> suggest preferred target around ¥10,000, not automatically “required <= ¥10,000”.
- “白か黒” -> one `one_of` condition, not two required conditions.

## 8. Category and domain handling

Category inference is a background aid, not an early mandatory choice.

When inference is confident, the category appears as an editable small label near the target.

When uncertain, the UI can ask “これはどれに近いですか？” with a short candidate list.

Changing category must preserve conditions that remain semantically valid. Conditions that cannot map to the new category move to needs_review rather than being deleted.

Flights and hotels use the same outer composer shell but can expose richer structured editors where the data is inherently relational:

Flights:
- origin/destination
- trip pattern
- date/date range/flexibility
- travelers
- cabin
- stop count
- airlines
- award/cash distinctions where supported
- price/change conditions

Hotels:
- location
- date/date range
- guests/rooms
- room requirements
- meal
- cancellation
- walking/location constraint
- facilities
- price/change conditions

They still produce the same visible condition-card model for review and correction.

## 9. Input sources

The architecture must allow multiple input sources without inventing separate Watch types.

Initial release:

- free text
- direct condition addition/editing

Designed extension points, not required in the first implementation:

- product URL
- pasted product/model identifier
- image-assisted input
- copy-from-existing Watch

An input adapter emits condition proposals; only the canonical draft store mutates the Watch.

## 10. Architecture

The current composer mixes rendering, parser behavior, category-specific fields, trigger editing, and DOM event handling in a large UI module. The redesign separates these responsibilities.

### 10.1 `composerDraftStore`

Owns one canonical mutable draft and exposes explicit edit operations.

Responsibilities:
- target/category/domain
- conditions
- unresolved fragments
- metadata
- validation/saveability

It does not render UI or parse raw language.

### 10.2 `interpretInput`

Transforms text into proposals:

- target proposal
- condition proposals
- unresolved fragments
- confidence

It does not directly overwrite the draft.

### 10.3 `mergeInterpretation`

Merges proposals into the existing draft predictably.

Rules cover:
- same attribute replacement
- OR values
- preservation of manual edits
- conflict detection
- unresolved preservation

Manual edits take precedence over later low-confidence parser proposals unless the user explicitly replaces them.

### 10.4 `conditionCatalog`

Provides category/domain metadata:

- attributes
- labels
- value types
- operators
- units
- suggested roles
- enumerations
- common recommendations

This replaces hard-coded `shoppingPrimaryFields` arrays in UI code.

### 10.5 UI components

Conceptual components:

- ComposerEntry
- TargetSummary
- ConditionList
- ConditionCard
- ConditionEditorSheet
- AddConditionSheet
- UnresolvedList
- ComposerSaveBar

The implementation can remain vanilla JS, but each unit must have an isolated module/API rather than one monolithic event delegate.

## 11. Data flow

1. User types or edits raw intent.
2. `interpretInput` emits proposals.
3. `mergeInterpretation` compares proposals with the existing draft.
4. `composerDraftStore` updates the canonical draft.
5. UI renders condition cards and unresolved fragments.
6. User directly edits any card or adds/removes conditions.
7. Save validates the canonical draft.
8. Saved Watch can be reopened into the same composer without loss.

The raw sentence is supporting metadata, not the canonical state after manual edits.

## 12. Error and unsupported-state handling

No parse or persistence failure may produce a false-success state.

Required behaviors:

- parsing exceptions preserve the entered text and show a non-destructive error
- unsupported attributes remain visible as unsupported/note, not silently removed
- contradictory required conditions are flagged before save
- storage failure keeps the draft visible and reports that saving failed
- changing category cannot silently drop conditions
- provider limitations are distinguished from Mikke interpretation limitations

## 13. iPhone interaction requirements

The primary target is current iPhone Safari.

Requirements:

- one-column composer
- minimum 44px interactive targets
- no horizontal scrolling for core controls
- bottom sheets for editing/add-condition flows
- sticky save bar that does not cover content or the keyboard
- focus returns to the originating card after a sheet closes
- keyboard-safe scrolling
- no requirement for hover
- VoiceOver labels for role, attribute, and value
- dynamic interpretation messages use appropriate live-region behavior without reading the entire form on every keystroke
- reduced-motion preference respected

## 14. Product Promise

The current beta is manual-check.

The composer must use wording such as:

- “変化条件”
- “確認時にこの変化を見つける”

It must not use wording that implies Mikke is already checking in the background or pushing notifications while the user is away.

The condition model may retain a semantic notification/change role for future scheduler support, but UI language must match current behavior.

## 15. Test strategy

### 15.1 Corpus tests

A versioned scenario corpus contains at least 800 scenarios. Each case declares expected semantic features, not brittle full-object snapshots.

Examples of assertions:

- inferred domain/category
- required/preferred/exclusion/change role
- expected operator/value
- unresolved fragment preserved
- contradictory state detected

The corpus must be easy to extend when a real user input fails.

### 15.2 Draft/merge tests

Must cover:

- text -> structured condition
- manual edit survives subsequent unrelated text edit
- changing one attribute does not duplicate it
- OR merge
- role change
- category switch preservation/review
- conflicting inputs
- unresolved retention
- reopen/save round trip

### 15.3 UI tests

Must cover:

- simple 2-condition flow
- 20+ condition flow
- add-condition search
- card edit bottom sheet
- unresolved mapping
- validation/conflict presentation
- save failure
- keyboard/focus return

### 15.4 iPhone release checks

Before replacing the current composer in the Preview RC:

- real iPhone Safari smoke
- VoiceOver walkthrough
- 320–430px viewport checks
- keyboard open/close behavior
- long condition list
- dynamic type / readable zoom behavior

## 16. Migration

Existing saved Watches must continue to open.

Migration principles:

- map current `domainConditions`, `compatibilityConditions`, and triggers into the new card representation
- do not rewrite stored data merely by opening the Watch
- save using a backwards-compatible schema revision or explicit migration version
- preserve unknown legacy fields

The current composer remains available behind the development branch until corpus, unit, integration, and iPhone gates pass.

## 17. Definition of done

The redesign is ready to replace the current input UI only when:

1. The 800+ scenario corpus is in CI.
2. No supported scenario silently loses user-entered intent.
3. Required/preferred/exclusion/allow/comparison/change semantics are directly editable.
4. A 20-condition Watch remains usable on iPhone without a giant permanent form.
5. Category-specific condition discovery works through the condition catalog.
6. Ambiguous and unsupported conditions are visible and recoverable.
7. Existing saved Watches open and round-trip without material loss.
8. Product Promise wording remains consistent with manual-check beta.
9. Automated tests and iPhone/VoiceOver release checks pass.

## 18. Explicit non-goals for this implementation

- background scheduler
- push notifications
- paid AI parsing APIs
- mandatory cloud persistence
- provider-specific scraping to infer missing attributes
- attempting to solve every vague qualitative phrase automatically

The goal is a robust input architecture that can safely represent uncertainty and evolve, not an illusion of perfect natural-language understanding.