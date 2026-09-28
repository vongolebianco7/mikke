const KEY='mikke.history.v1';

export function loadHistory(storage){
  try{
    const raw=storage.getItem(KEY);
    if(!raw)return {};
    const parsed=JSON.parse(raw);
    return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{};
  }catch{return {}}
}

export function saveHistory(storage,history){storage.setItem(KEY,JSON.stringify(history))}

export function appendCheckHistory(storage,watchId,result){
  const history=loadHistory(storage);
  const current=history[watchId]||{observations:[],events:[]};
  const observations=result.candidates.map((c)=>c.observation).filter(Boolean);
  history[watchId]={
    observations:[...current.observations,...observations].slice(-100),
    events:[...current.events,...(result.events||[])].slice(-100),
  };
  saveHistory(storage,history);
  return history;
}

export function previousByCandidate(history,watchId){
  const observations=history[watchId]?.observations||[];
  return observations.reduce((map,obs)=>({...map,[obs.candidateId]:obs}),{});
}
