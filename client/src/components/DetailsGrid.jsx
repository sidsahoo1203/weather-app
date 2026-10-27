import {
  Thermometer,
  Wind,
  Droplets,
  SunMedium,
  Leaf,
  Sunrise,
  Gauge,
  Eye,
  CloudRain,
  Cloudy,
  LayoutGrid,
  CalendarClock,
} from 'lucide-react';
import {
  formatTemp,
  formatWind,
  formatPressure,
  formatVisibility,
  formatPrecip,
  compassPoint,
  windWord,
} from '../lib/units.js';
import { timeFormatters, formatDuration } from '../lib/time.js';
import { aqiBand, uvBand } from '../lib/scales.js';
import { describeWeather } from '../lib/weatherCodes.js';
import { useSettings } from '../context/settings.js';
import { cn } from '../lib/cn.js';
import { CARD, SectionTitle } from './ui.jsx';

const VALUE = 'font-display text-2xl tracking-[-0.02em]';
const LABEL = 'font-sans text-sm font-bold tracking-normal';
const NOTE = 'mt-1.5 text-[12.5px] leading-[1.4] text-muted';

function Tile({ icon: Icon, title, children, wide = false }) {
  return (
    <div className={cn(CARD, 'min-w-0 rounded-2xl p-3.5', wide && 'col-span-full')}>
      <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold tracking-[0.07em] text-muted uppercase">
        <Icon size={14} aria-hidden /> {title}
      </h3>
      {children}
    </div>
  );
}

