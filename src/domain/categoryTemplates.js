const TEMPLATES={
  fashion:{categoryId:'fashion',displayName:'ファッション',defaultAttributes:['brand','model','size','color','condition'],recommendedAttributes:['material','release_year'],advancedAttributes:['seller'],supportedTriggers:['price','availability','coupon','sale']},
  appliances:{categoryId:'appliances',displayName:'家電',defaultAttributes:['brand','model','capacity','width','price'],recommendedAttributes:['height','depth','color','release_year','warranty','energy_consumption'],advancedAttributes:['seller'],supportedTriggers:['price','availability','shipping','coupon','release']},
  furniture:{categoryId:'furniture',displayName:'家具',defaultAttributes:['width','height','depth','color','material','price'],recommendedAttributes:['load_capacity','seat_count','assembly_required'],advancedAttributes:['seller'],supportedTriggers:['price','availability','shipping','delivery']},
  food:{categoryId:'food',displayName:'食品',defaultAttributes:['quantity','weight','origin_country','price'],recommendedAttributes:['expiration_date','storage_method','allergens'],advancedAttributes:['seller'],supportedTriggers:['price','shipping','coupon','unit_price']},
  used_car:{categoryId:'used_car',displayName:'中古車',defaultAttributes:['manufacturer','model','trim','model_year','mileage','color','repair_history','price'],recommendedAttributes:['fuel_type','drivetrain','warranty'],advancedAttributes:['seller'],supportedTriggers:['price','new_listing','seller']},
};

const SUBCATEGORY_EXTRAS={
  refrigerator:['total_capacity','freezer_capacity','installation_width','energy_consumption'],
  shoes:['size','weight','material'],
  shirt:['size','material'],
  sofa:['seat_count','load_capacity','assembly_required'],
  coffee:['quantity','weight','origin_country','expiration_date'],
  car:['manufacturer','model','trim','model_year','mileage','repair_history'],
};

export function getCategoryTemplate(categoryId){
  const template=TEMPLATES[categoryId];
  return template?structuredClone(template):null;
}

export function inferProductCategory(text=''){
  const raw=String(text);
  if(/冷蔵庫|洗濯機|エアコン|テレビ|電子レンジ|掃除機/.test(raw)) return {categoryId:'appliances',subcategoryId:/冷蔵庫/.test(raw)?'refrigerator':undefined};
  if(/ソファ|テーブル|椅子|チェア|ベッド|棚|家具/.test(raw)) return {categoryId:'furniture',subcategoryId:/ソファ/.test(raw)?'sofa':undefined};
  if(/コーヒー豆|食品|米|肉|魚|お菓子|飲料|ワイン/.test(raw)) return {categoryId:'food',subcategoryId:/コーヒー/.test(raw)?'coffee':undefined};
  if(/中古車|ヴェゼル|VEZEL|プリウス|自動車|車両/.test(raw)) return {categoryId:'used_car',subcategoryId:'car'};
  if(/スニーカー|シューズ|靴|シャツ|ジャケット|パンツ|服|New Balance|ニューバランス/.test(raw)) return {categoryId:'fashion',subcategoryId:/スニーカー|シューズ|靴|New Balance|ニューバランス/.test(raw)?'shoes':/シャツ/.test(raw)?'shirt':undefined};
  return {categoryId:'fashion',subcategoryId:undefined};
}

export function suggestedAttributesForCategory(categoryId,subcategoryId){
  const template=TEMPLATES[categoryId];
  if(!template)return [];
  return [...new Set([...(template.defaultAttributes||[]),...(template.recommendedAttributes||[]),...(subcategoryId?SUBCATEGORY_EXTRAS[subcategoryId]||[]:[])])];
}

export function triggerFamiliesForCategory(categoryId){
  return [...(TEMPLATES[categoryId]?.supportedTriggers||[])];
}
