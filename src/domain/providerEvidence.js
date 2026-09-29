import { factKnown, factUnknown, factUnsupported } from './candidateFacts.js';

const TRACKED_FIELDS = [
  'price','availability','title','shipping_fee','coupon_available','coupon_discount_amount','coupon_discount_percent','coupon_eligibility',
  'release_status','preorder_status','point_value','quantity',
];

function candidateValue(candidate, field) {
  const mapping = {
    price: candidate.price,
    availability: candidate.available === true ? 'in_stock' : candidate.available === false ? 'out_of_stock' : undefined,
    title: candidate.title,
    shipping_fee: candidate.shippingFee,
    coupon_available: candidate.couponAvailable,
    coupon_discount_amount: candidate.couponDiscountAmount,
    coupon_discount_percent: candidate.couponDiscountPercent,
    coupon_eligibility: candidate.couponEligibility,
    release_status: candidate.releaseStatus,
    preorder_status: candidate.preorderStatus,
    point_value: candidate.pointValue,
    quantity: candidate.quantity,
  };
  return mapping[field];
}

function missingInference(value) {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
}

export function attachProviderEvidence(candidate = {}, options = {}) {
  const provider = options.provider || candidate.provider || candidate.source || 'unknown';
  const supported = new Set(options.supportedFields || []);
  const inferred = new Set(options.inferredAttributes || []);
  const unknownAttributes = new Set(options.unknownAttributes || []);
  const facts = { ...(candidate.facts && typeof candidate.facts === 'object' ? candidate.facts : {}) };

  for (const field of TRACKED_FIELDS) {
    if (facts[field]) continue;
    if (!supported.has(field)) {
      facts[field] = factUnsupported({ provider });
      continue;
    }
    const value = candidateValue(candidate, field);
    facts[field] = value === undefined || value === null
      ? factUnknown({ provider })
      : factKnown(value, { provider, confidence: 'provider' });
  }

  const attrs = candidate.attributes && typeof candidate.attributes === 'object' ? candidate.attributes : {};
  for (const [key, value] of Object.entries(attrs)) {
    const attributeId = key === 'colors' ? 'color' : key === 'sizes' ? 'size' : key;
    if (facts[attributeId]) continue;
    const confidence = inferred.has(attributeId) ? 'inferred' : 'provider';
    facts[attributeId] = unknownAttributes.has(attributeId) || (inferred.has(attributeId) && missingInference(value))
      ? factUnknown({ provider, confidence })
      : factKnown(value, { provider, confidence });
  }

  return { ...candidate, facts };
}
