import { HttpError } from './errors.js';

const round = (value, digits) => Number(value.toFixed(digits));

function parseNumber(raw, name, min, max) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new HttpError(400, `"${name}" query parameter is required`);
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new HttpError(400, `"${name}" must be a number between ${min} and ${max}`);
  }
  return value;
}

/** Reads ?lat=&lon= and rounds to 4 decimals (~11 m), plenty for weather. */
export function parseCoords(query) {
  return {
    lat: round(parseNumber(query.lat, 'lat', -90, 90), 4),
    lon: round(parseNumber(query.lon, 'lon', -180, 180), 4),
  };
}

export function parseSearchQuery(query) {
  const q = typeof query.q === 'string' ? query.q.trim() : '';
  if (q.length < 2) throw new HttpError(400, '"q" must be at least 2 characters');
  if (q.length > 100) throw new HttpError(400, '"q" must be at most 100 characters');
  return q;
}

/** Cache key that groups nearby points (~1 km) together. */
export const gridKey = (lat, lon) => `${lat.toFixed(2)},${lon.toFixed(2)}`;
