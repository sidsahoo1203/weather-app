#!/usr/bin/env node
// Builds client/src/data/india/<ISO code>.json: the district headquarters of every Indian
// state and union territory, from OpenStreetMap (Overpass API).
//
//   node scripts/build-india-regions.mjs            # all states
//   node scripts/build-india-regions.mjs IN-TN IN-KL  # selected states
//
// Run by .github/workflows/india-regions.yml. Needs Node 20+ and internet access.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INDIA_STATES } from '../client/src/data/indiaStates.js';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '../client/src/data/india');
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const USER_AGENT = 'Atmos-Weather/1.0 (+https://github.com/sidsahoo1203/weather-app)';
const INDIA_BOUNDS = { south: 6, north: 37.6, west: 68, east: 97.5 };
const MIN_PLACES = 3;
const MAX_FALLBACK_PLACES = 40;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function overpass(query) {
  let lastError;
  for (let attempt = 0; attempt < 6; attempt++) {
    const url = ENDPOINTS[attempt % ENDPOINTS.length];
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(200_000),
      });
      if (res.ok) return (await res.json()).elements || [];
      lastError = new Error(`${url} responded ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    console.warn(`  retrying after: ${lastError.message}`);
    await sleep(10_000 * (attempt + 1));
  }
  throw lastError;
}

// The state area, matched on the current ISO code or any older alias.
const stateArea = (state) => {
  const codes = [state.code, ...(state.aliases || [])].map((c) => `area["ISO3166-2"="${c}"];`).join('');
  return `(${codes})->.s;`;
};

// Each district relation followed by its admin_centre node, if that node is inside the state
// (neighbouring districts can match the area through shared border ways).
const districtsQuery = (state) => `[out:json][timeout:180];
${stateArea(state)}
rel(area.s)["boundary"="administrative"]["admin_level"="5"]->.ds;
foreach.ds->.d(
  .d out tags;
  node(r.d:"admin_centre")(area.s);
  out body;
);`;

const townsQuery = (state) => `[out:json][timeout:180];
${stateArea(state)}
node(area.s)["place"~"^(city|town)$"]["name"];
out body;`;

const englishName = (tags = {}) => tags['name:en'] || tags.name;
const cleanDistrict = (name = '') => name.replace(/\s+(district|District)$/, '').trim();
const population = (tags = {}) => {
  const n = parseInt(String(tags.population ?? '').replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
};
const inIndia = ({ lat, lon }) =>
  lat >= INDIA_BOUNDS.south && lat <= INDIA_BOUNDS.north && lon >= INDIA_BOUNDS.west && lon <= INDIA_BOUNDS.east;
const round = (n) => Math.round(n * 10000) / 10000;

function placeFromNode(node, district) {
  return {
    name: englishName(node.tags),
    district: district ?? null,
    lat: round(node.lat),
    lon: round(node.lon),
    population: population(node.tags),
    place: node.tags?.place || 'town',
  };
}

async function buildState(state) {
  const places = [];
  const districts = [];
  let current = null;

  for (const el of await overpass(districtsQuery(state))) {
    if (el.type === 'relation') {
      current = cleanDistrict(englishName(el.tags));
      districts.push(current);
    } else if (el.type === 'node' && current && englishName(el.tags)) {
      places.push(placeFromNode(el, current));
    }
  }

  if (places.length < MIN_PLACES) {
    // No district data (small union territories) or no admin centres: use the largest towns.
    await sleep(3000);
    const towns = (await overpass(townsQuery(state)))
      .filter((el) => el.type === 'node' && englishName(el.tags))
      .map((el) => placeFromNode(el, null))
      .sort((a, b) => (a.place === 'city') === (b.place === 'city') ? b.population - a.population : a.place === 'city' ? -1 : 1)
      .slice(0, MAX_FALLBACK_PLACES);
    places.push(...towns);
  }

  // De-duplicate by name and position, then mark the capital (adding it if OSM lacked it).
  const seen = new Set();
  const unique = [];
  for (const p of places.filter(inIndia)) {
    const nameKey = p.name.toLowerCase();
    const posKey = `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`;
    if (seen.has(nameKey) || seen.has(posKey)) continue;
    seen.add(nameKey);
    seen.add(posKey);
    unique.push(p);
  }
  const { capital } = state;
  const near = (p) => Math.abs(p.lat - capital.lat) < 0.08 && Math.abs(p.lon - capital.lon) < 0.08;
  const existing = unique.find((p) => p.name.toLowerCase() === capital.name.toLowerCase()) || unique.find(near);
  if (existing) existing.capital = true;
  else unique.push({ ...capital, district: null, population: 0, place: 'city', capital: true });

  unique.sort((a, b) => Number(Boolean(b.capital)) - Number(Boolean(a.capital)) || b.population - a.population || a.name.localeCompare(b.name));
  return {
    code: state.code,
    name: state.name,
    districts: districts.length,
    source: 'OpenStreetMap contributors (ODbL), via Overpass API',
    generatedAt: new Date().toISOString().slice(0, 10),
    cities: unique.map(({ capital, ...p }, i) => ({ id: `${state.code}-${i}`, ...p, ...(capital ? { capital: true } : {}) })),
  };
}

async function main() {
  const wanted = process.argv.slice(2);
  const states = wanted.length ? INDIA_STATES.filter((s) => wanted.includes(s.code)) : INDIA_STATES;
  await mkdir(OUT_DIR, { recursive: true });

  const summary = [];
  for (const state of states) {
    console.log(`${state.code} ${state.name}…`);
    const data = await buildState(state);
    const withDistrict = data.cities.filter((c) => c.district).length;
    console.log(`  ${data.cities.length} places (${withDistrict} district HQs of ${data.districts} districts)`);
    if (data.cities.length < 2 && !state.ut) throw new Error(`${state.name}: too few places, refusing to write`);
    await writeFile(join(OUT_DIR, `${state.code}.json`), `${JSON.stringify(data, null, 1)}\n`);
    summary.push([state.code, data.cities.length]);
    await sleep(4000);
  }

  const total = summary.reduce((sum, [, n]) => sum + n, 0);
  console.log(`\nWrote ${summary.length} states, ${total} places.`);
  if (!wanted.length && total < 400) throw new Error(`Only ${total} places in total; the data looks incomplete.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
