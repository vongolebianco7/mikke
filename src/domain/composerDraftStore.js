const clone = (value) => structuredClone(value);
const VALID_ROLES = new Set(['required','preferred','exclude','allow','comparison','change']);

function normalizeCondition(input = {}, fallbackId) {
  return {
    id: input.id || fallbackId,
    attributeId: input.attributeId,
    operator: input.operator || 'eq',
    value: input.value,
    ...(input.unit !== undefined ? { unit: input.unit } : {}),
    role: VALID_ROLES.has(input.role) ? input.role : 'required',
    supportState: input.supportState || 'supported',
    ...(input.sourceText !== undefined ? { sourceText: input.sourceText } : {}),
    source: input.source || 'manual',
    manuallyEdited: input.manuallyEdited ?? true,
  };
}

function conflictForAttribute(items) {
  const required = items.filter((item) => item.role === 'required');
  let min = -Infinity;
  let max = Infinity;
  for (const item of required) {
    const value = Number(item.value);
    if (!Number.isFinite(value)) continue;
    if (item.operator === 'gte' || item.operator === 'gt') min = Math.max(min, value);
    if (item.operator === 'lte' || item.operator === 'lt') max = Math.min(max, value);
  }
  return min > max;
}

export function createComposerDraftStore(initialDraft = {}) {
  let nextId = 1;
  let draft = {
    domain: initialDraft.domain || 'shopping',
    categoryId: initialDraft.categoryId,
    subcategoryId: initialDraft.subcategoryId,
    target: clone(initialDraft.target || {}),
    conditions: (initialDraft.conditions || []).map((item) => normalizeCondition(item, `condition-${nextId++}`)),
    unresolved: clone(initialDraft.unresolved || []),
    metadata: clone(initialDraft.metadata || {}),
  };

  function getDraft() { return clone(draft); }
  function setTarget(target = {}) { draft = { ...draft, target: clone(target) }; return getDraft(); }
  function upsertCondition(input = {}) {
    const indexById = input.id ? draft.conditions.findIndex((item) => item.id === input.id) : -1;
    const indexByAttribute = indexById >= 0 ? indexById : draft.conditions.findIndex((item) => item.attributeId === input.attributeId && item.role === (input.role || item.role));
    if (indexByAttribute >= 0) {
      const current = draft.conditions[indexByAttribute];
      const updated = normalizeCondition({ ...current, ...input, id: current.id }, current.id);
      draft = { ...draft, conditions: draft.conditions.map((item, index) => index === indexByAttribute ? updated : item) };
      return clone(updated);
    }
    const created = normalizeCondition(input, `condition-${nextId++}`);
    draft = { ...draft, conditions: [...draft.conditions, created] };
    return clone(created);
  }
  function removeCondition(id) { draft = { ...draft, conditions: draft.conditions.filter((item) => item.id !== id) }; return getDraft(); }
  function setConditionRole(id, role) {
    if (!VALID_ROLES.has(role)) throw new Error('invalid_condition_role');
    draft = { ...draft, conditions: draft.conditions.map((item) => item.id === id ? { ...item, role, manuallyEdited: true } : item) };
    return getDraft();
  }
  function setUnresolved(items = []) { draft = { ...draft, unresolved: clone(items) }; return getDraft(); }
  function removeUnresolved(id) { draft = { ...draft, unresolved: draft.unresolved.filter((item) => item.id !== id) }; return getDraft(); }
  function setCategory({ domain = draft.domain, categoryId, subcategoryId } = {}) {
    draft = { ...draft, domain, categoryId, subcategoryId };
    return getDraft();
  }
  function validate() {
    const byAttribute = new Map();
    for (const item of draft.conditions) {
      if (!item.attributeId) continue;
      if (!byAttribute.has(item.attributeId)) byAttribute.set(item.attributeId, []);
      byAttribute.get(item.attributeId).push(item);
    }
    const conflicts = [];
    for (const [attributeId, items] of byAttribute) {
      if (conflictForAttribute(items)) conflicts.push({ attributeId, reason: 'contradictory_range' });
    }
    return { saveable: conflicts.length === 0, conflicts, unresolvedCount: draft.unresolved.length };
  }

  return { getDraft, setTarget, upsertCondition, removeCondition, setConditionRole, setUnresolved, removeUnresolved, setCategory, validate };
}
