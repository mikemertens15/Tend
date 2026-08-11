// Seasonal home upkeep.
//
// The jobs a house needs are mostly not urgent until they suddenly are, and
// they arrive on a calendar nobody keeps in their head — hose bibs before the
// first freeze, the AC before the first hot week. Tend knows what month it is,
// so it can raise them at the point they're worth doing.
//
// Northern-hemisphere months. `interval` is the cadence each job gets if you
// add it to Systems, so it comes back around next year on its own.

export const SEASONS = [
  {
    key: 'spring',
    label: 'Spring',
    icon: '🌱',
    months: [3, 4, 5],
    blurb: 'Undo the winter and get ahead of the heat.',
    jobs: [
      { name: 'Service the AC before it gets hot', interval: 365 },
      { name: 'Clean the gutters', interval: 182 },
      { name: 'Swap storm windows for screens', interval: 365 },
      { name: 'Check the roof and flashing', interval: 365 },
      { name: 'Turn the outdoor water back on', interval: 365 },
      { name: 'Service the mower', interval: 365 },
    ],
  },
  {
    key: 'summer',
    label: 'Summer',
    icon: '☀️',
    months: [6, 7, 8],
    blurb: "The outside jobs, while it's pleasant to be out there.",
    jobs: [
      { name: 'Reseal the deck', interval: 730 },
      { name: 'Wash the exterior windows', interval: 365 },
      { name: 'Trim back anything touching the house', interval: 365 },
      { name: 'Check the dryer vent', interval: 365 },
      { name: 'Test the sprinklers', interval: 365 },
    ],
  },
  {
    key: 'autumn',
    label: 'Autumn',
    icon: '🍂',
    months: [9, 10, 11],
    blurb: 'Everything you want done before the first hard freeze.',
    jobs: [
      { name: 'Service the furnace', interval: 365 },
      { name: 'Clean the gutters', interval: 182 },
      { name: 'Drain and shut off the outdoor taps', interval: 365 },
      { name: 'Sweep the chimney', interval: 365 },
      { name: 'Reverse the ceiling fans', interval: 365 },
      { name: 'Check for draughts around doors and windows', interval: 365 },
    ],
  },
  {
    key: 'winter',
    label: 'Winter',
    icon: '❄️',
    months: [12, 1, 2],
    blurb: 'Indoor jobs, and keeping an eye on the cold.',
    jobs: [
      { name: 'Test the smoke and CO alarms', interval: 182 },
      { name: 'Check the water heater', interval: 365 },
      { name: 'Look for ice dams after a thaw', interval: 365 },
      { name: 'Run the sump pump to check it', interval: 90 },
      { name: 'Vacuum the fridge coils', interval: 365 },
    ],
  },
];

export function currentSeason(now = new Date()) {
  const month = now.getMonth() + 1;
  return SEASONS.find((s) => s.months.includes(month)) ?? SEASONS[0];
}

// Loose match, because "Clean the gutters" and "clean gutters" are the same
// job and nobody should be nagged about the one they already added.
const normalise = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\b(the|a|an|and|before|it|gets|your)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export const alreadyTracked = (jobName, systemNames) => {
  const target = normalise(jobName);
  return systemNames.some((n) => {
    const other = normalise(n);
    return other === target || other.includes(target) || target.includes(other);
  });
};
