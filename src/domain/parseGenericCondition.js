import { inferProductCategory } from './categoryTemplates.js';
import { normalizeCondition, normalizeDomainCondition, normalizeTrigger } from './watchSchema.js';
import { normalizeCompatibilityCondition } from './compatibilityEngine.js';

const COLOR_MAP={'グレー':'gray','灰色':'gray','白':'white','ホワイト':'white','黒':'black','ブラック':'black','ベージュ':'beige','ネイビー':'navy','青':'blue','ブルー':'blue','赤':'red','レッド':'red'};
const DOMAIN_BY_CATEGORY={fashion:'fashion',appliances:'appliance',furniture:'furniture',food:'food',used_car:'used_car',baby:'baby',sports:'sports',electronics:'electronics',daily_goods:'daily_goods',beauty:'beauty',pet:'pet',hobby:'hobby'};
const FIELD_MAP={capacity:'totalCapacity',installation_width:'installationWidth',freezer_capacity:'freezerCapacity',release_year:'releaseYear',origin_country:'originCountry',expiration_date:'expirationDate',storage_method:'storageMethod',model_year:'modelYear',repair_history:'repairHistory',fuel_type:'fuelType',seat_count:'seatCount',load_capacity:'loadCapacity',assembly_required:'assemblyRequired'};
const STRUCTURED_EXCLUSION_TERMS=new Set(['中古']);
function condition(attributeId,operator,value,unit,role='required',source='category'){return normalizeCondition({attributeId,operator,value,unit,role,source})}
function trigger(metric,operator,value,unit,reference='current',scope='candidate'){return normalizeTrigger({metric,operator,value,unit,reference,scope,role:'notification'})}
function compatibility(id,relation,target,subjectType='product',role='required'){return normalizeCompatibilityCondition({id,relation,target,subjectType,role})}
function priceValue(text){const normalized=text.replace(/,/g,'');const man=normalized.match(/(\d+(?:\.\d+)?)\s*万円/);if(man)return Math.round(Number(man[1])*10000);const yen=normalized.match(/(\d{3,8})\s*円/);return yen?Number(yen[1]):undefined}
function colorValues(text){const found=[];for(const[jp,id]of Object.entries(COLOR_MAP))if(text.includes(jp))found.push(id);return[...new Set(found)]}
function firstClause(text){return text.split(/[、,]/)[0].trim()}
function exclusionTerms(text){
  const terms=[];
  for(const rawClause of String(text).split(/[、,]/)){
    const clause=rawClause.trim();
    const match=clause.match(/^(.+?)(?:除外|不可|不要)$/);
    const term=match?.[1]?.trim();
    if(term&&!STRUCTURED_EXCLUSION_TERMS.has(term))terms.push(term);
  }
  return [...new Set(terms)];
}
function toDomainCondition(item,domain){let fieldId=FIELD_MAP[item.attributeId]||item.attributeId;if(item.attributeId==='price'&&domain==='used_car')fieldId='totalPrice';return normalizeDomainCondition({fieldId,operator:item.operator,value:item.value,unit:item.unit,role:item.role})}
function toMonths(value,unit){return unit==='歳'?Math.round(Number(value)*12):Number(value)}
function parseCompatibility(text,domain){
  const items=[];
  const device=text.match(/(iPhone\s*\d+(?:\s*(?:Pro Max|Pro|Plus|Air))?|Pixel\s*\d+(?:\s*(?:Pro|a|Fold))?|Galaxy\s*[A-Z]?\d+(?:\s*(?:Ultra|Plus|FE))?)\s*(?:対応|用)/i);
  if(device)items.push(compatibility('compat-device','compatible_with',{type:'device',model:device[1].replace(/\s+/g,' ').trim()},'accessory'));
  if(domain==='baby'){
    const minAge=text.match(/(\d+(?:\.\d+)?)\s*(ヶ月|か月|歳)\s*(?:から|以上)/);
    const maxAge=text.match(/(\d+(?:\.\d+)?)\s*(ヶ月|か月|歳)\s*(?:まで|以下)/);
    if(minAge||maxAge){const target={type:'age_range'};if(minAge)target.minAgeMonths=toMonths(minAge[1],minAge[2]);if(maxAge)target.maxAgeMonths=toMonths(maxAge[1],maxAge[2]);items.push(compatibility('compat-age-range','within_limits',target,'product'))}
    const minWeight=text.match(/(\d+(?:\.\d+)?)\s*kg\s*(?:から|以上)/i);
    const maxWeight=text.match(/(\d+(?:\.\d+)?)\s*kg\s*(?:まで|以下)/i);
    if(minWeight||maxWeight){const target={type:'weight_range'};if(minWeight)target.minWeightKg=Number(minWeight[1]);if(maxWeight)target.maxWeightKg=Number(maxWeight[1]);items.push(compatibility('compat-weight-range','within_limits',target,'product'))}
  }
  const vehicle=text.match(/(ヴェゼル|VEZEL|プリウス)(?:[^、,]*?(20\d{2})年式)?[^、,]*(?:対応|適合|に付く|取り付け)/i);
  if(vehicle){const target={type:'vehicle',model:vehicle[1]};if(vehicle[2])target.modelYear=Number(vehicle[2]);items.push(compatibility('compat-vehicle','compatible_with',target,'accessory'))}
  return items;
}

