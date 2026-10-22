import { useMemo, useState } from 'react';
import { Map as MapIcon, ChevronDown, Flame, Snowflake, AlertTriangle } from 'lucide-react';
import { WeatherIcon } from './WeatherIcon.jsx';
import { formatTemp } from '../lib/units.js';
import { tempColor } from '../lib/scales.js';
import { describeWeather } from '../lib/weatherCodes.js';
import { useSettings } from '../context/settings.js';
import { cityToLocation, isNear } from '../lib/places.js';
import './RegionPanel.css';

const SORTS = {
  warm: { label: 'Warmest', fn: (a, b) => (b.current?.temp ?? -99) - (a.current?.temp ?? -99) },
  cool: { label: 'Coolest', fn: (a, b) => (a.current?.temp ?? 99) - (b.current?.temp ?? 99) },
  name: { label: 'A–Z', fn: (a, b) => a.name.localeCompare(b.name) },
};

export function RegionPanel({ regionQuery, location, onSelect, collapsed, onToggleCollapsed }) {
  const { units } = useSettings();
  const [sort, setSort] = useState('warm');
  const { data, isPending, isError, error, isFetching, isPlaceholderData } = regionQuery;

  const cities = useMemo(() => [...(data?.cities || [])].sort(SORTS[sort].fn), [data, sort]);
  const withTemp = cities.filter((c) => c.current?.temp != null);
  const hottest = withTemp.reduce((m, c) => (!m || c.current.temp > m.current.temp ? c : m), null);
  const coolest = withTemp.reduce((m, c) => (!m || c.current.temp < m.current.temp ? c : m), null);

  const region = data?.region;
  const title = region ? (region.scope === 'state' ? region.name : `Near ${region.name || 'here'}`) : 'Your state';

  return (
    <div className={`region ${collapsed ? 'is-collapsed' : ''}`}>
      <button type="button" className="region__head" onClick={onToggleCollapsed} aria-expanded={!collapsed}>
        <span className="region__icon">
          <MapIcon size={16} />
        </span>
        <span className="region__titles">
          <span className="region__eyebrow">Across</span>
          <span className="region__title">{title}</span>
        </span>
        <ChevronDown size={18} className="region__chev" aria-hidden />
      </button>

      {!collapsed && (
        <div className="region__body">
          {isPending ? (
            <ul className="region__list" aria-busy="true">
              {Array.from({ length: 7 }, (_, i) => (
                <li key={i} className="region__skeleton">
                  <div className="skeleton" style={{ height: 40 }} />
                </li>
              ))}
            </ul>
          ) : isError && !data ? (
            <p className="region__msg">
              <AlertTriangle size={16} /> {error?.message || 'Could not load nearby cities.'}
            </p>
          ) : !cities.length ? (
            <p className="region__msg">No cities found around this point. Try another spot on the map.</p>
          ) : (
            <>
              <p className="region__meta">
                {cities.length} {region?.scope === 'state' ? 'cities & towns' : 'places nearby'}
                {region?.country ? ` · ${region.country}` : ''}
              </p>

              {hottest && coolest && hottest !== coolest && (
                <div className="region__extremes">
                  <button type="button" onClick={() => onSelect(cityToLocation(hottest, region))}>
                    <Flame size={14} style={{ color: tempColor(hottest.current.temp) }} />
                    <span>{hottest.name}</span>
                    <strong>{formatTemp(hottest.current.temp, units)}</strong>
                  </button>
                  <button type="button" onClick={() => onSelect(cityToLocation(coolest, region))}>
                    <Snowflake size={14} style={{ color: tempColor(coolest.current.temp) }} />
                    <span>{coolest.name}</span>
                    <strong>{formatTemp(coolest.current.temp, units)}</strong>
                  </button>
                </div>
              )}

              <div className="segmented region__sort" role="group" aria-label="Sort cities">
                {Object.entries(SORTS).map(([key, s]) => (
                  <button key={key} type="button" aria-pressed={sort === key} onClick={() => setSort(key)}>
                    {s.label}
                  </button>
                ))}
              </div>

              <ul className={`region__list scroll-y ${isPlaceholderData && isFetching ? 'is-refreshing' : ''}`}>
                {cities.map((city) => {
                  const selected = isNear(city, location);
                  const c = city.current;
                  return (
                    <li key={city.id}>
                      <button
                        type="button"
                        className={`region__city ${selected ? 'is-selected' : ''}`}
                        onClick={() => onSelect(cityToLocation(city, region))}
                        aria-current={selected ? 'location' : undefined}
                      >
                        {c ? <WeatherIcon code={c.code} isDay={c.isDay} size={30} /> : <span className="region__noicon" />}
                        <span className="region__name">
                          {city.name}
                          <small>{c ? describeWeather(c.code, c.isDay).label : 'No data'}</small>
                        </span>
                        <span className="region__temp" style={{ '--t': tempColor(c?.temp) }}>
                          {formatTemp(c?.temp, units)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
