const cache = new Map();

/** Intl formatters bound to the forecast location's own time zone. */
export function timeFormatters(timeZone = 'UTC') {
  if (cache.has(timeZone)) return cache.get(timeZone);

  const make = (options) => {
    try {
      return new Intl.DateTimeFormat('en-US', { timeZone, ...options });
    } catch {
      return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options });
    }
  };
  const hour = make({ hour: 'numeric' });
  const clock = make({ hour: 'numeric', minute: '2-digit' });
  const weekday = make({ weekday: 'short' });
  const longDay = make({ weekday: 'long', month: 'short', day: 'numeric' });
  const dayKey = make({ year: 'numeric', month: '2-digit', day: '2-digit' });

  const fmt = {
    hour: (unix) => hour.format(unix * 1000).replace(' ', ' '),
    clock: (unix) => clock.format(unix * 1000),
    weekday: (unix) => weekday.format(unix * 1000),
    longDay: (unix) => longDay.format(unix * 1000),
    sameDay: (a, b) => dayKey.format(a * 1000) === dayKey.format(b * 1000),
  };
  cache.set(timeZone, fmt);
  return fmt;
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export function timeAgo(ms, now = Date.now()) {
  const minutes = Math.round((now - ms) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} h ago`;
}
