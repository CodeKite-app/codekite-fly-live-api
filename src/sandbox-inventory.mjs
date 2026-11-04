import { appLabel, defaultApiUrl, required } from './daytona.mjs';

/** Direct Daytona REST calls, without the SDK, for the cleanup job. */
async function daytonaRequest(method, path, apiKey) {
  const base = (process.env.DAYTONA_API_URL || defaultApiUrl).replace(/\/$/, '');
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`Daytona API: ${body?.message || `HTTP ${response.status}`}`);
  return body;
}

/** List every sandbox this app created, following the API's cursor pagination. */
export async function listAppSandboxes(apiKey = required('DAYTONA_API_KEY')) {
  const sandboxes = [];
  let cursor;
  do {
    const query = new URLSearchParams({ labels: JSON.stringify(appLabel), limit: '100' });
    if (cursor) query.set('cursor', cursor);
    const page = await daytonaRequest('GET', `/sandbox?${query}`, apiKey);
    for (const item of page.items) {
      sandboxes.push({ id: item.id, name: item.name, state: item.state, labels: item.labels, createdAt: item.createdAt });
    }
    cursor = page.nextCursor;
  } while (cursor);
  return sandboxes;
}

/** Delete app sandboxes older than maxAgeMinutes. Returns the IDs it removed. */
export async function deleteStaleSandboxes({ maxAgeMinutes = 60, apiKey = required('DAYTONA_API_KEY') } = {}) {
  if (!Number.isFinite(maxAgeMinutes) || maxAgeMinutes < 0) throw new Error('maxAgeMinutes must be a non-negative number.');
  const cutoff = Date.now() - maxAgeMinutes * 60_000;
  const removed = [];
  for (const sandbox of await listAppSandboxes(apiKey)) {
    if (sandbox.createdAt && Date.parse(sandbox.createdAt) < cutoff) {
      await daytonaRequest('DELETE', `/sandbox/${encodeURIComponent(sandbox.id)}`, apiKey);
      removed.push(sandbox.id);
    }
  }
  return removed;
}
