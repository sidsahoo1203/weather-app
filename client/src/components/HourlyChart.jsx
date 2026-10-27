import { useMemo, useState } from 'react';
import { Clock, Droplets, Sunrise, Sunset, Navigation2 } from 'lucide-react';
import { WeatherIcon } from './WeatherIcon.jsx';
import { toUnitTemp, compassPoint } from '../lib/units.js';
import { timeFormatters } from '../lib/time.js';
import { tempColor } from '../lib/scales.js';
import { useSettings } from '../context/settings.js';
import { cn } from '../lib/cn.js';
import { Segmented, SectionTitle } from './ui.jsx';

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

const toUnitWind = (kmh, units) => (units === 'imperial' ? kmh / 1.609344 : kmh);

const TABS = [
  { value: 'temp', label: 'Temperature' },
  { value: 'precip', label: 'Precipitation' },
  { value: 'wind', label: 'Wind' },
];

const POP_LABEL = 'text-[11px] font-bold text-faint data-wet:text-blue-400';

/** Positions values on the curve band and builds the line and area paths. */
function curve(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const points = values.map((v, i) => [
    i * COL + COL / 2,
    PAD_TOP + (1 - (v - min) / span) * (CURVE_H - PAD_TOP - PAD_BOTTOM),
  ]);
  const line = smoothPath(points);
  const area = points.length ? `${line} L${points.at(-1)[0]},${CURVE_H} L${points[0][0]},${CURVE_H} Z` : '';
  return { points, line, area };
}

function LineChart({ id, width, values, labels, colors }) {
  const { points, line, area } = useMemo(() => curve(values), [values]);
  return (
    <svg className="mt-1 block overflow-visible" width={width} height={CURVE_H} aria-hidden>
      <defs>
        <linearGradient id={`${id}-stroke`} x1="0" x2="1" y1="0" y2="0">
          {colors.map((color, i) => (
            <stop key={i} offset={colors.length > 1 ? i / (colors.length - 1) : 0} stopColor={color} />
          ))}
        </linearGradient>
        <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id}-fill)`} />
      <path d={line} fill="none" stroke={`url(#${id}-stroke)`} strokeWidth="2.5" strokeLinecap="round" />
      {points.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={i === 0 ? 4 : 2.5} fill={colors[i]} />
          <text x={x} y={y - 9} textAnchor="middle" className="fill-fg font-sans text-xs font-bold">
            {labels[i]}
          </text>
        </g>
      ))}
    </svg>
  );
}

