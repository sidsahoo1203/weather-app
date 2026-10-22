// WMO weather interpretation codes, as returned by Open-Meteo.
// `kind` picks the animated icon, `mood` picks the colour palette.
const CODES = {
  0: { label: 'Clear sky', kind: 'clear', mood: 'clear' },
  1: { label: 'Mostly clear', kind: 'clear', mood: 'clear' },
  2: { label: 'Partly cloudy', kind: 'partly', mood: 'clear' },
  3: { label: 'Overcast', kind: 'cloudy', mood: 'cloudy' },
  45: { label: 'Fog', kind: 'fog', mood: 'fog' },
  48: { label: 'Freezing fog', kind: 'fog', mood: 'fog' },
  51: { label: 'Light drizzle', kind: 'drizzle', mood: 'rain' },
  53: { label: 'Drizzle', kind: 'drizzle', mood: 'rain' },
  55: { label: 'Heavy drizzle', kind: 'drizzle', mood: 'rain' },
  56: { label: 'Freezing drizzle', kind: 'sleet', mood: 'snow' },
  57: { label: 'Heavy freezing drizzle', kind: 'sleet', mood: 'snow' },
  61: { label: 'Light rain', kind: 'rain', mood: 'rain' },
  63: { label: 'Rain', kind: 'rain', mood: 'rain' },
  65: { label: 'Heavy rain', kind: 'rain', mood: 'rain' },
  66: { label: 'Freezing rain', kind: 'sleet', mood: 'snow' },
  67: { label: 'Heavy freezing rain', kind: 'sleet', mood: 'snow' },
  71: { label: 'Light snow', kind: 'snow', mood: 'snow' },
  73: { label: 'Snow', kind: 'snow', mood: 'snow' },
  75: { label: 'Heavy snow', kind: 'snow', mood: 'snow' },
  77: { label: 'Snow grains', kind: 'snow', mood: 'snow' },
  80: { label: 'Light showers', kind: 'showers', mood: 'rain' },
  81: { label: 'Showers', kind: 'showers', mood: 'rain' },
  82: { label: 'Violent showers', kind: 'showers', mood: 'rain' },
  85: { label: 'Snow showers', kind: 'snow', mood: 'snow' },
  86: { label: 'Heavy snow showers', kind: 'snow', mood: 'snow' },
  95: { label: 'Thunderstorm', kind: 'thunder', mood: 'storm' },
  96: { label: 'Thunderstorm with hail', kind: 'thunder', mood: 'storm' },
  99: { label: 'Severe thunderstorm', kind: 'thunder', mood: 'storm' },
};

const UNKNOWN = { label: 'Unknown', kind: 'cloudy', mood: 'cloudy' };

export function describeWeather(code, isDay = true) {
  const info = CODES[code] ?? UNKNOWN;
  if (isDay || info.mood !== 'clear') return info;
  return { ...info, label: code === 0 ? 'Clear night' : info.label, mood: 'night' };
}

const WET = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
const SNOWY = new Set([71, 73, 75, 77, 85, 86]);

export const isWet = (code) => WET.has(code);
export const isSnowy = (code) => SNOWY.has(code);
