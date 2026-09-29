import { getAttributeDefinition } from './attributeRegistry.js';
import { getCategoryTemplate, inferProductCategory } from './categoryTemplates.js';
import { getDomainSchema, inferWatchDomain, listDomainFields, getDomainTriggerSuggestions } from './domainSchemas.js';
import { normalizeDomainCondition, normalizeDomainWatch } from './watchSchema.js';
import { createFlightTravelIntent, normalizeFlightTravelIntent } from './flightTravelIntent.js';

const COMMON_IDS=['brand','price','condition','color'];
const TRIGGER_PRESETS={
  price:{id:'price',label:'価格',phrases:['1万円以下になったら','今より安くなったら','10%以上値下がりしたら','登録後最安値になったら']},availability:{id:'availability',label:'在庫',phrases:['在庫復活したら']},shipping:{id:'shipping',label:'送料',phrases:['送料無料','送料込み1万円以下']},coupon:{id:'coupon',label:'クーポン',phrases:['10%OFFクーポン','クーポンが出たら']},release:{id:'release',label:'発売',phrases:['予約開始','発売されたら']},sale:{id:'sale',label:'セール',phrases:['10%以上値下がりしたら']},delivery:{id:'delivery',label:'配送',phrases:[]},unit_price:{id:'unit_price',label:'単価',phrases:[]},new_listing:{id:'new_listing',label:'新着',phrases:['新しい候補が見つかったら']},seller:{id:'seller',label:'販売店',phrases:[]},
};
const PRESETS={brand:['ブランドを指定'],model:['型番を指定'],size:['24.5cm','26.0cm'],color:['グレー','ブラック','ホワイト','ネイビー'],condition:['新品のみ'],capacity:['500L以上','400L以上'],total_capacity:['500L以上'],installation_width:['幅70cm以下'],width:['幅70cm以下','幅180cm以下'],height:['高さ180cm以下'],depth:['奥行70cm以下'],weight:['1kg以下'],material:['木製'],release_year:['2026年以降'],warranty:['保証あり'],energy_consumption:['省エネ'],freezer_capacity:['冷凍室100L以上'],quantity:['10個以上'],origin_country:['国産'],expiration_date:['賞味期限30日以上'],storage_method:['常温'],allergens:['アレルゲンなし'],manufacturer:['メーカーを指定'],trim:['グレードを指定'],model_year:['2027年式以降'],mileage:['3万km以下'],repair_history:['修復歴なし'],fuel_type:['ハイブリッド'],drivetrain:['4WD'],seat_count:['4人用'],load_capacity:['耐荷重100kg以上'],assembly_required:['組立不要'],seller:['販売店を指定']};
const DOMAIN_PHRASES={
  origin:['東京から','羽田から'],destination:['ホノルルまで','大阪まで'],tripType:['往復','片道'],outboundDate:['出発日を指定'],returnDate:['帰国日を指定'],adults:['大人2人'],children:['子ども1人'],infants:['乳児1人'],nonstopOnly:['直行便'],maxStops:['乗り換え1回まで'],allowedAirlines:['ANAかJAL'],lccAllowed:['LCC除外'],departureTimeRange:['午前発','午後発'],cabinClass:['エコノミー'],checkedBaggageIncluded:['受託手荷物込み'],changeable:['変更可'],refundable:['払い戻し可'],maxMiles:['10万マイル以下'],maxTaxesAndFees:['諸費用3万円以下'],checkIn:['チェックイン日を指定'],checkOut:['チェックアウト日を指定'],rooms:['1室'],maxWalkingMinutes:['駅徒歩5分以内'],nonsmoking:['禁煙'],minRoomArea:['25㎡以上'],breakfastIncluded:['朝食付き'],onsen:['温泉'],publicBath:['大浴場'],parking:['駐車場あり'],freeCancellation:['キャンセル無料'],rating:['評価4.2以上'],
};
function item(id){if(id==='price')return{id,label:'価格'};const def=getAttributeDefinition(id);return def?{id,label:def.label}:null}
export function attributePresetPhrases(attributeId){return[...(PRESETS[attributeId]||DOMAIN_PHRASES[attributeId]||[])]}

export function buildComposerModel(subject=''){
  const inferred=inferProductCategory(subject),template=getCategoryTemplate(inferred.categoryId),defaults=[...(template?.defaultAttributes||[])],recommended=[...(template?.recommendedAttributes||[])];
  const subcategoryExtras={refrigerator:['total_capacity','installation_width','freezer_capacity','energy_consumption'],shoes:['size','weight','material'],sofa:['seat_count','load_capacity','assembly_required'],coffee:['expiration_date','storage_method','allergens'],car:['fuel_type','drivetrain','warranty']}[inferred.subcategoryId]||[];
  const common=[...new Set(COMMON_IDS.filter((id)=>id==='price'||defaults.includes(id)))].map(item).filter(Boolean),commonIds=new Set(common.map((entry)=>entry.id));
  const categoryIds=[...new Set([...defaults,...subcategoryExtras,...recommended])].filter((id)=>id!=='price'&&!commonIds.has(id)),category=categoryIds.map(item).filter(Boolean).slice(0,10),shown=new Set([...common,...category].map((x)=>x.id));
  const advanced=[...categoryIds.slice(10),...(template?.advancedAttributes||[]),'seller','release_year','warranty','material'].filter((id,index,array)=>array.indexOf(id)===index&&!shown.has(id)).map(item).filter(Boolean);if(!advanced.length)advanced.push({id:'custom',label:'その他の属性'});
  const triggers=[...new Set(template?.supportedTriggers||['price','availability'])].map((id)=>TRIGGER_PRESETS[id]).filter(Boolean);if(!triggers.some((x)=>x.id==='price'))triggers.unshift(TRIGGER_PRESETS.price);
  return{...inferred,common,category,advanced,triggers};
}

