import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { TopBar } from './components/TopBar.jsx';
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
import { cn } from './lib/cn.js';
import { IconButton } from './components/ui.jsx';

// Leaflet is the largest dependency, so the map loads as its own chunk after the
// forecast panels have rendered.
const MapView = lazy(() => import('./components/MapView.jsx').then((m) => ({ default: m.MapView })));

const MAP_BOX = 'relative z-0 h-[46vh] min-h-[300px] desk:absolute desk:inset-0 desk:h-auto desk:min-h-0';

// Below `desk` the page stacks (top bar, map, tabs, one panel); from `desk` up the map
// fills the screen and the panels float over it.
const PANEL =
  'm-3 rounded-[22px] border border-edge bg-glass-strong desk:glass desk:absolute desk:top-[92px] desk:z-[1000] desk:m-0';
const TAB =
  'h-10 flex-1 truncate rounded-xl px-2.5 font-bold text-muted aria-pressed:bg-surface-hover aria-pressed:text-fg';

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
    <div
      className="flex min-h-full flex-col [--region-w:0px] [--weather-w:0px] desk:fixed desk:inset-0 desk:block desk:overflow-hidden desk:[--region-w:270px] desk:[--weather-w:380px] wide:[--region-w:310px] wide:[--weather-w:420px]"
      data-mood={mood}
    >
      <TopBar
        onSelect={select}
        onLocate={useMyLocation}
        locating={geoStatus === 'pending'}
        favorites={favorites}
        recents={recents}
      />

      <Suspense fallback={<div className={cn(MAP_BOX, 'bg-bg')} />}>
        <MapView
          className={MAP_BOX}
          location={location}
          userPosition={userPosition}
          cities={regionQuery.data?.cities}
          region={region}
          regionKey={regionKey}
          onSelect={select}
          onLocate={useMyLocation}
          initialCenter={initialCenter.current}
        />
      </Suspense>

      <nav
        className="sticky top-0 z-[1050] flex gap-1.5 border-b border-divider bg-bg px-3 py-2.5 desk:hidden"
        aria-label="Sections"
      >
        <button type="button" className={TAB} aria-pressed={tab === 'forecast'} onClick={() => setTab('forecast')}>
          Forecast
        </button>
        <button type="button" className={TAB} aria-pressed={tab === 'region'} onClick={() => setTab('region')}>
          {region?.scope === 'state' ? region.name : 'Nearby cities'}
        </button>
      </nav>

      <aside
        className={cn(
          PANEL,
          'p-4 desk:bottom-4 desk:left-4 desk:w-(--weather-w) desk:overflow-y-auto desk:overscroll-contain desk:p-5 scrollbar-thin',
          tab !== 'forecast' && 'max-desk:hidden',
        )}
        aria-label="Weather forecast"
      >
        <WeatherPanel
          location={location}
          weatherQuery={weatherQuery}
          place={place}
          isFavorite={favoritePlace ? isFavorite(favoritePlace) : false}
          onToggleFavorite={() => favoritePlace && toggleFavorite(favoritePlace)}
        />
      </aside>

      <aside
        className={cn(
          PANEL,
          'desk:right-4 desk:flex desk:max-h-[calc(100%-132px)] desk:w-(--region-w) desk:flex-col desk:overflow-hidden',
          tab !== 'region' && 'max-desk:hidden',
        )}
        aria-label="Cities in this state"
      >
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
        <div
          className="glass fixed bottom-4 left-1/2 z-[1200] flex max-w-[min(440px,calc(100%-32px))] -translate-x-1/2 animate-pop-in items-center gap-1.5 rounded-[14px] border border-edge py-1.5 pr-1.5 pl-4 text-[13.5px] desk:absolute desk:top-24 desk:bottom-auto desk:translate-x-[calc(-50%+(var(--weather-w)-var(--region-w))/2)]"
          role="status"
        >
          <span>{notice}</span>
          <IconButton onClick={() => setNotice(null)} aria-label="Dismiss">
            <X size={16} />
          </IconButton>
        </div>
      )}
    </div>
  );
}
