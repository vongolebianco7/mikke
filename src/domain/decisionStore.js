const KEY='mikke.decisions.v1';

export function loadDecisions(storage){
  try{
    const raw=storage.getItem(KEY);
    if(!raw)return{};
    const parsed=JSON.parse(raw);
    return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{};
  }catch{return{}}
}

export function saveDecisions(storage,decisions){storage.setItem(KEY,JSON.stringify(decisions))}

export function recordDecision(storage,watchId,decision){
  const state=loadDecisions(storage);
  const current=Array.isArray(state[watchId])?state[watchId]:[];
  state[watchId]=[...current,{...decision}].slice(-100);
  saveDecisions(storage,state);
  return state;
}
