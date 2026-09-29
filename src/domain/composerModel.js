import { getAttributeDefinition } from './attributeRegistry.js';
import { getCategoryTemplate, inferProductCategory } from './categoryTemplates.js';

const COMMON_IDS=['brand','price','condition','color'];
const TRIGGER_PRESETS={
  price:{id:'price',label:'価格',phrases:['1万円以下になったら','今より安くなったら','10%以上値下がりしたら','登録後最安値になったら']},
  availability:{id:'availability',label:'在庫',phrases:['在庫復活したら']},
  shipping:{id:'shipping',label:'送料',phrases:['送料無料','送料込み1万円以下']},
  coupon:{id:'coupon',label:'クーポン',phrases:['10%OFFクーポン','クーポンが出たら']},
  release:{id:'release',label:'発売',phrases:['予約開始','発売されたら']},
  sale:{id:'sale',label:'セール',phrases:['10%以上値下がりしたら']},
  delivery:{id:'delivery',label:'配送',phrases:[]},
  unit_price:{id:'unit_price',label:'単価',phrases:[]},
  new_listing:{id:'new_listing',label:'新着',phrases:['新しい候補が見つかったら']},
  seller:{id:'seller',label:'販売店',phrases:[]},
};

const PRESETS={
  brand:['ブランドを指定'], model:['型番を指定'], size:['24.5cm','26.0cm'], color:['グレー','ブラック','ホワイト','ネイビー'], condition:['新品のみ'],
  capacity:['500L以上','400L以上'], total_capacity:['500L以上'], installation_width:['幅70cm以下'], width:['幅70cm以下','幅180cm以下'], height:['高さ180cm以下'], depth:['奥行70cm以下'],
  weight:['1kg以下'], material:['木製'], release_year:['2026年以降'], warranty:['保証あり'], energy_consumption:['省エネ'], freezer_capacity:['冷凍室100L以上'],
  quantity:['10個以上'], origin_country:['国産'], expiration_date:['賞味期限30日以上'], storage_method:['常温'], allergens:['アレルゲンなし'],
  manufacturer:['メーカーを指定'], trim:['グレードを指定'], model_year:['2027年式以降'], mileage:['3万km以下'], repair_history:['修復歴なし'], fuel_type:['ハイブリッド'], drivetrain:['4WD'],
  seat_count:['4人用'], load_capacity:['耐荷重100kg以上'], assembly_required:['組立不要'], seller:['販売店を指定'],
};

function item(id){
  if(id==='price')return {id,label:'価格'};
  const def=getAttributeDefinition(id);
  return def?{id,label:def.label}:null;
}

export function attributePresetPhrases(attributeId){return [...(PRESETS[attributeId]||[])]}

export function buildComposerModel(subject=''){
  const inferred=inferProductCategory(subject);
  const template=getCategoryTemplate(inferred.categoryId);
  const defaults=[...(template?.defaultAttributes||[])];
  const recommended=[...(template?.recommendedAttributes||[])];
  const subcategoryExtras={
    refrigerator:['total_capacity','installation_width','freezer_capacity','energy_consumption'],
    shoes:['size','weight','material'],
    sofa:['seat_count','load_capacity','assembly_required'],
    coffee:['expiration_date','storage_method','allergens'],
    car:['fuel_type','drivetrain','warranty'],
  }[inferred.subcategoryId]||[];
  const common=[...new Set(COMMON_IDS.filter((id)=>id==='price'||defaults.includes(id)))].map(item).filter(Boolean);
  const commonIds=new Set(common.map((entry)=>entry.id));
  const categoryIds=[...new Set([...defaults,...subcategoryExtras,...recommended])]
    .filter((id)=>id!=='price'&&!commonIds.has(id));
  const category=categoryIds.map(item).filter(Boolean).slice(0,10);

  const shown=new Set([...common,...category].map((x)=>x.id));
  const advanced=[...categoryIds.slice(10),...(template?.advancedAttributes||[]),'seller','release_year','warranty','material']
    .filter((id,index,array)=>array.indexOf(id)===index&&!shown.has(id))
    .map(item).filter(Boolean);
  if(!advanced.length)advanced.push({id:'custom',label:'その他の属性'});

  const triggers=[...new Set(template?.supportedTriggers||['price','availability'])]
    .map((id)=>TRIGGER_PRESETS[id]).filter(Boolean);
  if(!triggers.some((x)=>x.id==='price'))triggers.unshift(TRIGGER_PRESETS.price);

  return {...inferred,common,category,advanced,triggers};
}

export function composerOptionsFor(subject='',group='common'){
  const model=buildComposerModel(subject);
  const entries=group==='category'?model.category:group==='advanced'?model.advanced:model.common;
  return entries.map((entry)=>({...entry,phrases:attributePresetPhrases(entry.id)}));
}
