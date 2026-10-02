const clone = (value) => value === undefined ? undefined : structuredClone(value);

function roleToCard(role) {
  if (role === 'notification') return 'change';
  if (role === 'comparison') return 'comparison';
  return role || 'required';
}

function domainConditionToCard(item, index) {
  return {
    id:item.id || `domain-${index}`,
    attributeId:item.fieldId || item.attributeId,
    operator:item.operator || 'eq',
    value:clone(item.value),
    ...(item.unit !== undefined ? { unit:item.unit } : {}),
    role:roleToCard(item.role),
    supportState:'confirmed',
    source:'legacy_domain',
    manuallyEdited:false,
  };
}

function compatibilityToCard(item, index) {
  return {
    id:item.id || `compat-${index}`,
    attributeId:'compatibility',
    operator:item.relation || 'compatible_with',
    value:clone(item.target),
    role:roleToCard(item.role),
    supportState:'confirmed',
    source:'legacy_compatibility',
    manuallyEdited:false,
    legacySubjectType:item.subjectType,
    compatibilityRelation:item.relation,
  };
}

function triggerToCard(item, index) {
  return {
    id:item.id || `trigger-${index}`,
    attributeId:item.metric,
    operator:item.reference && item.reference !== 'current' ? 'relative_change' : (item.operator || 'changed_to'),
    value:clone(item.value),
    ...(item.unit !== undefined ? { unit:item.unit } : {}),
    role:'change',
    supportState:'confirmed',
    source:'legacy_trigger',
    manuallyEdited:false,
    legacyTrigger:{ reference:item.reference, scope:item.scope, operator:item.operator },
  };
}

function legacyConditionsToCards(conditions = {}) {
  const cards = [];
  if (Number.isFinite(conditions.maxPrice)) cards.push({ id:'legacy-price', attributeId:'price', operator:'lte', value:conditions.maxPrice, unit:'JPY', role:'required', supportState:'confirmed', source:'legacy_conditions', manuallyEdited:false });
  if (conditions.size) cards.push({ id:'legacy-size', attributeId:'size', operator:'eq', value:conditions.size, role:'required', supportState:'confirmed', source:'legacy_conditions', manuallyEdited:false });
  if (Array.isArray(conditions.colors) && conditions.colors.length) cards.push({ id:'legacy-color', attributeId:'color', operator:'one_of', value:clone(conditions.colors), role:'preferred', supportState:'confirmed', source:'legacy_conditions', manuallyEdited:false });
  return cards;
}

export function draftFromWatch(watch = {}) {
  return {
    domain:watch.domain || watch.type || 'shopping',
    categoryId:watch.target?.categoryId,
    subcategoryId:watch.target?.subcategoryId,
    target:clone(watch.target || { title:watch.title || '' }),
    conditions:[
      ...(watch.domainConditions || []).map(domainConditionToCard),
      ...(watch.compatibilityConditions || []).map(compatibilityToCard),
      ...(watch.triggers || []).map(triggerToCard),
      ...legacyConditionsToCards(watch.conditions),
    ],
    unresolvedFragments:clone(watch.metadata?.unresolvedFragments || []),
    metadata:{ rawQuery:watch.rawQuery || watch.metadata?.rawQuery || '', inputMode:watch.metadata?.inputMode, originalSchemaVersion:watch.schemaVersion },
  };
}

function cardToDomainCondition(card) {
  return { id:card.id, fieldId:card.attributeId, operator:card.operator, value:clone(card.value), ...(card.unit !== undefined ? { unit:card.unit } : {}), role:card.role === 'change' ? 'notification' : card.role };
}

function compatibilityId(card) {
  if (card.attributeId?.startsWith('compatibility:')) return card.attributeId.slice('compatibility:'.length) || card.id;
  return card.id;
}

function isCompatibilityCard(card) {
  return card.attributeId === 'compatibility' || card.attributeId?.startsWith('compatibility:');
}

function cardToCompatibility(card) {
  return {
    id:compatibilityId(card),
    relation:card.compatibilityRelation || (card.operator === 'compatible_with' ? 'compatible_with' : card.operator),
    target:clone(card.value),
    subjectType:card.subjectType || card.legacySubjectType || 'product',
    role:card.role === 'change' ? 'notification' : card.role,
  };
}

function cardToTrigger(card) {
  const legacy = card.legacyTrigger || {};
  return { id:card.id, metric:card.attributeId, operator:legacy.operator || (card.operator === 'relative_change' ? 'lt' : card.operator), value:clone(card.value), ...(card.unit !== undefined ? { unit:card.unit } : {}), reference:legacy.reference || (card.operator === 'relative_change' ? 'previous_observation' : 'current'), scope:legacy.scope || 'candidate', role:'notification' };
}

function watchTypeForDomain(domain) {
  if (domain === 'flight') return 'flight';
  if (domain === 'hotel') return 'hotel';
  return 'shopping';
}

export function watchFromDraft(draft = {}, originalWatch = {}) {
  const next = clone(originalWatch || {});
  next.domain = draft.domain || next.domain || next.type || 'shopping';
  next.type = watchTypeForDomain(next.domain);
  if (next.domain !== 'flight') {
    delete next.travelIntent;
    delete next.flightFilters;
  }
  next.target = { ...(next.target || {}), ...clone(draft.target || {}) };
  if (draft.categoryId !== undefined) next.target.categoryId = draft.categoryId;
  if (draft.subcategoryId !== undefined) next.target.subcategoryId = draft.subcategoryId;

  const cards = draft.conditions || [];
  next.domainConditions = cards.filter((card) => card.role !== 'change' && !isCompatibilityCard(card) && card.source !== 'legacy_conditions').map(cardToDomainCondition);
  next.compatibilityConditions = cards.filter(isCompatibilityCard).map(cardToCompatibility);
  next.triggers = cards.filter((card) => card.role === 'change').map(cardToTrigger);
  next.metadata = { ...(next.metadata || {}), ...(draft.metadata || {}), unresolvedFragments:clone(draft.unresolvedFragments || []) };
  return next;
}
