// All 28 states and 8 union territories of India.
// `code` is the current ISO 3166-2 code. `aliases` lists older codes that OpenStreetMap or
// Nominatim may still return (ISO renamed several in 2023). `capital` is the seat of
// government. `pin` is the point shown for the state in the All-India view; it is the
// capital except where capitals coincide (Chandigarh serves Punjab and Haryana too).
// Plain data with no imports, so scripts/build-india-regions.mjs can load it in Node.

export const INDIA_STATES = [
  // States
  { code: 'IN-AP', name: 'Andhra Pradesh', capital: { name: 'Amaravati', lat: 16.5131, lon: 80.5165 } },
  { code: 'IN-AR', name: 'Arunachal Pradesh', capital: { name: 'Itanagar', lat: 27.0844, lon: 93.6053 } },
  { code: 'IN-AS', name: 'Assam', capital: { name: 'Dispur', lat: 26.1433, lon: 91.7898 } },
  { code: 'IN-BR', name: 'Bihar', capital: { name: 'Patna', lat: 25.5941, lon: 85.1376 } },
  { code: 'IN-CG', aliases: ['IN-CT'], name: 'Chhattisgarh', capital: { name: 'Raipur', lat: 21.2514, lon: 81.6296 } },
  { code: 'IN-GA', name: 'Goa', capital: { name: 'Panaji', lat: 15.4909, lon: 73.8278 } },
  { code: 'IN-GJ', name: 'Gujarat', capital: { name: 'Gandhinagar', lat: 23.2156, lon: 72.6369 } },
  {
    code: 'IN-HR',
    name: 'Haryana',
    capital: { name: 'Chandigarh', lat: 30.7333, lon: 76.7794 },
    pin: { name: 'Hisar', lat: 29.1492, lon: 75.7217 },
  },
  { code: 'IN-HP', name: 'Himachal Pradesh', capital: { name: 'Shimla', lat: 31.1048, lon: 77.1734 } },
  { code: 'IN-JH', name: 'Jharkhand', capital: { name: 'Ranchi', lat: 23.3441, lon: 85.3096 } },
  { code: 'IN-KA', name: 'Karnataka', capital: { name: 'Bengaluru', lat: 12.9716, lon: 77.5946 } },
  { code: 'IN-KL', name: 'Kerala', capital: { name: 'Thiruvananthapuram', lat: 8.5241, lon: 76.9366 } },
  { code: 'IN-MP', name: 'Madhya Pradesh', capital: { name: 'Bhopal', lat: 23.2599, lon: 77.4126 } },
  { code: 'IN-MH', name: 'Maharashtra', capital: { name: 'Mumbai', lat: 19.076, lon: 72.8777 } },
  { code: 'IN-MN', name: 'Manipur', capital: { name: 'Imphal', lat: 24.817, lon: 93.9368 } },
  { code: 'IN-ML', name: 'Meghalaya', capital: { name: 'Shillong', lat: 25.5788, lon: 91.8933 } },
  { code: 'IN-MZ', name: 'Mizoram', capital: { name: 'Aizawl', lat: 23.7271, lon: 92.7176 } },
  { code: 'IN-NL', name: 'Nagaland', capital: { name: 'Kohima', lat: 25.6751, lon: 94.1086 } },
  { code: 'IN-OD', aliases: ['IN-OR'], name: 'Odisha', capital: { name: 'Bhubaneswar', lat: 20.2961, lon: 85.8245 } },
  {
    code: 'IN-PB',
    name: 'Punjab',
    capital: { name: 'Chandigarh', lat: 30.7333, lon: 76.7794 },
    pin: { name: 'Ludhiana', lat: 30.901, lon: 75.8573 },
  },
  { code: 'IN-RJ', name: 'Rajasthan', capital: { name: 'Jaipur', lat: 26.9124, lon: 75.7873 } },
  { code: 'IN-SK', name: 'Sikkim', capital: { name: 'Gangtok', lat: 27.3389, lon: 88.6065 } },
  { code: 'IN-TN', name: 'Tamil Nadu', capital: { name: 'Chennai', lat: 13.0827, lon: 80.2707 } },
  { code: 'IN-TG', aliases: ['IN-TS'], name: 'Telangana', capital: { name: 'Hyderabad', lat: 17.385, lon: 78.4867 } },
  { code: 'IN-TR', name: 'Tripura', capital: { name: 'Agartala', lat: 23.8315, lon: 91.2868 } },
  { code: 'IN-UP', name: 'Uttar Pradesh', capital: { name: 'Lucknow', lat: 26.8467, lon: 80.9462 } },
  { code: 'IN-UK', aliases: ['IN-UT'], name: 'Uttarakhand', capital: { name: 'Dehradun', lat: 30.3165, lon: 78.0322 } },
  { code: 'IN-WB', name: 'West Bengal', capital: { name: 'Kolkata', lat: 22.5726, lon: 88.3639 } },
  // Union territories
  { code: 'IN-AN', name: 'Andaman and Nicobar Islands', ut: true, capital: { name: 'Sri Vijaya Puram', lat: 11.6234, lon: 92.7265 } },
  { code: 'IN-CH', name: 'Chandigarh', ut: true, capital: { name: 'Chandigarh', lat: 30.7333, lon: 76.7794 } },
  {
    code: 'IN-DH',
    aliases: ['IN-DN', 'IN-DD'],
    name: 'Dadra and Nagar Haveli and Daman and Diu',
    ut: true,
    capital: { name: 'Daman', lat: 20.3974, lon: 72.8328 },
  },
  { code: 'IN-DL', name: 'Delhi', ut: true, capital: { name: 'New Delhi', lat: 28.6139, lon: 77.209 } },
  { code: 'IN-JK', name: 'Jammu and Kashmir', ut: true, capital: { name: 'Srinagar', lat: 34.0837, lon: 74.7973 } },
  { code: 'IN-LA', name: 'Ladakh', ut: true, capital: { name: 'Leh', lat: 34.1526, lon: 77.5771 } },
  { code: 'IN-LD', name: 'Lakshadweep', ut: true, capital: { name: 'Kavaratti', lat: 10.5626, lon: 72.6369 } },
  { code: 'IN-PY', name: 'Puducherry', ut: true, capital: { name: 'Puducherry', lat: 11.9416, lon: 79.8083 } },
];

const BY_CODE = new Map();
for (const state of INDIA_STATES) {
  BY_CODE.set(state.code, state);
  for (const alias of state.aliases || []) BY_CODE.set(alias, state);
}

/** The state for an ISO 3166-2 code, accepting old codes such as IN-OR for Odisha. */
export const findIndiaState = (code) => (code ? BY_CODE.get(code.toUpperCase()) ?? null : null);

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
