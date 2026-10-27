import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useQuery } from '@tanstack/react-query';
import { Plus, Minus, Crosshair, CloudRain, Play, Pause, Layers } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { formatTemp } from '../lib/units.js';
import { tempColor } from '../lib/scales.js';
import { cityToLocation, isNear } from '../lib/places.js';
import { useSettings } from '../context/settings.js';
import { IconButton } from './ui.jsx';
import { cn } from '../lib/cn.js';

// Keyless tile services. CARTO's basemaps now need an API key, so they are not used.
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const OSM = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: OSM_ATTRIBUTION,
  maxNativeZoom: 19,
};
const BASEMAPS = {
  dark: {
    base: {
      url: `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
      attribution: `Tiles &copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, ${OSM_ATTRIBUTION}`,
      maxNativeZoom: 16,
    },
    labels: { url: `${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, maxNativeZoom: 16 },
  },
  light: { base: OSM },
  satellite: {
    base: {
      url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
      attribution: 'Imagery &copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics',
      maxNativeZoom: 18,
    },
    labels: { url: `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`, maxNativeZoom: 18 },
  },
};
// If a basemap fails this many tiles before showing any, switch to OpenStreetMap.
const TILE_FAILURE_LIMIT = 6;

function Basemap({ style, onFailed }) {
  const { base, labels } = BASEMAPS[style] || { base: OSM };
  const stats = useRef({ loaded: 0, failed: 0 });
  useEffect(() => {
    stats.current = { loaded: 0, failed: 0 };
  }, [style]);
  const handlers = useMemo(
    () => ({
      tileload: () => {
        stats.current.loaded += 1;
      },
      tileerror: () => {
        stats.current.failed += 1;
        if (!stats.current.loaded && stats.current.failed >= TILE_FAILURE_LIMIT) onFailed();
      },
    }),
    [onFailed],
  );
  return (
    <>
      <TileLayer
        key={`${style}-base`}
        url={base.url}
        attribution={base.attribution}
        maxNativeZoom={base.maxNativeZoom}
        maxZoom={19}
        zIndex={1}
        eventHandlers={handlers}
      />
      {labels && (
        <TileLayer key={`${style}-labels`} url={labels.url} maxNativeZoom={labels.maxNativeZoom} maxZoom={19} zIndex={2} />
      )}
    </>
  );
}

const DESKTOP = '(min-width: 901px)';
// On desktop the forecast panel covers the left of the map and the state list the right,
// so "centre" a point in the visible gap between them.
const PANEL_SHIFT_X = 50;

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

function centerFor(map, latlng, zoom) {
  if (!window.matchMedia(DESKTOP).matches) return latlng;
  const point = map.project(latlng, zoom).subtract([PANEL_SHIFT_X, 0]);
  return map.unproject(point, zoom);
}

function FlyToLocation({ location }) {
  const map = useMap();
  const lat = location?.lat;
  const lon = location?.lon;
  const source = location?.source;
  useEffect(() => {
    // Clicking the map should not move it under the user's cursor.
    if (lat == null || source === 'map') return;
    const zoom = Math.max(map.getZoom(), 9);
    map.flyTo(centerFor(map, L.latLng(lat, lon), zoom), zoom, { duration: 1.1 });
  }, [map, lat, lon, source]);
  return null;
}

/** Zooms out to show a whole state the first time its cities arrive. */
function FitRegion({ cities, regionKey, location }) {
  const map = useMap();
  const fitted = useRef(new Set());
  useEffect(() => {
    if (!regionKey || !cities?.length || fitted.current.has(regionKey)) return;
    const first = fitted.current.size === 0;
    fitted.current.add(regionKey);
    // Only on first load: later on, keep the user's own zoom when they jump between states.
    if (!first) return;
    const bounds = L.latLngBounds(cities.map((c) => [c.lat, c.lon]));
    if (location) bounds.extend([location.lat, location.lon]);
    const desktop = window.matchMedia(DESKTOP).matches;
    map.flyToBounds(bounds, {
      paddingTopLeft: desktop ? [450, 110] : [30, 30],
      paddingBottomRight: desktop ? [350, 30] : [30, 30],
      maxZoom: 10,
      duration: 1.2,
    });
  }, [map, cities, regionKey, location]);
  return null;
}

function MapEvents({ onSelect, onZoom }) {
  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng.wrap();
      onSelect({ lat, lon: lng, source: 'map' });
    },
    zoomend() {
      onZoom(map.getZoom());
    },
  });
  return null;
}

