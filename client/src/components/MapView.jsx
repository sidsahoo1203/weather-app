import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useQuery } from '@tanstack/react-query';
import { Plus, Minus, Crosshair, CloudRain, Play, Pause } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { formatTemp } from '../lib/units.js';
import { tempColor } from '../lib/scales.js';
import { cityToLocation, isNear } from '../lib/places.js';
import { useSettings } from '../context/settings.js';
import './MapView.css';

const BASEMAPS = {
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
};
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

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

function CityMarker({ city, region, units, selected, onSelect }) {
  const temp = city.current?.temp;
  const icon = useMemo(
    () =>
      L.divIcon({
        className: 'pin-anchor',
        iconSize: [0, 0],
        html: `<div class="pin${selected ? ' is-selected' : ''}" style="--t:${tempColor(temp)}">
          <span class="pin__temp">${formatTemp(temp, units)}</span>
          <span class="pin__name">${escapeHtml(city.name)}</span>
        </div>`,
      }),
    [temp, units, selected, city.name],
  );
  return (
    <Marker
      position={[city.lat, city.lon]}
      icon={icon}
      zIndexOffset={selected ? 1000 : Math.round(city.population / 1e5)}
      title={city.name}
      keyboard
      eventHandlers={{ click: () => onSelect(cityToLocation(city, region)) }}
    />
  );
}

const selectedIcon = L.divIcon({
  className: 'pin-anchor',
  iconSize: [0, 0],
  html: '<div class="target"><span></span></div>',
});

const userIcon = L.divIcon({
  className: 'pin-anchor',
  iconSize: [0, 0],
  html: '<div class="me" title="You are here"></div>',
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

export function MapView({ location, userPosition, cities, region, regionKey, onSelect, onLocate, initialCenter }) {
  const { theme, units } = useSettings();
  const [map, setMap] = useState(null);
  const [zoom, setZoom] = useState(7);
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
    <div className={`map-wrap zoom-${Math.min(Math.max(zoom, 3), 12)}`}>
      <MapContainer
        center={center}
        zoom={7}
        minZoom={3}
        zoomControl={false}
        worldCopyJump
        className="map"
        ref={setMap}
      >
        <TileLayer key={theme} url={BASEMAPS[theme]} attribution={ATTRIBUTION} subdomains="abcd" maxZoom={19} />
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

      <div className="map-controls glass" role="toolbar" aria-label="Map controls">
        <button type="button" className="icon-btn" onClick={() => map?.zoomIn()} aria-label="Zoom in">
          <Plus size={18} />
        </button>
        <button type="button" className="icon-btn" onClick={() => map?.zoomOut()} aria-label="Zoom out">
          <Minus size={18} />
        </button>
        <button type="button" className="icon-btn" onClick={onLocate} aria-label="Go to my location">
          <Crosshair size={18} />
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-pressed={radarOn}
          onClick={() => {
            setRadarOn((on) => !on);
            setPlaying(false);
            setFrameIndex(-1);
          }}
          aria-label="Toggle rain radar"
          title="Rain radar"
        >
          <CloudRain size={18} />
        </button>
      </div>

      {radarOn && (
        <div className="radar-bar glass" role="group" aria-label="Radar timeline">
          {radar.isError ? (
            <span className="radar-bar__msg">Radar is unavailable right now.</span>
          ) : !frames.length ? (
            <span className="radar-bar__msg">Loading radar…</span>
          ) : (
            <>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? 'Pause radar animation' : 'Play radar animation'}
              >
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
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
              />
              <span className="radar-bar__time">{activeFrame === latest ? `Now · ${frameTime}` : frameTime}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
