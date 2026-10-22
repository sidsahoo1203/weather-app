// Response normalizers shared in shape with server/src/services/*.js, so the app
// gets identical data whether it goes through the Atmos API or straight to the sources.
// Keep the two in sync when changing a field.

export const CURRENT_VARS = [
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

export const HOURLY_VARS = [
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

export const DAILY_VARS = [
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

export const AIR_VARS = [
  'us_aqi',
  'european_aqi',
  'pm2_5',
  'pm10',
  'ozone',
  'nitrogen_dioxide',
  'sulphur_dioxide',
  'carbon_monoxide',
];

export const HOURS_AHEAD = 48;
export const FORECAST_DAYS = 10;

export const num = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

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

const MAX_CITIES = 40;
const FALLBACK_RADIUS_M = 120000;
const ISO_SUBDIVISION = /^[A-Z]{2}-[A-Z0-9]{1,3}$/;

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
