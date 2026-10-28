import { useMemo, useState } from 'react';
import { Map as MapIcon, ChevronDown, Flame, Snowflake, AlertTriangle } from 'lucide-react';
import { WeatherIcon } from './WeatherIcon.jsx';
import { formatTemp } from '../lib/units.js';
import { tempColor } from '../lib/scales.js';
import { describeWeather } from '../lib/weatherCodes.js';
import { useSettings } from '../context/settings.js';
import { cityToLocation, isNear } from '../lib/places.js';
import { cn } from '../lib/cn.js';
import { CARD, Segmented, Skeleton } from './ui.jsx';

const SORTS = {
  warm: { label: 'Warmest', fn: (a, b) => (b.current?.temp ?? -99) - (a.current?.temp ?? -99) },
  cool: { label: 'Coolest', fn: (a, b) => (a.current?.temp ?? 99) - (b.current?.temp ?? 99) },
  name: { label: 'A–Z', fn: (a, b) => a.name.localeCompare(b.name) },
};
const VIEW_OPTIONS = [
  { value: 'state', label: 'This state' },
  { value: 'india', label: 'All India' },
];

const SORT_OPTIONS = Object.entries(SORTS).map(([value, { label }]) => ({ value, label }));

const EXTREME = cn(
  CARD,
  'grid grid-cols-[auto_1fr] items-center gap-x-1.5 rounded-xl p-2.5 text-left transition-colors duration-200 hover:bg-surface-hover',
);

// Temperature chip tinted by --t (the temperature colour), darker text in the light theme.
const TEMP_CHIP =
  'min-w-12 rounded-[9px] bg-[color-mix(in_srgb,var(--t)_14%,transparent)] px-2 py-1 text-center text-sm font-extrabold text-(--t) light:bg-[color-mix(in_srgb,var(--t)_22%,transparent)] light:text-[color-mix(in_srgb,var(--t)_62%,#000)]';

export function RegionPanel({ regionQuery, view, onViewChange, location, onSelect, collapsed, onToggleCollapsed }) {
  const { units } = useSettings();
  const [sort, setSort] = useState('warm');
  const { data, isPending, isError, error, isFetching, isPlaceholderData } = regionQuery;

  const cities = useMemo(() => [...(data?.cities || [])].sort(SORTS[sort].fn), [data, sort]);
  const withTemp = cities.filter((c) => c.current?.temp != null);
  const hottest = withTemp.reduce((m, c) => (!m || c.current.temp > m.current.temp ? c : m), null);
  const coolest = withTemp.reduce((m, c) => (!m || c.current.temp < m.current.temp ? c : m), null);

  const region = data?.region;
  const india = view === 'india';
  const title = india
    ? 'India'
    : region
      ? region.scope === 'state'
        ? region.name
        : `Near ${region.name || 'here'}`
      : 'Your state';

  return (
    <div className="flex max-h-full min-h-0 flex-col">
      {/* On phones the list is its own tab, so it is never collapsed. */}
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-[22px] px-4 py-3.5 text-left max-desk:pointer-events-none"
        onClick={onToggleCollapsed}
        aria-expanded={!collapsed}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/16 text-accent">
          <MapIcon size={16} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[11px] font-bold tracking-[0.08em] text-faint uppercase">
            {india ? 'All states' : 'Across'}
          </span>
          <span className="truncate font-display text-lg font-semibold">{title}</span>
        </span>
        <ChevronDown
          size={18}
          className={cn('hidden text-muted transition-transform duration-300 desk:block', collapsed && '-rotate-90')}
          aria-hidden
        />
      </button>

      <div className={cn('flex min-h-0 flex-col px-3 pb-3', collapsed && 'desk:hidden')}>
          <Segmented
            label="List"
            options={VIEW_OPTIONS}
            value={view}
            onChange={onViewChange}
            stretch
            className="mb-3"
          />
          {isPending ? (
            <ul className="m-0 list-none p-0" aria-busy="true">
              {Array.from({ length: 7 }, (_, i) => (
                <li key={i} className="py-1">
                  <Skeleton className="h-10" />
                </li>
              ))}
            </ul>
          ) : isError && !data ? (
            <p className="mx-1 mb-1.5 flex gap-2 text-[13px] text-muted">
              <AlertTriangle size={16} /> {error?.message || 'Could not load nearby cities.'}
            </p>
          ) : !cities.length ? (
            <p className="mx-1 mb-1.5 flex gap-2 text-[13px] text-muted">No cities found around this point. Try another spot on the map.</p>
          ) : (
            <>
              <p className="mx-1 -mt-1.5 mb-2.5 text-xs text-muted">
                {cities.length}{' '}
                {india ? 'states & union territories' : region?.scope === 'state' ? 'cities & towns' : 'places nearby'}
                {region?.country ? ` · ${region.country}` : ''}
              </p>

              {hottest && coolest && hottest !== coolest && (
                <div className="mb-2.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={EXTREME}
                    onClick={() => onSelect(cityToLocation(hottest, region))}
                  >
                    <Flame size={14} style={{ color: tempColor(hottest.current.temp) }} />
                    <span className="truncate text-xs text-muted">{hottest.name}</span>
                    <strong className="col-span-full font-display text-xl font-normal">
                      {formatTemp(hottest.current.temp, units)}
                    </strong>
                  </button>
                  <button
                    type="button"
                    className={EXTREME}
                    onClick={() => onSelect(cityToLocation(coolest, region))}
                  >
                    <Snowflake size={14} style={{ color: tempColor(coolest.current.temp) }} />
                    <span className="truncate text-xs text-muted">{coolest.name}</span>
                    <strong className="col-span-full font-display text-xl font-normal">
                      {formatTemp(coolest.current.temp, units)}
                    </strong>
                  </button>
                </div>
              )}

              <Segmented
                label="Sort cities"
                options={SORT_OPTIONS}
                value={sort}
                onChange={setSort}
                stretch
                className="mb-2"
              />

              <ul
                className={cn(
                  'scrollbar-thin -mx-1 my-0 min-h-0 list-none overflow-y-auto overscroll-contain px-1 transition-opacity duration-300',
                  isPlaceholderData && isFetching && 'opacity-50',
                )}
              >
                {cities.map((city) => {
                  const selected = isNear(city, location);
                  const c = city.current;
                  return (
                    <li key={city.id}>
                      <button
                        type="button"
                        className={cn(
                          'grid w-full grid-cols-[30px_1fr_auto] items-center gap-2.5 rounded-xl px-2 py-[7px] text-left transition-colors duration-150 hover:bg-surface-hover',
                          selected && 'bg-accent/16 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_45%,transparent)]',
                        )}
                        onClick={() => onSelect(cityToLocation(city, region))}
                        aria-current={selected ? 'location' : undefined}
                      >
                        {c ? <WeatherIcon code={c.code} isDay={c.isDay} size={30} /> : <span className="size-[30px]" />}
                        <span className="flex min-w-0 flex-col truncate text-sm/[1.45] font-semibold">
                          {city.name}
                          <small className="truncate text-xs/[1.45] font-medium text-faint">
                            {[city.sub, c ? describeWeather(c.code, c.isDay).label : 'No data'].filter(Boolean).join(' · ')}
                          </small>
                        </span>
                        <span className={TEMP_CHIP} style={{ '--t': tempColor(c?.temp) }}>
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
    </div>
  );
}
