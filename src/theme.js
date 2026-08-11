// Design tokens. Every value is a CSS custom property reference rather than a
// literal, so the same `colors.ink` works in both skins — the palettes live in
// index.css and the browser resolves whichever `data-theme` is on <html>.
//
// Skins: "warm" is Direction B from the Tend handoff (cream + terracotta);
// "dark" is Direction C, the always-on kitchen-tablet wall display.

export const colors = {
  bg: 'var(--c-bg)',
  card: 'var(--c-card)',
  cardBorder: 'var(--c-card-border)',
  navBar: 'var(--c-nav-bar)',
  accent: 'var(--c-accent)',
  accentDark: 'var(--c-accent-dark)',
  onAccent: 'var(--c-on-accent)',
  ink: 'var(--c-ink)',
  muted: 'var(--c-muted)',
  muted2: 'var(--c-muted2)',
  muted3: 'var(--c-muted3)',
  faint: 'var(--c-faint)',
  divider: 'var(--c-divider)',
  chipBg: 'var(--c-chip-bg)',
  inputBg: 'var(--c-input-bg)',
  inputBorder: 'var(--c-input-border)',
  track: 'var(--c-track)',
  starEmpty: 'var(--c-star-empty)',
  selected: 'var(--c-selected)',
  todayBg: 'var(--c-today-bg)',
};

// Status tones for systems / vehicles / pet care.
export const tone = {
  red: 'var(--t-red)',
  amber: 'var(--t-amber)',
  amberText: 'var(--t-amber-text)',
  green: 'var(--t-green)',
};

export const heroGradient = 'var(--g-hero)';

export const shadows = {
  accent: 'var(--s-accent)',
  modal: 'var(--s-modal)',
  backdrop: 'var(--s-backdrop)',
};

// Member avatar colors. Unlike everything above these are real hex values:
// they're written into the database per member when someone joins, so they
// have to survive outside the stylesheet. Both palettes are light pastels with
// dark initials, which stay legible on either skin.
export const AVATAR_PALETTE = [
  { bg: '#e2b4ba', color: '#5a2730' },
  { bg: '#a9c3b3', color: '#234034' },
  { bg: '#e6cda0', color: '#5a4419' },
  { bg: '#b6cbe0', color: '#274056' },
];

export const catLabel = { chore: 'Chore', vehicle: 'Vehicle', system: 'Home' };

export const fonts = {
  sans: "'Hanken Grotesk', system-ui, sans-serif",
  serif: "'Instrument Serif', Georgia, serif",
  mono: "'Space Mono', ui-monospace, monospace",
};
