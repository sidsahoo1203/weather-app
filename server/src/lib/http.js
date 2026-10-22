import { config } from '../config.js';
import { UpstreamError } from './errors.js';

/** fetch() a JSON document with a timeout, mapping every failure to UpstreamError. */
export async function fetchJson(url, { service, timeoutMs = 10000, headers, ...init } = {}) {
  let response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { 'User-Agent': config.userAgent, Accept: 'application/json', ...headers },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const reason = err?.name === 'TimeoutError' ? 'timed out' : err?.message || 'network error';
    throw new UpstreamError(`${service} is unreachable (${reason})`, { service });
  }

  if (!response.ok) {
    throw new UpstreamError(`${service} responded with ${response.status}`, {
      service,
      upstreamStatus: response.status,
    });
  }

  try {
    return await response.json();
  } catch {
    throw new UpstreamError(`${service} returned invalid JSON`, { service });
  }
}
