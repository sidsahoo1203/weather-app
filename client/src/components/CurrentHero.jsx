import { Star, Navigation, Droplet, Droplets, Wind } from 'lucide-react';
import { WeatherIcon } from './WeatherIcon.jsx';
import { describeWeather } from '../lib/weatherCodes.js';
import { formatTemp, formatCoords, formatWind } from '../lib/units.js';
import { timeFormatters, timeAgo } from '../lib/time.js';
import { forecastSummary } from '../lib/summary.js';
import { useSettings } from '../context/settings.js';
import { useNow } from '../hooks/useTimers.js';

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
    <section className={`hero ${refreshing ? 'is-refreshing' : ''}`} aria-live="polite">
      <div className="hero__top">
        <div className="hero__place">
          <h1 className="hero__name">
            {location.source === 'geo' && <Navigation size={16} className="hero__geo" aria-label="Your location" />}
            {name || <span className="hero__coords">{formatCoords(location.lat, location.lon)}</span>}
          </h1>
          <p className="hero__sub">{sub || (name ? formatCoords(location.lat, location.lon) : 'Locating place…')}</p>
        </div>
        <button
          type="button"
          className="icon-btn hero__fav"
          aria-pressed={isFavorite}
          onClick={onToggleFavorite}
          disabled={!name}
          aria-label={isFavorite ? 'Remove from favourites' : 'Save to favourites'}
          title={isFavorite ? 'Remove from favourites' : 'Save to favourites'}
        >
          <Star size={20} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      <p className="hero__time">
        {fmt.longDay(now / 1000)} · {fmt.clock(now / 1000)}
        {loc.timezoneAbbr && <span className="hero__tz"> {loc.timezoneAbbr}</span>}
      </p>

      <div className="hero__main">
        <div className="hero__temp">
          {formatTemp(current.temp, units, { degree: false })}
          <span className="hero__deg">°</span>
        </div>
        <WeatherIcon code={current.code} isDay={current.isDay} size={104} animated />
      </div>

      <div className="hero__cond">
        <strong>{info.label}</strong>
        <span>Feels like {formatTemp(current.feelsLike, units)}</span>
        {today && (
          <span>
            H {formatTemp(today.max, units)} · L {formatTemp(today.min, units)}
          </span>
        )}
      </div>

      <dl className="hero__stats">
        <div>
          <dt>
            <Droplet size={13} aria-hidden /> Precipitation
          </dt>
          <dd>{weather.hourly[0]?.pop != null ? `${weather.hourly[0].pop}%` : '--'}</dd>
        </div>
        <div>
          <dt>
            <Droplets size={13} aria-hidden /> Humidity
          </dt>
          <dd>{current.humidity != null ? `${Math.round(current.humidity)}%` : '--'}</dd>
        </div>
        <div>
          <dt>
            <Wind size={13} aria-hidden /> Wind
          </dt>
          <dd>{formatWind(current.wind.speed, units)}</dd>
        </div>
      </dl>

      <p className="hero__summary">{forecastSummary(weather, units, fmt)}</p>
      <p className="hero__updated">Updated {timeAgo(weather.updatedAt, now)}</p>
    </section>
  );
}
