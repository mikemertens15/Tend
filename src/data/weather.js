// Weather, in the two places a household actually wants it: on the week, and
// on the wall display.
//
// Open-Meteo needs no API key and sends CORS headers, so this is a plain fetch
// from the browser — no proxy, no secret, no edge function. The place is
// geocoded once when you set it and stored as lat/long in household settings,
// so the daily forecast call is the only one that ever runs.
//
// It deliberately isn't a section. Weather on its own is something your phone
// already does better; what Tend can do that a weather app can't is notice
// that the gutters are due on the one dry day this week.

const FORECAST = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search';

// WMO weather codes, collapsed to the handful of distinctions that change what
// you'd do today. "Light drizzle" and "moderate drizzle" are the same decision.
const CODES = [
  [[0], '☀️', 'Clear'],
  [[1, 2], '🌤️', 'Mostly sunny'],
  [[3], '☁️', 'Cloudy'],
  [[45, 48], '🌫️', 'Fog'],
  [[51, 53, 55, 56, 57], '🌦️', 'Drizzle'],
  [[61, 63, 65, 66, 67, 80, 81, 82], '🌧️', 'Rain'],
  [[71, 73, 75, 77, 85, 86], '🌨️', 'Snow'],
  [[95, 96, 99], '⛈️', 'Storms'],
];

export function describeCode(code) {
  const hit = CODES.find(([codes]) => codes.includes(code));
  return { icon: hit?.[1] ?? '🌡️', label: hit?.[2] ?? '—' };
}

// Wet enough that you'd put off anything outdoors.
export const isWet = (code) => code >= 51 && code !== 77;

// Cold enough that hoses, pipes and outdoor taps become a job.
export const FREEZING_C = 0;

export const cToF = (c) => (c * 9) / 5 + 32;

export function formatTemp(c, unit) {
  if (c == null) return '—';
  return unit === 'f' ? `${Math.round(cToF(c))}°` : `${Math.round(c)}°`;
}

// Turn "Cincinnati" or "45202" into somewhere with coordinates. Returns a few
// candidates, because place names are not unique and picking is the user's job.
export async function geocode(query) {
  const q = (query || '').trim();
  if (!q) return [];
  const url = `${GEOCODE}?name=${encodeURIComponent(q)}&count=5&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not look that up.');
  const body = await res.json();
  return (body.results ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    admin: r.admin1 ?? null,
    country: r.country_code ?? null,
    lat: r.latitude,
    lon: r.longitude,
    // "Cincinnati, Ohio, US" — enough to tell two Springfields apart.
    label: [r.name, r.admin1, r.country_code].filter(Boolean).join(', '),
  }));
}

// A week of daily forecast, keyed by 'YYYY-MM-DD' so the calendar can look a
// day up without searching.
export async function fetchForecast({ lat, lon }) {
  const url =
    `${FORECAST}?latitude=${lat}&longitude=${lon}` +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
    '&current=temperature_2m,weather_code&timezone=auto&forecast_days=8';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not reach the forecast.');
  const body = await res.json();

  const days = {};
  const d = body.daily ?? {};
  (d.time ?? []).forEach((date, i) => {
    days[date] = {
      date,
      code: d.weather_code?.[i] ?? null,
      high: d.temperature_2m_max?.[i] ?? null,
      low: d.temperature_2m_min?.[i] ?? null,
      rainChance: d.precipitation_probability_max?.[i] ?? null,
      ...describeCode(d.weather_code?.[i] ?? -1),
    };
  });

  return {
    fetchedAt: Date.now(),
    now: body.current
      ? {
          temp: body.current.temperature_2m,
          code: body.current.weather_code,
          ...describeCode(body.current.weather_code),
        }
      : null,
    days,
  };
}
