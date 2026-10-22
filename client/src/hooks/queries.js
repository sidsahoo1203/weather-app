import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '../lib/api.js';

const cell = (value, digits = 2) => (value == null ? null : Number(value.toFixed(digits)));

export function useWeather(location) {
  return useQuery({
    queryKey: ['weather', cell(location?.lat), cell(location?.lon)],
    queryFn: ({ signal }) => api.weather(location.lat, location.lon, signal),
    enabled: Boolean(location),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

/** Name, state and country for a point (reverse geocoding). */
export function usePlace(location) {
  return useQuery({
    queryKey: ['place', cell(location?.lat), cell(location?.lon)],
    queryFn: ({ signal }) => api.reverse(location.lat, location.lon, signal),
    enabled: Boolean(location),
    staleTime: Infinity,
  });
}

/**
 * Cities across the state of the selected point. Keyed by the state code, so
 * moving around inside one state does not refetch the list.
 */
export function useRegion(location, place) {
  const key = place ? place.stateCode || `near:${cell(location.lat, 1)},${cell(location.lon, 1)}` : null;
  return useQuery({
    queryKey: ['region', key],
    queryFn: ({ signal }) => api.region(location.lat, location.lon, signal),
    enabled: Boolean(location && key),
    staleTime: 10 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useSearch(query) {
  const q = query.trim();
  return useQuery({
    queryKey: ['search', q.toLowerCase()],
    queryFn: ({ signal }) => api.search(q, signal),
    enabled: q.length >= 2,
    staleTime: 60 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
