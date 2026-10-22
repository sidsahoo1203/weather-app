import { useMemo } from 'react';
import { Clock, Droplets, Sunrise, Sunset } from 'lucide-react';
import { WeatherIcon } from './WeatherIcon.jsx';
import { toUnitTemp } from '../lib/units.js';
import { timeFormatters } from '../lib/time.js';
import { tempColor } from '../lib/scales.js';
import { useSettings } from '../context/settings.js';

const HOURS = 25;
const COL = 58;
const CURVE_H = 64;
const PAD_TOP = 22;
const PAD_BOTTOM = 8;

/** Smooth path through points using Catmull–Rom splines converted to cubic Béziers. */
function smoothPath(points) {
  if (points.length < 2) return '';
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0]},${p2[1].toFixed(1)}`;
  }
  return d;
}

export function HourlyChart({ weather }) {
  const { units } = useSettings();
  const fmt = timeFormatters(weather.location.timezone);
  const hours = useMemo(() => weather.hourly.slice(0, HOURS), [weather.hourly]);
  const width = hours.length * COL;
  const sunEvents = weather.daily.flatMap((d) => [
    { time: d.sunrise, Icon: Sunrise, label: 'Sunrise' },
    { time: d.sunset, Icon: Sunset, label: 'Sunset' },
  ]);

  const { line, area, points, gradientStops } = useMemo(() => {
    const temps = hours.map((h) => h.temp ?? 0);
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const span = Math.max(max - min, 1);
    const pts = temps.map((t, i) => [
      i * COL + COL / 2,
      PAD_TOP + (1 - (t - min) / span) * (CURVE_H - PAD_TOP - PAD_BOTTOM),
    ]);
    const path = smoothPath(pts);
    return {
      points: pts,
      line: path,
      area: pts.length ? `${path} L${pts.at(-1)[0]},${CURVE_H} L${pts[0][0]},${CURVE_H} Z` : '',
      gradientStops: temps.map((t, i) => ({
        offset: temps.length > 1 ? i / (temps.length - 1) : 0,
        color: tempColor(t),
      })),
    };
  }, [hours]);

  if (!hours.length) return null;

  return (
    <section className="block">
      <h2 className="section-title">
        <Clock size={14} /> Next 24 hours
      </h2>
      <div className="hourly scroll-x" tabIndex={0} aria-label="Hourly forecast">
        <div className="hourly__inner" style={{ width }}>
          <div className="hourly__row">
            {hours.map((h, i) => {
              // Mark the sunrise/sunset that falls inside this hour.
              const event = sunEvents.find((e) => e.time >= h.time && e.time < h.time + 3600);
              return (
                <div key={h.time} className="hourly__col" style={{ width: COL }}>
                  {event ? (
                    <span className="hourly__time hourly__time--sun" title={`${event.label} at ${fmt.clock(event.time)}`}>
                      <event.Icon size={12} aria-label={event.label} />
                      {fmt.clock(event.time).replace(/\s?[AP]M$/, '')}
                    </span>
                  ) : (
                    <span className="hourly__time">{i === 0 ? 'Now' : fmt.hour(h.time)}</span>
                  )}
                  <WeatherIcon code={h.code} isDay={h.isDay} size={30} />
                </div>
              );
            })}
          </div>

          <svg className="hourly__curve" width={width} height={CURVE_H} aria-hidden>
            <defs>
              <linearGradient id="hourly-stroke" x1="0" x2="1" y1="0" y2="0">
                {gradientStops.map((s, i) => (
                  <stop key={i} offset={s.offset} stopColor={s.color} />
                ))}
              </linearGradient>
              <linearGradient id="hourly-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--accent)" stopOpacity="0.28" />
                <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#hourly-fill)" />
            <path d={line} fill="none" stroke="url(#hourly-stroke)" strokeWidth="2.5" strokeLinecap="round" />
            {points.map(([x, y], i) => (
              <g key={i}>
                <circle cx={x} cy={y} r={i === 0 ? 4 : 2.5} fill={tempColor(hours[i].temp)} />
                <text x={x} y={y - 9} textAnchor="middle" className="hourly__temp">
                  {Math.round(toUnitTemp(hours[i].temp, units))}°
                </text>
              </g>
            ))}
          </svg>

          <div className="hourly__row hourly__row--pop">
            {hours.map((h) => (
              <div key={h.time} className="hourly__pop" style={{ width: COL }} title={`${h.pop ?? 0}% chance of precipitation`}>
                <div className="hourly__bar">
                  <span style={{ height: `${Math.max(h.pop ?? 0, 2)}%` }} />
                </div>
                <span className={(h.pop ?? 0) >= 20 ? 'is-wet' : ''}>
                  {(h.pop ?? 0) >= 20 ? `${h.pop}%` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="hourly__legend">
        <Droplets size={12} /> Bars show the chance of precipitation · temperatures in {units === 'imperial' ? '°F' : '°C'}
      </p>
    </section>
  );
}
