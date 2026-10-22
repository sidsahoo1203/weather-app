import { describeWeather, isWet, isSnowy } from './weatherCodes.js';
import { formatTemp } from './units.js';

const LOOKAHEAD_HOURS = 12;
const LIKELY = 50;

/**
 * One friendly sentence about what's coming, e.g.
 * "Rain likely around 4 PM. High of 31° today."
 */
export function forecastSummary(weather, units, fmt) {
  const { current, hourly, daily } = weather;
  const next = hourly.slice(1, LOOKAHEAD_HOURS + 1);
  const parts = [];

  const wetNow = isWet(current.code) || isSnowy(current.code);
  if (wetNow) {
    const clears = next.find((h) => (h.pop ?? 0) < 30 && !isWet(h.code) && !isSnowy(h.code));
    const what = isSnowy(current.code) ? 'Snow' : 'Rain';
    parts.push(clears ? `${what} easing by ${fmt.hour(clears.time)}.` : `${what} continuing for the next few hours.`);
  } else {
    const wetHour = next.find((h) => (h.pop ?? 0) >= LIKELY || isWet(h.code) || isSnowy(h.code));
    if (wetHour) {
      const kind = describeWeather(wetHour.code).kind;
      const what = kind === 'thunder' ? 'Thunderstorms' : isSnowy(wetHour.code) ? 'Snow' : 'Rain';
      const chance = wetHour.pop != null ? ` (${wetHour.pop}%)` : '';
      parts.push(`${what} likely around ${fmt.hour(wetHour.time)}${chance}.`);
    } else {
      parts.push(`Dry for the next ${LOOKAHEAD_HOURS} hours.`);
    }
  }

  const today = daily[0];
  if (today && current.time != null) {
    // After sunset, talk about tonight's low instead of today's high.
    const evening = today.sunset != null && current.time > today.sunset;
    if (evening && daily[1]) {
      parts.push(`Low of ${formatTemp(today.min, units)} tonight, ${formatTemp(daily[1].max, units)} tomorrow.`);
    } else {
      parts.push(`High of ${formatTemp(today.max, units)}, low of ${formatTemp(today.min, units)}.`);
    }
  }

  const gust = current.wind?.gust;
  if (gust != null && gust >= 50) parts.push('Strong gusts expected.');

  return parts.join(' ');
}
