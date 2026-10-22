import { createContext, useContext } from 'react';

export const SettingsContext = createContext({
  units: 'metric',
  theme: 'dark',
  setUnits: () => {},
  setTheme: () => {},
});

export const useSettings = () => useContext(SettingsContext);
