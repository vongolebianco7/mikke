import { parseWatchQuery } from './parseWatch.js';

const OPERATOR_MAP = {
  eq: 'eq', in: 'one_of', not_in: 'neq', gte: 'gte', lte: 'lte', between: 'range',
  contains: 'contains', contains_text: 'contains', not_contains_text: 'not_contains',
  is_true: 'boolean', is_false: 'boolean', changed_to: 'changed_to', lt: 'relative_change',
};

function makeId(prefix, index) {
  return `${prefix}-${index}`;
}

function mappedRole(role) {
  if (role === 'notification') return 'change';
  if (role === 'comparison') return 'comparison';
  if (role === 'preferred') return 'preferred';
  return 'required';
}

function fromDomainCondition(condition, index) {
  return {
    id: condition.id || makeId('text-condition', index),
    attributeId: condition.fieldId || condition.attributeId,
    operator: OPERATOR_MAP[condition.operator] || condition.operator || 'eq',
    value: structuredClone(condition.value),
    ...(condition.unit ? { unit: condition.unit } : {}),
    role: mappedRole(condition.role),
    supportState: 'confirmed',
    source: 'text',
    manuallyEdited: false,
  };
}

function fromTrigger(trigger, index) {
  return {
    id: trigger.id || makeId('text-change', index),
    attributeId: trigger.metric,
    operator: trigger.operator === 'lte' ? 'lte' : (OPERATOR_MAP[trigger.operator] || 'changed_to'),
    value: structuredClone(trigger.value),
    ...(trigger.unit ? { unit: trigger.unit } : {}),
    role: 'change',
    supportState: 'confirmed',
    source: 'text',
    manuallyEdited: false,
    ...(trigger.reference ? { reference: trigger.reference } : {}),
    ...(trigger.scope ? { scope: trigger.scope } : {}),
  };
}

function fromCompatibility(condition, index) {
  return {
    id: condition.id || makeId('text-compatibility', index),
    attributeId: `compatibility:${condition.id || index}`,
    operator: 'compatible_with',
    value: structuredClone(condition.target),
    role: mappedRole(condition.role),
    supportState: 'confirmed',
    source: 'text',
    manuallyEdited: false,
    compatibilityRelation: condition.relation,
    subjectType: condition.subjectType,
  };
}

function parseApproximatePrice(text) {
  const normalized = text.replace(/,/g, '');
  const man = normalized.match(/(\d+(?:\.\d+)?)\s*万円\s*(?:くらい|ぐらい|前後|程度)/);
  if (man) return Math.round(Number(man[1]) * 10000);
  const yen = normalized.match(/(\d{3,8})\s*円\s*(?:くらい|ぐらい|前後|程度)/);
  return yen ? Number(yen[1]) : undefined;
}

function conservativeUnresolved(text) {
  const fragments = [];
  const clauses = String(text).split(/[、,。]/).map((item) => item.trim()).filter(Boolean);
  const unresolvedPatterns = [
    /安っぽくない/, /高級感/, /おしゃれ/, /かわいい/, /かっこいい/, /静かめ/, /軽め/,
    /バッテリー(?:が)?大きめ/, /長持ち/, /丈夫/, /使いやすい/, /評判(?:が)?良い/,
    /A\s*なら\s*B(?:も)?\s*(?:必須|必要)/, /なら.+(?:必須|OK|可)/,
    /未使用開封品ならOK/, /価格[^、,]*\d+円[^、,]*から[^、,]*\d+円/,
    /前(?:回)?と同じ/, /色だけ/, /最安/, /https?:\/\//i, /URL\s+/i,
    /型番[A-Za-z0-9-]*.*(?:完全一致|互換品)/i, /\d+円以上かつ\d+円以下/,
    /ただし展示品はOK/, /条件不明[A-Za-z0-9-]*/,
  ];
  for (const clause of clauses) {
    if (unresolvedPatterns.some((pattern) => pattern.test(clause))) {
      fragments.push({ id: `unresolved-${fragments.length}`, text: clause, state: 'unresolved' });
    }
  }
  if (!fragments.length && clauses.length && !/[\p{L}\p{N}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text)) {
    fragments.push({ id: 'unresolved-0', text: String(text).trim(), state: 'unresolved' });
  }
  return fragments;
}

