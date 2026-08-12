import { useState, useEffect, useCallback } from 'react';

// Skin switching on two independent dials: which palette, and light or dark.
// Both are stamped on <html>; the palettes are CSS custom properties, so this
// re-renders nothing — no context threaded through every component.
//
// Mode 'system' means "keep following the OS", and keeps following it, so a
// tablet that dims itself at night comes along too.

const PALETTE_KEY = 'tend.palette';
const MODE_KEY = 'tend.mode';
const PALETTES = ['warm', 'calm', 'garden', 'dusk'];

const read = (key, allowed, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return allowed.includes(v) ? v : fallback;
  } catch {
    // Private browsing can throw on localStorage access.
    return fallback;
  }
};

const prefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

export const storedPalette = () => read(PALETTE_KEY, PALETTES, 'warm');
export const storedMode = () => read(MODE_KEY, ['system', 'light', 'dark'], 'system');
export const resolveMode = (mode) => (mode === 'system' ? (prefersDark() ? 'dark' : 'light') : mode);

// Status bar / installed-app title bar colour, read back off the stylesheet so
// it can't drift from the palette it's meant to match.
function paintMeta() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--c-bg').trim();
  if (bg) meta.setAttribute('content', bg);
}

export function applyTheme(palette, mode) {
  const root = document.documentElement;
  root.dataset.palette = palette;
  root.dataset.mode = resolveMode(mode);
  paintMeta();
}

export function useTheme() {
  const [palette, setPaletteState] = useState(storedPalette);
  const [mode, setModeState] = useState(storedMode);

  useEffect(() => {
    applyTheme(palette, mode);
  }, [palette, mode]);

  // Only while following the OS.
  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => applyTheme(palette, 'system');
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [mode, palette]);

  const persist = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Not being able to remember the choice shouldn't stop it applying now.
    }
  };

  const setPalette = useCallback((next) => {
    persist(PALETTE_KEY, next);
    setPaletteState(next);
  }, []);

  const setMode = useCallback((next) => {
    persist(MODE_KEY, next);
    setModeState(next);
  }, []);

  return { palette, mode, resolvedMode: resolveMode(mode), setPalette, setMode };
}
