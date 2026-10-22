// Colour scales and category bands shared by tiles, charts and map markers.

const TEMP_STOPS = [
  [-20, [99, 102, 241]],
  [-5, [96, 165, 250]],
  [5, [56, 189, 248]],
  [14, [45, 212, 191]],
  [21, [163, 230, 53]],
  [27, [250, 204, 21]],
  [33, [251, 146, 60]],
  [40, [239, 68, 68]],
  [46, [190, 18, 60]],
];

/** Maps a °C temperature to an RGB colour along a cool→hot ramp. */
export function tempColor(c) {
  if (!Number.isFinite(c)) return 'rgb(148, 163, 184)';
  if (c <= TEMP_STOPS[0][0]) return `rgb(${TEMP_STOPS[0][1].join(', ')})`;
  for (let i = 1; i < TEMP_STOPS.length; i++) {
    const [t1, c1] = TEMP_STOPS[i];
    if (c <= t1) {
      const [t0, c0] = TEMP_STOPS[i - 1];
      const f = (c - t0) / (t1 - t0);
      return `rgb(${c0.map((v, k) => Math.round(v + (c1[k] - v) * f)).join(', ')})`;
    }
  }
  return `rgb(${TEMP_STOPS.at(-1)[1].join(', ')})`;
}

export const tempGradient = (min, max) => {
  const steps = 6;
  const stops = Array.from({ length: steps + 1 }, (_, i) => {
    const t = min + ((max - min) * i) / steps;
    return `${tempColor(t)} ${Math.round((i / steps) * 100)}%`;
  });
  return `linear-gradient(90deg, ${stops.join(', ')})`;
};

const AQI_BANDS = [
  { max: 50, label: 'Good', color: '#22c55e', advice: 'Air quality is great. Enjoy the outdoors.' },
  { max: 100, label: 'Moderate', color: '#eab308', advice: 'Acceptable; unusually sensitive people should limit long exertion.' },
  { max: 150, label: 'Unhealthy for sensitive groups', color: '#f97316', advice: 'Sensitive groups should reduce prolonged outdoor exertion.' },
  { max: 200, label: 'Unhealthy', color: '#ef4444', advice: 'Everyone may feel effects; limit time outdoors.' },
  { max: 300, label: 'Very unhealthy', color: '#a855f7', advice: 'Health alert: avoid outdoor activity.' },
  { max: Infinity, label: 'Hazardous', color: '#9f1239', advice: 'Emergency conditions: stay indoors.' },
];

export const aqiBand = (aqi) => AQI_BANDS.find((band) => aqi <= band.max) ?? AQI_BANDS.at(-1);

const UV_BANDS = [
  { max: 2, label: 'Low', color: '#22c55e', advice: 'No protection needed.' },
  { max: 5, label: 'Moderate', color: '#eab308', advice: 'Seek shade around midday.' },
  { max: 7, label: 'High', color: '#f97316', advice: 'Sunscreen, hat and sunglasses.' },
  { max: 10, label: 'Very high', color: '#ef4444', advice: 'Avoid the sun between 11 and 4.' },
  { max: Infinity, label: 'Extreme', color: '#a855f7', advice: 'Stay inside around midday.' },
];

export const uvBand = (uv) => UV_BANDS.find((band) => uv <= band.max) ?? UV_BANDS.at(-1);
