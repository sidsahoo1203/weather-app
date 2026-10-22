import { TtlCache, DAY } from '../lib/cache.js';
import { fetchJson } from '../lib/http.js';
import { gridKey } from '../lib/validate.js';

const SEARCH_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

const cache = new TtlCache({ max: 2000 });

export function normalizeSearch(data) {
  return (data?.results || []).map((r) => ({
    id: r.id,
    name: r.name,
    region: r.admin1 || null,
    district: r.admin2 || null,
    country: r.country || null,
    countryCode: r.country_code || null,
    lat: r.latitude,
    lon: r.longitude,
    population: r.population ?? null,
    timezone: r.timezone || null,
  }));
}

export function searchPlaces(query) {
  const q = query.toLowerCase();
  return cache.wrap(`search:${q}`, DAY, async () => {
    const params = new URLSearchParams({ name: query, count: 8, language: 'en', format: 'json' });
    const data = await fetchJson(`${SEARCH_URL}?${params}`, { service: 'Open-Meteo geocoding' });
    return normalizeSearch(data);
  });
}

export function normalizeReverse(data) {
  const a = data?.address || {};
  return {
    name:
      a.city ||
      a.town ||
      a.village ||
      a.municipality ||
      a.suburb ||
      a.hamlet ||
      a.county ||
      a.state_district ||
      a.state ||
      data?.name ||
      null,
    district: a.state_district || a.county || null,
    state: a.state || a.region || a.province || null,
    // ISO 3166-2 subdivision code such as "IN-OR" or "US-CA"; used to look up the state's cities.
    stateCode: a['ISO3166-2-lvl4'] || null,
    country: a.country || null,
    countryCode: a.country_code ? a.country_code.toUpperCase() : null,
  };
}

// Nominatim's usage policy allows at most one request per second.
let queue = Promise.resolve();
let lastCall = 0;
const NOMINATIM_GAP_MS = 1100;

function throttled(task) {
  const run = queue.then(async () => {
    const wait = lastCall + NOMINATIM_GAP_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastCall = Date.now();
    return task();
  });
  queue = run.catch(() => {});
  return run;
}

export function reverseGeocode(lat, lon) {
  return cache.wrap(`reverse:${gridKey(lat, lon)}`, 7 * DAY, () =>
    throttled(async () => {
      const params = new URLSearchParams({
        lat: lat.toFixed(4),
        lon: lon.toFixed(4),
        format: 'jsonv2',
        zoom: 10,
        addressdetails: 1,
        'accept-language': 'en',
      });
      const data = await fetchJson(`${REVERSE_URL}?${params}`, { service: 'Nominatim' });
      // Points in the ocean come back as { error: "Unable to geocode" }.
      return normalizeReverse(data?.error ? {} : data);
    }),
  );
}

export const _geocodeCache = cache;
