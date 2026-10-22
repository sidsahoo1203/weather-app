import { _weatherCache } from '../src/services/weather.js';
import { _geocodeCache } from '../src/services/geocode.js';
import { _regionCaches } from '../src/services/region.js';

const realFetch = globalThis.fetch;

/**
 * Replaces global fetch with a router: the first handler whose `match`
 * appears in the URL answers. Returns the list of requested URLs.
 */
export function mockFetch(handlers) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const href = String(url);
    calls.push({ url: href, init });
    const handler = handlers.find((h) => href.includes(h.match));
    if (!handler) throw new TypeError(`fetch failed: no mock for ${href}`);
    const { status = 200, body } = typeof handler.reply === 'function'
      ? handler.reply(href, init)
      : handler.reply;
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  return calls;
}

export function restoreFetch() {
  globalThis.fetch = realFetch;
  _weatherCache.clear();
  _geocodeCache.clear();
  _regionCaches.cityCache.clear();
  _regionCaches.weatherCache.clear();
}

const NOW = 1761130800; // 2025-10-22T11:00:00Z, on the hour

export const forecastFixture = {
  latitude: 20.3,
  longitude: 85.82,
  elevation: 45,
  timezone: 'Asia/Kolkata',
  timezone_abbreviation: 'GMT+5:30',
  utc_offset_seconds: 19800,
  current: {
    time: NOW + 900,
    temperature_2m: 31.4,
    relative_humidity_2m: 70,
    apparent_temperature: 36.2,
    is_day: 1,
    precipitation: 0,
    weather_code: 2,
    cloud_cover: 40,
    pressure_msl: 1008.2,
    wind_speed_10m: 12.5,
    wind_direction_10m: 200,
    wind_gusts_10m: 25,
    visibility: 24000,
    dew_point_2m: 25.1,
    uv_index: 7.2,
  },
  hourly: {
    time: Array.from({ length: 72 }, (_, i) => NOW - 3 * 3600 + i * 3600),
    temperature_2m: Array.from({ length: 72 }, (_, i) => 25 + (i % 10)),
    apparent_temperature: Array(72).fill(30),
    precipitation_probability: Array(72).fill(10),
    precipitation: Array(72).fill(0),
    weather_code: Array(72).fill(1),
    is_day: Array.from({ length: 72 }, (_, i) => (i % 24 < 12 ? 1 : 0)),
    wind_speed_10m: Array(72).fill(10),
    relative_humidity_2m: Array(72).fill(65),
    uv_index: Array(72).fill(null),
  },
  daily: {
    time: [NOW - 11 * 3600, NOW + 13 * 3600],
    weather_code: [2, 61],
    temperature_2m_max: [33, 30],
    temperature_2m_min: [24, 23],
    apparent_temperature_max: [38, 35],
    apparent_temperature_min: [27, 26],
    sunrise: [NOW - 5 * 3600, NOW + 19 * 3600],
    sunset: [NOW + 6 * 3600, NOW + 30 * 3600],
    daylight_duration: [41000, 40900],
    uv_index_max: [8, 6],
    precipitation_sum: [0, 12.4],
    precipitation_probability_max: [10, 80],
    wind_speed_10m_max: [18, 22],
    wind_direction_10m_dominant: [210, 190],
  },
};

export const airFixture = {
  current: {
    us_aqi: 87,
    european_aqi: 45,
    pm2_5: 28.4,
    pm10: 51,
    ozone: 60,
    nitrogen_dioxide: 12,
    sulphur_dioxide: 4,
    carbon_monoxide: 300,
  },
};

export const nominatimFixture = {
  name: 'Bhubaneswar',
  display_name: 'Bhubaneswar, Khordha, Odisha, India',
  address: {
    city: 'Bhubaneswar',
    state_district: 'Khordha',
    state: 'Odisha',
    'ISO3166-2-lvl4': 'IN-OR',
    country: 'India',
    country_code: 'in',
  },
};

export const overpassFixture = {
  elements: [
    { type: 'node', id: 1, lat: 20.46, lon: 85.88, tags: { name: 'Cuttack', place: 'city', population: '606,007' } },
    { type: 'node', id: 2, lat: 20.29, lon: 85.82, tags: { name: 'Bhubaneswar', place: 'city', population: '837737' } },
    { type: 'node', id: 3, lat: 19.81, lon: 85.83, tags: { name: 'Puri', place: 'town', population: '200564' } },
    { type: 'node', id: 4, lat: 21.47, lon: 83.97, tags: { name: 'Sambalpur', 'name:en': 'Sambalpur', place: 'city' } },
    { type: 'node', id: 5, lat: 20.0, lon: 85.0, tags: { name: 'Puri', place: 'town' } },
    { type: 'node', id: 6, lat: 20.0, lon: 85.0, tags: { place: 'town' } },
  ],
};
