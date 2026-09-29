import { getDomainField } from './domainSchemas.js';

const tripLabels={one_way:'片道',round_trip:'往復',multi_city:'複数都市'};
const cabinLabels={economy:'エコノミー',premium_economy:'プレミアムエコノミー',business:'ビジネス',first:'ファースト'};
const esc=(value)=>String(value??'').replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function placeLabel(place){return typeof place==='string'?place:place?.label||place?.id||''}
function setLabel(set,fallback){
  if(!set)return fallback;
  if(set.mode==='anywhere')return 'どこでも';
  const places=(set.places||[]).map(placeLabel).filter(Boolean);
  if(places.length)return places.join('・');
  return fallback;
}
function dateOptionLabel(option){
  if(!option)return '';
  if(option.kind==='exact')return [option.outbound,option.return].filter(Boolean).join(' → ');
  if(option.kind==='month')return `${option.month||''}${option.stayLengthDays?`・${option.stayLengthDays}日間`:''}`;
  if(option.kind==='range')return `${option.start||''}〜${option.end||''}${option.stayLengthDays?`・${option.stayLengthDays}日間`:''}`;
  if(option.kind==='flexible')return `${option.anchor||''} ±${option.flexDays||0}日`;
  if(option.kind==='anytime')return option.stayLengthDays?`いつでも・${option.stayLengthDays}日間`:'いつでも';
  return option.label||'';
}
function datesLabel(dateSet){
  const options=(dateSet?.options||[]).map(dateOptionLabel).filter(Boolean);
  return options.length?options.join(' / '):'いつでも';
}
function travellersLabel(travellers={}){
  const parts=[];
  if(travellers.adults)parts.push(`大人${travellers.adults}`);
  const childCount=Array.isArray(travellers.children)?travellers.children.length:Number(travellers.children||0);
  if(childCount)parts.push(`子ども${childCount}`);
  const infants=Number(travellers.infantsInSeat||0)+Number(travellers.infantsOnLap||0);
  if(infants)parts.push(`乳児${infants}`);
  return parts.join('・');
}
function filterValue(condition){
  const value=condition?.value;
  if(condition?.operator==='is_true')return 'あり';
  if(condition?.operator==='is_false')return 'なし';
  if(Array.isArray(value))return value.join('・');
  if(condition?.unit==='JPY'&&Number.isFinite(value))return `¥${Number(value).toLocaleString('ja-JP')}`;
  return `${value??''}${condition?.unit?` ${condition.unit}`:''}`.trim();
}
function filterLabel(watch,condition){
  const field=getDomainField('flight',condition?.fieldId);
  const label=field?.label||condition?.fieldId||'条件';
  const value=filterValue(condition);
  if(condition?.operator==='is_true')return label;
  if(condition?.operator==='is_false')return `${label}なし`;
  return value?`${label} ${value}`:label;
}
function triggerLabel(trigger){
  if(trigger?.metric==='price'&&trigger.operator==='lte'&&Number.isFinite(trigger.value))return `¥${Number(trigger.value).toLocaleString('ja-JP')}以下になったら`;
  if(trigger?.metric==='availability')return trigger.scope==='award'?'特典航空券の空席が出たら':'空席が出たら';
  if(['discount_percent','price_drop_percent'].includes(trigger?.metric)&&trigger.operator==='gte')return `${trigger.value}%以上値下がりしたら`;
  return [trigger?.metric,trigger?.operator,trigger?.value].filter((value)=>value!==undefined&&value!=='').join(' ');
}

export function flightIntentChips(watch={}){
  if(watch.domain!=='flight'||watch.schemaVersion!==4||!watch.travelIntent)return[];
  const intent=watch.travelIntent;
  const origin=setLabel(intent.originSet,'出発地未指定');
  const destination=setLabel(intent.destinationSet,'行き先未指定');
  const chips=[`${origin} → ${destination}`,tripLabels[intent.tripPattern]||intent.tripPattern,datesLabel(intent.dateSet)];
  const travellers=travellersLabel(intent.travellers);if(travellers)chips.push(travellers);
  const cabins=(intent.cabin?.allowed||[]).map((item)=>cabinLabels[item]||item).filter(Boolean);if(cabins.length)chips.push(cabins.join('・'));
  return chips.filter(Boolean);
}

export function flightIntentGroupsHtml(watch={}){
  if(watch.domain!=='flight'||watch.schemaVersion!==4||!watch.travelIntent)return'';
  const intent=watch.travelIntent;
  const journey=[
    `出発地 ${setLabel(intent.originSet,'未指定')}`,
    `行き先 ${setLabel(intent.destinationSet,'未指定')}`,
    `旅程 ${tripLabels[intent.tripPattern]||intent.tripPattern}`,
    `日付候補 ${datesLabel(intent.dateSet)}`,
  ];
  const travellers=travellersLabel(intent.travellers);if(travellers)journey.push(travellers);
  const cabins=(intent.cabin?.allowed||[]).map((item)=>cabinLabels[item]||item).filter(Boolean);if(cabins.length)journey.push(cabins.join('・'));
  const filters=Array.isArray(watch.flightFilters)?watch.flightFilters:[];
  const required=filters.filter((item)=>item.role!=='preferred').map((item)=>filterLabel(watch,item));
  const preferred=filters.filter((item)=>item.role==='preferred').map((item)=>filterLabel(watch,item));
  const notifications=(watch.triggers||[]).map(triggerLabel).filter(Boolean);
  const row=(label,items,kind='required')=>`<section><h3>${esc(label)}</h3><div class="role-list">${items.length?items.map((item)=>`<span class="role-chip ${kind}"><b>${esc(label)}</b>${esc(item)}</span>`).join(''):'<span class="group-empty">なし</span>'}</div></section>`;
  return `<div class="role-groups flight-intent-summary" data-flight-v4-summary="true">${row('旅程',journey,'required')}${row('必須',required,'required')}${row('希望',preferred,'preferred')}${row('通知条件',notifications,'notification')}</div>`;
}
