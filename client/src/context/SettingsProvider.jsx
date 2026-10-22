import { useEffect, useMemo, useState } from 'react';
import { SettingsContext } from './settings.js';
import { load, save } from '../lib/storage.js';

const prefersLight = () => window.matchMedia?.('(prefers-color-scheme: light)').matches;

// Fahrenheit by default only where it is the everyday unit.
const defaultUnits = () =>
  /^en-(US|LR)|^my\b/.test(navigator.language || '') ? 'imperial' : 'metric';

export function SettingsProvider({ children }) {
  const [units, setUnits] = useState(() => load('atmos:units', defaultUnits()));
  const [theme, setTheme] = useState(() => load('atmos:theme', prefersLight() ? 'light' : 'dark'));

  useEffect(() => save('atmos:units', units), [units]);
  useEffect(() => {
    save('atmos:theme', theme);
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'light' ? '#eef2f7' : '#0b1020');
  }, [theme]);

  const value = useMemo(() => ({ units, theme, setUnits, setTheme }), [units, theme]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
