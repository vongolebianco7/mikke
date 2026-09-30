const yen=(value)=>Number.isFinite(Number(value))?`${Number(value).toLocaleString('ja-JP')}円`:'価格条件';
const first=(arr=[])=>arr?.[0]?.label||'';
const condition=(watch,id)=>(watch.domainConditions||[]).find((item)=>item.fieldId===id);
const value=(watch,id)=>condition(watch,id)?.value;
const md=(iso)=>{if(!iso)return'';const m=String(iso).match(/^(?:\d{4}-)?(\d{2})-(\d{2})$/);return m?`${Number(m[1])}/${Number(m[2])}`:String(iso)};
const range=(a,b)=>a&&b?`${md(a)}〜${md(b)}`:'';
const enumText=(v)=>Array.isArray(v)?v.join('・'):String(v??'');

function notificationText(trigger,domain){
  if(!trigger)return'';
  if(trigger.metric==='price'&&trigger.operator==='lte')return`${yen(trigger.value)}以下になったら`;
  if(trigger.metric==='price_drop_percent')return trigger.value?`${trigger.value}%以上値下がりしたら`:'値下がりしたら';
  if(trigger.metric==='availability')return trigger.scope==='award'?'特典空席が出たら':domain==='flight'?'空席が出たら':domain==='hotel'?'空室が出たら':'在庫が出たら';
  if(trigger.reference==='watch_low')return'登録後最安になったら';
  if(trigger.type==='below_absolute')return`${yen(trigger.value)}以下になったら`;
  if(trigger.type==='restock')return domain==='hotel'?'空室が出たら':domain==='flight'?'空席が出たら':'在庫が出たら';
  if(trigger.type==='new_watch_low')return'登録後最安になったら';
  return'';
}

function flightSummary(watch){
  const intent=watch.travelIntent||{};
  const origin=first(intent.originSet?.places)||'出発地未指定';
  const destination=intent.destinationSet?.mode==='anywhere'?'どこでも':first(intent.destinationSet?.places)||'行き先未指定';
  const conditions=[];
  if(intent.tripPattern==='round_trip')conditions.push('往復');
  else if(intent.tripPattern==='one_way')conditions.push('片道');
  else if(intent.tripPattern==='multi_city')conditions.push('複数都市');
  const date=intent.dateSet?.options?.[0];
  if(date?.kind==='month'){
    const stay=date.stayLength?`・${date.stayLength.minNights===date.stayLength.maxNights?`${date.stayLength.minNights}泊`:`${date.stayLength.minNights}〜${date.stayLength.maxNights}泊`}`:'';
    conditions.push(`${date.year}年${date.month}月${stay}`);
  } else if(date?.kind==='exact') conditions.push(range(date.outboundDate,date.returnDate)||md(date.outboundDate));
  else if(date?.kind==='range') conditions.push(range(date.startDate,date.endDate));
  else if(date?.kind==='anytime') conditions.push('いつでも');
  for(const filter of watch.flightFilters||[]){
    if(filter.fieldId==='nonstopOnly'&&filter.value===true)conditions.push('直行便');
    if(filter.fieldId==='allowedAirlines')conditions.push(enumText(filter.value));
  }
  return{subject:`${origin} → ${destination}`,conditions:conditions.filter(Boolean)};
}

function hotelSummary(watch){
  const destination=value(watch,'destination')||value(watch,'area')||watch.target?.title||watch.title||'ホテル';
  const conditions=[];
  const dates=range(value(watch,'checkIn'),value(watch,'checkOut'));
  if(dates)conditions.push(dates);
  if(condition(watch,'breakfastIncluded')?.operator==='is_true'||value(watch,'breakfastIncluded')===true)conditions.push('朝食付き');
  if(condition(watch,'freeCancellation')?.operator==='is_true'||value(watch,'freeCancellation')===true)conditions.push('キャンセル無料');
  const walk=value(watch,'stationWalkMinutes');if(walk)conditions.push(`駅徒歩${walk}分以内`);
  return{subject:String(destination).replace(/のホテル$/,''),conditions};
}

function shoppingSummary(watch){
  const subject=watch.target?.title||watch.title||'商品';
  const labels={size:'サイズ',color:'カラー',colors:'カラー',condition:'状態',totalCapacity:'容量',width:'幅',modelYear:'年式',mileage:'走行距離'};
  const conditions=(watch.domainConditions||[]).filter((item)=>item.role!=='preferred').slice(0,4).map((item)=>{
    const label=labels[item.fieldId]||item.fieldId;
    if(item.operator==='is_true')return label;
    if(item.operator==='is_false')return`${label}なし`;
    return`${label} ${enumText(item.value)}`.trim();
  });
  return{subject,conditions};
}

export function summarizeWatchCard(watch={}){
  const domain=watch.domain||watch.type||'shopping';
  const core=domain==='flight'?flightSummary(watch):domain==='hotel'?hotelSummary(watch):shoppingSummary(watch);
  const notifications=(watch.triggers||[]).map((trigger)=>notificationText(trigger,domain)).filter(Boolean);
  if(!notifications.length){
    for(const trigger of [...(watch.conditions?.priceTriggers||[]),...(watch.conditions?.stateTriggers||[])]){
      const text=notificationText(trigger,domain);if(text)notifications.push(text);
    }
  }
  return{...core,notifications};
}
