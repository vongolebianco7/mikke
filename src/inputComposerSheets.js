import { recommendedConditions, searchConditionDefinitions } from './domain/conditionCatalog.js';
import { conditionDefinitionFor, escapeComposerHtml, roleLabel } from './inputComposerConditionList.js';

const ROLE_OPTIONS = ['required', 'preferred', 'excluded', 'allowed', 'comparison', 'change'];

function operatorLabel(operator) {
  return ({ eq: '一致', neq: '除外', gte: '以上', lte: '以下', range: '範囲', one_of: 'いずれか', contains: '含む', not_contains: '含まない', boolean: 'あり / なし', compatible_with: '対応', changed_to: 'になったら', relative_change: '変化', rank: '優先順位' })[operator] || operator;
}

function roleOptions(selected, allowed = ROLE_OPTIONS) {
  return ROLE_OPTIONS.filter((role) => allowed.includes(role)).map((role) => `<option value="${role}" ${role === selected ? 'selected' : ''}>${roleLabel(role)}</option>`).join('');
}

function operatorOptions(selected, operators = ['eq']) {
  const list = operators.includes(selected) ? operators : [selected, ...operators];
  return [...new Set(list)].map((operator) => `<option value="${escapeComposerHtml(operator)}" ${operator === selected ? 'selected' : ''}>${escapeComposerHtml(operatorLabel(operator))}</option>`).join('');
}

function scalarValue(value) {
  if (Array.isArray(value)) return value.join('、');
  if (value && typeof value === 'object') return value.model || value.label || JSON.stringify(value);
  return value ?? '';
}

export function renderConditionEditorSheet(draft, condition) {
  const definition = conditionDefinitionFor(draft, condition);
  const inputType = ['integer', 'number', 'money', 'measurement', 'duration'].includes(definition.valueType) ? 'number' : 'text';
  return `<div class="composer-sheet-backdrop" data-sheet-backdrop><section class="composer-sheet" data-condition-sheet role="dialog" aria-modal="true" aria-label="条件を編集"><div class="sheet-handle" aria-hidden="true"></div><div class="sheet-head"><div><small>${escapeComposerHtml(roleLabel(condition.role))}</small><h2>${escapeComposerHtml(definition.label)}</h2></div><button type="button" class="sheet-close" data-close-sheet aria-label="閉じる">×</button></div><label class="sheet-field"><span>条件の扱い</span><select data-condition-role>${roleOptions(condition.role, definition.roles || ROLE_OPTIONS)}</select></label><label class="sheet-field"><span>比較方法</span><select data-condition-operator>${operatorOptions(condition.operator, definition.operators || ['eq'])}</select></label><label class="sheet-field"><span>値</span><input data-condition-value type="${inputType}" value="${escapeComposerHtml(scalarValue(condition.value))}"></label><button type="button" class="sheet-remove" data-remove-condition>この条件を削除</button></section></div>`;
}

function optionRows(definitions) {
  return definitions.slice(0, 16).map((definition) => `<button type="button" class="condition-option" data-condition-option="${escapeComposerHtml(definition.attributeId)}"><span>${escapeComposerHtml(definition.label)}</span><small>追加</small></button>`).join('');
}

export function addConditionDefinitions(draft, query = '') {
  const context = { domain: draft.domain, categoryId: draft.categoryId, subcategoryId: draft.subcategoryId, targetText: draft.target?.title || '' };
  return query.trim() ? searchConditionDefinitions(draft.domain, query, draft.subcategoryId) : recommendedConditions(context);
}

export function renderAddConditionSheet(draft, query = '') {
  const definitions = addConditionDefinitions(draft, query);
  return `<div class="composer-sheet-backdrop" data-sheet-backdrop><section class="composer-sheet add-condition-sheet" data-add-condition-sheet role="dialog" aria-modal="true" aria-label="条件を追加"><div class="sheet-handle" aria-hidden="true"></div><div class="sheet-head"><div><small>条件を追加</small><h2>${query ? '検索結果' : 'おすすめ'}</h2></div><button type="button" class="sheet-close" data-close-sheet aria-label="閉じる">×</button></div><label class="condition-search"><span class="sr-only">条件を検索</span><input type="search" data-condition-search value="${escapeComposerHtml(query)}" placeholder="容量、幅、色、価格など"></label><div class="condition-options" data-condition-options>${optionRows(definitions) || '<p class="sheet-empty">該当する条件がありません。</p>'}</div><button type="button" class="text-condition-add" data-add-condition-text>文章で追加</button></section></div>`;
}

export function renderConditionOptions(draft, query = '') {
  return optionRows(addConditionDefinitions(draft, query)) || '<p class="sheet-empty">該当する条件がありません。</p>';
}
