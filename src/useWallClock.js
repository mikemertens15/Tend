import { useState, useEffect, useRef } from 'react';

// A clock for a screen that stays on for months.
//
// Ticks on the minute rather than every second — a wall display doesn't need
// seconds, and a once-a-minute render is the difference between a tablet that
// idles and one that runs warm. Re-aligns to the next real minute boundary
// each tick, so it can't drift, and resyncs when the device wakes from sleep.
export function useWallClock() {
  const [now, setNow] = useState(() => new Date());
  const timer = useRef(null);

  useEffect(() => {
    const schedule = () => {
      const next = 60000 - (Date.now() % 60000);
      timer.current = setTimeout(() => {
        setNow(new Date());
        schedule();
      }, next + 50);
    };
    schedule();

    // A backgrounded tab has its timers throttled; catch up on return.
    const resync = () => {
      if (document.visibilityState === 'visible') setNow(new Date());
    };
    document.addEventListener('visibilitychange', resync);

    return () => {
      clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', resync);
    };
  }, []);

  return now;
}

// A display left on a wall runs for months without anyone touching it, which
// is long enough for a websocket to die quietly, a token refresh to fail, or a
// deploy to leave it on stale code. One reload in the small hours costs
// nothing and clears all three.
export function useNightlyReload(active, hour = 4) {
  useEffect(() => {
    if (!active) return;
    const next = new Date();
    next.setHours(hour, 0, 0, 0);
    if (next <= new Date()) next.setDate(next.getDate() + 1);
    const timer = setTimeout(() => window.location.reload(), next - Date.now());
    return () => clearTimeout(timer);
  }, [active, hour]);
}

// Ask the device not to sleep. Nothing to fall back to if it's unsupported
// (Safari only grants it on user gesture, and older iPads not at all), so this
// is best-effort and the setup instructions cover the manual settings too.
export function useWakeLock(active) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
      } catch {
        // Denied or unsupported — the screen will sleep on its own schedule.
      }
    };
    acquire();

    // The lock is dropped whenever the page is hidden; take it again on return.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !cancelled) acquire();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release?.().catch(() => {});
    };
  }, [active]);
}
