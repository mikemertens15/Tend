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

// Hours between two Postgres times, or null when either is missing.
//
// An end before the start means the shift crossed midnight rather than that
// someone typed it backwards — 10pm–6am is eight hours, not minus sixteen, and
// getting this wrong would pay you a negative wage for every night shift.
export function shiftHours(start, end) {
  if (!start || !end) return null;
  const mins = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const span = mins(end) - mins(start);
  return Math.round(((span <= 0 ? span + 1440 : span) / 60) * 100) / 100;
}

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
