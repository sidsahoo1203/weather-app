import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search, X, Star, History, MapPin, Loader2 } from 'lucide-react';
import { useSearch } from '../hooks/queries.js';
import { useDebounced } from '../hooks/useTimers.js';
import './SearchBox.css';

const subtitle = (place) => [place.region, place.country].filter(Boolean).join(', ');

export function SearchBox({ onSelect, favorites, recents }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const rootRef = useRef(null);
  const listId = useId();

  const debounced = useDebounced(query, 220);
  const search = useSearch(debounced);
  const typing = query.trim().length >= 2;

  // Each entry: { key, group, place, icon }
  const items = useMemo(() => {
    if (typing) {
      return (search.data || []).map((place) => ({ key: `r${place.id}`, group: 'Results', place, icon: MapPin }));
    }
    const favs = favorites.map((place, i) => ({ key: `f${i}`, group: 'Favourites', place, icon: Star }));
    const recent = recents
      .filter((r) => !favorites.some((f) => Math.abs(f.lat - r.lat) < 0.01 && Math.abs(f.lon - r.lon) < 0.01))
      .map((place, i) => ({ key: `h${i}`, group: 'Recent', place, icon: History }));
    return [...favs, ...recent];
  }, [typing, search.data, favorites, recents]);

  useEffect(() => setActive(0), [items]);

  // "/" focuses the search from anywhere, like many productivity apps.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  const choose = (item) => {
    const { place } = item;
    onSelect({
      lat: place.lat,
      lon: place.lon,
      name: place.name,
      region: place.region ?? null,
      country: place.country ?? null,
      source: 'search',
    });
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && items[active]) {
      e.preventDefault();
      choose(items[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const showList = open && (items.length > 0 || typing);
  let lastGroup = null;

  return (
    <div className="search" ref={rootRef}>
      <label className="search__field">
        <Search size={18} className="search__icon" aria-hidden />
        <span className="sr-only">Search for a city or place</span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search any city, town or place…"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList && items[active] ? `${listId}-${items[active].key}` : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
        />
        {search.isFetching && typing ? (
          <Loader2 size={16} className="search__spinner" aria-label="Searching" />
        ) : query ? (
          <button type="button" className="search__clear" onClick={() => setQuery('')} aria-label="Clear search">
            <X size={16} />
          </button>
        ) : (
          <kbd className="search__kbd" aria-hidden>
            /
          </kbd>
        )}
      </label>

      {showList && (
        <ul id={listId} className="search__list glass" role="listbox">
          {items.map((item, i) => {
            const header = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            const Icon = item.icon;
            return (
              <li key={item.key} role="presentation">
                {header && !typing && <div className="search__group">{header}</div>}
                <div
                  id={`${listId}-${item.key}`}
                  role="option"
                  aria-selected={i === active}
                  className="search__option"
                  onPointerEnter={() => setActive(i)}
                  onClick={() => choose(item)}
                >
                  <Icon size={16} aria-hidden />
                  <span className="search__name">{item.place.name}</span>
                  <span className="search__sub">{subtitle(item.place)}</span>
                </div>
              </li>
            );
          })}
          {typing && !search.isFetching && search.data?.length === 0 && (
            <li className="search__empty">No places match “{query.trim()}”.</li>
          )}
          {typing && search.isError && <li className="search__empty">{search.error.message}</li>}
        </ul>
      )}
    </div>
  );
}
