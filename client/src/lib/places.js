/** Converts a listed place (a city in a state, or a state in the All-India view) into a selectable location. */
export function cityToLocation(city, region) {
  if (city.regionCode) {
    // A state in the All-India view: open its main city and that state's list.
    return {
      lat: city.lat,
      lon: city.lon,
      name: city.sub || city.name,
      region: city.name,
      country: 'India',
      regionCode: city.regionCode,
      source: 'city',
    };
  }
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
