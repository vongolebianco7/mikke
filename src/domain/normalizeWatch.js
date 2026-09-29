import {
  genericConditionFromLegacy,
  genericTriggerFromLegacy,
  normalizeDomainCondition,
  normalizeDomainWatch,
} from './watchSchema.js';
import { inferWatchDomain } from './domainSchemas.js';

const LEGACY_ATTRIBUTE_KEYS=['size','colors','excludeUsed','allowDisplay','origin','destination','directOnly','tripType'];
const FIELD_MAP={
  color:'color',size:'size',condition:'condition',price:'price',brand:'brand',model:'model',manufacturer:'manufacturer',trim:'trim',
  installation_width:'installationWidth',freezer_capacity:'freezerCapacity',total_capacity:'totalCapacity',capacity:'totalCapacity',
  release_year:'releaseYear',energy_consumption:'annualEnergyConsumption',origin_country:'originCountry',expiration_date:'expirationDate',storage_method:'storageMethod',
  model_year:'modelYear',repair_history:'repairHistory',fuel_type:'fuelType',seat_count:'seatCount',load_capacity:'loadCapacity',assembly_required:'assemblyRequired',
  origin:'origin',destination:'destination',direct:'nonstopOnly',display_item_allowed:'condition',mileage:'mileage',weight:'weight',width:'width',height:'height',depth:'depth',material:'material',quantity:'quantity',allergens:'allergens',seller:'seller',warranty:'warranty',drivetrain:'drivetrain',
};

function cloneArray(value){return Array.isArray(value)?[...value]:[]}
function legacyRole(key,requiredKeys,preferredKeys){if(requiredKeys.includes(key))return'required';if(preferredKeys.includes(key))return'preferred';return'preferred'}
function inferTarget(watch){
  if(watch.target&&typeof watch.target==='object'&&!Array.isArray(watch.target))return{...watch.target};
  return{categoryId:watch.type==='shopping'?undefined:watch.type,title:watch.title};
}
function domainFor(watch,target){
  if(watch.domain)return watch.domain==='appliances'?'appliance':watch.domain;
  if(watch.type==='flight'||watch.type==='hotel')return watch.type;
  const category=target?.categoryId;
  if(category==='appliances'||category==='appliance')return'appliance';
  if(['fashion','furniture','food','used_car'].includes(category))return category;
  return inferWatchDomain(`${watch.title||''} ${watch.rawQuery||''}`).domain;
}
function canonicalTripType(value){if(value==='roundtrip')return'round_trip';if(value==='oneway')return'one_way';return value}
function canonicalFieldId(attributeId,domain){
  if(attributeId==='price'&&domain==='used_car')return'totalPrice';
  return FIELD_MAP[attributeId]||attributeId;
}
function toDomainCondition(condition,domain){
  if(!condition)return null;
  let fieldId=canonicalFieldId(condition.attributeId,domain);
  let value=condition.value;
  if(fieldId==='tripType')value=canonicalTripType(value);
  if(condition.attributeId==='display_item_allowed'&&value===true){fieldId='condition';value=['display','new'];}
  return normalizeDomainCondition({
    id:condition.id,fieldId,operator:condition.operator,value,unit:condition.unit,role:condition.role,
    evidencePolicy:condition.role==='required'?'known_required':'allow_unknown',
  });
}
function addUniqueCondition(list,item){
  if(!item)return;
  const key=`${item.fieldId}:${item.operator}:${JSON.stringify(item.value)}:${item.role}`;
  if(!list.some((x)=>`${x.fieldId}:${x.operator}:${JSON.stringify(x.value)}:${x.role}`===key))list.push(item);
}

