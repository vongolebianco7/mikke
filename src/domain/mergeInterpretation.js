function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function mergeFragments(current = [], incoming = []) {
  const result = current.map(clone);
  const seen = new Set(result.map((item) => item.text));
  for (const fragment of incoming) {
    if (!seen.has(fragment.text)) {
      seen.add(fragment.text);
      result.push(clone(fragment));
    }
  }
  return result;
}

export function mergeInterpretation(draft = {}, interpretation = {}) {
  const currentConditions = Array.isArray(draft.conditions) ? draft.conditions.map(clone) : [];
  const proposals = Array.isArray(interpretation.conditionProposals) ? interpretation.conditionProposals : [];
  const conditions = [...currentConditions];

  for (const proposal of proposals) {
    const index = conditions.findIndex((item) => item.attributeId === proposal.attributeId && item.role === proposal.role);
    const sameAttributeIndex = conditions.findIndex((item) => item.attributeId === proposal.attributeId);
    const resolvedIndex = index >= 0 ? index : sameAttributeIndex;
    if (resolvedIndex < 0) {
      conditions.push(clone(proposal));
      continue;
    }

    const existing = conditions[resolvedIndex];
    if (existing.manuallyEdited) continue;
    if (proposal.supportState === 'needs_review' && existing.supportState === 'confirmed') continue;
    conditions[resolvedIndex] = { ...clone(proposal), id: existing.id || proposal.id };
  }

  return {
    ...clone(draft),
    ...(interpretation.targetProposal ? { target: clone(interpretation.targetProposal) } : {}),
    domain: interpretation.domainHint || draft.domain,
    categoryId: interpretation.categoryHint || draft.categoryId,
    subcategoryId: interpretation.subcategoryHint || draft.subcategoryId,
    conditions,
    unresolvedFragments: mergeFragments(draft.unresolvedFragments, interpretation.unresolvedFragments),
    metadata: {
      ...(clone(draft.metadata) || {}),
      ...(interpretation.rawText ? { rawQuery: interpretation.rawText } : {}),
    },
  };
}
