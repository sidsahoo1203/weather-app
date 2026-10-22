// Tamil Nadu: all 38 district headquarters plus major towns and hill stations.
// Bundled so the default view loads instantly without a places lookup.
// [name, lat, lon, population (2011 census, approx.), place]
const CITIES = [
  ['Chennai', 13.0827, 80.2707, 4646732, 'city'],
  ['Coimbatore', 11.0168, 76.9558, 1050721, 'city'],
  ['Madurai', 9.9252, 78.1198, 1017865, 'city'],
  ['Tiruchirappalli', 10.7905, 78.7047, 847387, 'city'],
  ['Tiruppur', 11.1085, 77.3411, 444352, 'city'],
  ['Salem', 11.6643, 78.146, 829267, 'city'],
  ['Erode', 11.341, 77.7172, 498129, 'city'],
  ['Tirunelveli', 8.7139, 77.7567, 473637, 'city'],
  ['Vellore', 12.9165, 79.1325, 504079, 'city'],
  ['Thoothukudi', 8.7642, 78.1348, 237830, 'city'],
  ['Dindigul', 10.3624, 77.9695, 207327, 'city'],
  ['Thanjavur', 10.787, 79.1378, 222943, 'city'],
  ['Hosur', 12.7409, 77.8253, 116821, 'city'],
  ['Nagercoil', 8.1833, 77.4119, 224849, 'city'],
  ['Kanchipuram', 12.8342, 79.7036, 164265, 'city'],
  ['Kumbakonam', 10.9617, 79.3881, 140156, 'city'],
  ['Karur', 10.9601, 78.0766, 70980, 'city'],
  ['Cuddalore', 11.748, 79.7714, 173636, 'city'],
  ['Tiruvannamalai', 12.2253, 79.0747, 145278, 'city'],
  ['Sivakasi', 9.4533, 77.8024, 71040, 'town'],
  ['Karaikudi', 10.0731, 78.7806, 106714, 'town'],
  ['Pudukkottai', 10.3833, 78.8001, 143347, 'town'],
  ['Nagapattinam', 10.7672, 79.8449, 102905, 'town'],
  ['Viluppuram', 11.9401, 79.4861, 96253, 'town'],
  ['Pollachi', 10.6609, 77.0048, 90180, 'town'],
  ['Rajapalayam', 9.4532, 77.5539, 130442, 'town'],
  ['Ambur', 12.7904, 78.7166, 114608, 'town'],
  ['Tambaram', 12.9249, 80.1, 174787, 'town'],
  ['Neyveli', 11.5432, 79.4776, 105687, 'town'],
  ['Krishnagiri', 12.5186, 78.2137, 71323, 'town'],
  ['Dharmapuri', 12.1211, 78.1582, 68619, 'town'],
  ['Namakkal', 11.2189, 78.1674, 55145, 'town'],
  ['Tiruvarur', 10.7725, 79.6368, 58301, 'town'],
  ['Mayiladuthurai', 11.1018, 79.6521, 85632, 'town'],
  ['Ramanathapuram', 9.3639, 78.8395, 61440, 'town'],
  ['Sivaganga', 9.8433, 78.4809, 40403, 'town'],
  ['Virudhunagar', 9.568, 77.9624, 72296, 'town'],
  ['Theni', 10.0104, 77.4768, 94810, 'town'],
  ['Tenkasi', 8.9594, 77.3161, 70545, 'town'],
  ['Kallakurichi', 11.738, 78.9639, 52508, 'town'],
  ['Chengalpattu', 12.6819, 79.9888, 62579, 'town'],
  ['Tiruvallur', 13.1231, 79.912, 56074, 'town'],
  ['Ranipet', 12.9224, 79.3332, 50764, 'town'],
  ['Tirupattur', 12.4964, 78.5654, 64125, 'town'],
  ['Perambalur', 11.2342, 78.8807, 49648, 'town'],
  ['Ariyalur', 11.1401, 79.0786, 28902, 'town'],
  ['Udhagamandalam (Ooty)', 11.4102, 76.695, 88430, 'town'],
  ['Kodaikanal', 10.2381, 77.4892, 36501, 'town'],
  ['Rameswaram', 9.2876, 79.3129, 44856, 'town'],
  ['Kanyakumari', 8.0883, 77.5385, 29761, 'town'],
  ['Kovilpatti', 9.1719, 77.8688, 95057, 'town'],
  ['Mamallapuram', 12.6208, 80.1945, 15172, 'town'],
];

export const TAMIL_NADU = {
  region: { name: 'Tamil Nadu', code: 'IN-TN', country: 'India', countryCode: 'IN', scope: 'state' },
  cities: CITIES.map(([name, lat, lon, population, place], i) => ({
    id: `tn-${i}`,
    name,
    lat,
    lon,
    population,
    place,
  })),
};

/** Where the app opens on a first visit. */
export const DEFAULT_LOCATION = {
  lat: 13.0827,
  lon: 80.2707,
  name: 'Chennai',
  region: 'Tamil Nadu',
  country: 'India',
  regionCode: 'IN-TN',
  source: 'default',
};

/** Regions bundled with the app, keyed by ISO 3166-2 code. */
export const BUNDLED_REGIONS = { 'IN-TN': TAMIL_NADU };
