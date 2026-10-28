import * as direct from './direct.js';
import { hasBundledRegion } from '../data/regions.js';

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

// Give the Atmos API (Render) this long before using the public sources directly.
// Free Render services sleep, and waking one can take close to a minute.
const SERVER_TIMEOUT_MS = 8000;
// After a failure, skip the server for a while instead of waiting on it for every request.
const SERVER_RETRY_AFTER_MS = 2 * 60 * 1000;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

let serverDownUntil = BASE ? 0 : Infinity;

/** Aborts when either the caller's signal fires or the timeout passes. */
function withTimeout(signal, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('Timed out', 'TimeoutError')), ms);
  const onAbort = () => controller.abort(signal.reason);
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener('abort', onAbort, { once: true });
  }
  return {
    signal: controller.signal,
    done: () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    },
  };
}

/**
 * GET from the Atmos API. Resolves to undefined when the server is unusable
 * (not configured, asleep, unreachable, 5xx, or not answering with JSON), so the
 * caller can fall back to the public sources. Rejects only for real client errors.
 */
async function fromServer(path, params, signal, isValid) {
  if (Date.now() < serverDownUntil) return undefined;
  const url = new URL(`${BASE}/api${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const timeout = withTimeout(signal, SERVER_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: timeout.signal, headers: { Accept: 'application/json' } });
    const body = await response.json().catch(() => null);
    if (response.status >= 400 && response.status < 500 && response.status !== 429) {
      throw new ApiError(body?.error?.message || `Request failed (${response.status})`, response.status);
    }
    if (response.ok && body && isValid(body)) return body;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (signal?.aborted) throw err;
  } finally {
    timeout.done();
  }
  serverDownUntil = Date.now() + SERVER_RETRY_AFTER_MS;
  return undefined;
}

async function load(path, params, signal, isValid, fallback) {
  const fromApi = await fromServer(path, params, signal, isValid);
  if (fromApi !== undefined) return fromApi;
  try {
    return await fallback();
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(err.message || 'Could not load weather data.', err.status ?? 0);
  }
}

const coords = (lat, lon) => ({ lat: lat.toFixed(4), lon: lon.toFixed(4) });

export const api = {
  weather: (lat, lon, signal) =>
    load('/weather', coords(lat, lon), signal, (b) => Boolean(b.current && b.hourly && b.daily), () =>
      direct.weather(lat, lon, signal),
    ),

  reverse: (lat, lon, signal) =>
    load('/geocode/reverse', coords(lat, lon), signal, (b) => 'stateCode' in b, () => direct.reverse(lat, lon, signal)),

  /** `regionCode` (e.g. "IN-TN") is optional; bundled Indian states then load without any lookup. */
  region: (lat, lon, regionCode, signal) => {
    if (hasBundledRegion(regionCode)) return direct.region(lat, lon, signal, regionCode);
    return load('/region', coords(lat, lon), signal, (b) => Array.isArray(b.cities), () =>
      direct.region(lat, lon, signal),
    );
  },

  search: (q, signal) =>
    load('/geocode/search', { q }, signal, (b) => Array.isArray(b.results), async () => ({
      results: await direct.search(q, signal),
    })).then((r) => r.results),

  /** Live conditions for every Indian state (one point each), fetched straight from Open-Meteo. */
  india: (signal) =>
    direct.india(signal).catch((err) => {
      if (err.name === 'AbortError') throw err;
      throw new ApiError(err.message || 'Could not load weather for India.', err.status ?? 0);
    }),

  /** Fire-and-forget request that starts waking a sleeping Render service. */
  warmUp: () => {
    if (!BASE) return;
    fetch(`${BASE}/api/health`).catch(() => {});
  },
};
