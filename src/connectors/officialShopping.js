export async function searchOfficialShopping(watch, fetchImpl = fetch, endpoint = '/api/shopping-search') {
  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        watch: {
          type: watch.type,
          title: watch.title,
          rawQuery: watch.rawQuery,
          conditions: watch.conditions || {},
        },
      }),
    });
    if (!response.ok) return { mode: 'unavailable', items: [], providers: [] };
    const payload = await response.json();
    const providers = Array.isArray(payload.providers) ? payload.providers : [];
    const hasConfiguredProvider = providers.some((provider) => provider.status === 'ok');
    return {
      mode: hasConfiguredProvider ? 'official' : 'unavailable',
      items: Array.isArray(payload.items) ? payload.items : [],
      providers,
      attribution: payload.attribution || {},
    };
  } catch {
    return { mode: 'unavailable', items: [], providers: [] };
  }
}
