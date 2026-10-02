import { getConditionDefinition } from '../domain/conditionCatalog.js';

export const ROLE_LABELS = Object.freeze({
  required: '必須',
  preferred: 'できれば',
  excluded: '除外',
  allowed: '許容',
  comparison: '比較',
  change: '変化条件',
});

export const OPERATOR_LABELS = Object.freeze({
  eq: '一致', neq: '一致しない', gte: '以上', lte: '以下', range: '範囲', one_of: 'いずれか',
  contains: '含む', not_contains: '含まない', boolean: 'はい / いいえ', compatible_with: '対応する',
  changed_to: '変わったら', relative_change: '前回より変化', rank: '比較で優先',
  in: 'いずれか', not_in: '除外', between: '範囲', is_true: 'はい', is_false: 'いいえ', lt: '前回より低い',
});

const FALLBACK_LABELS = Object.freeze({
  price: '価格', totalPrice: '総額', landed_price: '送料込み価格', size: 'サイズ', color: '色', condition: '状態',
  availability: '在庫・空き', shipping_fee: '送料', coupon_discount_percent: 'クーポン割引', discount_percent: '値下がり率',
  width: '幅', depth: '奥行', height: '高さ', totalCapacity: '容量', installationWidth: '設置幅', modelYear: '年式', mileage: '走行距離',
  repairHistory: '修復歴', compatibility: '対応・適合', destination: '行き先', origin: '出発地', freeCancellation: 'キャンセル無料',
});

const VALUE_LABELS = Object.freeze({
  white: '白', black: '黒', gray: 'グレー', grey: 'グレー', navy: 'ネイビー', blue: '青', red: '赤', beige: 'ベージュ',
  new: '新品', open_box: '未使用開封品', used: '中古', in_stock: '在庫あり',
  one_way: '片道', round_trip: '往復', multi_city: '複数都市',
  economy: 'エコノミー', premium_economy: 'プレミアムエコノミー', business: 'ビジネス', first: 'ファースト',
  cash: '現金・カード', miles: 'マイル', either: 'どちらでも',
});

export function conditionLabel(draft, condition) {
  if (condition.attributeId?.startsWith('compatibility:') || condition.attributeId === 'compatibility') return '対応・適合';
  return getConditionDefinition(draft.domain, condition.attributeId, draft.subcategoryId)?.label
    || FALLBACK_LABELS[condition.attributeId]
    || condition.attributeId
    || '条件';
}

function formatOne(value) {
  if (value == null || value === '') return '未設定';
  if (typeof value === 'boolean') return value ? 'はい' : 'いいえ';
  if (typeof value === 'number') return value.toLocaleString('ja-JP');
  if (typeof value === 'object') {
    if (value.model) return value.model;
    if (value.label) return value.label;
    return Object.values(value).filter((item) => typeof item === 'string' || typeof item === 'number').join(' / ') || '設定あり';
  }
  return VALUE_LABELS[value] || String(value);
}

export function conditionValueLabel(condition) {
  const unit = condition.unit === 'JPY' ? '円' : (condition.unit || '');
  if (condition.operator === 'range' && Array.isArray(condition.value)) {
    return condition.value.map((value) => `${formatOne(value)}${value == null || value === '' ? '' : unit}`).join('〜');
  }
  const values = Array.isArray(condition.value) ? condition.value.map(formatOne).join('・') : formatOne(condition.value);
  const suffix = {
    gte: '以上', lte: '以下', range: '', one_of: '', eq: '', neq: '以外', not_contains: 'を含まない',
    compatible_with: 'に対応', changed_to: 'になったら', relative_change: '（前回から変化）', rank: 'を優先',
  }[condition.operator] || '';
  return `${values}${unit}${suffix}`;
}

export function editableValue(condition) {
  if (Array.isArray(condition.value)) return condition.value.join('、');
  if (condition.value && typeof condition.value === 'object') return condition.value.model || condition.value.label || JSON.stringify(condition.value);
  return condition.value ?? '';
}
