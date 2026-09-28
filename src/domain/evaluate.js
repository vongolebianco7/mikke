function normalizeColor(value = '') {
  return value.replace('灰色', 'グレー').toLowerCase();
}

function checkKey(key, conditions, candidate) {
  const attrs = candidate.attributes || {};
  switch (key) {
    case 'maxPrice': return typeof candidate.price === 'number' && candidate.price <= conditions.maxPrice;
    case 'size': return typeof attrs.size === 'string' && attrs.size === conditions.size;
    case 'colors': return typeof attrs.color === 'string' && conditions.colors.some((c) => normalizeColor(attrs.color).includes(normalizeColor(c)));
    case 'origin': return attrs.origin === conditions.origin;
    case 'destination': return attrs.destination === conditions.destination;
    case 'directOnly': return conditions.directOnly ? attrs.direct === true : true;
    default: return false;
  }
}

export function evaluateCandidate(watch, candidate) {
  const required = watch.requiredKeys || [];
  const preferred = watch.preferredKeys || [];
  const requiredResults = required.map((key) => [key, checkKey(key, watch.conditions, candidate)]);
  const preferredResults = preferred.map((key) => [key, checkKey(key, watch.conditions, candidate)]);
  const requiredMatch = requiredResults.every(([, ok]) => ok);
  const total = required.length * 2 + preferred.length;
  const passed = requiredResults.filter(([, ok]) => ok).length * 2 + preferredResults.filter(([, ok]) => ok).length;
  const score = total === 0 ? 50 : Math.round((passed / total) * 100);
  const reasons = [...requiredResults, ...preferredResults].map(([key, ok]) => ({ key, ok }));
  return { requiredMatch, score, reasons };
}

export function deriveEvents(previous, current, evaluation) {
  const events = [];
  if (!previous) {
    if (evaluation.requiredMatch) events.push({ kind: 'condition_match', candidateId: current.candidateId });
    events.push({ kind: 'new_result', candidateId: current.candidateId });
    return events;
  }
  if (typeof previous.price === 'number' && typeof current.price === 'number' && current.price < previous.price) {
    events.push({ kind: 'price_drop', candidateId: current.candidateId, delta: previous.price - current.price });
  }
  if (previous.available === false && current.available === true) {
    events.push({ kind: 'restock', candidateId: current.candidateId });
  }
  return events;
}
