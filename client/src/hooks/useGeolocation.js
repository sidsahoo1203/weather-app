import { useCallback, useState } from 'react';

const MESSAGES = {
  1: 'Location permission was denied.',
  2: 'Your position is unavailable right now.',
  3: 'Finding your location took too long.',
};

/** Promise-based wrapper around navigator.geolocation with status tracking. */
export function useGeolocation() {
  const [state, setState] = useState({ status: 'idle', position: null, error: null });

  const locate = useCallback(
    () =>
      new Promise((resolve, reject) => {
        if (!('geolocation' in navigator)) {
          const error = 'This browser does not support location.';
          setState((s) => ({ ...s, status: 'error', error }));
          reject(new Error(error));
          return;
        }
        setState((s) => ({ ...s, status: 'pending', error: null }));
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            const position = { lat: coords.latitude, lon: coords.longitude, accuracy: coords.accuracy };
            setState({ status: 'success', position, error: null });
            resolve(position);
          },
          (err) => {
            const error = MESSAGES[err.code] || 'Could not get your location.';
            setState((s) => ({ ...s, status: 'error', error }));
            reject(new Error(error));
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
        );
      }),
    [],
  );

  return { ...state, locate };
}
