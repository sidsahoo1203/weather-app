const list = (value) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const overpassUrls = list(process.env.OVERPASS_URLS);

export const config = {
  port: Number(process.env.PORT) || 8080,
  env: process.env.NODE_ENV || 'development',
  // Comma-separated list of allowed browser origins. Supports "*" wildcards,
  // e.g. "https://weather-app-six-lake-76.vercel.app,https://weather-app-*.vercel.app".
  // When empty every origin is allowed (handy for local development).
  clientOrigins: list(process.env.CLIENT_ORIGIN),
  // Nominatim and Overpass ask every client to identify itself.
  userAgent:
    process.env.UPSTREAM_USER_AGENT ||
    'Atmos-Weather/1.0 (+https://github.com/sidsahoo1203/weather-app)',
  overpassUrls: overpassUrls.length
    ? overpassUrls
    : ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'],
  rateLimitPerMinute: Number(process.env.RATE_LIMIT_PER_MINUTE) || 120,
};
