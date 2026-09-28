function valueOf(watch,key){const c=watch?.conditions||{};return c[key]!==undefined?c[key]:c.attributes?.[key]}

export function estimateStrictness(watch){
  const required=(watch?.requiredKeys||[]).length;
  const preferred=(watch?.preferredKeys||[]).length;
  let score=required*2+preferred*.5;
  if(valueOf(watch,'size'))score+=.5;
  if(valueOf(watch,'excludeUsed'))score+=.5;
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
  const required=watch.requiredKeys||[];
  const maxPrice=valueOf(watch,'maxPrice');
  const candidatePrices=candidates.map(c=>c.price).filter(Number.isFinite);
  if(Number.isFinite(maxPrice)&&candidatePrices.length){
    const nearest=Math.min(...candidatePrices.filter(p=>p>maxPrice));
    if(Number.isFinite(nearest)&&nearest<=maxPrice*1.2){
      suggestions.push({kind:'raise_max_price',key:'maxPrice',currentValue:maxPrice,suggestedValue:roundUp500(nearest),label:`上限を${roundUp500(nearest).toLocaleString('ja-JP')}円に広げる`});
    }
  }
  for(const key of required){
    if(['origin','destination','directOnly','maxPrice'].includes(key))continue;
    if(candidates.some(c=>c.evaluation?.failedRequired?.includes(key))){
      suggestions.push({kind:'required_to_preferred',key,label:`${key}を必須から希望にする`});
    }
  }
  return suggestions.slice(0,3);
}