function domainEntry(field){return{id:field.id,label:field.label,type:field.type,operators:[...field.operators],phrases:attributePresetPhrases(field.id)}}
export function createComposerModel({type,raw='',domain,subcategoryId}={}){
  const inferred=domain?{domain,subcategoryId}:type==='flight'?{domain:'flight'}:type==='hotel'?{domain:'hotel'}:inferWatchDomain(raw);
  const resolvedSubcategory=subcategoryId||inferred.subcategoryId;
  const schema=getDomainSchema(inferred.domain);
  if(!schema)return{domain:inferred.domain,basic:[],common:[],detailed:[],advanced:[],triggers:[]};
  return{
    domain:inferred.domain,subcategoryId:resolvedSubcategory,displayName:schema.displayName,
    basic:listDomainFields(inferred.domain,'basic',resolvedSubcategory).map(domainEntry),
    common:listDomainFields(inferred.domain,'common',resolvedSubcategory).map(domainEntry),
    detailed:listDomainFields(inferred.domain,'detailed',resolvedSubcategory).map(domainEntry),
    advanced:listDomainFields(inferred.domain,'advanced',resolvedSubcategory).map(domainEntry),
    triggers:getDomainTriggerSuggestions(inferred.domain).map((item)=>({...item,phrases:TRIGGER_PRESETS[item.id]?.phrases||[]})),
  };
}

export function applyComposerCondition(watch={},draft={}){
  const normalized=normalizeDomainCondition(draft),existing=Array.isArray(watch.domainConditions)?watch.domainConditions:[];
  const next=existing.filter((item)=>!(item.fieldId===normalized.fieldId&&item.operator===normalized.operator));
  next.push(normalized);
  return normalizeDomainWatch({...watch,domainConditions:next,metadata:{...(watch.metadata||{})}});
}

function dateModeFor(options){if(!options.length)return'anytime';if(options.length>1)return'any_of';return options[0]?.kind||'anytime'}
export function applyFlightTravelIntentEdit(watch={},edit={}){
  const current=normalizeFlightTravelIntent(watch.travelIntent||createFlightTravelIntent());
  const intent=structuredClone(current);
  const metadata={...(watch.metadata||{})};
  if(edit.type==='add_place'){
    const key=edit.set==='origin'?'originSet':'destinationSet';
    const places=[...intent[key].places];
    const id=edit.place?.id;
    if(edit.place&&(!id||!places.some((p)=>p.id===id)))places.push({...edit.place});
    intent[key]={...intent[key],places,mode:places.length>1?'any_of':'specific'};
  } else if(edit.type==='remove_place'){
    const key=edit.set==='origin'?'originSet':'destinationSet';
    const places=intent[key].places.filter((p,index)=>edit.id!==undefined?p.id!==edit.id:index!==edit.index);
    intent[key]={...intent[key],places,mode:places.length>1?'any_of':places.length===1?'specific':edit.set==='destination'&&intent[key].mode==='anywhere'?'anywhere':'specific'};
  } else if(edit.type==='set_place_mode'){
    const key=edit.set==='origin'?'originSet':'destinationSet';
    intent[key]={...intent[key],mode:edit.mode,places:edit.mode==='anywhere'?[]:intent[key].places};
  } else if(edit.type==='add_date_option'){
    const options=[...intent.dateSet.options,structuredClone(edit.option)];
    intent.dateSet={mode:dateModeFor(options),options};
  } else if(edit.type==='remove_date_option'){
    const options=intent.dateSet.options.filter((_,index)=>index!==edit.index);
    intent.dateSet={mode:dateModeFor(options),options};
  } else if(edit.type==='replace_date_option'){
    const options=intent.dateSet.options.map((option,index)=>index===edit.index?structuredClone(edit.option):option);
    intent.dateSet={mode:dateModeFor(options),options};
  } else if(edit.type==='set_trip_pattern')intent.tripPattern=edit.value;
  else if(edit.type==='set_travellers')intent.travellers={...intent.travellers,...structuredClone(edit.value||{})};
  else if(edit.type==='set_cabin')intent.cabin={...intent.cabin,...structuredClone(edit.value||{})};
  else if(edit.type==='set_payment_intent')intent.paymentIntent={...intent.paymentIntent,...structuredClone(edit.value||{})};
  else if(edit.type==='set_input_mode')metadata.inputMode=edit.mode;
  return {...watch,schemaVersion:4,domain:'flight',travelIntent:normalizeFlightTravelIntent(intent),flightFilters:Array.isArray(watch.flightFilters)?watch.flightFilters.map((x)=>({...x})):[],triggers:Array.isArray(watch.triggers)?watch.triggers.map((x)=>({...x})):[],metadata};
}

export function composerOptionsFor(subject='',group='common'){const model=buildComposerModel(subject);const entries=group==='category'?model.category:group==='advanced'?model.advanced:model.common;return entries.map((entry)=>({...entry,phrases:attributePresetPhrases(entry.id)}))}
