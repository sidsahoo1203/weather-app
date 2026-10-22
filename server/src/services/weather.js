import { TtlCache, MINUTE } from '../lib/cache.js';
import { fetchJson } from '../lib/http.js';
import { gridKey } from '../lib/validate.js';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

const CURRENT_VARS = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'is_day',
  'precipitation',
  'weather_code',
  'cloud_cover',
  'pressure_msl',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'visibility',
  'dew_point_2m',
  'uv_index',
];

const HOURLY_VARS = [
  'temperature_2m',
  'apparent_temperature',
  'precipitation_probability',
  'precipitation',
  'weather_code',
  'is_day',
  'wind_speed_10m',
  'wind_direction_10m',
  'relative_humidity_2m',
  'uv_index',
];

const DAILY_VARS = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'apparent_temperature_max',
  'apparent_temperature_min',
  'sunrise',
  'sunset',
  'daylight_duration',
  'uv_index_max',
  'precipitation_sum',
  'precipitation_probability_max',
  'wind_speed_10m_max',
  'wind_direction_10m_dominant',
];

const AIR_VARS = [
  'us_aqi',
  'european_aqi',
  'pm2_5',
  'pm10',
  'ozone',
  'nitrogen_dioxide',
  'sulphur_dioxide',
  'carbon_monoxide',
];

const HOURS_AHEAD = 48;
const FORECAST_DAYS = 10;

const cache = new TtlCache({ max: 1000 });

const num = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/** Turns Open-Meteo's column arrays ({ time: [...], temp: [...] }) into row objects. */
function rows(block, mapping) {
  if (!block?.time) return [];
  return block.time.map((time, i) => {
    const row = { time };
    for (const [key, source] of Object.entries(mapping)) row[key] = num(block[source]?.[i]);
    return row;
  });
}

export function normalizeForecast(data) {
  const c = data.current || {};
  const currentHour = Math.floor((c.time ?? Date.now() / 1000) / 3600) * 3600;

  const hourly = rows(data.hourly, {
    temp: 'temperature_2m',
    feelsLike: 'apparent_temperature',
    pop: 'precipitation_probability',
    precip: 'precipitation',
    code: 'weather_code',
    isDay: 'is_day',
    wind: 'wind_speed_10m',
    windDir: 'wind_direction_10m',
    humidity: 'relative_humidity_2m',
    uv: 'uv_index',
  })
    .filter((hour) => hour.time >= currentHour)
    .slice(0, HOURS_AHEAD)
    .map((hour) => ({ ...hour, isDay: hour.isDay === 1 }));

  const daily = rows(data.daily, {
    code: 'weather_code',
    max: 'temperature_2m_max',
    min: 'temperature_2m_min',
    feelsMax: 'apparent_temperature_max',
    feelsMin: 'apparent_temperature_min',
    sunrise: 'sunrise',
    sunset: 'sunset',
    daylight: 'daylight_duration',
    uvMax: 'uv_index_max',
    precipSum: 'precipitation_sum',
    pop: 'precipitation_probability_max',
    windMax: 'wind_speed_10m_max',
    windDir: 'wind_direction_10m_dominant',
  });

  return {
    location: {
      lat: num(data.latitude),
      lon: num(data.longitude),
      elevation: num(data.elevation),
      timezone: data.timezone || 'UTC',
      timezoneAbbr: data.timezone_abbreviation || null,
      utcOffset: num(data.utc_offset_seconds) ?? 0,
    },
    current: {
      time: num(c.time),
      temp: num(c.temperature_2m),
      feelsLike: num(c.apparent_temperature),
      humidity: num(c.relative_humidity_2m),
      dewPoint: num(c.dew_point_2m),
      pressure: num(c.pressure_msl),
      cloudCover: num(c.cloud_cover),
      visibility: num(c.visibility),
      uv: num(c.uv_index),
      precip: num(c.precipitation),
      code: num(c.weather_code),
      isDay: c.is_day === 1,
      wind: {
        speed: num(c.wind_speed_10m),
        gust: num(c.wind_gusts_10m),
        dir: num(c.wind_direction_10m),
      },
    },
    hourly,
    daily,
  };
}

export function normalizeAirQuality(data) {
  const c = data?.current;
  if (!c) return null;
  return {
    usAqi: num(c.us_aqi),
    euAqi: num(c.european_aqi),
    pm25: num(c.pm2_5),
    pm10: num(c.pm10),
    o3: num(c.ozone),
    no2: num(c.nitrogen_dioxide),
    so2: num(c.sulphur_dioxide),
    co: num(c.carbon_monoxide),
  };
}

async function fetchForecast(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: CURRENT_VARS.join(','),
    hourly: HOURLY_VARS.join(','),
    daily: DAILY_VARS.join(','),
    timezone: 'auto',
    timeformat: 'unixtime',
    forecast_days: FORECAST_DAYS,
  });
  return fetchJson(`${FORECAST_URL}?${params}`, { service: 'Open-Meteo forecast' });
}

async function fetchAirQuality(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: AIR_VARS.join(','),
    timezone: 'auto',
    timeformat: 'unixtime',
  });
  return fetchJson(`${AIR_QUALITY_URL}?${params}`, { service: 'Open-Meteo air quality' });
}

export function getWeather(lat, lon) {
  // Snap to the ~1 km grid used as the cache key so everyone in that cell shares a response.
  const gLat = Number(lat.toFixed(2));
  const gLon = Number(lon.toFixed(2));

  return cache.wrap(`wx:${gridKey(gLat, gLon)}`, 10 * MINUTE, async () => {
    const [forecast, air] = await Promise.allSettled([
      fetchForecast(gLat, gLon),
      fetchAirQuality(gLat, gLon),
    ]);
    if (forecast.status === 'rejected') throw forecast.reason;

    return {
      ...normalizeForecast(forecast.value),
      // Air quality is a nice-to-have; never fail the whole response over it.
      air: air.status === 'fulfilled' ? normalizeAirQuality(air.value) : null,
      updatedAt: Date.now(),
    };
  });
}

/**
 * Current conditions for many points in as few calls as possible.
 * Open-Meteo accepts comma-separated coordinate lists and returns an array.
 */
export async function getCurrentBatch(points, { chunkSize = 50 } = {}) {
  const results = [];
  for (let i = 0; i < points.length; i += chunkSize) {
    const chunk = points.slice(i, i + chunkSize);
    const params = new URLSearchParams({
      latitude: chunk.map((p) => p.lat.toFixed(4)).join(','),
      longitude: chunk.map((p) => p.lon.toFixed(4)).join(','),
      current: 'temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m,relative_humidity_2m',
      timezone: 'auto',
      timeformat: 'unixtime',
    });
    const data = await fetchJson(`${FORECAST_URL}?${params}`, { service: 'Open-Meteo forecast' });
    const list = Array.isArray(data) ? data : [data];
    for (const item of list) {
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

export const _weatherCache = cache;
