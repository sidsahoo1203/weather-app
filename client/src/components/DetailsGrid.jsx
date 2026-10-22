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

function Tile({ icon: Icon, title, children, wide = false }) {
  return (
    <div className={`tile card ${wide ? 'tile--wide' : ''}`}>
      <h3 className="tile__title">
        <Icon size={14} aria-hidden /> {title}
      </h3>
      {children}
    </div>
  );
}

function Meter({ value, max, gradient, label }) {
  const pct = Math.min(Math.max(value / max, 0), 1) * 100;
  return (
    <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <span className="meter__track" style={{ background: gradient }} />
      <span className="meter__dot" style={{ left: `${pct}%` }} />
    </div>
  );
}

function Compass({ dir }) {
  return (
    <svg viewBox="0 0 80 80" className="compass" aria-hidden>
      <circle cx="40" cy="40" r="34" className="compass__ring" />
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
            className={major ? 'compass__tick compass__tick--major' : 'compass__tick'}
          />
        );
      })}
      {[
        ['N', 40, 20],
        ['E', 61, 43],
        ['S', 40, 65],
        ['W', 19, 43],
      ].map(([t, x, y]) => (
        <text key={t} x={x} y={y} textAnchor="middle" className="compass__label">
          {t}
        </text>
      ))}
      {dir != null && (
        // Arrow points where the wind is blowing to (opposite of where it comes from).
        <g transform={`rotate(${dir + 180} 40 40)`} className="compass__arrow">
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
    return <p className="tile__note">No sunrise or sunset today (polar day or night).</p>;
  }
  const t = Math.min(Math.max((now - sunrise) / (sunset - sunrise), 0), 1);
  const up = now >= sunrise && now <= sunset;
  const x = 100 - 85 * Math.cos(Math.PI * t);
  const y = 80 - 66 * Math.sin(Math.PI * t);

  return (
    <div className="sun">
      <svg viewBox="0 0 200 92" className="sun__svg" aria-hidden>
        <defs>
          <linearGradient id="sun-arc" x1="0" x2="1">
            <stop offset="0" stopColor="#f97316" />
            <stop offset="0.5" stopColor="#facc15" />
            <stop offset="1" stopColor="#f97316" />
          </linearGradient>
        </defs>
        <line x1="5" y1="80" x2="195" y2="80" className="sun__horizon" />
        <path d="M15 80 A85 66 0 0 1 185 80" className="sun__track" />
        <path
          d="M15 80 A85 66 0 0 1 185 80"
          className="sun__progress"
          pathLength="1"
          strokeDasharray={`${t} 1`}
          stroke="url(#sun-arc)"
        />
        <circle cx={x} cy={y} r={up ? 7 : 5} className={up ? 'sun__dot' : 'sun__dot is-down'} />
      </svg>
      <div className="sun__times">
        <span>
          <small>Sunrise</small>
          {fmt.clock(sunrise)}
        </span>
        <span className="sun__daylight">
          <small>Daylight</small>
          {formatDuration(daylight)}
        </span>
        <span>
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
    <section className="block">
      <h2 className="section-title">
        <LayoutGrid size={14} /> Conditions
      </h2>
      <div className="tiles">
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
          <div className="tile__split">
            <div>
              <p className="tile__value">{formatWind(current.wind.speed, units)}</p>
              <p className="tile__note">
                {windWord(current.wind.speed)} from {compassPoint(current.wind.dir)}
              </p>
              <p className="tile__note">Gusts {formatWind(current.wind.gust, units)}</p>
            </div>
            <Compass dir={current.wind.dir} />
          </div>
        </Tile>

        <Tile icon={Thermometer} title="Feels like">
          <p className="tile__value">{formatTemp(current.feelsLike, units)}</p>
          <p className="tile__note">{feelsNote}</p>
        </Tile>

        <Tile icon={SunMedium} title="UV index">
          {uvInfo ? (
            <>
              <p className="tile__value">
                {Math.round(uv)} <span style={{ color: uvInfo.color }}>{uvInfo.label}</span>
              </p>
              <Meter value={uv} max={11} gradient={UV_GRADIENT} label="UV index" />
              <p className="tile__note">{uvInfo.advice}</p>
            </>
          ) : (
            <p className="tile__note">Not available</p>
          )}
        </Tile>

        <Tile icon={Droplets} title="Humidity">
          <p className="tile__value">{current.humidity != null ? `${Math.round(current.humidity)}%` : '--'}</p>
          <p className="tile__note">The dew point is {formatTemp(current.dewPoint, units)} right now.</p>
        </Tile>

        <Tile icon={CloudRain} title="Precipitation">
          <p className="tile__value">{formatPrecip(today.precipSum, units)}</p>
          <p className="tile__note">
            Today · {formatPrecip(next24, units)} expected in the next 24 h.
          </p>
        </Tile>

        <Tile icon={Leaf} title="Air quality" wide>
          {aqiInfo ? (
            <>
              <p className="tile__value">
                {Math.round(aqi)} <span style={{ color: aqiInfo.color }}>{aqiInfo.label}</span>
              </p>
              <Meter value={aqi} max={300} gradient={AQI_GRADIENT} label="US air quality index" />
              <p className="tile__note">{aqiInfo.advice}</p>
              <dl className="pollutants">
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
              <p className="tile__note tile__note--faint">US AQI · pollutants in µg/m³</p>
            </>
          ) : (
            <p className="tile__note">Air quality data is not available here.</p>
          )}
        </Tile>

        <Tile icon={Gauge} title="Pressure">
          <p className="tile__value">{formatPressure(current.pressure, units)}</p>
          <p className="tile__note">At sea level.</p>
        </Tile>

        <Tile icon={Eye} title="Visibility">
          <p className="tile__value">{formatVisibility(vis, units)}</p>
          <p className="tile__note">{visNote}</p>
        </Tile>

        <Tile icon={CalendarClock} title="Tomorrow">
          {tomorrow ? (
            <>
              <p className="tile__value">
                {formatTemp(tomorrow.max, units)} <span className="tile__low">/ {formatTemp(tomorrow.min, units)}</span>
              </p>
              <p className="tile__note">
                {describeWeather(tomorrow.code).label}
                {(tomorrow.pop ?? 0) >= 20 ? ` · ${tomorrow.pop}% chance of rain` : ''}
              </p>
            </>
          ) : (
            <p className="tile__note">Not available</p>
          )}
        </Tile>

        <Tile icon={Cloudy} title="Cloud cover">
          <p className="tile__value">{current.cloudCover != null ? `${Math.round(current.cloudCover)}%` : '--'}</p>
          <p className="tile__note">
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
