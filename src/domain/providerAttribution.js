export function summarizeDataSources(results = []) {
  const providers = results.flatMap((result) => Array.isArray(result.providers) ? result.providers : []);
  return {
    hasDemo: results.some((result) => result.dataMode === 'sample'),
    rakuten: providers.some((provider) => provider.name === 'rakuten' && provider.status !== 'not_configured'),
    yahoo: providers.some((provider) => provider.name === 'yahoo' && provider.status !== 'not_configured'),
  };
}