// Leaflet markers are plain HTML strings, so their Tailwind classes live here. Labels
// show on hover, for the selected city, and for every city once the map wrapper sets
// data-labels (zoomed in). data-far (zoomed out) shrinks the temperature pills.
const PIN =
  'group/pin absolute flex -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-center gap-[3px] whitespace-nowrap';
const PIN_TEMP =
  'min-w-[38px] rounded-full bg-(--t) px-[7px] py-[3px] text-center text-xs font-extrabold text-[#0b1020] shadow-[0_4px_14px_-4px_rgba(0,0,0,0.6),0_0_0_2px_rgba(255,255,255,0.25)] transition-transform duration-200 group-hover/pin:scale-112 group-data-selected/pin:scale-112 group-data-selected/pin:shadow-[0_0_0_3px_var(--accent),0_6px_20px_-4px_rgba(0,0,0,0.7)] group-data-far/map:min-w-[30px] group-data-far/map:px-[5px] group-data-far/map:py-0.5 group-data-far/map:text-[10px]';
const PIN_NAME =
  'pointer-events-none -translate-y-0.5 rounded-md bg-glass px-1.5 py-px text-[11px] font-bold text-fg opacity-0 backdrop-blur-sm transition duration-200 group-hover/pin:translate-y-0 group-hover/pin:opacity-100 group-data-selected/pin:translate-y-0 group-data-selected/pin:opacity-100 group-data-labels/map:translate-y-0 group-data-labels/map:opacity-100';

const CityMarker = memo(function CityMarker({ city, region, units, selected, onSelect }) {
  const temp = city.current?.temp;
  const icon = useMemo(
    () =>
      L.divIcon({
        className: '',
        iconSize: [0, 0],
        html: `<div class="${PIN}"${selected ? ' data-selected' : ''} style="--t:${tempColor(temp)}">
          <span class="${PIN_TEMP}">${formatTemp(temp, units)}</span>
          <span class="${PIN_NAME}">${escapeHtml(city.name)}</span>
        </div>`,
      }),
    [temp, units, selected, city.name],
  );
  // A stable handler object stops react-leaflet re-binding the click listener on every render.
  const handlers = useMemo(
    () => ({ click: () => onSelect(cityToLocation(city, region)) }),
    [onSelect, city, region],
  );
  return (
    <Marker
      position={[city.lat, city.lon]}
      icon={icon}
      zIndexOffset={selected ? 1000 : Math.round(city.population / 1e5)}
      title={city.name}
      keyboard
      eventHandlers={handlers}
    />
  );
});

const selectedIcon = L.divIcon({
  className: '',
  iconSize: [0, 0],
  html: '<div class="pointer-events-none absolute size-[18px] -translate-x-1/2 -translate-y-1/2 animate-pulse-ring rounded-full border-[3px] border-white bg-accent"></div>',
});

const userIcon = L.divIcon({
  className: '',
  iconSize: [0, 0],
  html: '<div class="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-blue-500 shadow-[0_0_0_6px_rgba(59,130,246,0.25)]" title="You are here"></div>',
});

