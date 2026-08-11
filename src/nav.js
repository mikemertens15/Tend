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
      ['vehicles', 'Vehicles', '🚗'],
      ['systems', 'Systems', '🔧'],
      ['calendar', 'Calendar', '📅'],
      ['facts', 'Facts', '📋'],
    ],
  },
  {
    label: 'Life',
    items: [
      ['hobbies', 'Hobbies', '🎯'],
      ['goals', 'Goals', '⭐'],
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

// The four that earn a permanent slot on a phone; the rest live behind More.
export const PHONE_TABS = ['home', 'chores', 'groceries', 'pets'];

export const navLabel = (key) => NAV_ITEMS.find(([k]) => k === key)?.[1] ?? null;
