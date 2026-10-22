// All values arrive in metric (°C, km/h, mm, hPa, metres) and are converted for display.

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

export const toUnitTemp = (c, units) => (units === 'imperial' ? (c * 9) / 5 + 32 : c);

export function formatTemp(c, units, { degree = true } = {}) {
  if (!isNum(c)) return '--';
  const value = Math.round(toUnitTemp(c, units));
  // Avoid "-0°".
  return `${Object.is(value, -0) ? 0 : value}${degree ? '°' : ''}`;
}

export function formatWind(kmh, units) {
  if (!isNum(kmh)) return '--';
  return units === 'imperial' ? `${Math.round(kmh / 1.609344)} mph` : `${Math.round(kmh)} km/h`;
}

export function formatPrecip(mm, units) {
  if (!isNum(mm)) return '--';
  if (units === 'imperial') return `${(mm / 25.4).toFixed(mm > 0 && mm < 2.54 ? 2 : 1)} in`;
  return `${mm < 10 ? mm.toFixed(1) : Math.round(mm)} mm`;
}

export function formatPressure(hpa, units) {
  if (!isNum(hpa)) return '--';
  return units === 'imperial' ? `${(hpa * 0.02953).toFixed(2)} inHg` : `${Math.round(hpa)} hPa`;
}

export function formatVisibility(m, units) {
  if (!isNum(m)) return '--';
  if (units === 'imperial') {
    const mi = m / 1609.344;
    return `${mi >= 10 ? Math.round(mi) : mi.toFixed(1)} mi`;
  }
  const km = m / 1000;
  return `${km >= 10 ? Math.round(km) : km.toFixed(1)} km`;
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

export const compassPoint = (deg) =>
  isNum(deg) ? COMPASS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16] : '--';

export function formatCoords(lat, lon) {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}°${ns}, ${Math.abs(lon).toFixed(2)}°${ew}`;
}

/** Beaufort-style wording for a wind speed in km/h. */
export function windWord(kmh) {
  if (!isNum(kmh)) return '';
  if (kmh < 2) return 'Calm';
  if (kmh < 12) return 'Light breeze';
  if (kmh < 29) return 'Moderate breeze';
  if (kmh < 50) return 'Strong breeze';
  if (kmh < 75) return 'Gale';
  return 'Storm-force';
}
