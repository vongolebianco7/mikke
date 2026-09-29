import { factsFromCandidate } from './candidateFacts.js';
import { evaluateGenericConditions, evaluateDomainConditions } from './conditionEngine.js';

function normalizeColor(value = '') {
  return value.replace('灰色', 'グレー').toLowerCase();
}

function conditionValue(conditions, key) {
  if (conditions?.[key] !== undefined) return conditions[key];
  return conditions?.attributes?.[key];
}

function checkKey(key, conditions, candidate) {
  const attrs = candidate.attributes || {};
  const value = conditionValue(conditions, key);
  switch (key) {
    case 'maxPrice': return typeof candidate.price === 'number' && candidate.price <= value;
    case 'size': {
      if (Array.isArray(attrs.sizes)) return attrs.sizes.includes(value);
      return typeof attrs.size === 'string' && attrs.size === value;
    }
    case 'colors': {
      const expected = Array.isArray(value) ? value : [];
      const values = Array.isArray(attrs.colors) ? attrs.colors : (typeof attrs.color === 'string' ? [attrs.color] : []);
      return values.some((item) => expected.some((color) => normalizeColor(item).includes(normalizeColor(color))));
    }
    case 'origin': return attrs.origin === value;
    case 'destination': return attrs.destination === value;
    case 'directOnly': return value ? attrs.direct === true : true;
    case 'excludeUsed': return value ? attrs.used !== true : true;
    default: return false;
  }
}

function shapeEvaluation(result) {
  const reasons = result.outcomes.map(({ condition, state }) => ({
    key: condition.id || condition.fieldId || condition.attributeId,
    ok: state === 'pass',
    state,
  }));
  const nearMatch = !result.requiredMatch
    && result.unknownRequired.length === 0
    && result.unsupportedRequired.length === 0
    && result.failedRequired.length === 1
    && result.score >= 60;
  return {
    requiredMatch: result.requiredMatch,
    score: result.score,
    reasons,
    nearMatch,
    failedRequired: result.failedRequired,
    unknownRequired: result.unknownRequired,
    unsupportedRequired: result.unsupportedRequired,
  };
}

export function evaluateCandidate(watch, candidate) {
  const facts = factsFromCandidate(candidate);
  if (Array.isArray(watch.domainConditions) && watch.domainConditions.length) {
    return shapeEvaluation(evaluateDomainConditions(watch.domainConditions, facts));
  }
  if (Array.isArray(watch.genericConditions) && watch.genericConditions.length) {
    return shapeEvaluation(evaluateGenericConditions(watch.genericConditions, facts));
  }

  const required = watch.requiredKeys || [];
  const preferred = watch.preferredKeys || [];
  const requiredResults = required.map((key) => [key, checkKey(key, watch.conditions, candidate)]);
  const preferredResults = preferred.map((key) => [key, checkKey(key, watch.conditions, candidate)]);
  const requiredMatch = requiredResults.every(([, ok]) => ok);
  const total = required.length * 2 + preferred.length;
  const passed = requiredResults.filter(([, ok]) => ok).length * 2 + preferredResults.filter(([, ok]) => ok).length;
  const score = total === 0 ? 50 : Math.round((passed / total) * 100);
  const reasons = [...requiredResults, ...preferredResults].map(([key, ok]) => ({ key, ok }));
  const failedRequired = requiredResults.filter(([, ok]) => !ok).map(([key]) => key);
  const nearMatch = !requiredMatch && failedRequired.length === 1 && score >= 60;
  return { requiredMatch, score, reasons, nearMatch, failedRequired, unknownRequired: [], unsupportedRequired: [] };
}

function numeric(value) {
  return Number.isFinite(value);
}

function percentDrop(reference, current) {
  if (!numeric(reference) || !numeric(current) || reference <= 0 || current >= reference) return 0;
  return Math.round(((reference - current) / reference) * 100);
}

function triggerList(context) {
  return Array.isArray(context?.priceTriggers) ? context.priceTriggers : [];
}

export function deriveEvents(previous, current, evaluation, context = {}) {
  const events = [];
  if (!previous) {
    if (evaluation.requiredMatch) events.push({ kind: 'condition_match', candidateId: current.candidateId });
    events.push({ kind: 'new_result', candidateId: current.candidateId });
  } else {
    if (numeric(previous.price) && numeric(current.price) && current.price < previous.price) {
      events.push({ kind: 'price_drop', candidateId: current.candidateId, delta: previous.price - current.price, previousPrice: previous.price, currentPrice: current.price });
    }
    if (previous.available === false && current.available === true) {
      events.push({ kind: 'restock', candidateId: current.candidateId });
    }
  }

  if (evaluation.nearMatch && previous?.nearMatch !== true) {
    events.push({ kind: 'near_match', candidateId: current.candidateId, failedRequired: [...(evaluation.failedRequired || [])] });
  }

  for (const trigger of triggerList(context)) {
    if (!trigger?.type) continue;
    if (trigger.type === 'drop_percent' && numeric(current.price)) {
      const reference = trigger.reference === 'initial' ? 'initial' : 'previous';
      const referencePrice = reference === 'initial' ? context.initialPrice : previous?.price;
      if (numeric(referencePrice)) {
        const percent = percentDrop(referencePrice, current.price);
        if (percent >= Number(trigger.percent || 0) && percent > 0) events.push({ kind:'percent_drop',candidateId:current.candidateId,percent,reference,referencePrice,currentPrice:current.price });
      }
    }
    if (trigger.type === 'below_initial' && numeric(context.initialPrice) && numeric(current.price) && current.price < context.initialPrice) events.push({ kind:'initial_price_drop',candidateId:current.candidateId,referencePrice:context.initialPrice,currentPrice:current.price });
    if (trigger.type === 'below_absolute' && numeric(trigger.value) && numeric(current.price)) {
      const wasAbove = !numeric(previous?.price) || previous.price > trigger.value;
      if (current.price <= trigger.value && wasAbove) events.push({ kind:'target_price_reached',candidateId:current.candidateId,targetPrice:trigger.value,currentPrice:current.price });
    }
    if (trigger.type === 'new_watch_low' && numeric(context.observedLow) && numeric(current.price) && current.price < context.observedLow) events.push({ kind:'watch_low',candidateId:current.candidateId,previousLow:context.observedLow,currentPrice:current.price });
  }
  return events;
}
