import { Star, Navigation, Droplet, Droplets, Wind } from 'lucide-react';
import { WeatherIcon } from './WeatherIcon.jsx';
import { describeWeather } from '../lib/weatherCodes.js';
import { formatTemp, formatCoords, formatWind } from '../lib/units.js';
import { timeFormatters, timeAgo } from '../lib/time.js';
import { forecastSummary } from '../lib/summary.js';
import { useSettings } from '../context/settings.js';
import { useNow } from '../hooks/useTimers.js';
import { cn } from '../lib/cn.js';
import { IconButton, CARD } from './ui.jsx';

// Soft glow in the weather's accent colours behind the current conditions.
const GLOW =
  'bg-[radial-gradient(120%_90%_at_100%_0%,color-mix(in_srgb,var(--accent)_34%,transparent),transparent_60%),radial-gradient(90%_80%_at_0%_100%,color-mix(in_srgb,var(--accent-2)_24%,transparent),transparent_70%)]';
const STAT = cn(CARD, 'rounded-xl px-2.5 py-2');

export function CurrentHero({ weather, place, location, isFavorite, onToggleFavorite, refreshing }) {
  const { units } = useSettings();
  const now = useNow(30000);
  const { current, daily, location: loc } = weather;
  const fmt = timeFormatters(loc.timezone);
  const info = describeWeather(current.code, current.isDay);
  const today = daily[0];

  const name = place.name;
  const sub = [place.region, place.country].filter(Boolean).join(', ');

  return (
    <section
      aria-live="polite"
      data-testid="hero"
      className={cn(
        '-mx-4 -mt-4 rounded-t-[22px] rounded-b-[18px] px-4 pt-[18px] pb-4 transition-opacity duration-300 desk:-mx-5 desk:-mt-5 desk:px-[22px] desk:pt-[22px] desk:pb-5',
        GLOW,
        refreshing && 'opacity-55',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="m-0 flex items-center gap-2 font-display text-[26px] leading-[1.15] font-semibold tracking-[-0.02em]">
            {location.source === 'geo' && (
              <Navigation size={16} className="shrink-0 text-accent" aria-label="Your location" />
            )}
            {name || <span className="text-xl">{formatCoords(location.lat, location.lon)}</span>}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {sub || (name ? formatCoords(location.lat, location.lon) : 'Locating place…')}
          </p>
        </div>
        <IconButton
          className="-mt-1.5 -mr-2"
          tone="text-muted aria-pressed:text-yellow-400"
          pressed={isFavorite}
          onClick={onToggleFavorite}
          disabled={!name}
          aria-label={isFavorite ? 'Remove from favourites' : 'Save to favourites'}
          title={isFavorite ? 'Remove from favourites' : 'Save to favourites'}
        >
          <Star size={20} fill={isFavorite ? 'currentColor' : 'none'} />
        </IconButton>
      </div>

      <p className="mt-2.5 text-[13px] text-muted">
        {fmt.longDay(now / 1000)} · {fmt.clock(now / 1000)}
        {loc.timezoneAbbr && <span className="text-faint"> {loc.timezoneAbbr}</span>}
      </p>

      <div className="mt-1 flex items-center justify-between">
        <div className="flex items-start font-display text-8xl leading-none font-light tracking-[-0.05em]">
          {formatTemp(current.temp, units, { degree: false })}
          <span className="mt-2 text-5xl text-muted">°</span>
        </div>
        <WeatherIcon code={current.code} isDay={current.isDay} size={104} animated />
      </div>

      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3.5 gap-y-1 text-sm text-muted">
        <strong className="text-lg font-bold text-fg">{info.label}</strong>
        <span>Feels like {formatTemp(current.feelsLike, units)}</span>
        {today && (
          <span>
            H {formatTemp(today.max, units)} · L {formatTemp(today.min, units)}
          </span>
        )}
      </div>

      <dl className="mt-3.5 grid grid-cols-3 gap-2 [&_dd]:mt-0.5 [&_dd]:text-[15px] [&_dd]:font-extrabold [&_dt]:flex [&_dt]:items-center [&_dt]:gap-1 [&_dt]:text-[11px] [&_dt]:text-muted">
        <div className={STAT}>
          <dt>
            <Droplet size={13} aria-hidden /> Precipitation
          </dt>
          <dd>{weather.hourly[0]?.pop != null ? `${weather.hourly[0].pop}%` : '--'}</dd>
        </div>
        <div className={STAT}>
          <dt>
            <Droplets size={13} aria-hidden /> Humidity
          </dt>
          <dd>{current.humidity != null ? `${Math.round(current.humidity)}%` : '--'}</dd>
        </div>
        <div className={STAT}>
          <dt>
            <Wind size={13} aria-hidden /> Wind
          </dt>
          <dd>{formatWind(current.wind.speed, units)}</dd>
        </div>
      </dl>

      <p className={cn(CARD, 'mt-3.5 rounded-[14px] px-3.5 py-3 text-sm leading-normal')}>
        {forecastSummary(weather, units, fmt)}
      </p>
      <p className="mt-2.5 text-xs text-faint">Updated {timeAgo(weather.updatedAt, now)}</p>
    </section>
  );
}
