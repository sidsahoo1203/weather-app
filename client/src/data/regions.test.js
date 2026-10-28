// Sanity checks for the generated files in ./india (see scripts/build-india-regions.mjs).
import { describe, it, expect } from 'vitest';
import { INDIA_STATES, findIndiaState } from './indiaStates.js';

const files = import.meta.glob('./india/*.json', { eager: true, import: 'default' });

describe('bundled India data', () => {
  it('has a file for every state and union territory', () => {
    const missing = INDIA_STATES.filter((s) => !files[`./india/${s.code}.json`]).map((s) => s.code);
    expect(missing).toEqual([]);
  });

  for (const state of INDIA_STATES) {
    it(`${state.code} ${state.name}: valid places inside India, capital included`, () => {
      const data = files[`./india/${state.code}.json`];
      if (!data) return; // reported by the test above
      expect(data.code).toBe(state.code);
      expect(data.cities.length).toBeGreaterThan(0);
      const ids = new Set();
      for (const city of data.cities) {
        expect(typeof city.name).toBe('string');
        expect(city.lat).toBeGreaterThan(6);
        expect(city.lat).toBeLessThan(37.6);
        expect(city.lon).toBeGreaterThan(68);
        expect(city.lon).toBeLessThan(97.5);
        expect(ids.has(city.id)).toBe(false);
        ids.add(city.id);
      }
      expect(data.cities.some((c) => c.capital)).toBe(true);
    });
  }

  it('maps old ISO codes to the current state', () => {
    expect(findIndiaState('IN-OR').code).toBe('IN-OD');
    expect(findIndiaState('in-ct').code).toBe('IN-CG');
    expect(findIndiaState('IN-UT').code).toBe('IN-UK');
    expect(findIndiaState('IN-XX')).toBeNull();
    expect(findIndiaState(null)).toBeNull();
  });
});