export function normalizeWatch(watch={}){
  const legacyConditions=watch.conditions&&typeof watch.conditions==='object'?watch.conditions:{};
  const existingAttributes=legacyConditions.attributes&&typeof legacyConditions.attributes==='object'?legacyConditions.attributes:{};
  const attributes={...existingAttributes};
  for(const key of LEGACY_ATTRIBUTE_KEYS)if(legacyConditions[key]!==undefined&&attributes[key]===undefined)attributes[key]=legacyConditions[key];

  const requiredKeys=cloneArray(watch.requiredKeys),preferredKeys=cloneArray(watch.preferredKeys);
  const priceTriggers=Array.isArray(legacyConditions.priceTriggers)?[...legacyConditions.priceTriggers]:[];
  const stateTriggers=Array.isArray(legacyConditions.stateTriggers)?[...legacyConditions.stateTriggers]:[];
  if(typeof legacyConditions.maxPrice==='number'&&!priceTriggers.some((t)=>t?.type==='below_absolute'))priceTriggers.push({type:'below_absolute',value:legacyConditions.maxPrice,reference:'explicit',role:requiredKeys.includes('maxPrice')?'required':'notification'});

  const genericConditions=Array.isArray(watch.genericConditions)?[...watch.genericConditions]:[];
  const covered=new Set(genericConditions.map((c)=>c?.attributeId));
  if(typeof legacyConditions.maxPrice==='number'&&requiredKeys.includes('maxPrice')&&!covered.has('price')){
    const c=genericConditionFromLegacy('maxPrice',legacyConditions.maxPrice,'required'); if(c){genericConditions.push(c);covered.add('price')}
  }
  for(const key of ['size','colors','excludeUsed','allowDisplay','origin','destination','directOnly']){
    const value=legacyConditions[key]!==undefined?legacyConditions[key]:attributes[key]; if(value===undefined)continue;
    const normalizedId=key==='colors'?'color':key==='excludeUsed'?'condition':key==='directOnly'?'direct':key;
    if(covered.has(normalizedId))continue;
    const c=genericConditionFromLegacy(key,value,legacyRole(key,requiredKeys,preferredKeys)); if(c){genericConditions.push(c);covered.add(c.attributeId)}
  }

  const triggers=Array.isArray(watch.triggers)?[...watch.triggers]:[];
  for(const legacyTrigger of [...priceTriggers,...stateTriggers]){
    if(legacyTrigger?.type==='below_absolute'&&legacyTrigger.role==='required')continue;
    const t=genericTriggerFromLegacy(legacyTrigger); if(!t)continue;
    if(!triggers.some((x)=>x?.metric===t.metric&&x?.operator===t.operator&&x?.reference===t.reference&&x?.value===t.value))triggers.push(t);
  }

  const target=inferTarget(watch);
  const domain=domainFor(watch,target);
  const domainConditions=Array.isArray(watch.domainConditions)?watch.domainConditions.map(normalizeDomainCondition):[];
  for(const c of genericConditions)addUniqueCondition(domainConditions,toDomainCondition(c,domain));

  if(typeof legacyConditions.maxPrice==='number'&&requiredKeys.includes('maxPrice'))addUniqueCondition(domainConditions,normalizeDomainCondition({fieldId:domain==='used_car'?'totalPrice':'price',operator:'lte',value:legacyConditions.maxPrice,unit:'JPY',role:'required'}));

  if(domain==='flight'){
    const origin=legacyConditions.origin??attributes.origin; if(origin!==undefined)addUniqueCondition(domainConditions,normalizeDomainCondition({fieldId:'origin',operator:'eq',value:origin,role:legacyRole('origin',requiredKeys,preferredKeys)}));
    const destination=legacyConditions.destination??attributes.destination; if(destination!==undefined)addUniqueCondition(domainConditions,normalizeDomainCondition({fieldId:'destination',operator:'eq',value:destination,role:legacyRole('destination',requiredKeys,preferredKeys)}));
    const direct=legacyConditions.directOnly??attributes.directOnly; if(direct===true)addUniqueCondition(domainConditions,normalizeDomainCondition({fieldId:'nonstopOnly',operator:'is_true',value:true,role:legacyRole('directOnly',requiredKeys,preferredKeys)}));
    const tripType=legacyConditions.tripType??attributes.tripType; if(tripType)addUniqueCondition(domainConditions,normalizeDomainCondition({fieldId:'tripType',operator:'eq',value:canonicalTripType(tripType),role:'required'}));
  }

  const compatible={
    ...watch,domain,target,genericConditions,triggers,domainConditions,
    metadata:{rawQuery:watch.metadata?.rawQuery??watch.rawQuery??'',inputMode:watch.metadata?.inputMode,...(watch.metadata&&typeof watch.metadata==='object'?watch.metadata:{})},
    conditions:{...legacyConditions,attributes,priceTriggers,stateTriggers},requiredKeys,preferredKeys,
    baseline:{initialObservedAt:watch.baseline?.initialObservedAt??null,initialPriceByCandidate:watch.baseline?.initialPriceByCandidate&&typeof watch.baseline.initialPriceByCandidate==='object'?{...watch.baseline.initialPriceByCandidate}:{}},
    behavior:{...(watch.behavior&&typeof watch.behavior==='object'?watch.behavior:{}),decisionHistory:Array.isArray(watch.behavior?.decisionHistory)?[...watch.behavior.decisionHistory]:[]},
  };
  return normalizeDomainWatch(compatible);
}
