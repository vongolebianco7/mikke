const copy = (value) => structuredClone(value);

function proposalToCondition(proposal, fallbackId) {
  return {
    id: proposal.id || fallbackId,
    attributeId: proposal.attributeId,
    operator: proposal.operator || 'eq',
    value: copy(proposal.value),
    ...(proposal.unit !== undefined ? { unit:proposal.unit } : {}),
    role: proposal.role || 'required',
    supportState: proposal.state === 'confirmed' ? 'supported' : (proposal.state || 'supported'),
    ...(proposal.sourceText ? { sourceText:proposal.sourceText } : {}),
    source: proposal.source || 'interpretation',
    manuallyEdited: false,
  };
}

function conflictsFor(conditions) {
  const grouped = new Map();
  for (const item of conditions) {
    if (item.role !== 'required' || !item.attributeId) continue;
    if (!grouped.has(item.attributeId)) grouped.set(item.attributeId, []);
    grouped.get(item.attributeId).push(item);
  }
  const conflicts = [];
  for (const [attributeId, items] of grouped) {
    let min = -Infinity;
    let max = Infinity;
    for (const item of items) {
      const value = Number(item.value);
      if (!Number.isFinite(value)) continue;
      if (item.operator === 'gte' || item.operator === 'gt') min = Math.max(min, value);
      if (item.operator === 'lte' || item.operator === 'lt') max = Math.min(max, value);
    }
    if (min > max) conflicts.push({ attributeId, reason:'contradictory_range', min, max });
  }
  return conflicts;
}

function explicitReplacement(proposal, interpretation, options) {
  if (options.explicitReplacement) return true;
  const text = `${proposal.sourceText || ''} ${interpretation.targetProposal?.sourceText || ''}`;
  return /(だけ|に変えて|へ変更|同じ条件|ならOK|なら可|だが|ただし)/.test(text);
}

function sameSemanticSlot(existing, proposal) {
  if (existing.attributeId !== proposal.attributeId) return false;
  if (existing.operator === proposal.operator) return true;
  if (proposal.operator === 'one_of' || existing.operator === 'one_of') return true;
  return false;
}

export function mergeInterpretation(inputDraft = {}, interpretation = {}, options = {}) {
  const draft = copy({
    domain: inputDraft.domain || 'shopping',
    categoryId: inputDraft.categoryId,
    subcategoryId: inputDraft.subcategoryId,
    target: inputDraft.target || {},
    conditions: inputDraft.conditions || [],
    unresolved: inputDraft.unresolved || [],
    metadata: inputDraft.metadata || {},
  });
  const changes = [];
  let idCounter = draft.conditions.length + 1;

  if (interpretation.targetProposal?.value && !/同じ条件/.test(interpretation.targetProposal.sourceText || '')) {
    draft.target = { ...draft.target, ...copy(interpretation.targetProposal.value) };
    changes.push({ type:'target_updated' });
  }

  if (options.switchCategory) {
    if (interpretation.inferredDomain) draft.domain = interpretation.inferredDomain;
    if (interpretation.inferredCategory) draft.categoryId = interpretation.inferredCategory;
    if (options.supportedAttributes instanceof Set) {
      draft.conditions = draft.conditions.map((condition) => options.supportedAttributes.has(condition.attributeId)
        ? condition
        : { ...condition, supportState:'needs_review' });
    }
    changes.push({ type:'category_switched', domain:draft.domain, categoryId:draft.categoryId });
  }

  for (const proposal of interpretation.conditionProposals || []) {
    if (!proposal?.attributeId) continue;
    const replacement = explicitReplacement(proposal, interpretation, options);
    const candidates = draft.conditions
      .map((item,index) => ({ item,index }))
      .filter(({ item }) => item.attributeId === proposal.attributeId);
    const semantic = candidates.find(({ item }) => sameSemanticSlot(item,proposal));
    const existing = semantic || candidates[0];

    if (existing) {
      const shouldProtectManual = existing.item.manuallyEdited === true && Number(proposal.confidence ?? 0) < 0.9 && !replacement;
      const differingRangeOperators = ['gte','gt','lte','lt'].includes(existing.item.operator) && ['gte','gt','lte','lt'].includes(proposal.operator) && existing.item.operator !== proposal.operator;
      if (shouldProtectManual) {
        changes.push({ type:'proposal_skipped_manual_precedence', attributeId:proposal.attributeId });
        continue;
      }
      if (differingRangeOperators && !replacement) {
        const created = proposalToCondition(proposal, `interpreted-${idCounter++}`);
        draft.conditions.push(created);
        changes.push({ type:'condition_added', id:created.id });
        continue;
      }
      const updated = { ...proposalToCondition(proposal, existing.item.id), id:existing.item.id };
      draft.conditions[existing.index] = updated;
      changes.push({ type:'condition_updated', id:updated.id });
      continue;
    }

    const created = proposalToCondition(proposal, `interpreted-${idCounter++}`);
    draft.conditions.push(created);
    changes.push({ type:'condition_added', id:created.id });
  }

  const unresolvedByText = new Map((draft.unresolved || []).map((item) => [item.text, item]));
  for (const item of interpretation.unresolvedFragments || []) if (item?.text && !unresolvedByText.has(item.text)) unresolvedByText.set(item.text, copy(item));
  draft.unresolved = [...unresolvedByText.values()];

  const conflicts = conflictsFor(draft.conditions);
  return { draft, changes, conflicts };
}
