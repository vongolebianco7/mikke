import { getDomainField } from './domainSchemas.js';

const PRODUCT_DOMAINS=new Set(['fashion','appliance','furniture','food','used_car','baby','sports','electronics','daily_goods','beauty','pet','hobby']);

const SHARED_COMMERCE_FIELDS={
  sellerType:{id:'sellerType',label:'販売者種別',type:'enum',operators:['eq','in'],level:'common',group:'purchase',priority:'medium',supportsRequired:true,supportsPreferred:true},
  shippingFee:{id:'shippingFee',label:'送料',type:'money',operators:['lte','eq'],level:'common',group:'purchase',priority:'high',unit:'JPY',supportsRequired:true,supportsPreferred:true},
  deliveryDays:{id:'deliveryDays',label:'配送日数',type:'duration',operators:['lte'],level:'common',group:'purchase',priority:'medium',unit:'day',supportsRequired:true,supportsPreferred:true},
  returnable:{id:'returnable',label:'返品可',type:'boolean',operators:['is_true','is_false'],level:'common',group:'purchase',priority:'medium',supportsRequired:true,supportsPreferred:true},
  returnWindowDays:{id:'returnWindowDays',label:'返品期限',type:'duration',operators:['gte','lte'],level:'detailed',group:'purchase',priority:'low',unit:'day',supportsRequired:true,supportsPreferred:true},
  warrantyMonths:{id:'warrantyMonths',label:'保証月数',type:'integer',operators:['gte','lte'],level:'common',group:'purchase',priority:'medium',unit:'month',supportsRequired:true,supportsPreferred:true},
  subscriptionRequired:{id:'subscriptionRequired',label:'定期購入必須',type:'boolean',operators:['is_true','is_false'],level:'detailed',group:'purchase',priority:'low',supportsRequired:true,supportsPreferred:true},
  minimumOrderQuantity:{id:'minimumOrderQuantity',label:'最低購入数',type:'integer',operators:['lte','gte','eq'],level:'detailed',group:'purchase',priority:'low',supportsRequired:true,supportsPreferred:true},
  maximumOrderQuantity:{id:'maximumOrderQuantity',label:'購入上限',type:'integer',operators:['lte','gte','eq'],level:'detailed',group:'purchase',priority:'low',supportsRequired:true,supportsPreferred:true},
};

export function isProductDomain(domain){return PRODUCT_DOMAINS.has(domain)}

export function getSharedCommerceField(fieldId){
  const field=SHARED_COMMERCE_FIELDS[fieldId];
  return field?structuredClone(field):null;
}

export function listSharedCommerceFields(){return Object.values(SHARED_COMMERCE_FIELDS).map((field)=>structuredClone(field))}

export function getProductConditionField(domain,fieldId,subcategoryId){
  if(!isProductDomain(domain)) return null;
  return getDomainField(domain,fieldId,subcategoryId)||getSharedCommerceField(fieldId);
}
