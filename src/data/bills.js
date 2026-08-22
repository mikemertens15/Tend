// Bills: money in cents, and the handful of judgements that turn a row into
// something worth putting on a home screen.
//
// A bill is an event with `kind: 'bill'` — see the note at the top of the
// migration. That means everything about *when* it happens is already answered
// by recurrence.js, and everything here is about the two things an appointment
// doesn't have: what it costs, and whether this month's copy is settled.
//
// Money is integer cents everywhere and never a float. `0.1 + 0.2` is the
// oldest bug in the trade and rent is not the place to rediscover it.

import { dayStr } from '../dates';

export const BILL_KIND = 'bill';

// A bill that hasn't been paid and never will be marked paid by hand, because
// the bank does it. Once its day has passed, it's settled by definition —
// otherwise an autopay bill grows one permanent nag a month forever.
export const isSettled = (bill, today = dayStr()) =>
  Boolean(bill.paid) || (Boolean(bill.autopay) && bill.date < today);

export const isOverdue = (bill, today = dayStr()) =>
  !bill.paid && !bill.autopay && bill.date < today;

// Cents → "$1,450" / "$42.60". Mirrors usd() in pay.js deliberately: the two
// live in different modules because one counts wages and one counts bills, but
// a household reading both in the same afternoon shouldn't see two conventions.
export function money(cents) {
  if (cents == null) return null;
  const n = cents / 100;
  return Math.abs(n) >= 1000
    ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : `$${n.toFixed(2)}`;
}

// The same, but never null — for totals, where "nothing" is a real answer of $0
// rather than an unknown.
export const moneyTotal = (cents) => money(cents ?? 0);

// What a bill of unknown cost shows. A utility that varies isn't $0, and
// printing $0 would quietly under-count every total on the page.
export const UNKNOWN_AMOUNT = '—';

export const amountLabel = (cents) => money(cents) ?? UNKNOWN_AMOUNT;

// "$42.60" → 4260. Tolerant of what people actually type: a leading $, commas,
// spaces, and a bare "40" meaning forty dollars rather than forty cents.
export function parseAmount(input) {
  if (input == null) return null;
  const cleaned = String(input).replace(/[$,\s]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

// Cents → the string an <input> should hold. Not `money()`: a text field with a
// dollar sign in it can't be typed into sensibly.
export const amountInput = (cents) => (cents == null ? '' : (cents / 100).toFixed(2));

// How a due date reads when the point is urgency rather than the date itself.
export function dueLabel(date, today = dayStr()) {
  const days = Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000);
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days === -1) return '1 day late';
  if (days < 0) return `${-days} days late`;
  if (days < 7) return `Due in ${days} days`;
  if (days < 14) return 'Due next week';
  return `Due in ${Math.round(days / 7)} weeks`;
}

// Everything the summary strip needs, from a flat list of bill occurrences.
// Kept here rather than in the view so the web page and the reference widget
// renderer can't drift on what "due" means.
export function summarise(bills, today = dayStr()) {
  let unpaidCount = 0;
  let unpaidCents = 0;
  let overdueCount = 0;
  let overdueCents = 0;
  // Bills of unknown amount are counted but can't be totalled, and a total
  // that silently omits them would read as complete when it isn't.
  let unknownCount = 0;

  for (const b of bills) {
    if (isSettled(b, today)) continue;
    unpaidCount += 1;
    if (b.amountCents == null) unknownCount += 1;
    else unpaidCents += b.amountCents;
    if (isOverdue(b, today)) {
      overdueCount += 1;
      if (b.amountCents != null) overdueCents += b.amountCents;
    }
  }

  return { unpaidCount, unpaidCents, overdueCount, overdueCents, unknownCount };
}
