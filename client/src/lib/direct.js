// Fetches data straight from the public sources (all allow browser requests), so the
// app works even when the Atmos API on Render is asleep, unreachable or not configured.
import {
  CURRENT_VARS,
  HOURLY_VARS,
  DAILY_VARS,
  AIR_VARS,
  FORECAST_DAYS,
  num,
  normalizeForecast,
  normalizeAirQuality,
  normalizeSearch,
  normalizeReverse,
  buildOverpassQuery,
  rankPlaces,
} from './normalize.js';
import { loadBundledRegion, INDIA_OVERVIEW } from '../data/regions.js';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const SEARCH_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const OVERPASS_URLS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

const MINUTE = 60 * 1000;

export class SourceError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'SourceError';
    this.status = status;
  }
}

async function fetchJson(url, { service, signal, ...init } = {}) {
  let response;
  try {
    response = await fetch(url, { ...init, signal, headers: { Accept: 'application/json', ...init.headers } });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new SourceError(`${service} is unreachable. Check your connection.`);
  }
  if (!response.ok) throw new SourceError(`${service} responded with ${response.status}`, 502);
  try {
    return await response.json();
  } catch {
    throw new SourceError(`${service} returned an invalid response`, 502);
  }
}

// Small per-tab cache so moving around the map does not refetch the same cell.
const cache = new Map();
async function cached(key, ttl, load) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await load();
  cache.set(key, { value, expires: Date.now() + ttl });
  if (cache.size > 300) cache.delete(cache.keys().next().value);
  return value;
}

const cell = (lat, lon) => `${lat.toFixed(2)},${lon.toFixed(2)}`;

export function weather(lat, lon, signal) {
  const gLat = Number(lat.toFixed(2));
  const gLon = Number(lon.toFixed(2));
  return cached(`wx:${cell(gLat, gLon)}`, 10 * MINUTE, async () => {
    const forecastParams = new URLSearchParams({
      latitude: gLat,
      longitude: gLon,
      current: CURRENT_VARS.join(','),
      hourly: HOURLY_VARS.join(','),
      daily: DAILY_VARS.join(','),
      timezone: 'auto',
      timeformat: 'unixtime',
      forecast_days: FORECAST_DAYS,
    });
    const airParams = new URLSearchParams({
      latitude: gLat,
      longitude: gLon,
      current: AIR_VARS.join(','),
      timezone: 'auto',
      timeformat: 'unixtime',
    });
    const [forecast, air] = await Promise.allSettled([
      fetchJson(`${FORECAST_URL}?${forecastParams}`, { service: 'Open-Meteo', signal }),
      fetchJson(`${AIR_QUALITY_URL}?${airParams}`, { service: 'Open-Meteo air quality', signal }),
    ]);
    if (forecast.status === 'rejected') throw forecast.reason;
    return {
      ...normalizeForecast(forecast.value),
      air: air.status === 'fulfilled' ? normalizeAirQuality(air.value) : null,
      updatedAt: Date.now(),
    };
  });
}

export function search(q, signal) {
  return cached(`search:${q.toLowerCase()}`, 60 * MINUTE, async () => {
    const params = new URLSearchParams({ name: q, count: 8, language: 'en', format: 'json' });
    return normalizeSearch(await fetchJson(`${SEARCH_URL}?${params}`, { service: 'Place search', signal }));
  });
}

// Nominatim allows at most one request per second.
let nominatimQueue = Promise.resolve();
let lastNominatim = 0;
function throttled(task) {
  const run = nominatimQueue.then(async () => {
    const wait = lastNominatim + 1100 - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastNominatim = Date.now();
    return task();
  });
  nominatimQueue = run.catch(() => {});
  return run;
}

