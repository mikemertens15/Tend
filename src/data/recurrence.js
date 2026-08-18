// Repeat rules: what they produce, and how to say them out loud.
//
// Pure functions over a rule object and a date window. Nothing here touches
// the database or React, which is what makes the awkward cases — a Monday rule
// that starts on a Wednesday, a semester that stops mid-week, the 31st of
// February — checkable by reading.
//
// This mirrors private.occurrence_dates in the database, deliberately, the same
// way daily-digest re-states the nudge rules: the browser can't be the only
// thing that knows how to read a repeat rule, because the iOS widget has no
// browser. The app keeps its own copy so paging the calendar costs no round
// trip. If you change one, change the other — the rule set is small on purpose
// so that's a realistic instruction.
//
// The rule shape, camelCased off the events row:
//   { onDate, freq, interval, weekdays, until, count }
// `freq` null means it happens once, which is most events.

import { dayStr, addDays, parseDay, monthDay, parseTime } from '../dates';

export const FREQS = [
  [null, 'Once'],
  ['daily', 'Daily'],
  ['weekly', 'Weekly'],
  ['monthly', 'Monthly'],
  ['yearly', 'Yearly'],
];

// 0 = Monday … 6 = Sunday throughout, matching dates.js. Every grid in the app
// is Monday-first, so a second convention would only be a source of off-by-one
// bugs.
export const DOWS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DOW_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export const weekdayIndex = (dayString) => (parseDay(dayString).getDay() + 6) % 7;

// Monday of the week a date falls in.
export const weekStart = (dayString) => addDays(dayString, -weekdayIndex(dayString));

// Adding a month to the 31st has to land somewhere. Clamping to the 28th beats
// skipping February the way RFC 5545 would: the rent is still due, and an
// anniversary on the 29th of February is still worth a card in a normal year.
function addMonthsClamped(dayString, months) {
  const [y, m, d] = dayString.split('-').map(Number);
  const total = m - 1 + months;
  const year = y + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const lastOfMonth = new Date(year, month + 1, 0).getDate();
  return dayStr(new Date(year, month, Math.min(d, lastOfMonth)));
}

// Not defensive padding: `until` and `count` are both optional, so an
// open-ended daily rule asked about a wide window would otherwise run until the
// heat death of the tab.
const WEEK_GUARD = 1200; // ~23 years of weeks
const STEP_GUARD = 2000;

// Every date a rule produces inside [fromDay, toDay], in order.
export function occurrenceDates(rule, fromDay, toDay) {
  const { onDate, freq, interval, weekdays, until, count } = rule ?? {};
  if (!onDate || !fromDay || !toDay || fromDay > toDay) return [];
  if (!freq) return onDate >= fromDay && onDate <= toDay ? [onDate] : [];

  const step = Math.max(1, Number(interval) || 1);
  const out = [];
  // Counts every occurrence the rule has ever produced, including ones before
  // the window — otherwise "12 times" would mean something different depending
  // on which week you happened to be looking at.
  let produced = 0;

  // Weekly on named days: the shape a class timetable actually has. One row
  // says Monday, Wednesday and Friday rather than three rows saying one each.
  if (freq === 'weekly' && weekdays?.length) {
    const days = [...new Set(weekdays)].map(Number).sort((a, b) => a - b);
    let week = weekStart(onDate);
    for (let guard = 0; guard < WEEK_GUARD; guard++) {
      for (const wd of days) {
        const d = addDays(week, wd);
        // A rule can't fire before the day it starts, even when that day is a
        // Wednesday and the rule includes Mondays.
        if (d < onDate) continue;
        if (until && d > until) return out;
        produced += 1;
        if (count && produced > count) return out;
        if (d > toDay) return out;
        if (d >= fromDay) out.push(d);
      }
      week = addDays(week, 7 * step);
    }
    return out;
  }

  for (let i = 0; i < STEP_GUARD; i++) {
    const d =
      freq === 'daily'
        ? addDays(onDate, i * step)
        : freq === 'weekly'
          ? addDays(onDate, i * step * 7)
          : freq === 'monthly'
            ? addMonthsClamped(onDate, i * step)
            : addMonthsClamped(onDate, i * step * 12);
    if (until && d > until) break;
    produced += 1;
    if (count && produced > count) break;
    if (d > toDay) break;
    if (d >= fromDay) out.push(d);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Saying it out loud
// ---------------------------------------------------------------------------

const ordinal = (n) => {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
};

// "Mon, Wed & Fri", or the name people actually use when the set has one.
function joinDays(indexes) {
  const sorted = [...new Set(indexes)].map(Number).sort((a, b) => a - b);
  const names = sorted.map((i) => DOWS[i]);
  if (names.length === 0) return '';
  if (names.length === 7) return 'day';
  const key = names.join(',');
  if (key === 'Mon,Tue,Wed,Thu,Fri') return 'weekday';
  if (key === 'Sat,Sun') return 'weekend';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} & ${names.at(-1)}`;
}

// The line under the repeat control, and the line on an event that repeats.
// Reads as a sentence, because the only way to know you've built the rule you
// meant to is to read it back.
export function repeatSummary(rule) {
  const { onDate, freq, interval, weekdays, until, count } = rule ?? {};
  if (!freq) return null;
  const step = Math.max(1, Number(interval) || 1);
  const every = (unit) => (step === 1 ? `Every ${unit}` : `Every ${step} ${unit}s`);

  let head;
  if (freq === 'daily') {
    head = every('day');
  } else if (freq === 'weekly') {
    head = weekdays?.length
      ? step === 1
        ? `Every ${joinDays(weekdays)}`
        : `${every('week')} on ${joinDays(weekdays)}`
      : every('week');
  } else if (freq === 'monthly') {
    head = onDate ? `${every('month')} on the ${ordinal(Number(onDate.slice(8, 10)))}` : every('month');
  } else {
    head = onDate ? `${every('year')} on ${monthDay(parseDay(onDate))}` : every('year');
  }

  if (until) return `${head}, until ${monthDay(parseDay(until))}`;
  if (count) return `${head}, ${count} times`;
  return head;
}

// ---------------------------------------------------------------------------
// Exceptions
// ---------------------------------------------------------------------------
//
// One occurrence of a series can be cancelled or changed without touching the
// rest of it: the Friday the class didn't meet, the shift that moved to Tuesday
// afternoon. Keyed by the date the *rule* produced, which stays the
// occurrence's name even after it has been moved somewhere else — otherwise
// moving one twice would lose track of which one it was.

export const exceptionKey = (eventId, occurrenceDate) => `${eventId}:${occurrenceDate}`;

export function indexExceptions(rows) {
  const map = new Map();
  for (const r of rows ?? []) map.set(exceptionKey(r.event_id, r.occurrence_date), r);
  return map;
}

// Apply an exception to one expanded occurrence. Returns null when that
// occurrence was cancelled, so callers can filter in one pass.
export function applyException(occurrence, exception) {
  if (!exception) return occurrence;
  if (exception.action === 'skip') return null;
  const startTime = exception.start_time ?? occurrence.startTime;
  const endTime = exception.end_time ?? occurrence.endTime;
  return {
    ...occurrence,
    date: exception.on_date || occurrence.date,
    moved: Boolean(exception.on_date && exception.on_date !== occurrence.occurrenceDate),
    title: exception.title || occurrence.title,
    note: exception.note ?? occurrence.note,
    startTime,
    endTime,
    startMinutes: parseTime(startTime),
    endMinutes: parseTime(endTime),
    edited: true,
  };
}
