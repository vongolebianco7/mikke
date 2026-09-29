import { normalizeDomainCondition, normalizeTrigger } from './watchSchema.js';

const condition=(fieldId,operator,value,unit,role='required')=>normalizeDomainCondition({fieldId,operator,value,unit,role});
const trigger=(metric,operator,value,unit,reference='current',scope='candidate')=>normalizeTrigger({metric,operator,value,unit,reference,scope});
function yen(text){const n=text.replace(/,/g,'');const m=n.match(/(\d+(?:\.\d+)?)\s*万円/);if(m)return Math.round(Number(m[1])*10000);const y=n.match(/(\d{3,8})\s*円/);return y?Number(y[1]):undefined}
function dedupe(list){const seen=new Set();return list.filter((x)=>{const k=`${x.fieldId||x.metric}:${x.operator}:${JSON.stringify(x.value)}:${x.role||''}:${x.scope||''}`;if(seen.has(k))return false;seen.add(k);return true})}

export function parseHotelWatch(raw=''){
  const text=String(raw).trim(),domainConditions=[],triggers=[],unparsedClauses=[];
  const add=(c)=>c&&domainConditions.push(c),notify=(t)=>t&&triggers.push(t);
  const first=text.split(/[、,]/)[0].trim();
  const destination=first.replace(/の?ホテル|旅館|宿泊|宿/g,'').trim();if(destination)add(condition('destination','eq',destination));
  const dates=[...text.matchAll(/(20\d{2}-\d{2}-\d{2})/g)].map((m)=>m[1]);if(dates[0])add(condition('checkIn','eq',dates[0]));if(dates[1])add(condition('checkOut','eq',dates[1]));
  for(const [label,id] of [['大人','adults'],['子ども','children'],['子供','children'],['乳児','infants']]){const m=text.match(new RegExp(`${label}\\s*(\\d+)\\s*人`));if(m&&!domainConditions.some((c)=>c.fieldId===id))add(condition(id,'eq',Number(m[1])))}
  const rooms=text.match(/(\d+)\s*室/);if(rooms)add(condition('rooms','eq',Number(rooms[1])));
  const walk=text.match(/(?:駅(?:から)?徒歩|徒歩)\s*(\d+)\s*分(?:以内|以下)?/);if(walk)add(condition('maxWalkingMinutes','lte',Number(walk[1]),'min'));
  if(/禁煙/.test(text))add(condition('nonsmoking','is_true',true));
  const area=text.match(/(\d+(?:\.\d+)?)\s*(?:㎡|m2)\s*以上/i);if(area)add(condition('minRoomArea','gte',Number(area[1]),'m2'));
  if(/朝食付き|朝食込/.test(text))add(condition('breakfastIncluded','is_true',true));
  if(/温泉/.test(text))add(condition('onsen','is_true',true));if(/大浴場/.test(text))add(condition('publicBath','is_true',true));
  if(/駐車場(?:あり|付き|有)/.test(text))add(condition('parking','is_true',true));
  if(/キャンセル無料|無料キャンセル/.test(text))add(condition('freeCancellation','is_true',true));
  const rating=text.match(/(?:評価|レビュー)\s*(\d(?:\.\d+)?)\s*以上/);if(rating)add(condition('rating','gte',Number(rating[1])));
  const p=yen(text);if(p!==undefined){const scope=/1泊|一泊/.test(text)?'nightly':/合計|総額/.test(text)?'stay_total':'candidate';if(/なったら|通知|教えて/.test(text))notify(trigger('price','lte',p,'JPY','current',scope));else add(condition('price','lte',p,'JPY'));}
  const clauses=text.split(/[、,]/).map((x)=>x.trim()).filter(Boolean);for(const clause of clauses){if(/来月|再来月|週末/.test(clause)&&!/^20\d{2}-/.test(clause))unparsedClauses.push(clause)}
  return {domain:'hotel',target:{title:first},domainConditions:dedupe(domainConditions),triggers:dedupe(triggers),metadata:{rawQuery:text,unparsedClauses}};
}
