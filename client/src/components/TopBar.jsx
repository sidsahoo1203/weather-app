import { LocateFixed, Loader2, Moon, Sun } from 'lucide-react';
import { useSettings } from '../context/settings.js';
import { SearchBox } from './SearchBox.jsx';
import './TopBar.css';

function Logo() {
  return (
    <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden>
      <defs>
        <linearGradient id="atmos-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill="url(#atmos-logo)" opacity="0.18" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="url(#atmos-logo)" strokeWidth="2.5" />
      <path d="M7 19c3-2 6-2 9 0s6 2 9 0" fill="none" stroke="url(#atmos-logo)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function TopBar({ onSelect, onLocate, locating, favorites, recents }) {
  const { units, setUnits, theme, setTheme } = useSettings();

  return (
    <header className="topbar glass">
      <a className="brand" href="/" aria-label="Atmos home">
        <Logo />
        <span>Atmos</span>
      </a>

      <SearchBox onSelect={onSelect} favorites={favorites} recents={recents} />

      <div className="topbar__actions">
        <button
          type="button"
          className="icon-btn"
          onClick={onLocate}
          aria-label="Use my location"
          title="Use my location"
          disabled={locating}
        >
          {locating ? <Loader2 size={20} className="search__spinner" /> : <LocateFixed size={20} />}
        </button>

        <div className="segmented" role="group" aria-label="Temperature units">
          <button type="button" aria-pressed={units === 'metric'} onClick={() => setUnits('metric')}>
            °C
          </button>
          <button type="button" aria-pressed={units === 'imperial'} onClick={() => setUnits('imperial')}>
            °F
          </button>
        </div>

        <button
          type="button"
          className="icon-btn"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  );
}
