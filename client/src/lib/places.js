/** Converts a city from /api/region into a selectable location. */
export function cityToLocation(city, region) {
  return {
    lat: city.lat,
    lon: city.lon,
    name: city.name,
    region: region?.scope === 'state' ? region.name : null,
    country: region?.country ?? null,
    regionCode: region?.code ?? null,
    source: 'city',
  };
}

/** True when two points are within roughly 3 km of each other. */
export const isNear = (a, b, tolerance = 0.03) =>
  Boolean(a && b) && Math.abs(a.lat - b.lat) < tolerance && Math.abs(a.lon - b.lon) < tolerance;