function Meter({ value, max, gradient, label }) {
  const pct = Math.min(Math.max(value / max, 0), 1) * 100;
  return (
    <div
      className="relative mt-3 mb-1 h-1.5"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
    >
      <span className="absolute inset-0 rounded-[3px]" style={{ background: gradient }} />
      <span
        className="absolute top-1/2 -mt-1.5 -ml-1.5 size-3 rounded-full bg-white shadow-[0_0_0_3px_rgba(0,0,0,0.35)]"
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}

function Compass({ dir }) {
  return (
    <svg viewBox="0 0 80 80" className="size-[84px] shrink-0" aria-hidden>
      <circle cx="40" cy="40" r="34" className="fill-none stroke-divider [stroke-width:1]" />
      {Array.from({ length: 36 }, (_, i) => {
        const a = (i * 10 * Math.PI) / 180;
        const major = i % 9 === 0;
        return (
          <line
            key={i}
            x1={40 + Math.sin(a) * 34}
            y1={40 - Math.cos(a) * 34}
            x2={40 + Math.sin(a) * (major ? 28 : 31)}
            y2={40 - Math.cos(a) * (major ? 28 : 31)}
            className={major ? 'stroke-muted [stroke-width:1.6]' : 'stroke-faint opacity-60 [stroke-width:1]'}
          />
        );
      })}
      {[
        ['N', 40, 20],
        ['E', 61, 43],
        ['S', 40, 65],
        ['W', 19, 43],
      ].map(([t, x, y]) => (
        <text key={t} x={x} y={y} textAnchor="middle" className="fill-muted font-sans text-[8px] font-bold">
          {t}
        </text>
      ))}
      {dir != null && (
        // Arrow points where the wind is blowing to (opposite of where it comes from).
        <g transform={`rotate(${dir + 180} 40 40)`} className="fill-accent stroke-accent [&_line]:[stroke-linecap:round] [&_line]:[stroke-width:2.5]">
          <line x1="40" y1="56" x2="40" y2="26" />
          <path d="M40 20l-6 9h12z" />
          <circle cx="40" cy="58" r="3" />
        </g>
      )}
    </svg>
  );
}

function SunArc({ now, sunrise, sunset, fmt, daylight }) {
  if (sunrise == null || sunset == null) {
    return <p className={NOTE}>No sunrise or sunset today (polar day or night).</p>;
  }
  const t = Math.min(Math.max((now - sunrise) / (sunset - sunrise), 0), 1);
  const up = now >= sunrise && now <= sunset;
  const x = 100 - 85 * Math.cos(Math.PI * t);
  const y = 80 - 66 * Math.sin(Math.PI * t);

  return (
    <div>
      <svg viewBox="0 0 200 92" className="block max-h-[110px] w-full overflow-visible" aria-hidden>
        <defs>
          <linearGradient id="sun-arc" x1="0" x2="1">
            <stop offset="0" stopColor="#f97316" />
            <stop offset="0.5" stopColor="#facc15" />
            <stop offset="1" stopColor="#f97316" />
          </linearGradient>
        </defs>
        <line x1="5" y1="80" x2="195" y2="80" className="stroke-divider [stroke-width:1]" />
        <path
          d="M15 80 A85 66 0 0 1 185 80"
          className="fill-none stroke-faint opacity-60 [stroke-dasharray:3_4] [stroke-width:1.5]"
        />
        <path
          d="M15 80 A85 66 0 0 1 185 80"
          className="fill-none [stroke-linecap:round] [stroke-width:3]"
          pathLength="1"
          strokeDasharray={`${t} 1`}
          stroke="url(#sun-arc)"
        />
        <circle
          cx={x}
          cy={y}
          r={up ? 7 : 5}
          className={up ? 'fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]' : 'fill-faint'}
        />
      </svg>
      <div className="mt-1.5 flex justify-between font-bold [&_small]:text-[11px] [&_small]:font-semibold [&_small]:text-faint [&>span]:flex [&>span]:flex-col">
        <span>
          <small>Sunrise</small>
          {fmt.clock(sunrise)}
        </span>
        <span className="text-center">
          <small>Daylight</small>
          {formatDuration(daylight)}
        </span>
        <span className="text-right">
          <small>Sunset</small>
          {fmt.clock(sunset)}
        </span>
      </div>
    </div>
  );
}

const UV_GRADIENT = 'linear-gradient(90deg, #22c55e, #eab308 30%, #f97316 55%, #ef4444 78%, #a855f7)';
const AQI_GRADIENT = 'linear-gradient(90deg, #22c55e, #eab308 25%, #f97316 42%, #ef4444 58%, #a855f7 80%, #9f1239)';

export function DetailsGrid({ weather }) {
  const { units } = useSettings();
  const { current, daily, hourly, air, location } = weather;
  const fmt = timeFormatters(location.timezone);
  const today = daily[0] || {};
  const tomorrow = daily[1];

  const feelsDelta = (current.feelsLike ?? 0) - (current.temp ?? 0);
  const feelsNote =
    feelsDelta > 2
      ? 'Humidity is making it feel warmer.'
      : feelsDelta < -2
        ? 'Wind is making it feel cooler.'
        : 'Similar to the actual temperature.';

  const uv = current.uv ?? today.uvMax;
  const uvInfo = uv != null ? uvBand(uv) : null;
  const aqi = air?.usAqi;
  const aqiInfo = aqi != null ? aqiBand(aqi) : null;

  const next24 = hourly.slice(0, 24).reduce((sum, h) => sum + (h.precip ?? 0), 0);

  const vis = current.visibility;
  const visNote = vis == null ? '' : vis >= 10000 ? 'Perfectly clear view.' : vis >= 4000 ? 'Slight haze.' : 'Poor visibility, take care.';

  return (
    <section className="min-w-0">
      <SectionTitle icon={LayoutGrid}>Conditions</SectionTitle>
      <div className="grid grid-cols-2 gap-2.5">
        <Tile icon={Sunrise} title="Sun" wide>
          <SunArc
            now={current.time ?? Date.now() / 1000}
            sunrise={today.sunrise}
            sunset={today.sunset}
            daylight={today.daylight}
            fmt={fmt}
          />
        </Tile>

        <Tile icon={Wind} title="Wind" wide>
          <div className="flex flex-wrap items-center justify-between gap-1">
            <div>
              <p className={VALUE}>{formatWind(current.wind.speed, units)}</p>
              <p className={NOTE}>
                {windWord(current.wind.speed)} from {compassPoint(current.wind.dir)}
              </p>
              <p className={NOTE}>Gusts {formatWind(current.wind.gust, units)}</p>
            </div>
            <Compass dir={current.wind.dir} />
          </div>
        </Tile>

        <Tile icon={Thermometer} title="Feels like">
          <p className={VALUE}>{formatTemp(current.feelsLike, units)}</p>
          <p className={NOTE}>{feelsNote}</p>
        </Tile>

        <Tile icon={SunMedium} title="UV index">
          {uvInfo ? (
            <>
              <p className={VALUE}>
                {Math.round(uv)} <span className={LABEL} style={{ color: uvInfo.color }}>{uvInfo.label}</span>
              </p>
              <Meter value={uv} max={11} gradient={UV_GRADIENT} label="UV index" />
              <p className={NOTE}>{uvInfo.advice}</p>
            </>
          ) : (
            <p className={NOTE}>Not available</p>
          )}
        </Tile>

        <Tile icon={Droplets} title="Humidity">
          <p className={VALUE}>{current.humidity != null ? `${Math.round(current.humidity)}%` : '--'}</p>
          <p className={NOTE}>The dew point is {formatTemp(current.dewPoint, units)} right now.</p>
        </Tile>

        <Tile icon={CloudRain} title="Precipitation">
          <p className={VALUE}>{formatPrecip(today.precipSum, units)}</p>
          <p className={NOTE}>
            Today · {formatPrecip(next24, units)} expected in the next 24 h.
          </p>
        </Tile>

        <Tile icon={Leaf} title="Air quality" wide>
          {aqiInfo ? (
            <>
              <p className={VALUE}>
                {Math.round(aqi)} <span className={LABEL} style={{ color: aqiInfo.color }}>{aqiInfo.label}</span>
              </p>
              <Meter value={aqi} max={300} gradient={AQI_GRADIENT} label="US air quality index" />
              <p className={NOTE}>{aqiInfo.advice}</p>
              <dl className="mt-3 grid grid-cols-4 gap-2 text-center [&_dd]:mt-0.5 [&_dd]:font-bold [&_dt]:text-[11px] [&_dt]:text-faint [&>div]:rounded-[10px] [&>div]:bg-surface [&>div]:p-2">
                {[
                  ['PM2.5', air.pm25],
                  ['PM10', air.pm10],
                  ['O₃', air.o3],
                  ['NO₂', air.no2],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v != null ? Math.round(v) : '--'}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-1.5 text-[11px] leading-[1.4] text-faint">US AQI · pollutants in µg/m³</p>
            </>
          ) : (
            <p className={NOTE}>Air quality data is not available here.</p>
          )}
        </Tile>

        <Tile icon={Gauge} title="Pressure">
          <p className={VALUE}>{formatPressure(current.pressure, units)}</p>
          <p className={NOTE}>At sea level.</p>
        </Tile>

        <Tile icon={Eye} title="Visibility">
          <p className={VALUE}>{formatVisibility(vis, units)}</p>
          <p className={NOTE}>{visNote}</p>
        </Tile>

        <Tile icon={CalendarClock} title="Tomorrow">
          {tomorrow ? (
            <>
              <p className={VALUE}>
                {formatTemp(tomorrow.max, units)} <span className="text-lg font-light text-muted">/ {formatTemp(tomorrow.min, units)}</span>
              </p>
              <p className={NOTE}>
                {describeWeather(tomorrow.code).label}
                {(tomorrow.pop ?? 0) >= 20 ? ` · ${tomorrow.pop}% chance of rain` : ''}
              </p>
            </>
          ) : (
            <p className={NOTE}>Not available</p>
          )}
        </Tile>

        <Tile icon={Cloudy} title="Cloud cover">
          <p className={VALUE}>{current.cloudCover != null ? `${Math.round(current.cloudCover)}%` : '--'}</p>
          <p className={NOTE}>
            {current.cloudCover == null
              ? ''
              : current.cloudCover < 20
                ? 'Mostly clear skies.'
                : current.cloudCover < 70
                  ? 'Some clouds around.'
                  : 'Mostly cloudy.'}
          </p>
        </Tile>
      </div>
    </section>
  );
}
