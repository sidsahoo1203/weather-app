import { LocateFixed, Loader2, Moon, Sun } from 'lucide-react';
import { useSettings } from '../context/settings.js';
import { SearchBox } from './SearchBox.jsx';
import { IconButton, Segmented } from './ui.jsx';

const UNIT_OPTIONS = [
  { value: 'metric', label: '°C' },
  { value: 'imperial', label: '°F' },
];

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
    <header className="glass relative z-[1100] flex flex-wrap items-center gap-2.5 border-b border-edge px-3 py-2.5 desk:absolute desk:inset-x-4 desk:top-4 desk:h-16 desk:flex-nowrap desk:gap-4 desk:rounded-[20px] desk:border desk:py-0 desk:pr-2.5 desk:pl-4">
      <a
        className="mr-2 flex items-center gap-2.5 font-display text-[19px] font-semibold tracking-[-0.01em] text-fg no-underline"
        href="/"
        aria-label="Atmos home"
      >
        <Logo />
        <span className="hidden desk:inline">Atmos</span>
      </a>

      <SearchBox
        onSelect={onSelect}
        favorites={favorites}
        recents={recents}
        className="order-3 basis-full desk:order-none desk:max-w-[520px] desk:basis-auto"
      />

      <div className="ml-auto flex items-center gap-1.5">
        <IconButton onClick={onLocate} aria-label="Use my location" title="Use my location" disabled={locating}>
          {locating ? <Loader2 size={20} className="animate-spin" /> : <LocateFixed size={20} />}
        </IconButton>

        <Segmented
          label="Temperature units"
          options={UNIT_OPTIONS}
          value={units}
          onChange={setUnits}
        />

        <IconButton
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </IconButton>
      </div>
    </header>
  );
}
