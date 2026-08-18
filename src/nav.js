// One definition of the app's destinations, read by both the desktop top bar
// and the phone tab bar so they can't drift apart.
//
// Grouping keeps the app growable: Household is the house and everyone in it,
// Life is everything else. Hobbies is deliberately a single entry with its own
// landing page, so picking up a new one never adds a tab.

export const NAV_GROUPS = [
  { label: null, items: [['home', 'Home', '🏠']] },
  {
    label: 'Household',
    items: [
      ['chores', 'Chores', '🧹'],
      ['meals', 'Meals', '🍲'],
      ['groceries', 'Groceries', '🛒'],
      ['pets', 'Pets', '🐾'],
      ['systems', 'Systems', '🔧'],
      ['calendar', 'Calendar', '📅'],
      ['facts', 'Facts', '📋'],
      ['wishlist', 'Wishlist', '✨'],
    ],
  },
  {
    label: 'Life',
    items: [
      ['hobbies', 'Hobbies', '🎯'],
      ['goals', 'Goals', '⭐'],
      ['work', 'Earned', '💼'],
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

// The four that earn a permanent slot on a phone by default; the rest live
// behind More. Switching a section off drops it out and pulls the next one up.
export const PHONE_TABS = ['home', 'chores', 'groceries', 'pets'];

export const navLabel = (key) => NAV_ITEMS.find(([k]) => k === key)?.[1] ?? null;

// Sections that can't be switched off. Home is the landing route and the
// fallback for anything unrecognised, and chores is the question the whole app
// was built to answer — a Tend without them isn't a smaller Tend, it's a
// different program.
export const CORE_SECTIONS = ['home', 'chores'];

export const isCore = (key) => CORE_SECTIONS.includes(key);

// What each optional section is for, in the words you'd use deciding whether
// you want it. Only read by the setup panel.
export const SECTION_BLURBS = {
  meals: "What's for dinner, planned a week at a time",
  groceries: 'The shopping list, what it cost, and what you last paid',
  pets: 'Whether the animals have been fed, and their care',
  systems: 'Filters, gutters, smoke alarms — the upkeep with a clock on it',
  calendar: 'Everyone’s week on one grid, repeats and all',
  facts: 'Filter sizes, paint colours, model numbers',
  wishlist: 'Everything you want, and what it would come to',
  hobbies: 'Games, books, films and what you make',
  goals: 'The bigger things you\'re working towards',
  work: 'Hours actually worked, and what this cheque comes to',
};

// Everything you're allowed to turn off, in nav order.
export const OPTIONAL_SECTIONS = NAV_ITEMS.filter(([key]) => !isCore(key));

// The nav with a household's switched-off sections removed, and any group that
// empties out removed with them — a "Life" heading over nothing is worse than
// no heading.
//
// Note this takes a *deny* list rather than an allow list. A section added in a
// later release is then visible to everyone by default, which is the right
// failure: a new feature nobody can find is a support problem, and turning it
// off is one tap away.
export function visibleNavGroups(disabled = []) {
  const off = new Set(disabled.filter((k) => !isCore(k)));
  return NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter(([k]) => !off.has(k)) })).filter(
    (g) => g.items.length > 0,
  );
}

export function visibleSectionKeys(disabled = []) {
  return visibleNavGroups(disabled).flatMap((g) => g.items.map(([k]) => k));
}

// Four tabs for the thumb, backfilled in nav order so the bar is never short
// just because someone switched off Groceries.
export function phoneTabs(disabled = []) {
  const visible = visibleSectionKeys(disabled);
  const preferred = PHONE_TABS.filter((k) => visible.includes(k));
  return [...preferred, ...visible.filter((k) => !preferred.includes(k))].slice(0, 4);
}