function openBoxException(text) {
  if (!/(?:中古は?(?:不可|除外|嫌)|中古不可).*(?:未使用開封品|開封未使用|未使用品).*(?:OK|可)/.test(text)) return null;
  return {
    id: 'text-condition-exception',
    attributeId: 'condition',
    operator: 'one_of',
    value: ['new', 'open_box'],
    role: 'required',
    supportState: 'needs_review',
    source: 'text',
    manuallyEdited: false,
  };
}

function dedupeByAttribute(proposals) {
  const result = [];
  const indexByKey = new Map();
  for (const proposal of proposals) {
    const key = `${proposal.role}:${proposal.attributeId}`;
    const existingIndex = indexByKey.get(key);
    if (existingIndex === undefined) {
      indexByKey.set(key, result.length);
      result.push(proposal);
    } else {
      result[existingIndex] = proposal;
    }
  }
  return result;
}

function isVehicleAccessory(parsed) {
  return (parsed?.compatibilityConditions || []).some((item) => item?.subjectType === 'accessory' && item?.target?.type === 'vehicle');
}

function canonicalPriceAttribute(parsed, domain) {
  return domain === 'used_car' && !isVehicleAccessory(parsed) ? 'totalPrice' : 'price';
}

function normalizeDomainPriceAttributes(proposals, parsed, domain) {
  const priceAttribute = canonicalPriceAttribute(parsed, domain);
  return proposals.map((proposal) => {
    if (!['price', 'totalPrice'].includes(proposal.attributeId)) return proposal;
    return { ...proposal, attributeId: priceAttribute };
  });
}

export function interpretInput(raw, context = {}) {
  const text = String(raw || '').trim();
  if (!text) return { rawText: '', targetProposal: null, conditionProposals: [], unresolvedFragments: [], confidence: 'empty' };

  try {
    const parsed = parseWatchQuery(text);
    const parsedDomain = parsed?.domain || parsed?.type || context.domain;
    const domainConditions = Array.isArray(parsed?.domainConditions) ? parsed.domainConditions : [];
    const genericConditions = Array.isArray(parsed?.genericConditions) ? parsed.genericConditions : [];
    const baseConditions = domainConditions.length ? domainConditions : genericConditions;
    let conditionProposals = baseConditions.map(fromDomainCondition);
    conditionProposals.push(...(Array.isArray(parsed?.compatibilityConditions) ? parsed.compatibilityConditions.map(fromCompatibility) : []));
    conditionProposals.push(...(Array.isArray(parsed?.triggers) ? parsed.triggers.map(fromTrigger) : []));
    conditionProposals = normalizeDomainPriceAttributes(conditionProposals, parsed, parsedDomain);

    const approximatePrice = parseApproximatePrice(text);
    if (approximatePrice !== undefined) {
      const approximatePriceAttribute = canonicalPriceAttribute(parsed, parsedDomain);
      conditionProposals = conditionProposals.filter((item) => !['price', 'totalPrice', 'landed_price'].includes(item.attributeId));
      conditionProposals.push({
        id: 'text-approx-price', attributeId: approximatePriceAttribute, operator: 'eq', value: approximatePrice,
        unit: 'JPY', role: 'preferred', supportState: 'needs_review', source: 'text', manuallyEdited: false,
      });
    }

    const exception = openBoxException(text);
    if (exception) {
      conditionProposals = conditionProposals.filter((item) => item.attributeId !== 'condition');
      conditionProposals.push(exception);
    }

    const unresolvedFragments = conservativeUnresolved(text);
    return {
      rawText: text,
      targetProposal: parsed?.target ? structuredClone(parsed.target) : { title: text.split(/[、,]/)[0] },
      domainHint: parsedDomain,
      categoryHint: parsed?.target?.categoryId || parsed?.categoryId || context.categoryId,
      subcategoryHint: parsed?.target?.subcategoryId || context.subcategoryId,
      conditionProposals: dedupeByAttribute(conditionProposals),
      unresolvedFragments,
      confidence: unresolvedFragments.length ? 'mixed' : 'confirmed',
    };
  } catch {
    return {
      rawText: text,
      targetProposal: null,
      conditionProposals: [],
      unresolvedFragments: [{ id: 'unresolved-0', text, state: 'unresolved' }],
      confidence: 'unresolved',
    };
  }
}
