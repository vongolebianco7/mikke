import { genericConditionFromLegacy, genericTriggerFromLegacy, normalizeGenericWatch } from './watchSchema.js';

const LEGACY_ATTRIBUTE_KEYS = ['size', 'colors', 'excludeUsed', 'allowDisplay', 'origin', 'destination', 'directOnly', 'tripType'];

function cloneArray(value) {
  return Array.isArray(value) ? [...value] : [];
}

function legacyRole(key, requiredKeys, preferredKeys) {
  if (requiredKeys.includes(key)) return 'required';
  if (preferredKeys.includes(key)) return 'preferred';
  return 'preferred';
}

function inferTarget(watch) {
  if (watch.target && typeof watch.target === 'object' && !Array.isArray(watch.target)) return { ...watch.target };
  return {
    categoryId: watch.type === 'shopping' ? undefined : watch.type,
    title: watch.title,
  };
}

export function normalizeWatch(watch = {}) {
  const legacyConditions = watch.conditions && typeof watch.conditions === 'object' ? watch.conditions : {};
  const existingAttributes = legacyConditions.attributes && typeof legacyConditions.attributes === 'object'
    ? legacyConditions.attributes
    : {};

  const attributes = { ...existingAttributes };
  for (const key of LEGACY_ATTRIBUTE_KEYS) {
    if (legacyConditions[key] !== undefined && attributes[key] === undefined) attributes[key] = legacyConditions[key];
  }

  const requiredKeys = cloneArray(watch.requiredKeys);
  const preferredKeys = cloneArray(watch.preferredKeys);
  const priceTriggers = Array.isArray(legacyConditions.priceTriggers) ? [...legacyConditions.priceTriggers] : [];
  const stateTriggers = Array.isArray(legacyConditions.stateTriggers) ? [...legacyConditions.stateTriggers] : [];

  if (typeof legacyConditions.maxPrice === 'number' && !priceTriggers.some((trigger) => trigger?.type === 'below_absolute')) {
    priceTriggers.push({
      type: 'below_absolute',
      value: legacyConditions.maxPrice,
      reference: 'explicit',
      role: requiredKeys.includes('maxPrice') ? 'required' : 'notification',
    });
  }

  const genericConditions = Array.isArray(watch.genericConditions) ? [...watch.genericConditions] : [];
  const coveredAttributeIds = new Set(genericConditions.map((condition) => condition?.attributeId));

  if (typeof legacyConditions.maxPrice === 'number' && requiredKeys.includes('maxPrice') && !coveredAttributeIds.has('price')) {
    const condition = genericConditionFromLegacy('maxPrice', legacyConditions.maxPrice, 'required');
    if (condition) genericConditions.push(condition);
  }

  for (const key of ['size', 'colors', 'excludeUsed', 'allowDisplay', 'origin', 'destination', 'directOnly']) {
    const value = legacyConditions[key] !== undefined ? legacyConditions[key] : attributes[key];
    if (value === undefined) continue;
    const normalizedId = key === 'colors' ? 'color' : key === 'excludeUsed' ? 'condition' : key === 'directOnly' ? 'direct' : key;
    if (coveredAttributeIds.has(normalizedId)) continue;
    const condition = genericConditionFromLegacy(key, value, legacyRole(key, requiredKeys, preferredKeys));
    if (condition) {
      genericConditions.push(condition);
      coveredAttributeIds.add(condition.attributeId);
    }
  }

  const triggers = Array.isArray(watch.triggers) ? [...watch.triggers] : [];
  const allLegacyTriggers = [...priceTriggers, ...stateTriggers];
  for (const legacyTrigger of allLegacyTriggers) {
    if (legacyTrigger?.type === 'below_absolute' && legacyTrigger.role === 'required') continue;
    const trigger = genericTriggerFromLegacy(legacyTrigger);
    if (!trigger) continue;
    const duplicate = triggers.some((item) => item?.metric === trigger.metric
      && item?.operator === trigger.operator
      && item?.reference === trigger.reference
      && item?.value === trigger.value);
    if (!duplicate) triggers.push(trigger);
  }

  const compatible = {
    ...watch,
    target: inferTarget(watch),
    genericConditions,
    triggers,
    metadata: {
      rawQuery: watch.metadata?.rawQuery ?? watch.rawQuery ?? '',
      inputMode: watch.metadata?.inputMode,
      ...(watch.metadata && typeof watch.metadata === 'object' ? watch.metadata : {}),
    },
    conditions: {
      ...legacyConditions,
      attributes,
      priceTriggers,
      stateTriggers,
    },
    requiredKeys,
    preferredKeys,
    baseline: {
      initialObservedAt: watch.baseline?.initialObservedAt ?? null,
      initialPriceByCandidate: watch.baseline?.initialPriceByCandidate && typeof watch.baseline.initialPriceByCandidate === 'object'
        ? { ...watch.baseline.initialPriceByCandidate }
        : {},
    },
    behavior: {
      ...(watch.behavior && typeof watch.behavior === 'object' ? watch.behavior : {}),
      decisionHistory: Array.isArray(watch.behavior?.decisionHistory) ? [...watch.behavior.decisionHistory] : [],
    },
  };

  return normalizeGenericWatch(compatible);
}