export function parseGenericConditionClauses(raw){
  const text=String(raw||'').trim(),inferred=inferProductCategory(text),domain=DOMAIN_BY_CATEGORY[inferred.categoryId]||'fashion';
  const target={...inferred,title:firstClause(text)},conditions=[],triggers=[],seenConditions=new Set(),seenTriggers=new Set();
  const addCondition=(item)=>{if(!item)return;const key=`${item.attributeId}:${item.operator}:${JSON.stringify(item.value)}:${item.role}`;if(!seenConditions.has(key)){seenConditions.add(key);conditions.push(item)}};
  const addTrigger=(item)=>{if(!item)return;const key=`${item.metric}:${item.operator}:${item.reference}:${JSON.stringify(item.value)}`;if(!seenTriggers.has(key)){seenTriggers.add(key);triggers.push(item)}};
  for(const term of exclusionTerms(text))addCondition(condition('title','not_contains_text',term,undefined,'required','common'));
  const size=text.match(/(\d{2}(?:\.\d)?)\s*cm/i);if(size&&!/(幅|高さ|奥行|設置幅)[^、,]*\d{2}(?:\.\d)?\s*cm/i.test(text))addCondition(condition('size','eq',`${size[1]}cm`,undefined,'required','common'));
  const colors=colorValues(text);if(colors.length)addCondition(condition('color','in',colors,undefined,/必須|絶対/.test(text)?'required':'preferred','common'));if(/新品(?:のみ)?|中古(?:は)?不可|中古は嫌/.test(text))addCondition(condition('condition','eq','new',undefined,'required','common'));
  const capacity=text.match(/(?:容量\s*)?(\d{2,4}(?:\.\d+)?)\s*[lL]\s*(以上|以下)?/);if(capacity)addCondition(condition('capacity',capacity[2]==='以下'?'lte':'gte',Number(capacity[1]),'L'));
  const width=text.match(/(?:幅|本体幅|設置幅)\s*(\d+(?:\.\d+)?)\s*(mm|cm|m)?\s*(以上|以下)/i);if(width){const unit=(width[2]||'cm').toLowerCase(),factor=unit==='m'?1000:unit==='cm'?10:1;addCondition(condition(/設置幅/.test(width[0])?'installation_width':'width',width[3]==='以上'?'gte':'lte',Number(width[1])*factor,'mm'))}
  const weight=text.match(/(\d+(?:\.\d+)?)\s*(kg|g)\s*(以上|以下)/i);if(weight&&inferred.categoryId==='food'){const grams=weight[2].toLowerCase()==='kg'?Number(weight[1])*1000:Number(weight[1]);addCondition(condition('weight',weight[3]==='以上'?'gte':'lte',grams,'g'))}
  const year=text.match(/(20\d{2})\s*年式\s*(?:以降|以上)?/);if(year)addCondition(condition('model_year','gte',Number(year[1]),undefined,'required','category'));
  const mileage=text.replace(/,/g,'').match(/(\d+(?:\.\d+)?)\s*万\s*km\s*(以上|以下)/i);if(mileage)addCondition(condition('mileage',mileage[2]==='以上'?'gte':'lte',Math.round(Number(mileage[1])*10000),'km','required','category'));
  const mileagePlain=text.replace(/,/g,'').match(/(?<!万)(\d{3,6})\s*km\s*(以上|以下)/i);if(!mileage&&mileagePlain)addCondition(condition('mileage',mileagePlain[2]==='以上'?'gte':'lte',Number(mileagePlain[1]),'km','required','category'));if(/修復歴なし|事故歴なし/.test(text))addCondition(condition('repair_history','is_false',false,undefined,'required','category'));
  const price=priceValue(text),shippingInclusive=/(送料込み|送料込)/.test(text),priceAsNotification=/(なったら|教えて|通知)/.test(text)||shippingInclusive;if(price!==undefined){if(priceAsNotification)addTrigger(trigger(shippingInclusive?'landed_price':'price','lte',price,'JPY','current'));else addCondition(condition('price','lte',price,'JPY','required','common'))}
  if(/在庫復活|再入荷/.test(text))addTrigger(trigger('availability','changed_to','in_stock',undefined,'previous_observation'));if(/送料無料/.test(text))addTrigger(trigger('shipping_fee','eq',0,'JPY','current'));
  const couponPercent=text.match(/(\d{1,2})\s*%\s*(?:OFF|オフ)\s*クーポン|クーポン[^、,]*(\d{1,2})\s*%/i);if(couponPercent)addTrigger(trigger('coupon_discount_percent','gte',Number(couponPercent[1]||couponPercent[2]),'%','current'));if(/クーポン(?:が)?(?:出た|発行|利用可能|あり)/.test(text))addTrigger(trigger('coupon_available','changed_to',true,undefined,'previous_observation'));if(/予約開始|予約できるようになったら/.test(text))addTrigger(trigger('preorder_status','changed_to','open',undefined,'previous_observation'));if(/発売されたら|発売開始|発売になったら/.test(text))addTrigger(trigger('release_status','changed_to','released',undefined,'previous_observation'));
  if(/(?:今より|前回(?:確認)?より).*(?:安く|値下がり)/.test(text))addTrigger(trigger('price','lt',undefined,'JPY','previous_observation'));const pct=text.match(/(\d{1,2})\s*%\s*以上(?:に)?(?:値下がり|安く)/);if(pct)addTrigger(trigger('discount_percent','gte',Number(pct[1]),'%',/(登録時|最初)/.test(text)?'initial_observation':'previous_observation'));if(/登録時.*(?:安く|値下がり)/.test(text)&&!pct)addTrigger(trigger('price','lt',undefined,'JPY','initial_observation'));if(/登録後最安値|Mikke.*最安値/i.test(text))addTrigger(trigger('price','lt',undefined,'JPY','watch_low'));
  const domainConditions=conditions.map((item)=>toDomainCondition(item,domain));
  const compatibilityConditions=parseCompatibility(text,domain);
  return{domain,target:{...target,domain,subcategoryId:target.subcategoryId},domainConditions,conditions,compatibilityConditions,triggers};
}