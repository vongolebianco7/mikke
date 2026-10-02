import { getConditionDefinition } from './domain/conditionCatalog.js';

const ROLE_LABELS = {
  required: '必須',
  preferred: 'できれば',
  excluded: '除外',
  allowed: '許容',
  comparison: '比較',
  change: '変化条件',
};

const OPERATOR_LABELS = {
  eq: '=', neq: '以外', gte: '以上', lte: '以下', range: '範囲', one_of: 'いずれか',
  contains: 'を含む', not_contains: 'を含まない', boolean: '', compatible_with: '対応',
  changed_to: 'になったら', relative_change: '変化', rank: '優先',
};

export function escapeComposerHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

export function conditionDefinitionFor(draft, condition) {
  if (condition.attributeId === 'compatibility' || condition.attributeId?.startsWith('compatibility:')) {
    return { attributeId: condition.attributeId, label: '互換性', valueType: 'text', operators: ['compatible_with'], roles: ['required', 'preferred'] };
  }
  return getConditionDefinition(draft.domain, condition.attributeId, draft.subcategoryId) || {
    attributeId: condition.attributeId,
    label: condition.attributeId || '条件',
    valueType: 'text',
    operators: [condition.operator || 'eq'],
    roles: ['required', 'preferred', 'excluded', 'allowed', 'comparison', 'change'],
  };
}

export function roleLabel(role) {
  return ROLE_LABELS[role] || '必須';
}

export function conditionValueLabel(condition) {
  const value = condition.value;
  let text;
  if (Array.isArray(value)) text = value.join('・');
  else if (value && typeof value === 'object') text = value.model || value.label || Object.values(value).filter((item) => ['string', 'number'].includes(typeof item)).join(' ');
  else if (typeof value === 'boolean') text = value ? 'あり' : 'なし';
  else text = value ?? '';
  const unit = condition.unit ? String(condition.unit) : '';
  const operator = OPERATOR_LABELS[condition.operator] ?? condition.operator ?? '';
  if (condition.operator === 'gte' || condition.operator === 'lte') return `${text}${unit}${operator}`;
  if (condition.operator === 'one_of') return `${text}`;
  if (condition.operator === 'neq' || condition.operator === 'not_contains') return `${text}${operator}`;
  if (condition.operator === 'changed_to') return `${text}${operator}`;
  return [text, unit, operator === '=' ? '' : operator].filter(Boolean).join(' ').trim();
}

export function renderConditionCards(draft) {
  const conditions = Array.isArray(draft.conditions) ? draft.conditions : [];
  return conditions.map((condition) => {
    const definition = conditionDefinitionFor(draft, condition);
    const support = condition.supportState === 'needs_review' ? '<span class="condition-review">要確認</span>'
      : condition.supportState === 'unsupported' ? '<span class="condition-review">現在は判定不可</span>' : '';
    return `<button type="button" class="condition-card role-${escapeComposerHtml(condition.role)}" data-condition-card data-condition-id="${escapeComposerHtml(condition.id)}" aria-label="${escapeComposerHtml(`${roleLabel(condition.role)} ${definition.label} ${conditionValueLabel(condition)}`)}"><span class="condition-role">${escapeComposerHtml(roleLabel(condition.role))}</span><span class="condition-main"><b>${escapeComposerHtml(definition.label)}</b><span>${escapeComposerHtml(conditionValueLabel(condition))}</span></span>${support}<span class="condition-chevron" aria-hidden="true">›</span></button>`;
  }).join('');
}

export function renderUnresolvedList(draft) {
  const fragments = Array.isArray(draft.unresolvedFragments) ? draft.unresolvedFragments : [];
  if (!fragments.length) return '';
  return `<section class="unresolved-list" data-unresolved-list><b>まだ条件にできていません</b>${fragments.map((fragment) => `<div><span>${escapeComposerHtml(fragment.text)}</span><button type="button" data-remove-unresolved="${escapeComposerHtml(fragment.id)}" aria-label="未解釈の条件を削除">×</button></div>`).join('')}</section>`;
}
