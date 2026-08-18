// The vocabulary of calendars: the colours you can pick, and what to do with a
// colour once it's picked.
//
// Calendar colours are real hex values rather than theme tokens, for the same
// reason member avatar colours are: they're chosen per household and stored in
// the database, so they have to survive outside the stylesheet. That means they
// have to work on all four palettes in both modes, which is why nothing here
// paints a calendar's colour behind text. The saturated value is used for bars,
// dots and rules; the fill behind a block is the same colour at low alpha, so
// it composites over whichever card colour is underneath and the normal ink
// stays legible on top.

export const CALENDAR_COLORS = [
  ['#c2673f', 'Terracotta'],
  ['#4a5fa8', 'Indigo'],
  ['#2f8079', 'Teal'],
  ['#8a4f7d', 'Plum'],
  ['#5c7f3f', 'Moss'],
  ['#b5822a', 'Amber'],
  ['#b4506a', 'Rose'],
  ['#55677a', 'Slate'],
];

export const CALENDAR_ICONS = ['📅', '🏡', '💼', '🎓', '🔒', '🩺', '⚽', '🎭', '✈️', '🎂', '🐾', '🎸'];

export const DEFAULT_CALENDAR_COLOR = CALENDAR_COLORS[1][0];

const clampByte = (n) => Math.max(0, Math.min(255, Math.round(n)));

function rgb(hex) {
  const h = (hex || '').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n) || full.length !== 6) return { r: 90, g: 90, b: 90 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// The fill behind an event block: the calendar's colour, mostly transparent, so
// it reads as that calendar on any skin without fighting the text.
export function tint(hex, alpha = 0.14) {
  const { r, g, b } = rgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// A lighter or darker version of a colour, for the one or two places something
// has to sit directly on it.
export function shade(hex, amount) {
  const { r, g, b } = rgb(hex);
  const target = amount > 0 ? 255 : 0;
  const t = Math.abs(amount);
  const mix = (c) => clampByte(c + (target - c) * t);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

// Black or white, whichever can be read on this colour. Computed rather than
// stored because a household can pick a colour that isn't on the list above.
export function inkOn(hex) {
  const { r, g, b } = rgb(hex);
  const channel = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  return luminance > 0.42 ? '#1c1a17' : '#ffffff';
}

// Which calendar a new event should land on, given what kind of thing it is.
//
// This is the whole of "smart enough to know my timetable is mine". Choosing a
// kind picks the calendar that matches by name, which in turn decides whether
// the event starts private — so a class is yours and a birthday dinner is
// everyone's, without anyone answering a question about visibility.
const KIND_HINTS = {
  work: ['work', 'job', 'shift'],
  school: ['school', 'class', 'college', 'uni', 'course'],
  appointment: ['personal', 'health', 'medical'],
  birthday: ['family', 'birthday'],
  holiday: ['family', 'holiday'],
  trip: ['family', 'travel', 'trip'],
};

export function suggestCalendar(kind, calendars) {
  if (!calendars?.length) return null;
  for (const hint of KIND_HINTS[kind] ?? []) {
    const hit = calendars.find((c) => c.name.toLowerCase().includes(hint));
    if (hit) return hit;
  }
  // Fall back to the first one, which is Family in a seeded household.
  return calendars[0];
}
