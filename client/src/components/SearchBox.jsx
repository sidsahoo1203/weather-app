import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search, X, Star, History, MapPin, Loader2 } from 'lucide-react';
import { useSearch } from '../hooks/queries.js';
import { useDebounced } from '../hooks/useTimers.js';
import { cn } from '../lib/cn.js';

const subtitle = (place) => [place.region, place.country].filter(Boolean).join(', ');

export function SearchBox({ onSelect, favorites, recents, className }) {
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
    <div className={cn('relative flex-1', className)} ref={rootRef}>
      <label className="flex h-11 cursor-text items-center gap-2.5 rounded-[14px] border border-divider bg-surface pr-3 pl-3.5 transition-colors duration-200 focus-within:border-accent/60 focus-within:bg-surface-hover">
        <Search size={18} className="shrink-0 text-muted" aria-hidden />
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
          className="h-full min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-none placeholder:text-faint"
        />
        {search.isFetching && typing ? (
          <Loader2 size={16} className="animate-spin text-muted" aria-label="Searching" />
        ) : query ? (
          <button
            type="button"
            className="grid size-[26px] place-items-center rounded-lg text-muted hover:bg-surface-hover"
            onClick={() => setQuery('')}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        ) : (
          <kbd className="rounded-md border border-divider px-[7px] py-px font-sans text-xs text-faint" aria-hidden>
            /
          </kbd>
        )}
      </label>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+8px)] z-10 m-0 max-h-[min(420px,60vh)] animate-pop-in list-none overflow-y-auto rounded-2xl border border-edge bg-menu p-1.5 shadow-panel"
        >
          {items.map((item, i) => {
            const header = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            const Icon = item.icon;
            return (
              <li key={item.key} role="presentation">
                {header && !typing && (
                  <div className="px-2.5 pt-2 pb-1 text-[11px] font-bold tracking-[0.08em] text-faint uppercase">{header}</div>
                )}
                <div
                  id={`${listId}-${item.key}`}
                  role="option"
                  aria-selected={i === active}
                  className="grid cursor-pointer grid-cols-[auto_auto_1fr] items-center gap-2.5 rounded-[10px] p-2.5 text-muted aria-selected:bg-surface-hover aria-selected:text-fg"
                  onPointerEnter={() => setActive(i)}
                  onClick={() => choose(item)}
                >
                  <Icon size={16} aria-hidden />
                  <span className="font-semibold whitespace-nowrap text-fg">{item.place.name}</span>
                  <span className="truncate text-[13px] text-faint">{subtitle(item.place)}</span>
                </div>
              </li>
            );
          })}
          {typing && !search.isFetching && search.data?.length === 0 && (
            <li className="px-2.5 py-3.5 text-sm text-muted">No places match “{query.trim()}”.</li>
          )}
          {typing && search.isError && <li className="px-2.5 py-3.5 text-sm text-muted">{search.error.message}</li>}
        </ul>
      )}
    </div>
  );
}
