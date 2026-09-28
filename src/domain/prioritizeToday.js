const EVENT_PRIORITY={target_price_reached:0,watch_low:1,percent_drop:2,restock:3,initial_price_drop:4,price_drop:5,condition_match:6,new_result:7};

function targetPrice(watch){
  const c=watch?.conditions||{};
  if(Number.isFinite(c.maxPrice))return c.maxPrice;
  const trigger=(c.priceTriggers||[]).find(t=>t?.type==='below_absolute'&&Number.isFinite(t.value));
  return trigger?.value;
}

export function prioritizeToday(watches=[],resultsByWatch={},history={}){
  const active=watches.filter(w=>w.status!=='stopped');
  const importantChanges=[];
  const nearTargets=[];
  const matches=[];
  const stagnant=[];
  for(const watch of active){
    const result=resultsByWatch[watch.id];
    const events=history?.[watch.id]?.events||[];
    for(const event of events){
      if(EVENT_PRIORITY[event.kind]!==undefined&&EVENT_PRIORITY[event.kind]<=5)importantChanges.push({watch,event});
    }
    const target=targetPrice(watch);
    for(const candidate of result?.candidates||[]){
      if(candidate.evaluation?.requiredMatch){matches.push({watch,candidate});continue}
      if(Number.isFinite(target)&&Number.isFinite(candidate.price)&&candidate.price>target){
        const distance=candidate.price-target;
        if(distance<=Math.max(2000,target*.1))nearTargets.push({watch,candidate,target,distance});
      }
    }
    if(!result||(!(result.candidates||[]).some(c=>c.evaluation?.requiredMatch)&&events.length===0))stagnant.push({watch});
  }
  importantChanges.sort((a,b)=>(EVENT_PRIORITY[a.event.kind]??99)-(EVENT_PRIORITY[b.event.kind]??99));
  nearTargets.sort((a,b)=>a.distance-b.distance);
  matches.sort((a,b)=>(b.candidate.evaluation?.score||0)-(a.candidate.evaluation?.score||0)||(a.candidate.price??Infinity)-(b.candidate.price??Infinity));
  return{importantChanges,nearTargets,matches,stagnant,relaxations:[]};
}
