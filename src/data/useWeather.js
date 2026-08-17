import { useState, useEffect, useCallback, useMemo } from 'react';
import { useHousehold } from '../household/HouseholdProvider';
import { fetchForecast } from './weather';

// One forecast per household, cached in localStorage.
//
// The cache is doing real work rather than being an optimisation: the calendar,
// the dashboard and the kitchen display all want the same week, and the wall
// tablet is left running for days. Without it, a screen that never navigates
// would still hammer the API on every re-render.

const TTL_MS = 60 * 60 * 1000; // an hour; a daily forecast doesn't move faster
const key = (lat, lon) => `tend:weather:${lat},${lon}`;

function readCache(lat, lon) {
  try {
    const raw = window.localStorage.getItem(key(lat, lon));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Date.now() - parsed.fetchedAt < TTL_MS ? parsed : null;
  } catch {
    return null;
  }
}

export function useWeather({ enabled = true } = {}) {
  const { settings } = useHousehold();
  const place = settings.weather ?? null;
  const lat = place?.lat ?? null;
  const lon = place?.lon ?? null;
  const on = enabled && lat != null && lon != null;

  const [data, setData] = useState(() => (on ? readCache(lat, lon) : null));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!on) {
      setData(null);
      return;
    }
    const cached = readCache(lat, lon);
    if (cached) {
      setData(cached);
      return;
    }
    let live = true;
    fetchForecast({ lat, lon })
      .then((next) => {
        if (!live) return;
        setData(next);
        setError(null);
        try {
          window.localStorage.setItem(key(lat, lon), JSON.stringify(next));
        } catch {
          /* private mode, or the quota is full — the forecast just won't cache */
        }
      })
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [on, lat, lon]);

  // A day's forecast, or null when it's outside the week we have.
  const forDay = useCallback((dayString) => data?.days?.[dayString] ?? null, [data]);

  return useMemo(
    () => ({
      place,
      unit: settings.weatherUnit ?? 'f',
      now: data?.now ?? null,
      days: data?.days ?? {},
      forDay,
      error,
      ready: Boolean(data),
      configured: lat != null && lon != null,
    }),
    [place, settings.weatherUnit, data, forDay, error, lat, lon],
  );
}
