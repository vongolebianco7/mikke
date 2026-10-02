import { parseWatchQuery } from './parseWatch.js';

const COLOR_MAP = new Map([
  ['白','white'],['ホワイト','white'],['黒','black'],['ブラック','black'],['グレー','gray'],['灰色','gray'],
  ['ネイビー','navy'],['ベージュ','beige'],['赤','red'],['レッド','red'],['青','blue'],['ブルー','blue'],
]);

function roleOf(role) {
  if (role === 'notification') return 'change';
  if (role === 'comparison') return 'comparison';
  if (role === 'preferred') return 'preferred';
  return role || 'required';
}

function proposalFromDomainCondition(condition, rawText) {
  return {
    attributeId: condition.fieldId || condition.attributeId,
    operator: condition.operator || 'eq',
    value: condition.value,
    ...(condition.unit !== undefined ? { unit: condition.unit } : {}),
    role: roleOf(condition.role),
    state: 'confirmed',
    confidence: 0.9,
    sourceText: rawText,
    source: 'parser',
  };
}

function proposalFromCompatibility(condition, rawText) {
  return {
    attributeId: 'compatibility',
    operator: condition.relation || 'compatible_with',
    value: condition.target,
    role: roleOf(condition.role),
    state: 'confirmed',
    confidence: 0.85,
    sourceText: rawText,
    source: 'parser',
  };
}

function proposalFromTrigger(trigger, rawText) {
  const relative = trigger.reference && trigger.reference !== 'current';
  return {
    attributeId: trigger.metric || 'change',
    operator: relative ? 'relative_change' : (trigger.operator || 'changed_to'),
    value: trigger.value,
    ...(trigger.unit !== undefined ? { unit: trigger.unit } : {}),
    role: 'change',
    state: 'confirmed',
    confidence: 0.9,
    reference: trigger.reference,
    scope: trigger.scope,
    sourceText: rawText,
    source: 'parser',
  };
}

function approximatePrice(text) {
  const normalized = text.replace(/,/g,'');
  const man = normalized.match(/(\d+(?:\.\d+)?)\s*万円\s*(?:くらい|前後|程度)/);
  const yen = normalized.match(/(\d{3,8})\s*円\s*(?:くらい|前後|程度)/);
  const center = man ? Math.round(Number(man[1]) * 10000) : yen ? Number(yen[1]) : undefined;
  if (!Number.isFinite(center)) return null;
  const tolerance = Math.max(500, Math.round(center * 0.2));
  return {
    attributeId:'price', operator:'range', value:{ min:Math.max(0, center - tolerance), max:center + tolerance }, unit:'JPY',
    role:'preferred', state:'needs_review', confidence:0.62, sourceText:text, source:'interpretation',
  };
}

function colorOr(text) {
  const names = [...COLOR_MAP.keys()].sort((a,b) => b.length - a.length);
  for (const left of names) for (const right of names) {
    if (left === right) continue;
    if (text.includes(`${left}か${right}`) || text.includes(`${left}または${right}`) || text.includes(`${left}or${right}`)) {
      return {
        attributeId:'color', operator:'one_of', value:[COLOR_MAP.get(left),COLOR_MAP.get(right)], role:'required',
        state:'confirmed', confidence:0.96, sourceText:`${left}か${right}`, source:'interpretation',
      };
    }
  }
  return null;
}

function exceptionCondition(text) {
  if (!/(中古不可|中古は(?:不可|除外|嫌)).*(未使用開封品|開封未使用|未使用品).*(OK|可|なら)/.test(text)) return null;
  const phrase = text.match(/未使用開封品|開封未使用|未使用品/)?.[0] || '未使用開封品';
  return {
    proposal: {
      attributeId:'condition', operator:'one_of', value:['new','open_box'], role:'required', state:'needs_review',
      confidence:0.7, sourceText:text, source:'interpretation',
    },
    unresolved: { id:'exception-open-box', text:phrase, state:'unresolved', reason:'exception_requires_review' },
  };
}

function vagueFragments(text) {
  const phrases = ['安っぽくない','高級すぎない','軽め','静かめ','大きめ','小さめ','有名どころ','レビュー評価高め','近くで買える'];
  return phrases.filter((phrase) => text.includes(phrase)).map((phrase, index) => ({
    id:`vague-${index}-${phrase}`, text:phrase, state:'unresolved', reason:'qualitative_threshold_missing',
  }));
}

