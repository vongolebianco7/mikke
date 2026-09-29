import { getDomainField } from './domainSchemas.js';

function valueOf(watch,key){const c=watch?.conditions||{};return c[key]!==undefined?c[key]:c.attributes?.[key]}
function v3Conditions(watch){return Array.isArray(watch?.domainConditions)?watch.domainConditions:[]}
function fieldLabel(watch,key){return getDomainField(watch?.domain,key)?.label||key}

export function estimateStrictness(watch){
  const domainConditions=v3Conditions(watch);
  const required=domainConditions.length?domainConditions.filter((c)=>c.role==='required').length:(watch?.requiredKeys||[]).length;
  const preferred=domainConditions.length?domainConditions.filter((c)=>c.role==='preferred').length:(watch?.preferredKeys||[]).length;
  let score=required*2+preferred*.5;
  if(!domainConditions.length){
    if(valueOf(watch,'size'))score+=.5;
    if(valueOf(watch,'excludeUsed'))score+=.5;
  }
  if(score<2)return{level:'broad',label:'広め',isEstimate:true};
  if(score<4)return{level:'balanced',label:'ちょうどよい',isEstimate:true};
  if(score<7)return{level:'strict',label:'厳しめ',isEstimate:true};
  return{level:'very_strict',label:'かなり厳しい',isEstimate:true};
}

function roundUp500(value){return Math.ceil(value/500)*500}

export function suggestRelaxations(watch,history,latestResult){
  const observations=history?.[watch.id]?.observations||[];
  const candidates=latestResult?.candidates||[];
  if(observations.length<3||candidates.some(c=>c.evaluation?.requiredMatch))return[];
  const suggestions=[];
  const domainConditions=v3Conditions(watch);
  const required=domainConditions.length?domainConditions.filter((c)=>c.role==='required').map((c)=>c.fieldId):(watch.requiredKeys||[]);
  const priceCondition=domainConditions.find((c)=>c.role==='required'&&['price','totalPrice','vehiclePrice'].includes(c.fieldId)&&c.operator==='lte'&&Number.isFinite(c.value));
  const maxPrice=priceCondition?.value??valueOf(watch,'maxPrice');
  const candidatePrices=candidates.map(c=>c.price).filter(Number.isFinite);
  if(Number.isFinite(maxPrice)&&candidatePrices.length){
    const higher=candidatePrices.filter(p=>p>maxPrice);
    const nearest=higher.length?Math.min(...higher):NaN;
    if(Number.isFinite(nearest)&&nearest<=maxPrice*1.2){
      suggestions.push({kind:'raise_max_price',key:priceCondition?.fieldId||'maxPrice',currentValue:maxPrice,suggestedValue:roundUp500(nearest),label:`上限を${roundUp500(nearest).toLocaleString('ja-JP')}円に広げる`});
    }
  }
  for(const key of required){
    if(['origin','destination','directOnly','maxPrice','price','totalPrice','vehiclePrice'].includes(key))continue;
    if(candidates.some(c=>c.evaluation?.failedRequired?.includes(key))){
      suggestions.push({kind:'required_to_preferred',key,label:`${fieldLabel(watch,key)}を必須から希望にする`});
    }
  }
  return suggestions.slice(0,3);
}