function PrecipBars({ hours }) {
  return (
    <div className="mt-1 flex items-end" style={{ height: CURVE_H + 24 }}>
      {hours.map((h) => {
        const pop = h.pop ?? 0;
        return (
          <div
            key={h.time}
            className="flex h-full flex-col items-center justify-end gap-1"
            style={{ width: COL }}
            title={`${pop}% chance of precipitation`}
          >
            <span className={POP_LABEL} data-wet={pop >= 20 || undefined}>
              {pop}%
            </span>
            <div className="flex h-[60px] w-[22px] items-end overflow-hidden rounded-md bg-surface">
              <span className="w-full rounded-md bg-gradient-to-b from-blue-400 to-blue-500" style={{ height: `${Math.max(pop, 3)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HourlyChart({ weather }) {
  const { units } = useSettings();
  const [tab, setTab] = useState('temp');
  const fmt = timeFormatters(weather.location.timezone);
  const hours = useMemo(() => weather.hourly.slice(0, HOURS), [weather.hourly]);
  const width = hours.length * COL;
  const sunEvents = weather.daily.flatMap((d) => [
    { time: d.sunrise, Icon: Sunrise, label: 'Sunrise' },
    { time: d.sunset, Icon: Sunset, label: 'Sunset' },
  ]);

  const series = useMemo(() => {
    const temps = hours.map((h) => h.temp ?? 0);
    const winds = hours.map((h) => h.wind ?? 0);
    return {
      temp: {
        values: temps,
        labels: temps.map((t) => `${Math.round(toUnitTemp(t, units))}°`),
        colors: temps.map(tempColor),
      },
      wind: {
        values: winds,
        labels: winds.map((w) => `${Math.round(toUnitWind(w, units))}`),
        colors: winds.map(() => 'var(--accent)'),
      },
    };
  }, [hours, units]);

  if (!hours.length) return null;

  const windUnit = units === 'imperial' ? 'mph' : 'km/h';
  const legend = {
    temp: `Bars show the chance of precipitation · temperatures in ${units === 'imperial' ? '°F' : '°C'}`,
    precip: 'Chance of precipitation for each hour',
    wind: `Wind speed in ${windUnit} · arrows point where the wind blows`,
  }[tab];

  return (
    <section className="min-w-0">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <SectionTitle icon={Clock} flush>
          Next 24 hours
        </SectionTitle>
        <Segmented
          role="tablist"
          label="Hourly chart"
          options={TABS}
          value={tab}
          onChange={setTab}
          size="sm"
        />
      </div>
      <div
        className="scrollbar-thin -mx-4 overflow-x-auto overscroll-x-contain px-4 pb-1.5 [mask-image:linear-gradient(90deg,transparent,#000_20px,#000_calc(100%-20px),transparent)] desk:-mx-5 desk:px-5"
        tabIndex={0}
        aria-label="Hourly forecast"
      >
        <div className="relative" style={{ width }}>
          <div className="flex">
            {hours.map((h, i) => {
              // Mark the sunrise/sunset that falls inside this hour.
              const event = sunEvents.find((e) => e.time >= h.time && e.time < h.time + 3600);
              return (
                <div key={h.time} className="relative flex flex-col items-center gap-1.5" style={{ width: COL }}>
                  {event ? (
                    <span
                      className="flex items-center gap-0.5 text-xs font-semibold whitespace-nowrap text-amber-400"
                      title={`${event.label} at ${fmt.clock(event.time)}`}
                    >
                      <event.Icon size={12} aria-label={event.label} />
                      {fmt.clock(event.time).replace(/\s?[AP]M$/, '')}
                    </span>
                  ) : (
                    <span className={cn('text-xs font-semibold whitespace-nowrap', i === 0 ? 'text-fg' : 'text-muted')}>
                      {i === 0 ? 'Now' : fmt.hour(h.time)}
                    </span>
                  )}
                  <WeatherIcon code={h.code} isDay={h.isDay} size={30} />
                </div>
              );
            })}
          </div>

          {tab === 'precip' ? (
            <PrecipBars hours={hours} />
          ) : (
            <LineChart id={`hourly-${tab}`} width={width} {...series[tab]} />
          )}

          {tab === 'temp' && (
            <div className="mt-1 flex">
              {hours.map((h) => (
                <div
                  key={h.time}
                  className="flex min-h-[42px] flex-col items-center gap-[3px]"
                  style={{ width: COL }}
                  title={`${h.pop ?? 0}% chance of precipitation`}
                >
                  <div className="flex h-6 w-2 items-end overflow-hidden rounded bg-surface">
                    <span className="w-full rounded bg-gradient-to-b from-blue-400 to-blue-500" style={{ height: `${Math.max(h.pop ?? 0, 2)}%` }} />
                  </div>
                  <span className={POP_LABEL} data-wet={(h.pop ?? 0) >= 20 || undefined}>
                    {(h.pop ?? 0) >= 20 ? `${h.pop}%` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}

          {tab === 'wind' && (
            <div className="mt-1.5 flex min-h-6">
              {hours.map((h) => (
                <div
                  key={h.time}
                  className="grid place-items-center text-muted"
                  style={{ width: COL }}
                  title={h.windDir != null ? `From ${compassPoint(h.windDir)}` : undefined}
                >
                  {h.windDir != null && (
                    <Navigation2 size={14} style={{ transform: `rotate(${h.windDir + 180}deg)` }} aria-hidden />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-faint">
        <Droplets size={12} /> {legend}
      </p>
    </section>
  );
}
