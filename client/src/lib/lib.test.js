import { describe, it, expect } from 'vitest';
import { formatTemp, formatWind, formatPrecip, formatPressure, formatVisibility, compassPoint, formatCoords } from './units.js';
import { describeWeather, isWet, isSnowy } from './weatherCodes.js';
import { tempColor, aqiBand, uvBand } from './scales.js';
import { forecastSummary } from './summary.js';
import { timeFormatters, formatDuration } from './time.js';
import { isNear, cityToLocation } from './places.js';

describe('units', () => {
  it('formats temperatures in both systems without "-0"', () => {
    expect(formatTemp(21.6, 'metric')).toBe('22°');
    expect(formatTemp(0, 'imperial')).toBe('32°');
    expect(formatTemp(-0.3, 'metric')).toBe('0°');
    expect(formatTemp(null, 'metric')).toBe('--');
    expect(formatTemp(30, 'metric', { degree: false })).toBe('30');
  });

  it('formats wind, precipitation, pressure and visibility', () => {
    expect(formatWind(16.09, 'imperial')).toBe('10 mph');
    expect(formatWind(12.4, 'metric')).toBe('12 km/h');
    expect(formatPrecip(2.345, 'metric')).toBe('2.3 mm');
    expect(formatPrecip(25.4, 'imperial')).toBe('1.0 in');
    expect(formatPressure(1013.25, 'metric')).toBe('1013 hPa');
    expect(formatPressure(1013.25, 'imperial')).toBe('29.92 inHg');
    expect(formatVisibility(24000, 'metric')).toBe('24 km');
    expect(formatVisibility(3200, 'metric')).toBe('3.2 km');
  });

  it('maps degrees to compass points', () => {
    expect(compassPoint(0)).toBe('N');
    expect(compassPoint(359)).toBe('N');
    expect(compassPoint(200)).toBe('SSW');
    expect(compassPoint(-90)).toBe('W');
    expect(compassPoint(null)).toBe('--');
  });

  it('formats coordinates with hemispheres', () => {
    expect(formatCoords(20.2961, -85.8245)).toBe('20.30°N, 85.82°W');
  });
});

describe('weather codes', () => {
  it('describes codes and switches clear skies to night mood', () => {
    expect(describeWeather(0, true)).toMatchObject({ label: 'Clear sky', mood: 'clear', kind: 'clear' });
    expect(describeWeather(0, false)).toMatchObject({ label: 'Clear night', mood: 'night' });
    expect(describeWeather(63, false).mood).toBe('rain');
    expect(describeWeather(1234).label).toBe('Unknown');
  });

  it('classifies wet and snowy codes', () => {
    expect(isWet(61)).toBe(true);
    expect(isWet(95)).toBe(true);
    expect(isWet(73)).toBe(false);
    expect(isSnowy(73)).toBe(true);
    expect(isSnowy(3)).toBe(false);
  });
});

describe('scales', () => {
  it('interpolates temperature colours and clamps the ends', () => {
    expect(tempColor(-50)).toBe('rgb(99, 102, 241)');
    expect(tempColor(60)).toBe('rgb(190, 18, 60)');
    expect(tempColor(NaN)).toBe('rgb(148, 163, 184)');
    expect(tempColor(24)).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
  });

  it('bands AQI and UV values', () => {
    expect(aqiBand(42).label).toBe('Good');
    expect(aqiBand(151).label).toBe('Unhealthy');
    expect(aqiBand(999).label).toBe('Hazardous');
    expect(uvBand(6.5).label).toBe('High');
    expect(uvBand(12).label).toBe('Extreme');
  });
});

describe('time', () => {
  it('formats in the location time zone', () => {
    const fmt = timeFormatters('Asia/Kolkata');
    // 2025-10-22T11:00:00Z is 4:30 PM in India.
    expect(fmt.clock(1761130800)).toMatch(/^4:30\sPM$/);
    expect(fmt.weekday(1761130800)).toBe('Wed');
    expect(timeFormatters('Not/AZone').clock(0)).toMatch(/^12:00\sAM$/);
  });

  it('formats durations', () => {
    expect(formatDuration(41000)).toBe('11h 23m');
  });
});

describe('forecastSummary', () => {
  const fmt = timeFormatters('UTC');
  const base = 1761130800;
  const hour = (i, extra = {}) => ({ time: base + i * 3600, code: 1, pop: 0, ...extra });
  const daily = [{ max: 31, min: 22, sunset: base + 8 * 3600 }, { max: 29, min: 21 }];

  it('announces upcoming rain', () => {
    const hourly = Array.from({ length: 13 }, (_, i) => hour(i, i === 4 ? { pop: 70, code: 61 } : {}));
    const text = forecastSummary({ current: { code: 1, time: base }, hourly, daily }, 'metric', fmt);
    expect(text).toMatch(/^Rain likely around 3\sPM \(70%\)\./);
    expect(text).toContain('High of 31°, low of 22°.');
  });

  it('says when rain eases and talks about tonight after sunset', () => {
    const hourly = Array.from({ length: 13 }, (_, i) => hour(i, i < 3 ? { pop: 90, code: 63 } : {}));
    const now = base + 9 * 3600;
    const text = forecastSummary({ current: { code: 63, time: now }, hourly, daily }, 'imperial', fmt);
    expect(text).toMatch(/^Rain easing by 2\sPM\./);
    expect(text).toContain('Low of 72° tonight, 84° tomorrow.');
  });

  it('reports a dry spell', () => {
    const hourly = Array.from({ length: 13 }, (_, i) => hour(i));
    expect(forecastSummary({ current: { code: 0, time: base }, hourly, daily }, 'metric', fmt)).toMatch(/^Dry for the next 12 hours\./);
  });
});

describe('places', () => {
  it('compares nearby points and builds locations from cities', () => {
    expect(isNear({ lat: 1, lon: 1 }, { lat: 1.01, lon: 0.99 })).toBe(true);
    expect(isNear({ lat: 1, lon: 1 }, { lat: 1.2, lon: 1 })).toBe(false);
    expect(isNear(null, { lat: 1, lon: 1 })).toBe(false);
    expect(
      cityToLocation({ lat: 1, lon: 2, name: 'Puri' }, { scope: 'state', name: 'Odisha', code: 'IN-OR', country: 'India' }),
    ).toEqual({ lat: 1, lon: 2, name: 'Puri', region: 'Odisha', country: 'India', regionCode: 'IN-OR', source: 'city' });
  });
});
