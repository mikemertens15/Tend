// Lightweight date helpers so the dashboard stays "live" — the greeting, the
// week range and the calendar's "today" all reflect the real current date.

const DOWS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Returns the current Mon–Sun week plus today's index (0 = Mon … 6 = Sun).
export function getWeek(now = new Date()) {
  const jsDay = now.getDay(); // 0 = Sun … 6 = Sat
  const todayIndex = jsDay === 0 ? 6 : jsDay - 1;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - todayIndex);

  const days = DOWS.map((dow, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { dow, date: d, num: d.getDate() };
  });

  return { monday, days, todayIndex };
}

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function longDate(d) {
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS_LONG[d.getMonth()]} ${d.getDate()}`;
}

export function shortDate(d) {
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

// Parse a date-only 'YYYY-MM-DD' string (how Postgres `date` columns arrive)
// as local midnight — `new Date('2026-08-14')` would parse as UTC and can
// render as the previous day in western timezones.
export function parseDay(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// A date as a 'YYYY-MM-DD' string in local time (defaults to today), for date
// columns and date inputs.
export function dayStr(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Whole days from today until d (negative = that many days ago).
export function daysUntil(d, now = new Date()) {
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((d - a) / 86400000);
}

export function monthDay(d) {
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

// 'Mon' … 'Sun'. DOWS is Monday-first; getDay() is Sunday-first.
export function shortDay(d) {
  return DOWS[(d.getDay() + 6) % 7];
}

// Add days to a 'YYYY-MM-DD' string and get one back.
export function addDays(dayString, n) {
  const d = parseDay(dayString);
  d.setDate(d.getDate() + n);
  return dayStr(d);
}

// ---------------------------------------------------------------------------
// Times of day
// ---------------------------------------------------------------------------
//
// A Postgres `time` column arrives as 'HH:MM:SS'. Everything below works in
// minutes since midnight, because that's what positioning a block on a day
// grid needs and it makes the midnight-wrap rule below expressible once.

export function parseTime(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h)) return null;
  return h * 60 + (m || 0);
}

// Minutes since midnight back to 'HH:MM', which is what a time input wants.
export function timeStr(minutes) {
  if (minutes == null) return '';
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const p = (n) => String(n).padStart(2, '0');
  return `${p(Math.floor(wrapped / 60))}:${p(wrapped % 60)}`;
}

// "4:30 PM", and "4 PM" on the hour — the minutes are noise when they're zero
// and these labels sit in tight calendar cells.
export function timeLabel(t) {
  const mins = typeof t === 'number' ? t : parseTime(t);
  if (mins == null) return null;
  const h = Math.floor((((mins % 1440) + 1440) % 1440) / 60);
  const m = (((mins % 1440) + 1440) % 1440) % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour} ${period}` : `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

// "9:30 – 10:45 AM": the period is dropped from the start when both ends share
// it, which is how a person writes it down.
export function timeRangeLabel(start, end) {
  const a = timeLabel(start);
  if (!a) return null;
  const b = timeLabel(end);
  if (!b) return a;
  const sameHalf = a.slice(-2) === b.slice(-2);
  return `${sameHalf ? a.slice(0, -3) : a} – ${b}`;
}

// The wrap rule, in one place: an end at or before the start means the span
// crossed midnight rather than that someone typed it backwards. 10pm–6am is
// eight hours, not minus sixteen, and getting it wrong would pay a negative
// wage for every night shift.
export function spanMinutes(start, end) {
  const a = parseTime(start);
  const b = parseTime(end);
  if (a == null || b == null) return null;
  const span = b - a;
  return span <= 0 ? span + 1440 : span;
}

// Hours between two times, to two places, or null when either is missing.
export function shiftHours(start, end) {
  const mins = spanMinutes(start, end);
  return mins == null ? null : Math.round((mins / 60) * 100) / 100;
}

// "8h 15m" — hours alone read as a wage calculation, and a decimal like 8.25
// is hard to check against a memory of the day.
export function hoursLabel(hours) {
  if (hours == null) return null;
  const total = Math.round(hours * 60);
  const h = Math.floor(Math.abs(total) / 60);
  const m = Math.abs(total) % 60;
  const sign = total < 0 ? '-' : '';
  if (h === 0) return `${sign}${m}m`;
  return m === 0 ? `${sign}${h}h` : `${sign}${h}h ${m}m`;
}

// Month names, exported so the views stop each keeping their own copy.
export const MONTH_NAMES = MONTHS_LONG;
export const monthName = (d) => MONTHS_LONG[d.getMonth()];

export function monthYear(d) {
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

// "June 22 – 28" when both ends share a month, otherwise "Jun 29 – Jul 5".
export function weekRangeLabel(days) {
  const start = days[0].date;
  const end = days[6].date;
  if (start.getMonth() === end.getMonth()) {
    return `${MONTHS_LONG[start.getMonth()]} ${start.getDate()} – ${end.getDate()}`;
  }
  return `${shortDate(start)} – ${shortDate(end)}`;
}
