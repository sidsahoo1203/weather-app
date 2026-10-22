import { useEffect, useState } from 'react';

export function useDebounced(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/** True once `active` has stayed true for `ms` milliseconds. */
export function useLingering(active, ms) {
  const [lingering, setLingering] = useState(false);
  useEffect(() => {
    if (!active) {
      setLingering(false);
      return undefined;
    }
    const id = setTimeout(() => setLingering(true), ms);
    return () => clearTimeout(id);
  }, [active, ms]);
  return lingering;
}

/** Re-renders every `ms` so relative times ("5 min ago") stay fresh. */
export function useNow(ms = 60000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
