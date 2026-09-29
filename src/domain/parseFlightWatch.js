import { normalizeDomainCondition, normalizeTrigger } from './watchSchema.js';

const condition=(fieldId,operator,value,unit,role='required')=>normalizeDomainCondition({fieldId,operator,value,unit,role});
const trigger=(metric,operator,value,unit,reference='current',scope='candidate')=>normalizeTrigger({metric,operator,value,unit,reference,scope});
function yen(text){const n=text.replace(/,/g,'');const m=n.match(/(\d+(?:\.\d+)?)\s*万円/);if(m)return Math.round(Number(m[1])*10000);const y=n.match(/(\d{3,8})\s*円/);return y?Number(y[1]):undefined}
function dedupe(list){const seen=new Set();return list.filter((x)=>{const k=`${x.fieldId||x.metric}:${x.operator}:${JSON.stringify(x.value)}:${x.role||''}:${x.scope||''}`;if(seen.has(k))return false;seen.add(k);return true})}

export function parseFlightWatch(raw=''){
  const text=String(raw).trim(), domainConditions=[],triggers=[],unparsedClauses=[];
  const add=(c)=>c&&domainConditions.push(c), notify=(t)=>t&&triggers.push(t);
  let routeMatched=false;
  const anywhere=text.match(/どこからでも([^、,]+?)(?=、|,|$)/);
  if(anywhere){add(condition('destination','eq',anywhere[1].replace(/航空券|フライト/g,'').trim()));routeMatched=true;}
  if(!anywhere){
    const route=text.match(/([^、,]+?)から([^、,]+?)(?=、|,|$)/);
    if(route){add(condition('origin','eq',route[1].replace(/航空券|フライト/g,'').trim()));add(condition('destination','eq',route[2].replace(/航空券|フライト/g,'').trim()));routeMatched=true;}
  }
  if(/羽田のみ/.test(text))add(condition('departureAirports','in',['HND']));
  if(/成田のみ/.test(text))add(condition('departureAirports','in',['NRT']));
  if(/成田除外/.test(text))add(condition('departureAirports','not_in',['NRT']));
  if(/羽田除外/.test(text))add(condition('departureAirports','not_in',['HND']));
  if(/往復/.test(text))add(condition('tripType','eq','round_trip'));
  else if(/片道/.test(text))add(condition('tripType','eq','one_way'));
  if(/直行便|直行のみ/.test(text))add(condition('nonstopOnly','is_true',true));
  const stops=text.match(/(?:乗り換え|乗継)\s*(\d+)\s*回まで/);if(stops)add(condition('maxStops','lte',Number(stops[1])));
  const airlines=[];if(/ANA/.test(text))airlines.push('ANA');if(/JAL/.test(text))airlines.push('JAL');if(airlines.length)add(condition('allowedAirlines','in',airlines));
  if(/LCC(?:除外|不可|なし)/.test(text))add(condition('lccAllowed','is_false',false));
  if(/午前発/.test(text))add(condition('departureTimeRange','between',['00:00','11:59']));
  if(/午後発/.test(text))add(condition('departureTimeRange','between',['12:00','23:59']));
  if(/エコノミー/.test(text))add(condition('cabinClass','eq','economy'));
  if(/受託手荷物(?:込み|付|あり)/.test(text))add(condition('checkedBaggageIncluded','is_true',true));
  if(/変更可|変更可能/.test(text))add(condition('changeable','is_true',true));
  if(/払い戻し可|払戻し可|返金可/.test(text))add(condition('refundable','is_true',true));
  for(const [label,id] of [['大人','adults'],['子ども','children'],['子供','children'],['乳児','infants']]){const m=text.match(new RegExp(`${label}\\s*(\\d+)\\s*人`));if(m&&!domainConditions.some((c)=>c.fieldId===id))add(condition(id,'eq',Number(m[1])))}
  const miles=text.replace(/,/g,'').match(/(\d+(?:\.\d+)?)\s*万\s*マイル以下/);if(miles)add(condition('maxMiles','lte',Math.round(Number(miles[1])*10000),'mile'));
  const fees=text.match(/(?:諸費用|税(?:・|と)?諸費用)\s*([^、,]+?)(?:以下|まで)/);if(fees){const v=yen(fees[1]);if(v!==undefined)add(condition('maxTaxesAndFees','lte',v,'JPY'));}
  const p=yen(text);if(p!==undefined){if(/なったら|通知|教えて/.test(text))notify(trigger('price','lte',p,'JPY'));else add(condition('price','lte',p,'JPY'));}
  const pct=text.match(/(\d{1,2})\s*%\s*以上(?:に)?(?:値下がり|安く)/);if(pct)notify(trigger('discount_percent','gte',Number(pct[1]),'%','previous_observation'));
  if(/登録後最安値|登録してから最安値/.test(text))notify(trigger('price','lt',undefined,'JPY','watch_low'));
  if(/特典航空券[^、,]*(?:空席|取れる|空いた).*(?:出たら|なったら)|特典航空券の空席が出たら/.test(text))notify(trigger('availability','changed_to','in_stock',undefined,'previous_observation','award'));
  const dateMatches=[...text.matchAll(/(20\d{2}-\d{2}-\d{2})/g)].map((m)=>m[1]);if(dateMatches[0])add(condition('outboundDate','eq',dateMatches[0]));if(dateMatches[1])add(condition('returnDate','eq',dateMatches[1]));
  const clauses=text.split(/[、,]/).map((x)=>x.trim()).filter(Boolean);for(const clause of clauses){if(/来月|再来月|週末|安い日/.test(clause)&&!/^20\d{2}-/.test(clause))unparsedClauses.push(clause)}
  return {domain:'flight',target:{title:routeMatched?text.split(/[、,]/)[0]:text.split(/[、,]/)[0]},domainConditions:dedupe(domainConditions),triggers:dedupe(triggers),metadata:{rawQuery:text,unparsedClauses}};
}
