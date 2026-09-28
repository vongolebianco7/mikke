const COLOR_WORDS = ['グレー', '灰色', '黒', 'ブラック', '白', 'ホワイト', 'ベージュ', 'ネイビー', '青', 'ブルー', '赤', 'レッド'];

function parsePrice(raw) {
  const normalized = raw.replace(/,/g, '');
  const man = normalized.match(/(\d+(?:\.\d+)?)\s*万円(?:以下|未満|切ったら|まで)?/);
  if (man) return Math.round(Number(man[1]) * 10000);
  const yen = normalized.match(/(\d{4,7})\s*円?(?:以下|未満|切ったら|まで)/);
  return yen ? Number(yen[1]) : undefined;
}

function parseSize(raw) {
  const match = raw.match(/(\d{2}(?:\.\d)?)\s*cm/i);
  return match ? `${match[1]}cm` : undefined;
}

function inferType(raw) {
  if (/(航空券|フライト|直行便|往復|片道|から.+(?:へ|まで)|→)/.test(raw)) return 'flight';
  if (/(ホテル|宿|旅館|泊|宿泊)/.test(raw)) return 'hotel';
  return 'shopping';
}

function extractTitle(raw, type) {
  if (type === 'flight') return raw.split(/[、,]/)[0].trim();
  if (type === 'hotel') return raw.split(/[、,]/)[0].trim();
  return raw.split(/[、,]/)[0].trim() || '新しいWatch';
}

export function parseWatchQuery(raw) {
  const text = raw.trim();
  const type = inferType(text);
  const conditions = {};
  const maxPrice = parsePrice(text);
  if (maxPrice !== undefined) conditions.maxPrice = maxPrice;

  if (type === 'shopping') {
    const size = parseSize(text);
    if (size) conditions.size = size;
    const colors = COLOR_WORDS.filter((color) => text.includes(color));
    if (colors.length) conditions.colors = [...new Set(colors.map((color) => color === '灰色' ? 'グレー' : color))];
    if (/(中古不可|中古は嫌|中古除外|新品のみ)/.test(text)) conditions.excludeUsed = true;
    if (/(展示品.*OK|展示品.*可)/.test(text)) conditions.allowDisplay = true;
  }

  if (type === 'flight') {
    const route = text.match(/(.+?)から(.+?)(?:、|,|\s|$)/);
    if (route) {
      conditions.origin = route[1].trim();
      conditions.destination = route[2].trim();
    }
    if (text.includes('直行便')) conditions.directOnly = true;
    if (text.includes('往復')) conditions.tripType = 'roundtrip';
    if (text.includes('片道')) conditions.tripType = 'oneway';
  }

  if (type === 'hotel') {
    const place = text.split(/[、,]/)[0].replace(/ホテル|宿|旅館/g, '').trim();
    if (place) conditions.destination = place;
  }

  const requiredKeys = [];
  const preferredKeys = [];
  if (conditions.maxPrice !== undefined) requiredKeys.push('maxPrice');
  if (conditions.size) requiredKeys.push('size');
  if (conditions.origin) requiredKeys.push('origin');
  if (conditions.destination) requiredKeys.push('destination');
  if (conditions.directOnly) requiredKeys.push('directOnly');
  if (conditions.colors) preferredKeys.push('colors');

  return { type, title: extractTitle(text, type), rawQuery: text, conditions, requiredKeys, preferredKeys };
}
