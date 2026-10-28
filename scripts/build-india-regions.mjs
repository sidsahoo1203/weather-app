#!/usr/bin/env node
// Builds client/src/data/india/<ISO code>.json: the district headquarters of every Indian
// state and union territory, from OpenStreetMap (Overpass API).
//
//   node scripts/build-india-regions.mjs                    # states that have no file yet
//   node scripts/build-india-regions.mjs --refresh          # rebuild every state
//   node scripts/build-india-regions.mjs IN-TN IN-KL        # rebuild selected states
//   --budget-minutes=45                                     # stop starting new states after this
//
// Each state's file is written as soon as it is built, and a state that keeps failing is
// skipped, so a run against busy public Overpass servers still keeps its progress; the
// next run picks up the missing states. Exits 1 if any requested state is still missing.
//
// Run by .github/workflows/india-regions.yml. Needs Node 20+ and internet access.

import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INDIA_STATES } from '../client/src/data/indiaStates.js';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '../client/src/data/india');
// Public Overpass instances, tried in turn.
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
const ATTEMPTS = 6;
const USER_AGENT = 'Atmos-Weather/1.0 (+https://github.com/sidsahoo1203/weather-app)';
const INDIA_BOUNDS = { south: 6, north: 37.6, west: 68, east: 97.5 };
const MIN_PLACES = 3;
const MAX_FALLBACK_PLACES = 40;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function overpass(query) {
  let lastError;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const url = ENDPOINTS[attempt % ENDPOINTS.length];
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(100_000),
      });
      if (res.ok) return (await res.json()).elements || [];
      lastError = new Error(`${url} responded ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    console.warn(`  retrying after: ${lastError.message}`);
    await sleep(5_000 * (attempt + 1));
  }
  throw lastError;
}

// The state area, matched on the current ISO code or any older alias.
const stateArea = (state) => {
  const codes = [state.code, ...(state.aliases || [])].map((c) => `area["ISO3166-2"="${c}"];`).join('');
  return `(${codes})->.s;`;
};

// The headquarters (admin_centre) of every district, kept only when the node is inside the
// state: neighbouring districts can match the area through shared border ways. One flat
// query, which busy public Overpass servers answer far more reliably than a per-district loop.
const headquartersQuery = (state) => `[out:json][timeout:120];
${stateArea(state)}
rel(area.s)["boundary"="administrative"]["admin_level"="5"]->.ds;
node(r.ds:"admin_centre")(area.s);
out body;`;

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
  const places = (await overpass(headquartersQuery(state)))
    .filter((el) => el.type === 'node' && englishName(el.tags))
    .map((el) => placeFromNode(el, el.tags?.['is_in:district'] ? cleanDistrict(el.tags['is_in:district']) : null));
  const headquarters = places.filter(inIndia).length;

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
    headquarters,
    source: 'OpenStreetMap contributors (ODbL), via Overpass API',
    generatedAt: new Date().toISOString().slice(0, 10),
    cities: unique.map(({ capital, ...p }, i) => ({ id: `${state.code}-${i}`, ...p, ...(capital ? { capital: true } : {}) })),
  };
}

const fileFor = (state) => join(OUT_DIR, `${state.code}.json`);
const exists = (path) => access(path).then(() => true, () => false);

async function main() {
  const args = process.argv.slice(2);
  const refresh = args.includes('--refresh');
  const budget = Number(args.find((a) => a.startsWith('--budget-minutes='))?.split('=')[1]) || Infinity;
  const startedAt = Date.now();
  const wanted = args.filter((a) => a.startsWith('IN-'));
  await mkdir(OUT_DIR, { recursive: true });

  let states = wanted.length ? INDIA_STATES.filter((s) => wanted.includes(s.code)) : INDIA_STATES;
  if (!wanted.length && !refresh) {
    const missing = [];
    for (const state of states) if (!(await exists(fileFor(state)))) missing.push(state);
    states = missing;
    console.log(`${INDIA_STATES.length - missing.length} states already built, ${missing.length} to build.`);
  }

  const built = [];
  const failed = [];
  for (const state of states) {
    if ((Date.now() - startedAt) / 60000 > budget) {
      console.warn(`Time budget of ${budget} min used; leaving ${state.code} and later states for the next run.`);
      failed.push(...states.slice(states.indexOf(state)).map((s) => s.code));
      break;
    }
    console.log(`${state.code} ${state.name}…`);
    try {
      const data = await buildState(state);
      console.log(`  ${data.cities.length} places (${data.headquarters} district headquarters)`);
      if (data.cities.length < 2 && !state.ut) throw new Error('too few places, not writing');
      await writeFile(fileFor(state), `${JSON.stringify(data, null, 1)}\n`);
      built.push([state.code, data.cities.length]);
    } catch (err) {
      console.error(`  FAILED ${state.code}: ${err.message}`);
      failed.push(state.code);
    }
    await sleep(4000);
  }

  const total = built.reduce((sum, [, n]) => sum + n, 0);
  console.log(`\nBuilt ${built.length} states (${total} places).`);
  if (failed.length) {
    console.error(`Still missing: ${failed.join(' ')}. Run again to retry them.`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
