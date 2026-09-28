# Universal Product Conditions and Trigger Engine

Date: 2026-09-29
Status: Design specification
Branch: `feat/mikke-mvp`

## Goal

Mikke should handle fashion, appliances, furniture, food, used cars, baby goods, tools, sports goods, cosmetics, PC parts, gardening goods, and other product categories without creating a separate condition model for each category.

The user-facing UI may adapt to a category, but every Watch should compile into the same internal condition and trigger structures.

## Design principles

1. Category-specific UX, category-agnostic engine.
2. Conditions describe what qualifies as a candidate; triggers describe when a user should be told about a change.
3. Unknown product attributes must still be representable as generic attribute conditions.
4. Do not require Mikke to know every possible product schema in advance.
5. Keep required, preferred, and notification semantics separate.
6. Do not fabricate unavailable provider data. A field can be unsupported or unknown.
7. Existing Watches must continue to load safely.

## Core Watch model

```js
{
  target: {
    categoryId,
    subcategoryId,
    title,
    brand,
    model
  },
  conditions: [Condition],
  triggers: [Trigger],
  metadata: {
    rawQuery,
    inputMode
  }
}
```

Existing legacy fields such as `conditions.maxPrice`, `requiredKeys`, and `preferredKeys` remain readable during migration and normalize into the new representation.

## Generic condition model

```js
{
  id,
  attributeId,
  operator,
  value,
  unit,
  role: 'required' | 'preferred',
  source: 'common' | 'category' | 'subcategory' | 'custom'
}
```

Supported operator families:

- equality: `eq`, `neq`
- numeric: `gte`, `lte`, `between`
- enum/list: `in`, `not_in`, `contains`, `contains_all`
- boolean: `is_true`, `is_false`
- text fallback: `contains_text`, `not_contains_text`

Examples:

```js
{ attributeId: 'size', operator: 'eq', value: 24.5, unit: 'cm', role: 'required' }
{ attributeId: 'capacity', operator: 'gte', value: 500, unit: 'L', role: 'required' }
{ attributeId: 'color', operator: 'in', value: ['gray', 'white'], role: 'preferred' }
{ attributeId: 'mileage', operator: 'lte', value: 30000, unit: 'km', role: 'required' }
```

## Attribute registry

Attributes are defined independently from category templates.

```js
{
  attributeId: 'width',
  label: '幅',
  type: 'number',
  unit: 'mm',
  operators: ['lte', 'gte', 'between'],
  aliases: ['横幅', '本体幅']
}
```

Common registry examples:

- price
- brand
- model
- color
- size
- width
- height
- depth
- weight
- capacity
- quantity
- condition
- material
- release_year
- origin_country
- warranty
- seller

Category-specific attributes can use the same registry format, for example `mileage`, `repair_history`, `freezer_capacity`, or `allergens`.

## Category template model

```js
{
  categoryId,
  displayName,
  parentCategoryId,
  defaultAttributes: [],
  recommendedAttributes: [],
  advancedAttributes: [],
  supportedTriggers: [],
  synonyms: {},
  units: {}
}
```

Templates change which conditions are suggested first. They do not change the evaluation engine.

## Category template examples

### Fashion

Default:
- brand
- model
- size
- color
- price
- condition

Recommended:
- gender
- material
- fit
- season
- release_year

Possible subcategory additions:
- shirt: chest_width, body_length, sleeve_length, collar_type
- shoes: shoe_size, width_class, purpose, weight

### Appliances

Default:
- brand
- model
- price
- dimensions
- capacity
- release_year

Recommended:
- color
- warranty
- energy_consumption
- functions

Subcategory example: refrigerator
- total_capacity
- freezer_capacity
- vegetable_compartment
- door_count
- door_style
- installation_width

### Furniture

Default:
- width
- height
- depth
- color
- price
- material

Recommended:
- load_capacity
- seat_count
- assembly_required
- package_dimensions

### Food

Default:
- quantity
- weight
- price
- shipping_fee
- origin_country

Recommended:
- expiration_date
- storage_method
- allergens
- calories
- sugar
- organic

Derived metrics may include normalized unit price such as price per 100g or per item.

### Used car

Default:
- manufacturer
- model
- trim
- price
- model_year
- mileage
- color
- repair_history

Recommended:
- fuel_type
- drivetrain
- inspection_expiry
- one_owner
- non_smoking
- warranty
- equipment

## Trigger engine

Triggers are category-agnostic. Every trigger has the same shape:

```js
{
  id,
  metric,
  operator,
  value,
  unit,
  reference,
  scope,
  role: 'notification'
}
```

The key abstraction is:

```text
metric + operator + reference
```

### Price triggers

Metrics:
- `price`
- `effective_price`
- `discount_percent`
- `watch_low`

Examples:

```js
{ metric: 'price', operator: 'lte', value: 10000, unit: 'JPY', reference: 'current' }
{ metric: 'price', operator: 'lt', reference: 'previous_observation' }
{ metric: 'discount_percent', operator: 'gte', value: 10, reference: 'previous_observation' }
{ metric: 'price', operator: 'lt', reference: 'watch_low' }
```

### Availability triggers

Metrics:
- `availability`
- `stock_quantity`
- `preorder_status`

Examples:

```js
{ metric: 'availability', operator: 'changed_to', value: 'in_stock' }
{ metric: 'availability', operator: 'changed_to', value: 'low_stock' }
{ metric: 'preorder_status', operator: 'changed_to', value: 'open' }
```

### Release triggers

Metrics:
- `release_status`
- `release_date`

Examples:

```js
{ metric: 'release_status', operator: 'changed_to', value: 'announced' }
{ metric: 'release_status', operator: 'changed_to', value: 'preorder_open' }
{ metric: 'release_status', operator: 'changed_to', value: 'released' }
```

### Shipping triggers

Metrics:
- `shipping_fee`
- `landed_price`
- `delivery_date`
- `delivery_days`

Examples:

```js
{ metric: 'shipping_fee', operator: 'eq', value: 0, unit: 'JPY' }
{ metric: 'landed_price', operator: 'lte', value: 15000, unit: 'JPY' }
{ metric: 'delivery_date', operator: 'lte', value: '2026-10-25' }
```

`landed_price = item_price + shipping_fee` when both values are available.

### Coupon triggers

Metrics:
- `coupon_available`
- `coupon_discount_amount`
- `coupon_discount_percent`

Examples:

```js
{ metric: 'coupon_available', operator: 'changed_to', value: true }
{ metric: 'coupon_discount_amount', operator: 'gte', value: 1000, unit: 'JPY' }
{ metric: 'coupon_discount_percent', operator: 'gte', value: 10, unit: '%' }
```

Coupon state must distinguish:
- detected
- eligible
- unknown

Mikke must not state that a coupon is usable if eligibility cannot be confirmed.

### Points and effective prices

Keep values separate:

- `cash_price`
- `effective_price_after_coupon`
- `effective_price_after_points`

Points must not automatically be represented as cash-equivalent without explicit labeling.

### Seller triggers

Metrics:
- `seller_changed`
- `cheaper_seller_found`

Only deduplicate products across sellers when a strong identity exists, such as GTIN/JAN/EAN/UPC, verified model code, or another reliable provider identifier.

## Derived purchase metrics

Possible derived metrics:

```text
landed_price = item_price + shipping_fee
coupon_adjusted_price = landed_price - verified_coupon_discount
effective_price_after_points = coupon_adjusted_price - explicit_point_value
unit_price = landed_price / normalized_quantity
```

Each derived metric must carry provenance and must not be computed when required inputs are unknown.

## Category-level trigger suggestions

The engine supports all common triggers, but the UI only promotes relevant ones.

Fashion:
- price
- availability
- coupon
- sale

Appliances:
- price
- availability
- shipping
- coupon
- release

Furniture:
- price
- availability
- shipping
- delivery

Food:
- price
- shipping
- coupon
- normalized unit price

Used cars:
- price
- new listing
- price change
- seller/dealer change

## Input UX compatibility

The three Watch creation modes all compile to the same condition/trigger model.

### Easy mode

Question-driven, category-aware prompts.

Example for refrigerator:
- capacity?
- installation width?
- color?
- what price should trigger notification?

### Build mode

Category-aware chips such as:
- +容量
- +寸法
- +メーカー
- +価格
- +在庫
- +送料

### Free text mode

Example:

```text
500L以上、幅70cm以下、白かグレー、新品、15万円以下になったら教えて
```

Parser output is normalized into the same model used by the other two modes.

## Progressive disclosure

Do not render every possible attribute.

UI order:

1. よく使う条件
2. この商品でよく使う条件
3. その他の条件

Unknown/custom attributes can be added through an advanced path without requiring a new app release for each category.

## Data confidence and unsupported fields

Every candidate attribute/metric should be able to represent:

- known value
- unknown value
- unsupported by provider
- inferred value (only where safe and explicitly marked)

Unknown must not be treated as false or zero.

A required condition with unknown evidence must not be called a confirmed match.

A notification trigger requiring missing historical evidence must not fire.

## Backward compatibility

Legacy Watches are normalized on read.

Examples:

- `conditions.maxPrice` -> generic price condition or price trigger according to existing semantics
- `requiredKeys` -> `role: required`
- `preferredKeys` -> `role: preferred`
- existing `priceTriggers` -> new Trigger shape

Do not require destructive migration of localStorage. New writes may use a versioned schema while old records remain readable.

## Initial implementation scope

Phase 1 should implement the generic engine and enough templates to prove the architecture:

- fashion
- appliances
- furniture
- food
- used car

Common triggers in Phase 1:

- absolute price
- previous-price drop
- percentage drop
- Watch low
- availability/restock
- shipping fee
- coupon detection/discount where provider evidence exists
- release/preorder state where provider evidence exists

Do not fabricate data for providers that do not expose these fields.

## Success criteria

1. A Watch from each reference category can be represented by the same condition model.
2. Trigger evaluation code does not branch on category for price, inventory, shipping, coupon, or release events.
3. Category templates only control suggestions and metadata, not core evaluation semantics.
4. All three creation modes produce compatible normalized Watch data.
5. Existing Watches continue to load.
6. Unknown provider fields do not produce false matches or false notifications.
7. iPhone UI uses progressive disclosure and does not expose the complete schema at once.
8. No paid or metered AI/API dependency is required for the condition engine.
