import { config } from '../config.js';
import { TtlCache, DAY, MINUTE } from '../lib/cache.js';
import { fetchJson } from '../lib/http.js';
import { UpstreamError } from '../lib/errors.js';
import { reverseGeocode } from './geocode.js';
import { getCurrentBatch } from './weather.js';

const MAX_CITIES = 40;
const FALLBACK_RADIUS_M = 120000;
const ISO_SUBDIVISION = /^[A-Z]{2}-[A-Z0-9]{1,3}$/;

const cityCache = new TtlCache({ max: 300 });
const weatherCache = new TtlCache({ max: 300 });

export function buildOverpassQuery({ stateCode, lat, lon }) {
  const filter = '["place"~"^(city|town)$"]["name"]';
  if (stateCode && ISO_SUBDIVISION.test(stateCode)) {
    return `[out:json][timeout:25];area["ISO3166-2"="${stateCode}"]["boundary"="administrative"]->.s;node(area.s)${filter};out 1500;`;
  }
  return `[out:json][timeout:25];node(around:${FALLBACK_RADIUS_M},${lat},${lon})${filter};out 600;`;
}

const parsePopulation = (raw) => {
  const n = parseInt(String(raw ?? '').replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
};

/** Picks the most significant places: cities before towns, then by population. */
export function rankPlaces(elements, limit = MAX_CITIES) {
  const seen = new Set();
  return elements
    .filter((el) => el.type === 'node' && el.tags?.name && Number.isFinite(el.lat))
    .map((el) => ({
      id: el.id,
      name: el.tags['name:en'] || el.tags.name,
      lat: el.lat,
      lon: el.lon,
      place: el.tags.place,
      population: parsePopulation(el.tags.population),
    }))
    .sort((a, b) => {
      const aCity = a.place === 'city';
      const bCity = b.place === 'city';
      if (aCity !== bCity) return aCity ? -1 : 1;
      return b.population - a.population;
    })
    .filter((place) => {
      const key = place.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

async function queryOverpass(query) {
  let lastError;
  for (const url of config.overpassUrls) {
    try {
      return await fetchJson(url, {
        service: 'Overpass',
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        timeoutMs: 30000,
      });
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new UpstreamError('No Overpass endpoint configured', { service: 'Overpass' });
}

async function findCities(place, lat, lon) {
  if (place.stateCode) {
    const data = await queryOverpass(buildOverpassQuery({ stateCode: place.stateCode }));
    const cities = rankPlaces(data.elements || []);
    if (cities.length) return cities;
  }
  // No subdivision code (or an empty result): fall back to places around the point.
  const data = await queryOverpass(buildOverpassQuery({ lat, lon }));
  return rankPlaces(data.elements || []);
}

export async function getRegion(lat, lon) {
  const place = await reverseGeocode(lat, lon);
  const regionKey = place.stateCode || `near:${lat.toFixed(1)},${lon.toFixed(1)}`;

  const cities = await cityCache.wrap(`cities:${regionKey}`, 7 * DAY, () =>
    findCities(place, lat, lon),
  );

  let conditions = [];
  if (cities.length) {
    try {
      conditions = await weatherCache.wrap(`wx:${regionKey}`, 10 * MINUTE, () =>
        getCurrentBatch(cities),
      );
    } catch {
      // Still useful without temperatures: the client can list and map the cities.
      conditions = [];
    }
  }

  return {
    region: {
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

export const _regionCaches = { cityCache, weatherCache };
