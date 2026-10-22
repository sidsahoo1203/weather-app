import { useCallback, useEffect, useState } from 'react';
import { load, save } from '../lib/storage.js';

const MAX_RECENT = 6;
const same = (a, b) => Math.abs(a.lat - b.lat) < 0.01 && Math.abs(a.lon - b.lon) < 0.01;

/** Favourite and recently viewed places, persisted in localStorage. */
export function useSavedPlaces() {
  const [favorites, setFavorites] = useState(() => load('atmos:favorites', []));
  const [recents, setRecents] = useState(() => load('atmos:recents', []));

  useEffect(() => save('atmos:favorites', favorites), [favorites]);
  useEffect(() => save('atmos:recents', recents), [recents]);

  const isFavorite = useCallback((place) => favorites.some((f) => same(f, place)), [favorites]);

  const toggleFavorite = useCallback((place) => {
    setFavorites((list) =>
      list.some((f) => same(f, place)) ? list.filter((f) => !same(f, place)) : [...list, place],
    );
  }, []);

  const addRecent = useCallback((place) => {
    if (!place?.name) return;
    setRecents((list) => [place, ...list.filter((r) => !same(r, place))].slice(0, MAX_RECENT));
  }, []);

  return { favorites, recents, isFavorite, toggleFavorite, addRecent };
}
