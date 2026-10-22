import { Router } from 'express';
import { parseCoords, parseSearchQuery } from '../lib/validate.js';
import { getWeather } from '../services/weather.js';
import { searchPlaces, reverseGeocode } from '../services/geocode.js';
import { getRegion } from '../services/region.js';

export const api = Router();

const cacheFor = (res, seconds) => res.set('Cache-Control', `public, max-age=${seconds}`);

api.get('/health', (req, res) => {
  res.set('Cache-Control', 'no-store').json({ ok: true, uptime: Math.round(process.uptime()) });
});

api.get('/weather', async (req, res) => {
  const { lat, lon } = parseCoords(req.query);
  cacheFor(res, 300).json(await getWeather(lat, lon));
});

api.get('/geocode/search', async (req, res) => {
  const q = parseSearchQuery(req.query);
  cacheFor(res, 3600).json({ results: await searchPlaces(q) });
});

api.get('/geocode/reverse', async (req, res) => {
  const { lat, lon } = parseCoords(req.query);
  cacheFor(res, 86400).json(await reverseGeocode(lat, lon));
});

api.get('/region', async (req, res) => {
  const { lat, lon } = parseCoords(req.query);
  cacheFor(res, 300).json(await getRegion(lat, lon));
});
