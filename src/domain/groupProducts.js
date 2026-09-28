const STRONG_KEYS=['jan','ean','upc','modelNumber','sku'];

function identityOf(candidate){
  const attrs=candidate?.attributes||{};
  for(const key of STRONG_KEYS){
    const raw=attrs[key];
    if(typeof raw==='string'&&raw.trim())return{kind:key,value:raw.trim().toLowerCase()};
    if(Number.isFinite(raw))return{kind:key,value:String(raw)};
  }
  return null;
}

export function groupProducts(candidates=[]){
  const groups=[];
  const index=new Map();
  for(const candidate of candidates){
    const identity=identityOf(candidate);
    const groupKey=identity?`${identity.kind}:${identity.value}`:`unique:${candidate.id}`;
    let group=index.get(groupKey);
    if(!group){
      group={identity,representative:candidate,offers:[]};
      index.set(groupKey,group);groups.push(group);
    }
    group.offers.push(candidate);
    group.offers.sort((a,b)=>(a.price??Infinity)-(b.price??Infinity));
    group.representative=group.offers[0];
  }
  return groups;
}
