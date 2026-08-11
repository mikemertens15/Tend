import { parseDay, daysUntil, monthDay } from '../dates';

// "Something you do every so often, and a date you last did it." Home systems
// (HVAC filter, gutters) and pet care (litter, flea meds, nail trims) are the
// same shape with different words, so the countdown maths lives here once.

// Sort sentinel for never-logged items: a finite "very far away", because
// Infinity - Infinity is NaN and would make a comparator unstable.
export const UNTRACKED = Number.MAX_SAFE_INTEGER;

const CADENCES = [
  [1, 'Daily'],
  [2, 'Every other day'],
  [3, 'Every 3 days'],
  [7, 'Weekly'],
  [14, 'Every 2 weeks'],
  [30, 'Monthly'],
  [90, 'Every 3 months'],
  [180, 'Every 6 months'],
  [365, 'Yearly'],
];

// The chips each modal offers. A furnace filter is never a daily job and a
// litter box is never an annual one, so neither list is the whole set.
export const HOME_CADENCES = CADENCES.filter(([d]) => d >= 7);
export const PET_CADENCES = CADENCES.filter(([d]) => d <= 90);

export function intervalLabel(days) {
  return CADENCES.find(([d]) => d === days)?.[1] ?? `Every ${days} days`;
}

// How much warning a cadence deserves, scaled to how long it is: a weekly job
// turns amber two days out, a quarterly one three weeks out. Capped so yearly
// items don't glow amber for a whole season.
const warnWindow = (intervalDays) => Math.min(21, Math.max(1, Math.ceil(intervalDays / 4)));

function countdownLabel(daysLeft) {
  if (daysLeft < 0) return `Overdue ${-daysLeft}d`;
  if (daysLeft === 0) return 'Due today';
  if (daysLeft === 1) return 'Tomorrow';
  if (daysLeft <= 13) return `In ${daysLeft}d`;
  if (daysLeft <= 60) return `In ${Math.round(daysLeft / 7)} wks`;
  return 'Good';
}

// The traffic-light state for one recurring job. `lastDoneOn` is a 'YYYY-MM-DD'
// string or null; never-logged items sit at the end of the list with an amber
// nudge rather than pretending to be either fine or overdue.
export function dueStatus(lastDoneOn, intervalDays) {
  if (!lastDoneOn) {
    return { tone: 'amber', status: 'Not logged', daysLeft: UNTRACKED, lastLabel: null, tracked: false };
  }
  const last = parseDay(lastDoneOn);
  const due = parseDay(lastDoneOn);
  due.setDate(due.getDate() + intervalDays);
  const daysLeft = daysUntil(due);

  const tone = daysLeft <= 0 ? 'red' : daysLeft <= warnWindow(intervalDays) ? 'amber' : 'green';
  return { tone, status: countdownLabel(daysLeft), daysLeft, lastLabel: monthDay(last), tracked: true };
}
