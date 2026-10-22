import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { TopBar } from './components/TopBar.jsx';
import { MapView } from './components/MapView.jsx';
import { WeatherPanel } from './components/WeatherPanel.jsx';
import { RegionPanel } from './components/RegionPanel.jsx';
import { useWeather, usePlace, useRegion } from './hooks/queries.js';
import { useGeolocation } from './hooks/useGeolocation.js';
import { useSavedPlaces } from './hooks/useSavedPlaces.js';
import { describeWeather } from './lib/weatherCodes.js';
import { formatTemp } from './lib/units.js';
import { load, save } from './lib/storage.js';
import { api } from './lib/api.js';
import { DEFAULT_LOCATION } from './data/tamilNadu.js';
import { useSettings } from './context/settings.js';
import './App.css';

function readUrlLocation() {
  const params = new URLSearchParams(window.location.search);
  const lat = Number(params.get('lat'));
  const lon = Number(params.get('lon'));
  if (!params.has('lat') || !params.has('lon') || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon, name: params.get('name') || null, region: null, country: null, source: 'url' };
}

function writeUrlLocation(loc) {
  const params = new URLSearchParams({ lat: loc.lat.toFixed(4), lon: loc.lon.toFixed(4) });
  if (loc.name) params.set('name', loc.name);
  window.history.replaceState(null, '', `${window.location.pathname}?${params}`);
}

export default function App() {
  const { units } = useSettings();
  const { locate, position: userPosition, status: geoStatus } = useGeolocation();
  const { favorites, recents, isFavorite, toggleFavorite, addRecent } = useSavedPlaces();

  // Open on a shared link if there is one, otherwise on Tamil Nadu.
  const [location, setLocation] = useState(() => readUrlLocation() || DEFAULT_LOCATION);
  const [notice, setNotice] = useState(null);
  const [tab, setTab] = useState('forecast');
  const [regionCollapsed, setRegionCollapsed] = useState(() => load('atmos:regionCollapsed', false));
  const initialCenter = useRef([location.lat, location.lon]);

  const select = useCallback((loc) => {
    setLocation(loc);
    writeUrlLocation(loc);
  }, []);

  const useMyLocation = useCallback(() => {
    locate()
      .then((pos) => select({ lat: pos.lat, lon: pos.lon, source: 'geo' }))
      .catch((err) => setNotice(err.message));
  }, [locate, select]);

  // Start waking the API server (free hosting sleeps) while the first data loads.
  useEffect(() => api.warmUp(), []);

  useEffect(() => save('atmos:regionCollapsed', regionCollapsed), [regionCollapsed]);

  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(null), 7000);
    return () => clearTimeout(id);
  }, [notice]);

  const weatherQuery = useWeather(location);
  const placeQuery = usePlace(location);
  const regionQuery = useRegion(location, placeQuery.data);

  const resolved = placeQuery.data;
  const place = useMemo(
    () => ({
      name: location?.name || resolved?.name || null,
      region: location?.region || resolved?.state || null,
      country: location?.country || resolved?.country || null,
    }),
    [location, resolved],
  );

  // Remember places the user actually looked at.
  useEffect(() => {
    if (!location || !place.name) return;
    addRecent({ lat: location.lat, lon: location.lon, ...place });
  }, [location, place, addRecent]);

  const weather = weatherQuery.data;
  const mood = weather ? describeWeather(weather.current.code, weather.current.isDay).mood : 'clear';

  useEffect(() => {
    document.title =
      weather && place.name ? `${formatTemp(weather.current.temp, units)} ${place.name} · Atmos` : 'Atmos · Live Weather Map';
  }, [weather, place.name, units]);

  const favoritePlace = location && place.name ? { lat: location.lat, lon: location.lon, ...place } : null;
  const region = regionQuery.data?.region;
  const regionKey = region ? region.code || `${region.name}:${region.country}` : null;

  return (
    <div className="app" data-mood={mood} data-tab={tab}>
      <TopBar
        onSelect={select}
        onLocate={useMyLocation}
        locating={geoStatus === 'pending'}
        favorites={favorites}
        recents={recents}
      />

      <MapView
        location={location}
        userPosition={userPosition}
        cities={regionQuery.data?.cities}
        region={region}
        regionKey={regionKey}
        onSelect={select}
        onLocate={useMyLocation}
        initialCenter={initialCenter.current}
      />

      <nav className="tabs" aria-label="Sections">
        <button type="button" aria-pressed={tab === 'forecast'} onClick={() => setTab('forecast')}>
          Forecast
        </button>
        <button type="button" aria-pressed={tab === 'region'} onClick={() => setTab('region')}>
          {region?.scope === 'state' ? region.name : 'Nearby cities'}
        </button>
      </nav>

      <aside className="panel panel--weather glass scroll-y" aria-label="Weather forecast">
        <WeatherPanel
          location={location}
          weatherQuery={weatherQuery}
          place={place}
          isFavorite={favoritePlace ? isFavorite(favoritePlace) : false}
          onToggleFavorite={() => favoritePlace && toggleFavorite(favoritePlace)}
        />
      </aside>

      <aside className="panel panel--region glass" aria-label="Cities in this state">
        <RegionPanel
          regionQuery={regionQuery}
          location={location}
          onSelect={(loc) => {
            select(loc);
            setTab('forecast');
          }}
          collapsed={regionCollapsed}
          onToggleCollapsed={() => setRegionCollapsed((c) => !c)}
        />
      </aside>

      {notice && (
        <div className="toast glass" role="status">
          <span>{notice}</span>
          <button type="button" className="icon-btn" onClick={() => setNotice(null)} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
