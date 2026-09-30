import { getDomainSchema, inferWatchDomain } from './domainSchemas.js';

const LEGACY_FIELDS={
  fashion:{defaultAttributes:['brand','model','size','color','condition'],recommendedAttributes:['material','release_year'],advancedAttributes:['seller'],supportedTriggers:['price','availability','coupon','sale']},
  appliances:{defaultAttributes:['brand','model','capacity','width','price'],recommendedAttributes:['height','depth','color','release_year','warranty','energy_consumption'],advancedAttributes:['seller'],supportedTriggers:['price','availability','shipping','coupon','release']},
  furniture:{defaultAttributes:['width','height','depth','color','material','price'],recommendedAttributes:['load_capacity','seat_count','assembly_required'],advancedAttributes:['seller'],supportedTriggers:['price','availability','shipping','delivery']},
  food:{defaultAttributes:['quantity','weight','origin_country','price'],recommendedAttributes:['expiration_date','storage_method','allergens'],advancedAttributes:['seller'],supportedTriggers:['price','shipping','coupon','unit_price']},
  used_car:{defaultAttributes:['manufacturer','model','trim','model_year','mileage','color','repair_history','price'],recommendedAttributes:['fuel_type','drivetrain','warranty'],advancedAttributes:['seller'],supportedTriggers:['price','new_listing','seller']},
};

const SUBCATEGORY_EXTRAS={
  refrigerator:['total_capacity','freezer_capacity','installation_width','energy_consumption'],
  shoes:['size','weight','material'], shirt:['size','material'], sofa:['seat_count','load_capacity','assembly_required'],
  coffee:['quantity','weight','origin_country','expiration_date'], car:['manufacturer','model','trim','model_year','mileage','repair_history'],
};

export function getCategoryTemplate(categoryId){
  const legacy=LEGACY_FIELDS[categoryId];
  if(!legacy)return null;
  const domainId=categoryId==='appliances'?'appliance':categoryId;
  const schema=getDomainSchema(domainId);
  return {categoryId,displayName:schema?.displayName||categoryId,...structuredClone(legacy)};
}

export function inferProductCategory(text=''){
  const raw=String(text);
  const inferred=inferWatchDomain(raw);
  if(inferred.domain==='appliance') return {categoryId:'appliances',subcategoryId:inferred.subcategoryId};
  if(inferred.domain==='furniture') return {categoryId:'furniture',subcategoryId:/ソファ/.test(raw)?'sofa':undefined};
  if(inferred.domain==='food') return {categoryId:'food',subcategoryId:/コーヒー/.test(raw)?'coffee':undefined};
  if(inferred.domain==='used_car') return {categoryId:'used_car',subcategoryId:'car'};
  if(inferred.domain==='fashion') return {categoryId:'fashion',subcategoryId:/スニーカー|シューズ|靴|New Balance|ニューバランス/.test(raw)?'shoes':/シャツ/.test(raw)?'shirt':undefined};
  return {categoryId:'fashion',subcategoryId:undefined};
}

export function suggestedAttributesForCategory(categoryId,subcategoryId){
  const template=getCategoryTemplate(categoryId);
  if(!template)return [];
  return [...new Set([...(template.defaultAttributes||[]),...(template.recommendedAttributes||[]),...(subcategoryId?SUBCATEGORY_EXTRAS[subcategoryId]||[]:[])])];
}

export function triggerFamiliesForCategory(categoryId){
  return [...(getCategoryTemplate(categoryId)?.supportedTriggers||[])];
}
