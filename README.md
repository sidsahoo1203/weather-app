# Atmos: Live Weather Map

A map-first, full-stack weather explorer. The whole screen is a live map; the forecast and a
"cities across your state" list float over it. Click any city or point on the map to see its weather.

**Live:** https://weather-app-rwex.vercel.app

## Features

- **Opens on Tamil Nadu.** Chennai's forecast and live temperatures for all 38 district headquarters and
  major towns load instantly (the list is bundled). Tap the location button to jump to where you are.
- **Every city in any state.** Click anywhere else and Atmos works out which state it is in and puts the
  temperature of every major city and town on the map. You can also browse them as a list, sorted warmest, coolest or A–Z,
  with the hottest and coolest places highlighted.
- **Real interactive map** (Leaflet + OpenStreetMap/CARTO). Click a city pin or any spot on the map and
  its forecast loads. Search a city in another state and the list switches to that state.
- **Rain radar** (RainViewer) with a play/pause timeline of the past two hours.
- **Rich forecast:** current conditions with animated icons, a plain-English summary ("Rain likely around
  4 PM"), a 24-hour temperature curve with rain chances, a 10-day forecast with range bars, and tiles for
  sun position, wind compass, UV, air quality (US AQI + pollutants), humidity, pressure, visibility,
  precipitation, cloud cover and tomorrow.
- **Search** with autocomplete and keyboard navigation (press `/`), plus favourites and recent places.
- °C/°F, light/dark themes, accent colours that follow the weather, shareable URLs (`?lat=&lon=`),
  and a responsive layout that turns into tabs on phones.

## Architecture

```
weather-app/
├── client/          React 18 + Vite SPA → deployed on Vercel
│   ├── vercel.json   Vercel settings (Root Directory = client)
│   └── src/
│       ├── components/   Map, panels, charts, animated icons
│       ├── hooks/        TanStack Query data hooks, geolocation, saved places
│       ├── lib/          API client, units, time zones, colour scales, summaries
│       └── context/      Units + theme settings
├── server/          Node 20+ / Express 5 API → deployed on Render
│   └── src/
│       ├── services/     weather, geocoding, region (state cities)
│       ├── lib/          TTL cache, fetch helper, validation, errors
│       └── routes/       /api endpoints
└── render.yaml      Render Blueprint for server/
```

The app gets its data from these free, keyless sources:

| Data | Source |
| --- | --- |
| Forecast, current conditions, air quality | [Open-Meteo](https://open-meteo.com/) |
| Place search | Open-Meteo Geocoding |
| Reverse geocoding (name, state, ISO code) | [Nominatim](https://nominatim.org/) (OpenStreetMap), throttled to 1 req/s |
| Cities and towns in a state | [Overpass API](https://overpass-api.de/) (OpenStreetMap) |

**Two ways to fetch.** When `VITE_API_URL` points at the Atmos API, the browser asks the API first (with an
8-second timeout). If the API is not configured, asleep, unreachable or answers with anything but valid
data, the browser fetches the same sources directly (all of them allow browser requests) and skips the API
for two minutes. The site therefore keeps working even when the free Render service is sleeping.

The server caches responses in memory: weather for 10 min, place lookups for days, city lists for a week.
It collapses identical requests that arrive at the same time into one upstream call, fetches current
weather for all of a state's cities in a single batched call, and rate-limits clients. You don't need any
API keys. Map tiles (CARTO) and radar (RainViewer) load directly in the browser.

### API

| Endpoint | Returns |
| --- | --- |
| `GET /api/health` | `{ ok, uptime }` (used by Render's health check) |
| `GET /api/weather?lat=&lon=` | Current conditions, 48 h hourly, 10-day daily, air quality |
| `GET /api/geocode/search?q=` | Up to 8 matching places |
| `GET /api/geocode/reverse?lat=&lon=` | `{ name, district, state, stateCode, country, countryCode }` |
| `GET /api/region?lat=&lon=` | The state containing the point and its top 40 cities with current weather |

## Local development

Requires Node 20+.

```bash
npm run install:all     # installs server/ and client/
npm run dev:server      # API on http://localhost:8080
npm run dev:client      # app on http://localhost:5173 (proxies /api to :8080)
```

```bash
npm test                # server (node:test + supertest) and client (vitest) tests
npm run lint
```

## Deployment

Deploy the API first, because the client needs its URL.

### 1. API on Render

1. In [Render](https://dashboard.render.com), choose **New → Blueprint** and select this repository.
   Render reads `render.yaml` and creates the `atmos-api` web service (root `server/`, `npm start`,
   health check `/api/health`).
2. Check the `CLIENT_ORIGIN` variable. It already allows `https://weather-app-rwex.vercel.app` and its
   preview URLs. Add any custom domain, comma-separated.
3. After the deploy, open `https://<your-service>.onrender.com/api/health`. It should return `{"ok":true,...}`.

To set the service up by hand instead: **New → Web Service**, Root Directory `server`, Build Command
`npm ci --omit=dev`, Start Command `npm start`, plus the env vars from `render.yaml`.

> Render's free plan puts the service to sleep after about 15 idle minutes, so the first request after that
> can take 30–60 s. The app tells users when this happens.

### 2. Client on Vercel

The client works on its own. `VITE_API_URL` is optional and only adds the API's caching.


1. Import the repository in Vercel and set **Root Directory** to `client` (Framework Preset: Vite;
   leave the build settings at their defaults). `client/vercel.json` adds the SPA rewrite and asset caching.
2. Under **Environment Variables**, add `VITE_API_URL` = `https://<your-service>.onrender.com`
   (no trailing slash), then deploy.
3. Add the Vercel URL to `CLIENT_ORIGIN` on Render.

## Credits

Weather data by Open-Meteo (CC BY 4.0) · Map data © OpenStreetMap contributors · Tiles © CARTO · Radar by RainViewer.
