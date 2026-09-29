function known(fact){return fact?.state==='known'}
function same(a,b){return typeof a==='string'&&typeof b==='string'?a.toLowerCase()===b.toLowerCase():Object.is(a,b)}
function numberOf(fact){return known(fact)&&Number.isFinite(Number(fact.value))?Number(fact.value):null}
function percentDrop(reference,current){return reference>0&&current<reference?Math.round(((reference-current)/reference)*100):0}

function event(kind,trigger,currentValue,extra={}){
  return {kind,metric:trigger.metric,currentValue,trigger:{...trigger},...extra};
}

export function evaluateTrigger(trigger={},currentFacts={},previousFacts={},historyContext={}){
  const current=currentFacts[trigger.metric];
  const previous=previousFacts?.[trigger.metric];

  if(trigger.metric==='discount_percent'){
    const currentPrice=numberOf(currentFacts.price);
    let referencePrice=null;
    if(trigger.reference==='initial_observation') referencePrice=Number.isFinite(historyContext.initialPrice)?historyContext.initialPrice:null;
    else referencePrice=numberOf(previousFacts?.price);
    if(currentPrice===null||referencePrice===null)return null;
    const pct=percentDrop(referencePrice,currentPrice);
    if(trigger.operator==='gte'&&pct>=Number(trigger.value||0)&&pct>0) return event('percent_drop',trigger,pct,{percent:pct,referencePrice,currentPrice});
    return null;
  }

  if(trigger.reference==='watch_low'){
    const value=numberOf(currentFacts.price);
    if(value===null||!Number.isFinite(historyContext.observedLow))return null;
    if(trigger.operator==='lt'&&value<historyContext.observedLow) return event('watch_low',trigger,value,{previousLow:historyContext.observedLow,currentPrice:value});
    return null;
  }

  if(trigger.reference==='initial_observation'&&trigger.metric==='price'){
    const value=numberOf(currentFacts.price);
    if(value===null||!Number.isFinite(historyContext.initialPrice))return null;
    if(trigger.operator==='lt'&&value<historyContext.initialPrice) return event('initial_price_drop',trigger,value,{referencePrice:historyContext.initialPrice,currentPrice:value});
    return null;
  }

  if(trigger.reference==='previous_observation'){
    if(!known(current)||!known(previous))return null;
    if(trigger.operator==='changed_to'){
      if(same(current.value,trigger.value)&&!same(previous.value,trigger.value)){
        if(trigger.metric==='availability'&&trigger.value==='in_stock')return event('restock',trigger,current.value);
        if(trigger.metric==='release_status'&&trigger.value==='released')return event('released',trigger,current.value);
        if(trigger.metric==='release_status'&&trigger.value==='preorder_open')return event('preorder_open',trigger,current.value);
        if(trigger.metric==='preorder_status'&&trigger.value==='open')return event('preorder_open',trigger,current.value);
        if(trigger.metric==='coupon_available'&&trigger.value===true)return event('coupon_available',trigger,current.value);
        return event(`${trigger.metric}_changed`,trigger,current.value,{previousValue:previous.value});
      }
      return null;
    }
    if(trigger.metric==='price'&&trigger.operator==='lt'){
      const currentPrice=numberOf(current), previousPrice=numberOf(previous);
      if(currentPrice===null||previousPrice===null||currentPrice>=previousPrice)return null;
      return event('price_drop',trigger,currentPrice,{delta:previousPrice-currentPrice,previousPrice,currentPrice});
    }
  }

  if(!known(current))return null;

  if(trigger.metric==='coupon_discount_percent'||trigger.metric==='coupon_discount_amount'){
    if(!known(currentFacts.coupon_eligibility)||currentFacts.coupon_eligibility.value!=='eligible')return null;
    const value=Number(current.value);
    if(trigger.operator==='gte'&&Number.isFinite(value)&&value>=Number(trigger.value))return event('coupon_discount',trigger,value);
    return null;
  }

  if(trigger.operator==='changed_to'){
    if(!known(previous)||same(previous.value,trigger.value))return null;
    if(same(current.value,trigger.value)){
      if(trigger.metric==='coupon_available'&&trigger.value===true)return event('coupon_available',trigger,current.value);
      if(trigger.metric==='release_status'&&trigger.value==='released')return event('released',trigger,current.value);
      if(trigger.metric==='preorder_status'&&trigger.value==='open')return event('preorder_open',trigger,current.value);
      if(trigger.metric==='availability'&&trigger.value==='in_stock')return event('restock',trigger,current.value);
      return event(`${trigger.metric}_changed`,trigger,current.value,{previousValue:previous.value});
    }
    return null;
  }

  const value=Number(current.value);
  const target=Number(trigger.value);
  if(!Number.isFinite(value)||!Number.isFinite(target))return null;
  const previousValue=numberOf(previous);
  const crossed=previousValue===null||(
    trigger.operator==='lte'?previousValue>target:
    trigger.operator==='lt'?previousValue>=target:
    trigger.operator==='gte'?previousValue<target:
    trigger.operator==='gt'?previousValue<=target:
    trigger.operator==='eq'?previousValue!==target:false
  );
  const pass=trigger.operator==='lte'?value<=target:
    trigger.operator==='lt'?value<target:
    trigger.operator==='gte'?value>=target:
    trigger.operator==='gt'?value>target:
    trigger.operator==='eq'?value===target:false;
  if(!pass||!crossed)return null;
  if(trigger.metric==='price'&&trigger.operator==='lte')return event('target_price_reached',trigger,value,{targetPrice:target,currentPrice:value});
  if(trigger.metric==='shipping_fee'&&trigger.operator==='eq'&&target===0)return event('free_shipping',trigger,value);
  return event(`${trigger.metric}_threshold`,trigger,value,{targetValue:target});
}

export function evaluateTriggers(triggers=[],currentFacts={},previousFacts={},historyContext={}){
  return triggers.map((trigger)=>evaluateTrigger(trigger,currentFacts,previousFacts,historyContext)).filter(Boolean);
}
