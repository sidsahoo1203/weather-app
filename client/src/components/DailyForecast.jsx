import { CalendarDays, Droplet } from 'lucide-react';
import { WeatherIcon } from './WeatherIcon.jsx';
import { formatTemp } from '../lib/units.js';
import { timeFormatters } from '../lib/time.js';
import { tempGradient, tempColor } from '../lib/scales.js';
import { describeWeather } from '../lib/weatherCodes.js';
import { useSettings } from '../context/settings.js';

export function DailyForecast({ weather }) {
  const { units } = useSettings();
  const fmt = timeFormatters(weather.location.timezone);
  const days = weather.daily.filter((d) => d.min != null && d.max != null);
  if (!days.length) return null;

  const lo = Math.min(...days.map((d) => d.min));
  const hi = Math.max(...days.map((d) => d.max));
  const span = Math.max(hi - lo, 1);
  const pct = (t) => ((t - lo) / span) * 100;
  const now = weather.current.temp;

  return (
    <section className="block">
      <h2 className="section-title">
        <CalendarDays size={14} /> {days.length}-day forecast
      </h2>
      <ol className="daily">
        {days.map((d, i) => {
          const label = i === 0 ? 'Today' : fmt.weekday(d.time);
          return (
            <li key={d.time} className="daily__row" title={`${fmt.longDay(d.time)}: ${describeWeather(d.code).label}`}>
              <span className="daily__day">{label}</span>
              <span className="daily__icon">
                <WeatherIcon code={d.code} size={28} />
                {(d.pop ?? 0) >= 20 && (
                  <span className="daily__pop">
                    <Droplet size={10} aria-hidden />
                    {d.pop}%
                  </span>
                )}
              </span>
              <span className="daily__min">{formatTemp(d.min, units)}</span>
              <span className="daily__track" aria-hidden>
                <span
                  className="daily__range"
                  style={{
                    left: `${pct(d.min)}%`,
                    width: `${Math.max(pct(d.max) - pct(d.min), 3)}%`,
                    background: tempGradient(d.min, d.max),
                  }}
                />
                {i === 0 && now != null && (
                  <span
                    className="daily__now"
                    style={{ left: `${Math.min(Math.max(pct(now), 0), 100)}%`, borderColor: tempColor(now) }}
                  />
                )}
              </span>
              <span className="daily__max">{formatTemp(d.max, units)}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
