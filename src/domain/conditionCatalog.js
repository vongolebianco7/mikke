import { getDomainField, listDomainFields } from './domainSchemas.js';

export const CONDITION_PRIMITIVES = Object.freeze([
  'eq', 'neq', 'gte', 'lte', 'range', 'one_of', 'contains', 'not_contains',
  'boolean', 'compatible_with', 'changed_to', 'relative_change', 'rank',
]);

const OPERATOR_MAP = {
  eq: 'eq',
  not_eq: 'neq',
  gte: 'gte',
  gt: 'gte',
  lte: 'lte',
  lt: 'lte',
  between: 'range',
  in: 'one_of',
  not_in: 'neq',
  contains: 'contains',
  contains_all: 'contains',
  contains_text: 'contains',
  not_contains_text: 'not_contains',
  is_true: 'boolean',
  is_false: 'boolean',
};

const ROLE_SET = Object.freeze(['required', 'preferred', 'excluded', 'allowed', 'comparison', 'change']);

function normalizeOperators(field) {
  const operators = (field?.operators || []).map((operator) => OPERATOR_MAP[operator] || operator);
  return [...new Set(operators.filter((operator) => CONDITION_PRIMITIVES.includes(operator)))];
}

function toDefinition(field) {
  if (!field) return null;
  return {
    attributeId: field.id,
    label: field.label,
    valueType: field.type,
    operators: normalizeOperators(field),
    roles: [...ROLE_SET],
    ...(field.unit ? { unit: field.unit } : {}),
    allowedValues: Array.isArray(field.allowedValues) ? [...field.allowedValues] : [],
    group: field.group || 'general',
    priority: field.priority || 'medium',
    level: field.level || 'common',
  };
}

export function getConditionDefinition(domain, attributeId, subcategoryId) {
  return toDefinition(getDomainField(domain, attributeId, subcategoryId));
}

function searchableText(definition) {
  return `${definition.label} ${definition.attributeId} ${definition.group}`.toLocaleLowerCase('ja-JP');
}

export function searchConditionDefinitions(domain, query = '', subcategoryId) {
  const needle = String(query).trim().toLocaleLowerCase('ja-JP');
  return listDomainFields(domain, undefined, subcategoryId)
    .map(toDefinition)
    .filter(Boolean)
    .filter((definition) => !needle || searchableText(definition).includes(needle));
}

const RECOMMENDATION_BOOSTS = {
  refrigerator: ['totalCapacity', 'installationWidth', 'width', 'depth', 'doorStyle', 'freezerCapacity', 'color', 'condition', 'price'],
  running_shoes: ['size', 'shoeWidth', 'model', 'color', 'condition', 'price', 'material'],
  used_car: ['model', 'trim', 'modelYear', 'mileage', 'repairHistory', 'bodyColor', 'drivetrain', 'totalPrice', 'warrantyYears'],
};

const PRIORITY_SCORE = { high: 30, medium: 20, low: 10 };
const LEVEL_SCORE = { basic: 12, common: 8, detailed: 4, advanced: 0 };

function inferredRecommendationKey({ domain, subcategoryId, categoryId, targetText = '' }) {
  if (domain === 'used_car') return 'used_car';
  if (subcategoryId === 'refrigerator' || /冷蔵庫/.test(targetText)) return 'refrigerator';
  if (categoryId === 'running_shoes' || /ランニングシューズ|ランニング.*靴/.test(targetText)) return 'running_shoes';
  return null;
}

export function recommendedConditions(context = {}) {
  const { domain = 'fashion', subcategoryId } = context;
  const key = inferredRecommendationKey(context);
  const boosts = RECOMMENDATION_BOOSTS[key] || [];
  return listDomainFields(domain, undefined, subcategoryId)
    .map(toDefinition)
    .filter(Boolean)
    .map((definition, index) => ({
      definition,
      index,
      score: (PRIORITY_SCORE[definition.priority] || 0)
        + (LEVEL_SCORE[definition.level] || 0)
        + Math.max(0, 100 - Math.max(0, boosts.indexOf(definition.attributeId)) * 6) * (boosts.includes(definition.attributeId) ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ definition }) => definition);
}
