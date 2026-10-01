const WINDOW_MS = 5 * 60 * 1000;
const COOLDOWN_MS = 30 * 60 * 1000;

function eventTime(event) {
  const value = Date.parse(event?.timestamp || '');
  return Number.isFinite(value) ? value : NaN;
}

function inWindow(events, now) {
  const start = now - WINDOW_MS;
  return events.filter((event) => {
    const at = eventTime(event);
    return Number.isFinite(at) && at >= start && at <= now;
  });
}

function apiAlert(windowEvents, statusCode, incidentKey, mode) {
  const apiEvents = windowEvents.filter((event) => event.kind === 'api' && Number.isInteger(event.statusCode));
  if (!apiEvents.length) return null;
  const matches = apiEvents.filter((event) => statusCode(event.statusCode));
  const ratio = matches.length / apiEvents.length;
  const triggered = mode === '5xx'
    ? matches.length >= 5 && ratio >= 0.05
    : matches.length >= 5 || ratio >= 0.10;
  return triggered ? { incidentKey, severity: 'CRITICAL', count: matches.length, ratio } : null;
}

function providerAlerts(windowEvents) {
  const grouped = new Map();
  for (const event of windowEvents) {
    if (event.kind !== 'provider' || !event.provider) continue;
    const list = grouped.get(event.provider) || [];
    list.push(event);
    grouped.set(event.provider, list);
  }

  const alerts = [];
  for (const [provider, events] of grouped) {
    events.sort((a, b) => eventTime(a) - eventTime(b));
    let consecutive = 0;
    for (const event of events) {
      if (event.outcome === 'error' || event.outcome === 'rate_limited') consecutive += 1;
      else if (event.outcome === 'success') consecutive = 0;
    }
    if (consecutive >= 5) alerts.push({ incidentKey: `provider:${provider}`, severity: 'CRITICAL', consecutiveFailures: consecutive });
    else if (consecutive >= 3) alerts.push({ incidentKey: `provider:${provider}`, severity: 'WARN', consecutiveFailures: consecutive });
  }
  return alerts;
}

export function createAlertEvaluator({ now = Date.now, cooldownMs = COOLDOWN_MS } = {}) {
  const lastEmitted = new Map();

  return {
    evaluate(events = []) {
      const current = now();
      const windowEvents = inWindow(events, current);
      const candidates = [
        apiAlert(windowEvents, (status) => status >= 500 && status <= 599, 'api:5xx', '5xx'),
        apiAlert(windowEvents, (status) => status === 429, 'api:429', '429'),
        ...providerAlerts(windowEvents),
      ].filter(Boolean);

      return candidates.filter((alert) => {
        const last = lastEmitted.get(alert.incidentKey);
        if (last !== undefined && current - last < cooldownMs) return false;
        lastEmitted.set(alert.incidentKey, current);
        return true;
      });
    },
  };
}
