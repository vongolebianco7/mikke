const KEY='mikke.decisions.v1';

export function loadDecisions(storage){
  try{
    const raw=storage.getItem(KEY);
    if(!raw)return{};
    const parsed=JSON.parse(raw);
    return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{};
  }catch{return{}}
}

export function saveDecisions(storage,decisions){
  try{
    storage.setItem(KEY,JSON.stringify(decisions));
    return {ok:true};
  }catch{
    return {ok:false,reason:'storage_unavailable'};
  }
}

function nextDecisionState(storage,watchId,decision){
  const state=loadDecisions(storage);
  const current=Array.isArray(state[watchId])?state[watchId]:[];
  state[watchId]=[...current,{...decision}].slice(-100);
  return state;
}

export function tryRecordDecision(storage,watchId,decision){
  const state=nextDecisionState(storage,watchId,decision);
  const saved=saveDecisions(storage,state);
  return saved.ok?{ok:true,state}:{ok:false,reason:saved.reason,state};
}

export function recordDecision(storage,watchId,decision){
  return tryRecordDecision(storage,watchId,decision).state;
}
