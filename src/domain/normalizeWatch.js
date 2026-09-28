const LEGACY_ATTRIBUTE_KEYS = ['size', 'colors', 'excludeUsed', 'allowDisplay', 'origin', 'destination', 'directOnly', 'tripType'];

function cloneArray(value) {
  return Array.isArray(value) ? [...value] : [];
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

  if (typeof legacyConditions.maxPrice === 'number' && !priceTriggers.some((trigger) => trigger?.type === 'below_absolute')) {
    priceTriggers.push({
      type: 'below_absolute',
      value: legacyConditions.maxPrice,
      reference: 'explicit',
      role: requiredKeys.includes('maxPrice') ? 'required' : 'notification',
    });
  }

  return {
    ...watch,
    conditions: {
      ...legacyConditions,
      attributes,
      priceTriggers,
      stateTriggers: Array.isArray(legacyConditions.stateTriggers) ? [...legacyConditions.stateTriggers] : [],
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
}
