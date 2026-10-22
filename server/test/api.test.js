import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp, originMatcher } from '../src/app.js';
import { rankPlaces, buildOverpassQuery } from '../src/services/region.js';
import { TtlCache } from '../src/lib/cache.js';
import {
  mockFetch,
  restoreFetch,
  forecastFixture,
  airFixture,
  nominatimFixture,
  overpassFixture,
} from './helpers.js';

const app = createApp({ clientOrigins: [] });

afterEach(restoreFetch);

test('GET /api/health', async () => {
  const res = await request(app).get('/api/health').expect(200);
  assert.equal(res.body.ok, true);
});

test('GET /api/weather validates coordinates', async () => {
  for (const qs of ['', '?lat=20', '?lat=abc&lon=1', '?lat=91&lon=0', '?lat=0&lon=181', '?lat=&lon=']) {
    const res = await request(app).get(`/api/weather${qs}`).expect(400);
    assert.match(res.body.error.message, /lat|lon/);
  }
});

test('GET /api/weather normalizes forecast and air quality', async () => {
  const calls = mockFetch([
    { match: 'air-quality-api', reply: { body: airFixture } },
    { match: 'api.open-meteo.com/v1/forecast', reply: { body: forecastFixture } },
  ]);

  const res = await request(app).get('/api/weather?lat=20.2961&lon=85.8245').expect(200);
  const body = res.body;

  assert.equal(body.location.timezone, 'Asia/Kolkata');
  assert.equal(body.current.temp, 31.4);
  assert.equal(body.current.isDay, true);
  assert.deepEqual(body.current.wind, { speed: 12.5, gust: 25, dir: 200 });
  // Hourly starts at the current hour (fixture starts 3 h earlier) and is capped at 48.
  assert.equal(body.hourly.length, 48);
  assert.equal(body.hourly[0].time, Math.floor(forecastFixture.current.time / 3600) * 3600);
  assert.equal(body.hourly[0].uv, null);
  assert.equal(body.daily.length, 2);
  assert.equal(body.daily[1].pop, 80);
  assert.equal(body.air.usAqi, 87);
  assert.equal(body.air.pm25, 28.4);

  // Coordinates are snapped to the 0.01° cache grid before calling upstream.
  assert.ok(calls.every((c) => c.url.includes('latitude=20.3') && c.url.includes('longitude=85.82')));

  // Second request inside the grid cell is served from cache.
  await request(app).get('/api/weather?lat=20.2999&lon=85.8201').expect(200);
  assert.equal(calls.length, 2);
});

test('GET /api/weather still answers when air quality fails', async () => {
  mockFetch([
    { match: 'air-quality-api', reply: { status: 503, body: {} } },
    { match: 'api.open-meteo.com/v1/forecast', reply: { body: forecastFixture } },
  ]);
  const res = await request(app).get('/api/weather?lat=1&lon=2').expect(200);
  assert.equal(res.body.air, null);
  assert.equal(res.body.current.code, 2);
});

test('GET /api/weather maps upstream failures to 502', async () => {
  mockFetch([
    { match: 'api.open-meteo.com', reply: { status: 500, body: { error: true } } },
  ]);
  const res = await request(app).get('/api/weather?lat=3&lon=4').expect(502);
  assert.match(res.body.error.message, /Open-Meteo/);
});

test('GET /api/geocode/search', async () => {
  mockFetch([
    {
      match: 'geocoding-api.open-meteo.com',
      reply: {
        body: {
          results: [
            { id: 1, name: 'Puri', latitude: 19.81, longitude: 85.83, country: 'India', country_code: 'IN', admin1: 'Odisha', population: 200564 },
          ],
        },
      },
    },
  ]);
  const res = await request(app).get('/api/geocode/search?q=puri').expect(200);
  assert.deepEqual(res.body.results[0], {
    id: 1,
    name: 'Puri',
    region: 'Odisha',
    district: null,
    country: 'India',
    countryCode: 'IN',
    lat: 19.81,
    lon: 85.83,
    population: 200564,
    timezone: null,
  });

  await request(app).get('/api/geocode/search?q=a').expect(400);
});

test('GET /api/geocode/search returns [] when nothing matches', async () => {
  mockFetch([{ match: 'geocoding-api', reply: { body: { generationtime_ms: 0.4 } } }]);
  const res = await request(app).get('/api/geocode/search?q=zzzzqqq').expect(200);
  assert.deepEqual(res.body.results, []);
});

test('GET /api/geocode/reverse', async () => {
  mockFetch([{ match: 'nominatim.openstreetmap.org', reply: { body: nominatimFixture } }]);
  const res = await request(app).get('/api/geocode/reverse?lat=20.29&lon=85.82').expect(200);
  assert.deepEqual(res.body, {
    name: 'Bhubaneswar',
    district: 'Khordha',
    state: 'Odisha',
    stateCode: 'IN-OR',
    country: 'India',
    countryCode: 'IN',
  });
});

