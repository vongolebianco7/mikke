export function factKnown(value, meta = {}) {
  return { state: 'known', value, meta: { ...meta } };
}

export function factUnknown(meta = {}) {
  return { state: 'unknown', value: undefined, meta: { ...meta } };
}

export function factUnsupported(meta = {}) {
  return { state: 'unsupported', value: undefined, meta: { ...meta } };
}

function asFact(value, meta = {}) {
  if (value && typeof value === 'object' && ['known','unknown','unsupported'].includes(value.state)) return value;
  return value === undefined || value === null ? factUnknown(meta) : factKnown(value, meta);
}

export function factsFromCandidate(candidate = {}) {
  const source = candidate.source || candidate.provider || candidate.shopName;
  const baseMeta = source ? { source } : {};
  const facts = {};

  if (candidate.facts && typeof candidate.facts === 'object') {
    for (const [key, value] of Object.entries(candidate.facts)) facts[key] = asFact(value, baseMeta);
  }

  const direct = {
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
  for (const [key, value] of Object.entries(direct)) {
    if (facts[key] === undefined) facts[key] = asFact(value, baseMeta);
  }

  const attrs = candidate.attributes && typeof candidate.attributes === 'object' ? candidate.attributes : {};
  for (const [key, value] of Object.entries(attrs)) {
    const normalizedKey = key === 'colors' ? 'color' : key === 'sizes' ? 'size' : key;
    if (facts[normalizedKey] === undefined) facts[normalizedKey] = asFact(value, baseMeta);
  }

  return facts;
}
