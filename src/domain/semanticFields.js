const BINDINGS={
  size:{
    fashion:'size',baby:'size',sports:'size',electronics:'size',daily_goods:'size',beauty:'size',pet:'size',hobby:'size',
  },
  capacity:{
    'appliance:refrigerator':'totalCapacity',food:'volume',
  },
  weight:{
    furniture:'weight',food:'weight',baby:'weight',sports:'weight',electronics:'weight',daily_goods:'weight',beauty:'weight',pet:'weight',hobby:'weight',
  },
};

export function resolveSemanticField({conceptId,domain,subcategoryId}={}){
  const binding=BINDINGS[conceptId];
  if(!binding||!domain)return null;
  if(subcategoryId&&binding[`${domain}:${subcategoryId}`])return binding[`${domain}:${subcategoryId}`];
  return binding[domain]||null;
}

export function listSemanticBindings(conceptId){
  const binding=BINDINGS[conceptId];
  return binding?structuredClone(binding):{};
}
