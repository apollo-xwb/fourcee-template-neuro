/**
 * Loads the injected audit payload. Order is unchanged from the original wiring:
 * `/contents.json` first, then `/content.json` (the file n8n pushes).
 *
 * Hosts with an SPA fallback answer `/contents.json` with index.html and a 200,
 * which used to be parsed as JSON and break the whole audit. A response only
 * counts when its body is actually JSON.
 */
async function tryJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) return null;
    const text = await res.text();
    if (!/^\s*[{[]/.test(text)) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

let inflight: Promise<unknown | null> | null = null;

export function loadAuditContent<T = unknown>(): Promise<T | null> {
  if (!inflight) {
    inflight = (async () => (await tryJson('/contents.json')) ?? (await tryJson('/content.json')))();
  }
  return inflight as Promise<T | null>;
}
