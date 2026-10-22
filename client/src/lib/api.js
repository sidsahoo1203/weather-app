const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function get(path, params, signal) {
  const url = new URL(`${BASE}/api${path}`, window.location.origin);
  for (const [key, value] of Object.entries(params || {})) url.searchParams.set(key, value);

  let response;
  try {
    response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Could not reach the weather service. Check your connection.', 0);
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(body?.error?.message || `Request failed (${response.status})`, response.status);
  }
  return body;
}

const coords = (lat, lon) => ({ lat: lat.toFixed(4), lon: lon.toFixed(4) });

export const api = {
  weather: (lat, lon, signal) => get('/weather', coords(lat, lon), signal),
  reverse: (lat, lon, signal) => get('/geocode/reverse', coords(lat, lon), signal),
  region: (lat, lon, signal) => get('/region', coords(lat, lon), signal),
  search: (q, signal) => get('/geocode/search', { q }, signal).then((r) => r.results),
  health: (signal) => get('/health', null, signal),
};
