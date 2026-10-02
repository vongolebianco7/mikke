const ROLES = new Set(['required', 'preferred', 'excluded', 'allowed', 'comparison', 'change']);

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function normalizeCondition(input = {}) {
  return {
    id: input.id || `condition-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`,
    attributeId: input.attributeId,
    operator: input.operator || 'eq',
    value: clone(input.value),
    ...(input.unit ? { unit: input.unit } : {}),
    role: ROLES.has(input.role) ? input.role : 'required',
    supportState: input.supportState || 'confirmed',
    ...(input.sourceText ? { sourceText: input.sourceText } : {}),
    source: input.source || 'manual',
    manuallyEdited: Boolean(input.manuallyEdited),
  };
}

function semanticLane(condition) {
  return condition.role === 'change' ? 'change' : 'eligibility';
}

function contradictionConflicts(conditions) {
  const conflicts = [];
  const grouped = new Map();
  for (const condition of conditions.filter((item) => item.role === 'required')) {
    if (!grouped.has(condition.attributeId)) grouped.set(condition.attributeId, []);
    grouped.get(condition.attributeId).push(condition);
  }
  for (const [attributeId, items] of grouped) {
    const minimums = items.filter((item) => item.operator === 'gte').map((item) => Number(item.value)).filter(Number.isFinite);
    const maximums = items.filter((item) => item.operator === 'lte').map((item) => Number(item.value)).filter(Number.isFinite);
    if (minimums.length && maximums.length && Math.max(...minimums) > Math.min(...maximums)) {
      conflicts.push({ type: 'contradictory_bounds', attributeId });
    }
  }
  return conflicts;
}

export function createComposerDraftStore(initialDraft = {}) {
  let draft = {
    target: clone(initialDraft.target || {}),
    domain: initialDraft.domain || initialDraft.type || 'shopping',
    categoryId: initialDraft.categoryId || initialDraft.target?.categoryId,
    subcategoryId: initialDraft.subcategoryId || initialDraft.target?.subcategoryId,
    conditions: Array.isArray(initialDraft.conditions) ? initialDraft.conditions.map(normalizeCondition) : [],
    unresolvedFragments: Array.isArray(initialDraft.unresolvedFragments) ? clone(initialDraft.unresolvedFragments) : [],
    metadata: clone(initialDraft.metadata || {}),
  };

  const snapshot = () => clone(draft);

  return {
    getDraft: snapshot,
    setTarget(target = {}) {
      draft = { ...draft, target: clone(target) };
      return snapshot();
    },
    upsertCondition(conditionInput) {
      const incoming = normalizeCondition({ ...conditionInput, manuallyEdited: true });
      const incomingLane = semanticLane(incoming);
      const existingIndex = draft.conditions.findIndex((item) => item.id === incoming.id || (item.attributeId === incoming.attributeId && semanticLane(item) === incomingLane));
      if (existingIndex >= 0) {
        const existing = draft.conditions[existingIndex];
        const next = [...draft.conditions];
        next[existingIndex] = { ...incoming, id: existing.id };
        draft = { ...draft, conditions: next };
      } else {
        draft = { ...draft, conditions: [...draft.conditions, incoming] };
      }
      return snapshot();
    },
    removeCondition(id) {
      draft = { ...draft, conditions: draft.conditions.filter((item) => item.id !== id) };
      return snapshot();
    },
    setConditionRole(id, role) {
      if (!ROLES.has(role)) return snapshot();
      draft = {
        ...draft,
        conditions: draft.conditions.map((item) => item.id === id ? { ...item, role, manuallyEdited: true } : item),
      };
      return snapshot();
    },
    setUnresolved(fragments = []) {
      draft = { ...draft, unresolvedFragments: clone(fragments) };
      return snapshot();
    },
    removeUnresolved(id) {
      draft = { ...draft, unresolvedFragments: draft.unresolvedFragments.filter((item) => item.id !== id) };
      return snapshot();
    },
    setCategory({ domain = draft.domain, categoryId, subcategoryId } = {}) {
      draft = { ...draft, domain, categoryId, subcategoryId };
      return snapshot();
    },
    validate() {
      const conflicts = contradictionConflicts(draft.conditions);
      return {
        saveable: conflicts.length === 0,
        conflicts,
        unresolvedCount: draft.unresolvedFragments.length,
      };
    },
  };
}
