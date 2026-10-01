const KEY='mikke.history.v1';

export function loadHistory(storage){
  try{
    const raw=storage.getItem(KEY);
    if(!raw)return {};
    const parsed=JSON.parse(raw);
    return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{};
  }catch{return {}}
}

export function saveHistory(storage,history){
  try{
    storage.setItem(KEY,JSON.stringify(history));
    return {ok:true};
  }catch{
    return {ok:false,reason:'storage_unavailable'};
  }
}

function nextHistory(storage,watchId,result){
  const history=loadHistory(storage);
  const current=history[watchId]||{observations:[],events:[]};
  const observations=result.candidates.map((c)=>c.observation).filter(Boolean);
  history[watchId]={
    observations:[...current.observations,...observations].slice(-100),
    events:[...current.events,...(result.events||[])].slice(-100),
  };
  return history;
}

export function tryAppendCheckHistory(storage,watchId,result){
  const history=nextHistory(storage,watchId,result);
  const saved=saveHistory(storage,history);
  return saved.ok?{ok:true,history}:{ok:false,reason:saved.reason,history};
}

export function appendCheckHistory(storage,watchId,result){
  return tryAppendCheckHistory(storage,watchId,result).history;
}

export function previousByCandidate(history,watchId){
  const observations=history[watchId]?.observations||[];
  return observations.reduce((map,obs)=>({...map,[obs.candidateId]:obs}),{});
}

export function priceContextByCandidate(history,watchId){
  const observations=history[watchId]?.observations||[];
  const grouped=new Map();
  for(const observation of observations){
    if(!observation?.candidateId)continue;
    const list=grouped.get(observation.candidateId)||[];
    list.push(observation);
    grouped.set(observation.candidateId,list);
  }
  const result={};
  for(const [candidateId,list] of grouped){
    const numericPrices=list.map((item)=>item.price).filter(Number.isFinite);
    result[candidateId]={
      previous:list[list.length-1],
      initialPrice:numericPrices.length?numericPrices[0]:undefined,
      observedLow:numericPrices.length?Math.min(...numericPrices):undefined,
      observationCount:list.length,
    };
  }
  return result;
}
