import { inferProductCategory } from './categoryTemplates.js';
import { normalizeCondition, normalizeTrigger } from './watchSchema.js';

const COLOR_MAP={
  'グレー':'gray','灰色':'gray','白':'white','ホワイト':'white','黒':'black','ブラック':'black','ベージュ':'beige','ネイビー':'navy','青':'blue','ブルー':'blue','赤':'red','レッド':'red',
};

function condition(attributeId,operator,value,unit,role='required',source='category'){
  return normalizeCondition({attributeId,operator,value,unit,role,source});
}
function trigger(metric,operator,value,unit,reference='current',scope='candidate'){
  return normalizeTrigger({metric,operator,value,unit,reference,scope,role:'notification'});
}
function priceValue(text){
  const normalized=text.replace(/,/g,'');
  const man=normalized.match(/(\d+(?:\.\d+)?)\s*万円/);
  if(man)return Math.round(Number(man[1])*10000);
  const yen=normalized.match(/(\d{3,8})\s*円/);
  return yen?Number(yen[1]):undefined;
}
function colorValues(text){
  const found=[];
  for(const [jp,id] of Object.entries(COLOR_MAP))if(text.includes(jp))found.push(id);
  return [...new Set(found)];
}
function firstClause(text){return text.split(/[、,]/)[0].trim()}

export function parseGenericConditionClauses(raw){
  const text=String(raw||'').trim();
  const inferred=inferProductCategory(text);
  const target={...inferred,title:firstClause(text)};
  const conditions=[];
  const triggers=[];
  const seenConditions=new Set();
  const seenTriggers=new Set();
  const addCondition=(item)=>{
    if(!item)return;
    const key=`${item.attributeId}:${item.operator}:${JSON.stringify(item.value)}:${item.role}`;
    if(!seenConditions.has(key)){seenConditions.add(key);conditions.push(item)}
  };
  const addTrigger=(item)=>{
    if(!item)return;
    const key=`${item.metric}:${item.operator}:${item.reference}:${JSON.stringify(item.value)}`;
    if(!seenTriggers.has(key)){seenTriggers.add(key);triggers.push(item)}
  };

  const size=text.match(/(\d{2}(?:\.\d)?)\s*cm/i);
  if(size&&!/(幅|高さ|奥行|設置幅)[^、,]*\d{2}(?:\.\d)?\s*cm/i.test(text)) addCondition(condition('size','eq',`${size[1]}cm`,undefined,'required','common'));

  const colors=colorValues(text);
  if(colors.length)addCondition(condition('color','in',colors,undefined,/必須|絶対/.test(text)?'required':'preferred','common'));
  if(/新品(?:のみ)?|中古不可|中古は嫌/.test(text))addCondition(condition('condition','eq','new',undefined,'required','common'));

  const capacity=text.match(/(?:容量\s*)?(\d{2,4}(?:\.\d+)?)\s*[lL]\s*(以上|以下)?/);
  if(capacity)addCondition(condition('capacity',capacity[2]==='以下'?'lte':'gte',Number(capacity[1]),'L'));

  const width=text.match(/(?:幅|本体幅|設置幅)\s*(\d+(?:\.\d+)?)\s*(mm|cm|m)?\s*(以上|以下)/i);
  if(width){
    const unit=(width[2]||'cm').toLowerCase();
    const factor=unit==='m'?1000:unit==='cm'?10:1;
    addCondition(condition(/設置幅/.test(width[0])?'installation_width':'width',width[3]==='以上'?'gte':'lte',Number(width[1])*factor,'mm'));
  }

  const weight=text.match(/(\d+(?:\.\d+)?)\s*(kg|g)\s*(以上|以下)/i);
  if(weight&&inferred.categoryId==='food'){
    const grams=weight[2].toLowerCase()==='kg'?Number(weight[1])*1000:Number(weight[1]);
    addCondition(condition('weight',weight[3]==='以上'?'gte':'lte',grams,'g'));
  }

  const year=text.match(/(20\d{2})\s*年式\s*(?:以降|以上)?/);
  if(year)addCondition(condition('model_year','gte',Number(year[1]),undefined,'required','category'));
  const mileage=text.replace(/,/g,'').match(/(\d+(?:\.\d+)?)\s*万\s*km\s*(以上|以下)/i);
  if(mileage)addCondition(condition('mileage',mileage[2]==='以上'?'gte':'lte',Math.round(Number(mileage[1])*10000),'km','required','category'));
  const mileagePlain=text.replace(/,/g,'').match(/(?<!万)(\d{3,6})\s*km\s*(以上|以下)/i);
  if(!mileage&&mileagePlain)addCondition(condition('mileage',mileagePlain[2]==='以上'?'gte':'lte',Number(mileagePlain[1]),'km','required','category'));
  if(/修復歴なし|事故歴なし/.test(text))addCondition(condition('repair_history','is_false',false,undefined,'required','category'));

  const price=priceValue(text);
  const shippingInclusive=/(送料込み|送料込)/.test(text);
  const priceAsNotification=/(なったら|教えて|通知)/.test(text)||shippingInclusive;
  if(price!==undefined){
    if(priceAsNotification)addTrigger(trigger(shippingInclusive?'landed_price':'price','lte',price,'JPY','current'));
    else addCondition(condition('price','lte',price,'JPY','required','common'));
  }

  if(/在庫復活|再入荷/.test(text))addTrigger(trigger('availability','changed_to','in_stock',undefined,'previous_observation'));
  if(/送料無料/.test(text))addTrigger(trigger('shipping_fee','eq',0,'JPY','current'));
  const couponPercent=text.match(/(\d{1,2})\s*%\s*(?:OFF|オフ)\s*クーポン|クーポン[^、,]*(\d{1,2})\s*%/i);
  if(couponPercent)addTrigger(trigger('coupon_discount_percent','gte',Number(couponPercent[1]||couponPercent[2]),'%','current'));
  if(/クーポン(?:が)?(?:出た|発行|利用可能|あり)/.test(text))addTrigger(trigger('coupon_available','changed_to',true,undefined,'previous_observation'));
  if(/予約開始|予約できるようになったら/.test(text))addTrigger(trigger('preorder_status','changed_to','open',undefined,'previous_observation'));
  if(/発売されたら|発売開始|発売になったら/.test(text))addTrigger(trigger('release_status','changed_to','released',undefined,'previous_observation'));

  if(/(?:今より|前回(?:確認)?より).*(?:安く|値下がり)/.test(text))addTrigger(trigger('price','lt',undefined,'JPY','previous_observation'));
  const pct=text.match(/(\d{1,2})\s*%\s*以上(?:に)?(?:値下がり|安く)/);
  if(pct)addTrigger(trigger('discount_percent','gte',Number(pct[1]),'%',/(登録時|最初)/.test(text)?'initial_observation':'previous_observation'));
  if(/登録時.*(?:安く|値下がり)/.test(text)&&!pct)addTrigger(trigger('price','lt',undefined,'JPY','initial_observation'));
  if(/登録後最安値|Mikke.*最安値/i.test(text))addTrigger(trigger('price','lt',undefined,'JPY','watch_low'));

  return {target,conditions,triggers};
}
