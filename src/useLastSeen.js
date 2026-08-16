import { useState, useEffect } from 'react';
import { dayStr, parseDay, daysUntil } from './dates';

// How long it's been since you last actually looked at Tend, so the dashboard
// can greet a return rather than ambushing it (see data/catchup.js).
//
// Two decisions worth stating, because both are easy to get wrong:
//
// It's stored per device, in localStorage, rather than per member in the
// database. That's one fewer migration, and it's arguably the truer reading:
// "this screen hasn't been looked at in a while" is what the dashboard is
// reacting to. The cost is that checking in on your phone doesn't count as
// having seen the tablet. If that ever matters, swap the two calls below for a
// `last_seen_at` column on household_members — nothing else has to change.
//
// And the kitchen display never stamps it. That screen is signed in
// permanently and sits on #/hub all day, so if it counted as a visit the
// absence would reset every time the clock ticked and this would never fire
// once on any device in the household.

const keyFor = (userId) => `tend:last-seen:${userId ?? 'anon'}`;

export function useLastSeen({ userId, active = true }) {
  // Read on the first render, before the effect below writes today over it —
  // and hold it for the life of the session so the card can't vanish
  // mid-interaction just because something re-rendered.
  const [awayDays] = useState(() => {
    if (!active || typeof window === 'undefined' || !userId) return 0;
    const seen = window.localStorage.getItem(keyFor(userId));
    // No stamp means this device has never been used, which is a first visit
    // rather than a long absence.
    if (!seen) return 0;
    const gap = -daysUntil(parseDay(seen));
    return gap > 0 ? gap : 0;
  });

  useEffect(() => {
    if (!active || typeof window === 'undefined' || !userId) return;
    window.localStorage.setItem(keyFor(userId), dayStr());
  }, [userId, active]);

  return awayDays;
}
