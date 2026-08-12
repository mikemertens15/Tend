// The palette picker's metadata. The colours that actually render live in
// index.css as custom properties — this file only names the options and
// carries three swatch hexes each so the picker can show you what you're
// choosing without mounting it.
//
// Adding a palette: add an entry here, then a `[data-palette="key"]` block and
// a `[data-palette="key"][data-mode="dark"]` block in index.css.

export const PALETTES = [
  {
    key: 'warm',
    label: 'Warm',
    blurb: 'Cream and terracotta',
    swatch: { light: ['#f4ece1', '#c2724a', '#3a2e25'], dark: ['#17120f', '#d0784e', '#f3e8db'] },
  },
  {
    key: 'calm',
    label: 'Calm',
    blurb: 'Cool, quiet, minimal',
    swatch: { light: ['#f4f6f8', '#587894', '#1f2933'], dark: ['#11151a', '#7ba3c4', '#e8edf3'] },
  },
  {
    key: 'garden',
    label: 'Garden',
    blurb: 'Sage and olive',
    swatch: { light: ['#f1f4ed', '#627c50', '#2b3327'], dark: ['#12160f', '#8fb173', '#e9efe3'] },
  },
  {
    key: 'dusk',
    label: 'Dusk',
    blurb: 'Indigo and plum',
    swatch: { light: ['#f4f2f8', '#7a5ba6', '#2c2436'], dark: ['#15121b', '#a382ce', '#ece7f4'] },
  },
];

export const MODES = [
  ['system', 'Match device'],
  ['light', 'Light'],
  ['dark', 'Dark'],
];

export const paletteMeta = (key) => PALETTES.find((p) => p.key === key) ?? PALETTES[0];
