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

// Today as a 'YYYY-MM-DD' string in local time, for date columns and inputs.
export function todayStr(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

// Whole days from today until d (negative = that many days ago).
export function daysUntil(d, now = new Date()) {
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((d - a) / 86400000);
}

export function monthDay(d) {
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
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
