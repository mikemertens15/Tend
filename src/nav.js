// Daily essentials and supporting tools share one definition across navigation.
export const NAV_GROUPS = [
  {
    label: null,
    items: [
      ['home', 'Home', '🏠'],
      ['tasks', 'Tasks', '✓'],
      ['calendar', 'Calendar', '📅'],
      ['groceries', 'Groceries', '🛒'],
    ],
  },
  {
    label: 'Around the house',
    items: [
      ['meals', 'Meals', '🍲'],
      ['systems', 'Maintenance', '🔧'],
      ['pets', 'Pets', '🐾'],
      ['facts', 'House info', '📋'],
    ],
  },
];
export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);
export const PHONE_TABS = ['home', 'tasks', 'calendar', 'groceries'];
export const CORE_SECTIONS = ['home', 'tasks', 'calendar', 'groceries'];
export const isCore = (key) => CORE_SECTIONS.includes(key);
export const navLabel = (key) => NAV_ITEMS.find(([k]) => k === key)?.[1] ?? null;
export const SECTION_BLURBS = {
  meals: 'Plan dinner for the week',
  systems: 'Keep up with filters, gutters, and smoke alarms',
  pets: 'Share feeding routines and pet care',
  facts: 'Keep useful sizes, model numbers, and house notes together',
};
export const OPTIONAL_SECTIONS = NAV_ITEMS.filter(([key]) => !isCore(key));
export function visibleNavGroups(disabled = []) {
  const off = new Set(Array.isArray(disabled) ? disabled : []);
  return NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter(([k]) => isCore(k) || !off.has(k)) })).filter(
    (g) => g.items.length,
  );
}
export function visibleSectionKeys(disabled = []) {
  return visibleNavGroups(disabled).flatMap((g) => g.items.map(([k]) => k));
}
export function phoneTabs() {
  return [...PHONE_TABS];
}
// Keep old chore links and native shortcuts useful. Retired routes go Home.
export function resolveRoute(route, disabled = []) {
  const key = route === 'chores' ? 'tasks' : route;
  if (key === 'hub' || key === 'releases') return key;
  return visibleSectionKeys(disabled).includes(key) ? key : 'home';
}