function unsupportedProposals(text) {
  const out = [];
  if (/実店舗.*試着|試着可能/.test(text)) out.push({
    attributeId:'storeTryOn', operator:'boolean', value:true, role:'preferred', state:'unsupported', confidence:0.95,
    sourceText:text.match(/実店舗[^、,]*試着[^、,]*|試着可能[^、,]*/)?.[0] || '実店舗で試着可能', source:'interpretation',
  });
  return out;
}

function knownClause(clause) {
  return /(円|万円|白|黒|グレー|ネイビー|ベージュ|赤|青|新品|中古|幅\d|cm|年以降|年モデル|在庫|再入荷|%|保証|サイズ|直行|往復|片道|ホテル|航空券|送料無料|送料込み|型番|互換|対応|容量|L以上|kg|修復歴|走行距離)/.test(clause);
}

function dedupe(items) {
  const map = new Map();
  for (const item of items) {
    if (!item?.attributeId) continue;
    const key = `${item.attributeId}:${item.role}:${item.operator}`;
    if (!map.has(key) || item.source === 'interpretation') map.set(key, item);
  }
  return [...map.values()];
}

export function interpretInput(rawText, context = {}) {
  const text = String(rawText || '').trim();
  if (!text) return { conditionProposals:[], unresolvedFragments:[], confidence:0 };

  let parsed;
  try { parsed = parseWatchQuery(text); } catch { parsed = null; }
  const targetText = text.split(/[、,]/)[0].trim() || text;
  const targetProposal = {
    value: parsed?.target || { title:targetText },
    state:'confirmed',
    confidence: parsed ? 0.82 : 0.55,
    sourceText:text,
  };

  let conditionProposals = [
    ...(parsed?.domainConditions || []).map((item) => proposalFromDomainCondition(item,text)),
    ...(parsed?.genericConditions || []).filter((item) => !(parsed?.domainConditions || []).some((d) => d.fieldId === item.attributeId)).map((item) => proposalFromDomainCondition(item,text)),
    ...(parsed?.compatibilityConditions || []).map((item) => proposalFromCompatibility(item,text)),
    ...(parsed?.triggers || []).map((item) => proposalFromTrigger(item,text)),
  ];

  const approx = approximatePrice(text);
  if (approx) {
    conditionProposals = conditionProposals.filter((item) => item.attributeId !== 'price');
    conditionProposals.push(approx);
  }
  const colors = colorOr(text);
  if (colors) {
    conditionProposals = conditionProposals.filter((item) => item.attributeId !== 'color');
    conditionProposals.push(colors);
  }

  const exception = exceptionCondition(text);
  const unresolvedFragments = vagueFragments(text);
  if (exception) {
    conditionProposals = conditionProposals.filter((item) => item.attributeId !== 'condition');
    conditionProposals.push(exception.proposal);
    unresolvedFragments.push(exception.unresolved);
  }
  conditionProposals.push(...unsupportedProposals(text));

  const percent = text.match(/(?:今より|前回(?:確認)?より)[^、,]*(\d{1,2})\s*%[^、,]*(?:安く|値下がり)/);
  if (percent && !conditionProposals.some((item) => item.role === 'change' && item.operator === 'relative_change')) {
    conditionProposals.push({
      attributeId:'price', operator:'relative_change', value:-Number(percent[1]), unit:'%', reference:'previous_observation',
      role:'change', state:'confirmed', confidence:0.95, sourceText:percent[0], source:'interpretation',
    });
  }

  for (const [index, clause] of text.split(/[、,]/).map((item) => item.trim()).filter(Boolean).slice(1).entries()) {
    if (!knownClause(clause) && !unresolvedFragments.some((item) => item.text === clause)) {
      unresolvedFragments.push({ id:`unresolved-${index}`, text:clause, state:'unresolved', reason:'no_safe_mapping' });
    }
  }

  if (!parsed && unresolvedFragments.length === 0) unresolvedFragments.push({ id:'raw-unresolved', text, state:'unresolved', reason:'parse_failed' });

  return {
    targetProposal,
    conditionProposals:dedupe(conditionProposals),
    unresolvedFragments,
    inferredDomain:parsed?.domain || parsed?.type || context.domain,
    inferredCategory:parsed?.target?.categoryId || parsed?.target?.subcategoryId || context.categoryId,
    confidence: parsed ? 0.82 : 0.55,
  };
}
