import { CalendarDays, Droplet } from 'lucide-react';
import { WeatherIcon } from './WeatherIcon.jsx';
import { formatTemp } from '../lib/units.js';
import { timeFormatters } from '../lib/time.js';
import { tempGradient, tempColor } from '../lib/scales.js';
import { describeWeather } from '../lib/weatherCodes.js';
import { useSettings } from '../context/settings.js';
import { SectionTitle } from './ui.jsx';

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
    <section className="min-w-0">
      <SectionTitle icon={CalendarDays}>{days.length}-day forecast</SectionTitle>
      <ol className="m-0 list-none p-0">
        {days.map((d, i) => {
          const label = i === 0 ? 'Today' : fmt.weekday(d.time);
          return (
            <li
              key={d.time}
              className="grid grid-cols-[52px_44px_38px_1fr_38px] items-center gap-2.5 border-b border-divider py-[7px] last:border-b-0"
              title={`${fmt.longDay(d.time)}: ${describeWeather(d.code).label}`}
            >
              <span className="font-semibold">{label}</span>
              <span className="relative grid justify-items-center">
                <WeatherIcon code={d.code} size={28} />
                {(d.pop ?? 0) >= 20 && (
                  <span className="-mt-0.5 flex items-center gap-px text-[10px] font-bold text-blue-400">
                    <Droplet size={10} aria-hidden />
                    {d.pop}%
                  </span>
                )}
              </span>
              <span className="text-right text-muted">{formatTemp(d.min, units)}</span>
              <span className="relative h-1.5 rounded-[3px] bg-surface-hover" aria-hidden>
                <span
                  className="absolute inset-y-0 rounded-[3px]"
                  style={{
                    left: `${pct(d.min)}%`,
                    width: `${Math.max(pct(d.max) - pct(d.min), 3)}%`,
                    background: tempGradient(d.min, d.max),
                  }}
                />
                {i === 0 && now != null && (
                  <span
                    className="absolute top-1/2 -mt-[5px] -ml-[5px] size-2.5 rounded-full border-[3px] bg-bg"
                    style={{ left: `${Math.min(Math.max(pct(now), 0), 100)}%`, borderColor: tempColor(now) }}
                  />
                )}
              </span>
              <span className="font-bold">{formatTemp(d.max, units)}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