export function reverse(lat, lon, signal) {
  return cached(`reverse:${cell(lat, lon)}`, 24 * 60 * MINUTE, () =>
    throttled(async () => {
      const params = new URLSearchParams({
        lat: lat.toFixed(4),
        lon: lon.toFixed(4),
        format: 'jsonv2',
        zoom: 10,
        addressdetails: 1,
        'accept-language': 'en',
      });
      const data = await fetchJson(`${REVERSE_URL}?${params}`, { service: 'OpenStreetMap', signal });
      return normalizeReverse(data?.error ? {} : data);
    }),
  );
}

/** Current conditions for many points in one request (Open-Meteo accepts coordinate lists). */
export async function currentBatch(points, signal) {
  const results = [];
  for (let i = 0; i < points.length; i += 50) {
    const chunk = points.slice(i, i + 50);
    const params = new URLSearchParams({
      latitude: chunk.map((p) => p.lat.toFixed(4)).join(','),
      longitude: chunk.map((p) => p.lon.toFixed(4)).join(','),
      current: 'temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m,relative_humidity_2m',
      timezone: 'auto',
      timeformat: 'unixtime',
    });
    const data = await fetchJson(`${FORECAST_URL}?${params}`, { service: 'Open-Meteo', signal });
    for (const item of Array.isArray(data) ? data : [data]) {
      const c = item?.current;
      results.push(
        c
          ? {
              temp: num(c.temperature_2m),
              feelsLike: num(c.apparent_temperature),
              code: num(c.weather_code),
              isDay: c.is_day === 1,
              wind: num(c.wind_speed_10m),
              humidity: num(c.relative_humidity_2m),
            }
          : null,
      );
    }
  }
  return results;
}

async function queryOverpass(query, signal) {
  let lastError;
  for (const url of OVERPASS_URLS) {
    try {
      return await fetchJson(url, {
        service: 'OpenStreetMap places',
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal,
      });
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      lastError = err;
    }
  }
  throw lastError;
}

async function findCities(place, lat, lon, signal) {
  if (place.stateCode) {
    const data = await queryOverpass(buildOverpassQuery({ stateCode: place.stateCode }), signal);
    const cities = rankPlaces(data.elements || []);
    if (cities.length) return cities;
  }
  const data = await queryOverpass(buildOverpassQuery({ lat, lon }), signal);
  return rankPlaces(data.elements || []);
}

/** `regionCode` lets bundled regions (Indian states, e.g. "IN-TN") skip the reverse-geocoding lookup. */
export async function region(lat, lon, signal, regionCode) {
  let bundled = await loadBundledRegion(regionCode);
  const place = bundled ? null : await reverse(lat, lon, signal);
  bundled ??= await loadBundledRegion(place.stateCode);
  const key = bundled?.region.code || place.stateCode || `near:${lat.toFixed(1)},${lon.toFixed(1)}`;

  const cities = bundled
    ? bundled.cities
    : await cached(`cities:${key}`, 24 * 60 * MINUTE, () => findCities(place, lat, lon, signal));

  let conditions = [];
  if (cities.length) {
    try {
      conditions = await cached(`regionwx:${key}`, 10 * MINUTE, () => currentBatch(cities, signal));
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      conditions = [];
    }
  }

  return {
    region: bundled
      ? bundled.region
      : {
          name: place.state || place.name,
          code: place.stateCode,
          country: place.country,
          countryCode: place.countryCode,
          scope: place.stateCode ? 'state' : 'nearby',
        },
    cities: cities.map((city, i) => ({ ...city, current: conditions[i] ?? null })),
    updatedAt: Date.now(),
  };
}

/** Current conditions at one point per Indian state, in a single request. */
export async function india(signal) {
  const conditions = await cached('india', 10 * MINUTE, () => currentBatch(INDIA_OVERVIEW.cities, signal));
  return {
    region: INDIA_OVERVIEW.region,
    cities: INDIA_OVERVIEW.cities.map((city, i) => ({ ...city, current: conditions[i] ?? null })),
    updatedAt: Date.now(),
  };
}

export const _directCache = cache;