test('GET /api/geocode/reverse handles open ocean', async () => {
  mockFetch([{ match: 'nominatim', reply: { body: { error: 'Unable to geocode' } } }]);
  const res = await request(app).get('/api/geocode/reverse?lat=-40&lon=-130').expect(200);
  assert.equal(res.body.name, null);
  assert.equal(res.body.stateCode, null);
});

test('GET /api/region lists ranked cities of the state with current weather', async () => {
  const calls = mockFetch([
    { match: 'nominatim', reply: { body: nominatimFixture } },
    { match: 'overpass', reply: { body: overpassFixture } },
    {
      match: 'api.open-meteo.com/v1/forecast',
      reply: (url) => {
        const count = new URL(url).searchParams.get('latitude').split(',').length;
        return {
          body: Array.from({ length: count }, (_, i) => ({
            current: { temperature_2m: 30 + i, weather_code: 3, is_day: 1, wind_speed_10m: 9, relative_humidity_2m: 60, apparent_temperature: 33 },
          })),
        };
      },
    },
  ]);

  const res = await request(app).get('/api/region?lat=20.29&lon=85.82').expect(200);
  assert.deepEqual(res.body.region, {
    name: 'Odisha',
    code: 'IN-OR',
    country: 'India',
    countryCode: 'IN',
    scope: 'state',
  });
  assert.deepEqual(
    res.body.cities.map((c) => c.name),
    ['Bhubaneswar', 'Cuttack', 'Sambalpur', 'Puri'],
  );
  assert.equal(res.body.cities[0].current.temp, 30);
  assert.equal(res.body.cities[3].current.temp, 33);

  const overpassCall = calls.find((c) => c.url.includes('overpass'));
  assert.equal(overpassCall.init.method, 'POST');
  assert.match(decodeURIComponent(overpassCall.init.body), /ISO3166-2"="IN-OR"/);
});

test('GET /api/region keeps cities when the weather batch fails', async () => {
  mockFetch([
    { match: 'nominatim', reply: { body: { address: { state: 'Nowhere', country: 'X' } } } },
    { match: 'overpass', reply: { body: overpassFixture } },
    { match: 'api.open-meteo.com', reply: { status: 429, body: {} } },
  ]);
  const res = await request(app).get('/api/region?lat=10&lon=10').expect(200);
  assert.equal(res.body.region.scope, 'nearby');
  assert.equal(res.body.cities.length, 4);
  assert.equal(res.body.cities[0].current, null);
});

test('buildOverpassQuery rejects unsafe subdivision codes', () => {
  assert.match(buildOverpassQuery({ stateCode: 'US-CA' }), /area\["ISO3166-2"="US-CA"\]/);
  const unsafe = buildOverpassQuery({ stateCode: '"];out;', lat: 1, lon: 2 });
  assert.match(unsafe, /around:\d+,1,2/);
  assert.doesNotMatch(unsafe, /out;"/);
});

test('rankPlaces prefers cities, then population, and de-duplicates names', () => {
  const ranked = rankPlaces(overpassFixture.elements, 3);
  assert.deepEqual(ranked.map((p) => p.name), ['Bhubaneswar', 'Cuttack', 'Sambalpur']);
  assert.equal(ranked[1].population, 606007);
});

test('originMatcher supports exact origins and wildcards', () => {
  const allowed = originMatcher(['https://weather-app-rwex.vercel.app', 'https://weather-app-*.vercel.app']);
  assert.ok(allowed('https://weather-app-rwex.vercel.app'));
  assert.ok(allowed('https://weather-app-git-main-me.vercel.app'));
  assert.ok(!allowed('https://evil.example.com'));
  assert.ok(!allowed('https://weather-app-x.vercel.app.evil.com'));
  assert.ok(originMatcher([])('https://anything.example'));
});

test('CORS only echoes allowed origins', async () => {
  const strict = createApp({ clientOrigins: ['https://weather-app-rwex.vercel.app'] });
  const ok = await request(strict).get('/api/health').set('Origin', 'https://weather-app-rwex.vercel.app');
  assert.equal(ok.headers['access-control-allow-origin'], 'https://weather-app-rwex.vercel.app');
  const blocked = await request(strict).get('/api/health').set('Origin', 'https://evil.example.com');
  assert.equal(blocked.headers['access-control-allow-origin'], undefined);
});

test('unknown routes return JSON 404', async () => {
  const res = await request(app).get('/api/nope').expect(404);
  assert.match(res.body.error.message, /No route/);
});

test('TtlCache expires entries and de-duplicates concurrent loads', async () => {
  const cache = new TtlCache({ max: 2 });
  let loads = 0;
  const load = () => cache.wrap('k', 20, async () => ++loads);
  const [a, b] = await Promise.all([load(), load()]);
  assert.equal(a, 1);
  assert.equal(b, 1);
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(await load(), 2);

  cache.set('x', 1, 1000);
  cache.set('y', 2, 1000);
  assert.equal(cache.get('k'), undefined); // evicted as least recently used
});
