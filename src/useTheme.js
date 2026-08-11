import { useState, useEffect, useCallback } from 'react';

// Skin switching. The palettes are CSS custom properties (index.css), so all
// this does is stamp `data-theme` on <html> — no re-render of the tree, no
// context threaded through every component.
//
// A stored choice is an override. With nothing stored we follow the OS and
// keep following it, so a tablet that dims itself at night comes along too.

const KEY = 'tend.theme';

export const THEMES = [
  ['light', 'Warm', 'Cream and terracotta'],
  ['dark', 'Wall display', 'Dark, for an always-on tablet'],
];

const prefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

const stored = () => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    // Private browsing can throw on localStorage access; fall back to the OS.
    return null;
  }
};

export function resolveTheme() {
  return stored() ?? (prefersDark() ? 'dark' : 'light');
}

function paint(theme) {
  document.documentElement.dataset.theme = theme;
  // Colour the phone status bar / installed-app title bar to match.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#17120f' : '#f4ece1');
}

export function useTheme() {
  const [theme, setThemeState] = useState(resolveTheme);
  // Null means "no explicit choice yet" — keep tracking the OS.
  const [pinned, setPinned] = useState(() => stored() !== null);

  useEffect(() => {
    paint(theme);
  }, [theme]);

  useEffect(() => {
    if (pinned) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setThemeState(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [pinned]);

  const setTheme = useCallback((next) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Not being able to remember the choice shouldn't stop it applying now.
    }
    setPinned(true);
    setThemeState(next);
  }, []);

  return { theme, setTheme };
}
