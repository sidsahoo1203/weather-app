import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const NOW = 1761130800;

const forecastBody = {
  latitude: 13.08,
  longitude: 80.27,
  timezone: 'Asia/Kolkata',
  timezone_abbreviation: 'IST',
  utc_offset_seconds: 19800,
  current: { time: NOW, temperature_2m: 30.2, weather_code: 3, is_day: 1, wind_speed_10m: 14, wind_direction_10m: 120 },
  hourly: {
    time: [NOW, NOW + 3600],
    temperature_2m: [30, 29],
    wind_speed_10m: [14, 12],
    wind_direction_10m: [120, 130],
    precipitation_probability: [20, 60],
    weather_code: [3, 61],
    is_day: [1, 1],
  },
  daily: { time: [NOW], temperature_2m_max: [33], temperature_2m_min: [26], weather_code: [3] },
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function mockFetch(handler) {
  const calls = [];
  globalThis.fetch = vi.fn(async (url, init = {}) => {
    calls.push({ url: String(url), init });
    return handler(String(url), init);
  });
  return calls;
}

async function loadApi(apiUrl = '') {
  vi.resetModules();
  vi.stubEnv('VITE_API_URL', apiUrl);
  return (await import('./api.js')).api;
}

const realFetch = globalThis.fetch;
beforeEach(() => vi.useRealTimers());
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.unstubAllEnvs();
});

describe('api without a server (direct mode)', () => {
  it('loads and normalizes the forecast straight from Open-Meteo', async () => {
    const calls = mockFetch((url) =>
      url.includes('air-quality') ? json({ current: { us_aqi: 55, pm2_5: 12 } }) : json(forecastBody),
    );
    const api = await loadApi();
    const data = await api.weather(13.0827, 80.2707);

    expect(data.current.temp).toBe(30.2);
    expect(data.hourly[1]).toMatchObject({ pop: 60, windDir: 130, code: 61 });
    expect(data.air.usAqi).toBe(55);
    expect(calls.every((c) => c.url.startsWith('https://') && !c.url.includes('/api/'))).toBe(true);
  });

  it('loads Tamil Nadu from the bundled list without a places lookup', async () => {
    const calls = mockFetch((url) => {
      const count = new URL(url).searchParams.get('latitude').split(',').length;
      return json(
        Array.from({ length: count }, (_, i) => ({ current: { temperature_2m: 25 + (i % 10), weather_code: 1, is_day: 1 } })),
      );
    });
    const api = await loadApi();
    const data = await api.region(13.08, 80.27, 'IN-TN');

    expect(data.region).toMatchObject({ name: 'Tamil Nadu', code: 'IN-TN', scope: 'state' });
    expect(data.cities.length).toBeGreaterThanOrEqual(50);
    expect(data.cities[0]).toMatchObject({ name: 'Chennai', current: { temp: 25 } });
    expect(data.cities.every((c) => c.current)).toBe(true);
    // 52 places → two batched forecast requests, and no Nominatim/Overpass calls.
    expect(calls).toHaveLength(2);
    expect(calls.every((c) => c.url.includes('api.open-meteo.com'))).toBe(true);
  });

  it('finds the state of any other point through OpenStreetMap', async () => {
    const calls = mockFetch((url) => {
      if (url.includes('nominatim')) {
        return json({ address: { city: 'Bengaluru', state: 'Karnataka', 'ISO3166-2-lvl4': 'IN-KA', country: 'India', country_code: 'in' } });
      }
      if (url.includes('overpass')) {
        return json({ elements: [{ type: 'node', id: 7, lat: 12.97, lon: 77.59, tags: { name: 'Bengaluru', place: 'city', population: '8443675' } }] });
      }
      return json({ current: { temperature_2m: 24, weather_code: 2, is_day: 1 } });
    });
    const api = await loadApi();
    const data = await api.region(12.97, 77.59, null);

    expect(data.region).toMatchObject({ name: 'Karnataka', code: 'IN-KA' });
    expect(data.cities[0]).toMatchObject({ name: 'Bengaluru', current: { temp: 24 } });
    expect(decodeURIComponent(calls.find((c) => c.url.includes('overpass')).init.body)).toContain('IN-KA');
  });

  it('turns source failures into readable errors', async () => {
    mockFetch(() => json({ error: true }, 500));
    const api = await loadApi();
    await expect(api.weather(1, 2)).rejects.toMatchObject({ name: 'ApiError', message: expect.stringMatching(/Open-Meteo/) });
  });
});

describe('api with a server', () => {
  it('uses the server response when it is valid', async () => {
    const serverBody = { current: { temp: 1 }, hourly: [], daily: [], location: {} };
    const calls = mockFetch(() => json(serverBody));
    const api = await loadApi('https://atmos.onrender.com/');
    expect(await api.weather(1, 2)).toEqual(serverBody);
    expect(calls[0].url).toBe('https://atmos.onrender.com/api/weather?lat=1.0000&lon=2.0000');
  });

  it('falls back to the sources when the server answers with a web page', async () => {
    const calls = mockFetch((url) => {
      if (url.includes('onrender')) return new Response('<!doctype html><html></html>', { status: 200 });
      return url.includes('air-quality') ? json({}) : json(forecastBody);
    });
    const api = await loadApi('https://atmos.onrender.com');
    const data = await api.weather(13.08, 80.27);
    expect(data.current.temp).toBe(30.2);

    // The server is skipped for a while after failing.
    await api.weather(10, 10);
    expect(calls.filter((c) => c.url.includes('onrender'))).toHaveLength(1);
  });

  it('falls back when the server is asleep and times out', async () => {
    vi.useFakeTimers();
    mockFetch((url, init) => {
      if (url.includes('onrender')) {
        return new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason)));
      }
      return url.includes('air-quality') ? json({}) : json(forecastBody);
    });
    const api = await loadApi('https://atmos.onrender.com');
    const pending = api.weather(13.08, 80.27);
    await vi.advanceTimersByTimeAsync(8000);
    expect((await pending).current.temp).toBe(30.2);
  });

  it('passes real client errors through instead of falling back', async () => {
    mockFetch(() => json({ error: { message: '"q" must be at least 2 characters' } }, 400));
    const api = await loadApi('https://atmos.onrender.com');
    await expect(api.search('a')).rejects.toMatchObject({ status: 400 });
  });
});
