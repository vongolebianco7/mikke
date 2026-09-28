export function safeOutboundUrl(value) {
  if (typeof value !== 'string' || !value.trim() || value.startsWith('//')) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.href;
  } catch {
    return null;
  }
}
