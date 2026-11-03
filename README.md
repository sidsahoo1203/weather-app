# Atmos: Live Weather Map

A live weather explorer for India and the rest of the world, built around a full-screen interactive map.
Pick any city, district or spot on the map and get its live conditions, a 24-hour outlook, a 10-day
forecast, air quality and more.

**Live site:** https://weather-app-six-lake-76.vercel.app

---

## About the project

This project started as a small single-card weather app (type a city, see the temperature). I rebuilt it
into a full-stack, map-first weather app:

- a **React** front end styled with **Tailwind CSS**, hosted on **Vercel**
- a **Node.js / Express** API, set up for **Render**
- **real, live weather data** with no API keys: Open-Meteo forecasts and OpenStreetMap places and maps
- **every Indian state built in**: about 800 district headquarters across all 28 states and 8 union
  territories, plus an All-India view

The app keeps working on its own: if the API server is asleep or unreachable, the browser fetches the same
live data directly.

---

## What you'll see

When you open the site it starts on **Chennai, Tamil Nadu**:

- **A full-screen map** with a live temperature pin on every district headquarters in the state. Pins are
  colour-coded from cool blue to hot red.
- **The forecast panel** (left):
  - **Now:** the current temperature with an animated weather icon, "feels like", today's high and low,
    and the chance of precipitation, humidity and wind.
  - **A one-line summary**, for example *"Rain likely around 4 PM. High of 31°, low of 24°."*
  - **Next 24 hours:** a chart with **Temperature**, **Precipitation** and **Wind** tabs, plus sunrise and
    sunset times.
  - **10-day forecast**, with temperature range bars and rain chances.
  - **Conditions:** a sun-path arc with daylight hours, a wind compass with gusts, UV index, air quality
    (AQI with PM2.5, PM10, O₃, NO₂), humidity and dew point, precipitation, pressure, visibility,
    cloud cover and tomorrow's outlook.
- **The state panel** (right): every city in the state with its live temperature and conditions, the
  warmest and coolest place at a glance, and sorting by Warmest, Coolest or A–Z.
- **Map controls:** zoom, jump to your location, **satellite view**, and **rain radar** with a playable
  timeline of the last two hours.

The colours follow the weather: sunny amber, rainy blue, stormy purple, night indigo. On a phone the layout
becomes a map on top with **Forecast** and **State** tabs below.

---

## What you can do

- **Explore any Indian state.** Click a district pin, or click anywhere on the map. The forecast switches
  to that place and the panel lists every district in its state with live temperatures.
- **See all of India at once.** Switch the panel to **All India** for one live pin per state and union
  territory. Click a state to open its districts.
- **Search any place in the world.** Use the search bar (or press `/`): cities, towns or landmarks, with
  suggestions as you type.
- **Use your location.** Tap the location button to see the weather where you are.
- **Check the rain radar.** Turn on radar to watch rain move over the last two hours.
- **Switch the map style**, between the dark or light map and satellite imagery.
- **Save favourites.** Star a place to keep it in the search list, next to your recently viewed places.
- **Change units and theme:** °C or °F, dark or light.
- **Share a forecast.** The page address includes the location, so a copied link opens the same place.

---

## What's inside the project

```
weather-app/
├── client/                React app (Vercel)
│   └── src/
│       ├── components/    Map, forecast panel, hourly chart, 10-day list, condition tiles,
│       │                  state panel, search, animated weather icons
│       ├── data/          All 36 Indian states and union territories, with their district
│       │                  headquarters (one file per state, loaded only when needed)
│       ├── hooks/         Data loading and caching, geolocation, saved places
│       ├── lib/           Weather and map data access, units, time zones, colour scales,
│       │                  forecast summaries
│       └── index.css      Tailwind theme: colours, dark/light mode, animations
├── server/                Express API (Render): weather, place search, reverse geocoding and
│                          state cities, with caching and rate limiting
├── scripts/               Builds the India district data from OpenStreetMap
└── .github/workflows/     GitHub Action that refreshes the India data automatically
```

### Built with

| Area | Tools |
| --- | --- |
| Front end | React 18, Vite, Tailwind CSS v4, TanStack Query, Leaflet / React Leaflet, Lucide icons |
| Back end | Node.js, Express 5, Helmet, CORS, rate limiting, in-memory caching |
| Weather | [Open-Meteo](https://open-meteo.com/): forecasts, current conditions, air quality, place search |
| Places | [OpenStreetMap](https://www.openstreetmap.org/): Nominatim and the Overpass API |
| Maps | OpenStreetMap and Esri map and satellite tiles, [RainViewer](https://www.rainviewer.com/) radar |
| Hosting | Vercel (site), Render (API), GitHub Actions (data refresh) |
| Quality | Automated tests for the API and the app (node:test, Supertest, Vitest) and ESLint |

### Under the hood

- **Fast first load.** The map library loads separately after the forecast appears. Each state's district
  list is a small file downloaded only when you open that state.
- **Few requests.** Live temperatures for a whole state come from one or two batched requests. The All-India
  view needs a single request.
- **Resilient.** If the API is unavailable, the app fetches the data directly. If a map tile service fails,
  the map switches to another one.
- **No API keys.** Every data source used is free and keyless.

---

## Credits

Weather data by [Open-Meteo](https://open-meteo.com/) (CC BY 4.0) · Map and place data ©
[OpenStreetMap](https://www.openstreetmap.org/copyright) contributors · Map tiles © OpenStreetMap, Esri ·
Rain radar by [RainViewer](https://www.rainviewer.com/).
