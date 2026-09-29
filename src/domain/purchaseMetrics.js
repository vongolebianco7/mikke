import { factKnown, factUnknown } from './candidateFacts.js';

function known(fact){return fact?.state==='known'}

export function derivePurchaseMetrics(facts={}){
  const out={};
  if(known(facts.price)&&known(facts.shipping_fee)){
    out.landed_price=factKnown(facts.price.value+facts.shipping_fee.value,{dependsOn:['price','shipping_fee'],provenance:'derived'});
  }else out.landed_price=factUnknown({dependsOn:['price','shipping_fee'],provenance:'derived'});

  if(known(out.landed_price)&&known(facts.coupon_discount_amount)&&known(facts.coupon_eligibility)&&facts.coupon_eligibility.value==='eligible'){
    out.coupon_adjusted_price=factKnown(Math.max(0,out.landed_price.value-facts.coupon_discount_amount.value),{dependsOn:['landed_price','coupon_discount_amount','coupon_eligibility'],provenance:'derived'});
  }else if(known(out.landed_price)&&(!facts.coupon_discount_amount||facts.coupon_discount_amount.state==='unknown')){
    out.coupon_adjusted_price=out.landed_price;
  }else out.coupon_adjusted_price=factUnknown({dependsOn:['landed_price','coupon_discount_amount','coupon_eligibility'],provenance:'derived'});

  const baseForPoints=known(out.coupon_adjusted_price)?out.coupon_adjusted_price:out.landed_price;
  if(known(baseForPoints)&&known(facts.point_value)){
    out.effective_price_after_points=factKnown(Math.max(0,baseForPoints.value-facts.point_value.value),{dependsOn:['coupon_adjusted_price','point_value'],provenance:'derived',cashEquivalent:false});
  }else out.effective_price_after_points=factUnknown({dependsOn:['coupon_adjusted_price','point_value'],provenance:'derived',cashEquivalent:false});

  if(known(out.landed_price)&&known(facts.normalized_quantity)&&Number(facts.normalized_quantity.value)>0){
    out.unit_price=factKnown(out.landed_price.value/Number(facts.normalized_quantity.value),{dependsOn:['landed_price','normalized_quantity'],provenance:'derived'});
  }else out.unit_price=factUnknown({dependsOn:['landed_price','normalized_quantity'],provenance:'derived'});

  return out;
}
