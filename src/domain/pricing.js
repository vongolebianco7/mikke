export function displayPriceModel(candidate = {}) {
  const currentPrice = Number.isFinite(candidate.price) ? candidate.price : null;
  const sampleReferenceAllowed = candidate.dataMode === 'sample' && candidate.referencePriceDefined === true && Number.isFinite(candidate.previousPrice) && Number.isFinite(candidate.price) && candidate.previousPrice > candidate.price;
  const referencePrice = sampleReferenceAllowed ? candidate.previousPrice : null;
  const percentOff = sampleReferenceAllowed ? Math.round((1 - candidate.price / candidate.previousPrice) * 100) : null;
  return {
    currentPrice,
    referencePrice,
    percentOff,
    note: '最終価格・在庫は販売ページで確認してください',
  };
}
