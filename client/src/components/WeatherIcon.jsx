import { useId } from 'react';
import { cn } from '../lib/cn.js';
import { describeWeather } from '../lib/weatherCodes.js';

// Animations (motion-safe:group-data-animated/wi:…) run only on icons rendered with
// `animated` and when the user allows motion. Class names are written out in full so
// Tailwind can find them.

// A cloud drawn in a 64×64 box (roughly x 11–57, y 16–46).
const CLOUD = 'M20 46h26a10 10 0 0 0 .9-19.96A14 14 0 0 0 20.3 24.4 11 11 0 0 0 20 46z';

function Sun({ cx = 32, cy = 32, r = 11 }) {
  return (
    <g>
      <g
        className="stroke-amber-400 [stroke-linecap:round] [stroke-width:3] motion-safe:group-data-animated/wi:animate-wi-spin"
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          return (
            <line
              key={i}
              x1={cx + Math.cos(a) * (r + 4)}
              y1={cy + Math.sin(a) * (r + 4)}
              x2={cx + Math.cos(a) * (r + 8.5)}
              y2={cy + Math.sin(a) * (r + 8.5)}
            />
          );
        })}
      </g>
      <circle cx={cx} cy={cy} r={r} className="fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.55)]" />
    </g>
  );
}

function Moon({ cx = 32, cy = 32, r = 12 }) {
  const id = useId();
  return (
    <g className="motion-safe:group-data-animated/wi:animate-wi-glow">
      <mask id={id}>
        <rect width="64" height="64" fill="#fff" />
        <circle cx={cx + r * 0.55} cy={cy - r * 0.45} r={r * 0.85} fill="#000" />
      </mask>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        mask={`url(#${id})`}
        className="fill-slate-200 drop-shadow-[0_0_6px_rgba(226,232,240,0.35)]"
      />
    </g>
  );
}

function Cloud({ dark, transform }) {
  return (
    <path
      d={CLOUD}
      transform={transform}
      className={cn(
        'stroke-slate-900/10 [stroke-width:1] light:stroke-slate-900/30',
        dark ? 'fill-slate-400 light:fill-slate-500' : 'fill-slate-100 light:fill-slate-200',
        'motion-safe:group-data-animated/wi:animate-wi-drift',
      )}
    />
  );
}

function Drops({ snow = false, mixed = false }) {
  const xs = [24, 33, 42];
  return (
    <g>
      {xs.map((x, i) => {
        const flake = snow || (mixed && i === 1);
        return flake ? (
          <circle
            key={x}
            cx={x - 2}
            cy={51}
            r={2.2}
            className="fill-sky-100 stroke-sky-300 [stroke-width:1] motion-safe:group-data-animated/wi:animate-wi-snow"
            style={{ animationDelay: `${i * 0.35}s` }}
          />
        ) : (
          <line
            key={x}
            x1={x}
            y1={47}
            x2={x - 3}
            y2={55}
            className="stroke-blue-400 [stroke-linecap:round] [stroke-width:3] motion-safe:group-data-animated/wi:animate-wi-fall"
            style={{ animationDelay: `${i * 0.25}s` }}
          />
        );
      })}
    </g>
  );
}

const Bolt = () => (
  <path
    d="M34 43l-7 11h5.5l-3 9 10-13h-5.5l3.5-7z"
    className="fill-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.7)] motion-safe:group-data-animated/wi:animate-wi-flash"
  />
);

function Fog() {
  return (
    <g className="stroke-slate-300 [stroke-linecap:round] [stroke-width:3.5] *:motion-safe:group-data-animated/wi:animate-wi-slide">
      <line x1="14" y1="50" x2="46" y2="50" />
      <line x1="20" y1="56" x2="52" y2="56" style={{ animationDelay: '0.6s' }} />
    </g>
  );
}

const LIFTED = 'translate(0 -6)';

export function WeatherIcon({ code, isDay = true, size = 40, animated = false, title }) {
  const { kind, label } = describeWeather(code, isDay);
  const celestial = isDay ? <Sun cx={22} cy={22} r={8.5} /> : <Moon cx={23} cy={22} r={10} />;

  let art;
  switch (kind) {
    case 'clear':
      art = isDay ? <Sun /> : <Moon />;
      break;
    case 'partly':
      art = (
        <>
          {celestial}
          <Cloud transform="translate(10 8) scale(0.82)" />
        </>
      );
      break;
    case 'fog':
      art = (
        <>
          <Cloud transform={LIFTED} />
          <Fog />
        </>
      );
      break;
    case 'drizzle':
    case 'rain':
    case 'sleet':
    case 'snow':
      art = (
        <>
          <Cloud dark={kind === 'rain'} transform={LIFTED} />
          <Drops snow={kind === 'snow'} mixed={kind === 'sleet'} />
        </>
      );
      break;
    case 'showers':
      art = (
        <>
          {celestial}
          <Cloud transform="translate(8 0) scale(0.85)" />
          <Drops />
        </>
      );
      break;
    case 'thunder':
      art = (
        <>
          <Cloud dark transform={LIFTED} />
          <Bolt />
        </>
      );
      break;
    default:
      art = <Cloud />;
  }

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className="group/wi block shrink-0 overflow-visible"
      data-animated={animated || undefined}
      role="img"
      aria-label={title || label}
    >
      {art}
    </svg>
  );
}