// RainViewer: free precipitation radar mosaics, updated every 10 minutes.
function useRadarFrames(enabled) {
  return useQuery({
    queryKey: ['radar'],
    queryFn: async () => {
      const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
      if (!res.ok) throw new Error('Radar unavailable');
      const data = await res.json();
      return { host: data.host, frames: data.radar?.past || [] };
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchInterval: enabled ? 10 * 60 * 1000 : false,
  });
}

function RadarLayers({ host, frames, index }) {
  return frames.map((frame, i) => (
    <TileLayer
      key={frame.path}
      url={`${host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`}
      opacity={i === index ? 0.7 : 0}
      zIndex={10}
      maxNativeZoom={7}
      maxZoom={19}
      attribution='Radar &copy; <a href="https://www.rainviewer.com/" target="_blank">RainViewer</a>'
    />
  ));
}

export const MapView = memo(function MapView({ className, location, userPosition, cities, region, regionKey, onSelect, onLocate, initialCenter }) {
  const { theme, units } = useSettings();
  const [map, setMap] = useState(null);
  const [zoom, setZoom] = useState(7);
  const [satellite, setSatellite] = useState(false);
  // Set when the chosen tile service fails; OpenStreetMap is used from then on.
  const [tilesFailed, setTilesFailed] = useState(false);
  const onTilesFailed = useCallback(() => setTilesFailed(true), []);
  const basemap = tilesFailed ? 'light' : satellite ? 'satellite' : theme;
  const [radarOn, setRadarOn] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [frameIndex, setFrameIndex] = useState(-1);
  const radar = useRadarFrames(radarOn);
  const frames = radar.data?.frames || [];
  const latest = frames.length - 1;
  const activeFrame = frameIndex < 0 || frameIndex > latest ? latest : frameIndex;

  useEffect(() => {
    if (!playing || frames.length < 2) return undefined;
    const id = setInterval(() => setFrameIndex((i) => ((i < 0 ? latest : i) + 1) % frames.length), 600);
    return () => clearInterval(id);
  }, [playing, frames.length, latest]);

  const frameTime = frames[activeFrame]
    ? new Date(frames[activeFrame].time * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '';

  const center = initialCenter || [location?.lat ?? 20, location?.lon ?? 78];

  return (
    <div
      className={cn('group/map', className)}
      data-labels={zoom >= 9 || undefined}
      data-far={zoom <= 5 || undefined}
    >
      <MapContainer
        center={center}
        zoom={7}
        minZoom={3}
        zoomControl={false}
        worldCopyJump
        className="size-full"
        ref={setMap}
      >
        <Basemap style={basemap} onFailed={onTilesFailed} />
        {radarOn && radar.data && <RadarLayers host={radar.data.host} frames={frames} index={activeFrame} />}

        <FlyToLocation location={location} />
        <FitRegion cities={cities} regionKey={regionKey} location={location} />
        <MapEvents onSelect={onSelect} onZoom={setZoom} />

        {cities?.map((city) => (
          <CityMarker
            key={city.id}
            city={city}
            region={region}
            units={units}
            selected={isNear(city, location)}
            onSelect={onSelect}
          />
        ))}
        {location && !cities?.some((c) => isNear(c, location)) && (
          <Marker position={[location.lat, location.lon]} icon={selectedIcon} interactive={false} zIndexOffset={2000} />
        )}
        {userPosition && <Marker position={[userPosition.lat, userPosition.lon]} icon={userIcon} interactive={false} />}
      </MapContainer>

      <div
        className="glass absolute right-3 bottom-3 z-[1000] flex flex-col rounded-2xl border border-edge p-1 desk:right-[calc(1rem+var(--region-w)+12px)] desk:bottom-7"
        role="toolbar"
        aria-label="Map controls"
      >
        <IconButton onClick={() => map?.zoomIn()} aria-label="Zoom in">
          <Plus size={18} />
        </IconButton>
        <IconButton onClick={() => map?.zoomOut()} aria-label="Zoom out">
          <Minus size={18} />
        </IconButton>
        <IconButton onClick={onLocate} aria-label="Go to my location">
          <Crosshair size={18} />
        </IconButton>
        <IconButton
          pressed={satellite}
          onClick={() => setSatellite((on) => !on)}
          aria-label="Toggle satellite view"
          title={satellite ? 'Map view' : 'Satellite view'}
        >
          <Layers size={18} />
        </IconButton>
        <IconButton
          pressed={radarOn}
          onClick={() => {
            setRadarOn((on) => !on);
            setPlaying(false);
            setFrameIndex(-1);
          }}
          aria-label="Toggle rain radar"
          title="Rain radar"
        >
          <CloudRain size={18} />
        </IconButton>
      </div>

      {radarOn && (
        <div
          className="glass absolute right-[76px] bottom-3 left-3 z-[1000] flex items-center gap-2.5 rounded-2xl border border-edge py-1 pr-4 pl-1 desk:right-auto desk:bottom-7 desk:left-1/2 desk:min-w-[300px] desk:translate-x-[calc(-50%+(var(--weather-w)-var(--region-w))/2)]"
          role="group"
          aria-label="Radar timeline"
        >
          {radar.isError ? (
            <span className="px-3 py-2.5 text-[13px] text-muted">Radar is unavailable right now.</span>
          ) : !frames.length ? (
            <span className="px-3 py-2.5 text-[13px] text-muted">Loading radar…</span>
          ) : (
            <>
              <IconButton
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? 'Pause radar animation' : 'Play radar animation'}
              >
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </IconButton>
              <input
                type="range"
                min={0}
                max={latest}
                value={activeFrame}
                onChange={(e) => {
                  setPlaying(false);
                  setFrameIndex(Number(e.target.value));
                }}
                aria-label="Radar frame"
                className="flex-1 accent-accent"
              />
              <span className="min-w-[82px] text-right text-xs font-bold tabular-nums">{activeFrame === latest ? `Now · ${frameTime}` : frameTime}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
});
