const CONDITION_ROLES = new Set(['required', 'preferred']);
const CONDITION_SOURCES = new Set(['common', 'category', 'subcategory', 'custom']);

export function normalizeCondition(condition = {}) {
  return {
    id: condition.id,
    attributeId: condition.attributeId,
    operator: condition.operator,
    value: condition.value,
    unit: condition.unit,
    role: CONDITION_ROLES.has(condition.role) ? condition.role : 'preferred',
    source: CONDITION_SOURCES.has(condition.source) ? condition.source : 'custom',
  };
}

export function normalizeTrigger(trigger = {}) {
  return {
    id: trigger.id,
    metric: trigger.metric,
    operator: trigger.operator,
    value: trigger.value,
    unit: trigger.unit,
    reference: trigger.reference || 'current',
    scope: trigger.scope || 'candidate',
    role: 'notification',
  };
}

export function normalizeGenericWatch(watch = {}) {
  return {
    ...watch,
    schemaVersion: 2,
    target: watch.target && typeof watch.target === 'object' && !Array.isArray(watch.target) ? { ...watch.target } : {},
    genericConditions: Array.isArray(watch.genericConditions) ? watch.genericConditions.map(normalizeCondition) : [],
    triggers: Array.isArray(watch.triggers) ? watch.triggers.map(normalizeTrigger) : [],
    metadata: watch.metadata && typeof watch.metadata === 'object' && !Array.isArray(watch.metadata) ? { ...watch.metadata } : {},
  };
}

export function normalizeDomainCondition(condition = {}) {
  const role = CONDITION_ROLES.has(condition.role) ? condition.role : 'preferred';
  return {
    id: condition.id,
    fieldId: condition.fieldId,
    operator: condition.operator,
    value: condition.value,
    unit: condition.unit,
    role,
    evidencePolicy: condition.evidencePolicy || (role === 'required' ? 'known_required' : 'allow_unknown'),
  };
}

export function normalizeDomainWatch(watch = {}) {
  return {
    ...watch,
    schemaVersion: 3,
    domain: watch.domain,
    target: watch.target && typeof watch.target === 'object' && !Array.isArray(watch.target) ? { ...watch.target } : {},
    domainConditions: Array.isArray(watch.domainConditions) ? watch.domainConditions.map(normalizeDomainCondition) : [],
    triggers: Array.isArray(watch.triggers) ? watch.triggers.map(normalizeTrigger) : [],
    metadata: watch.metadata && typeof watch.metadata === 'object' && !Array.isArray(watch.metadata) ? { ...watch.metadata } : {},
  };
}

export function genericConditionFromLegacy(key, value, role = 'preferred') {
  if (value === undefined) return null;
  const common = { role: role === 'required' ? 'required' : 'preferred', source: 'common' };
  if (key === 'maxPrice') return normalizeCondition({ ...common, attributeId: 'price', operator: 'lte', value, unit: 'JPY' });
  if (key === 'size') return normalizeCondition({ ...common, attributeId: 'size', operator: 'eq', value });
  if (key === 'colors') return normalizeCondition({ ...common, attributeId: 'color', operator: 'in', value: Array.isArray(value) ? [...value] : [value] });
  if (key === 'excludeUsed' && value) return normalizeCondition({ ...common, attributeId: 'condition', operator: 'eq', value: 'new' });
  if (key === 'allowDisplay' && value) return normalizeCondition({ ...common, attributeId: 'display_item_allowed', operator: 'is_true', value: true });
  if (key === 'origin') return normalizeCondition({ ...common, attributeId: 'origin', operator: 'eq', value });
  if (key === 'destination') return normalizeCondition({ ...common, attributeId: 'destination', operator: 'eq', value });
  if (key === 'directOnly' && value) return normalizeCondition({ ...common, attributeId: 'direct', operator: 'is_true', value: true });
  return null;
}

export function genericTriggerFromLegacy(trigger = {}) {
  if (trigger.type === 'below_absolute') return normalizeTrigger({metric:'price',operator:'lte',value:trigger.value,unit:'JPY',reference:'current',scope:'candidate'});
  if (trigger.type === 'below_previous') return normalizeTrigger({metric:'price',operator:'lt',reference:'previous_observation',scope:'candidate'});
  if (trigger.type === 'below_initial') return normalizeTrigger({metric:'price',operator:'lt',reference:'initial_observation',scope:'candidate'});
  if (trigger.type === 'drop_percent') return normalizeTrigger({metric:'discount_percent',operator:'gte',value:trigger.percent,unit:'%',reference:trigger.reference === 'initial' ? 'initial_observation' : 'previous_observation',scope:'candidate'});
  if (trigger.type === 'new_watch_low') return normalizeTrigger({metric:'price',operator:'lt',reference:'watch_low',scope:'candidate'});
  if (trigger.type === 'restock') return normalizeTrigger({metric:'availability',operator:'changed_to',value:'in_stock',reference:'previous_observation',scope:'candidate'});
  if (trigger.type === 'new_result') return normalizeTrigger({metric:'listing_status',operator:'changed_to',value:'new',reference:'previous_observation',scope:'candidate'});
  return null;
}
