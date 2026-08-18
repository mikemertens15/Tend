// What a shift is worth.
//
// Pure functions over a job, a scheduled occurrence and a record of what
// actually happened. No React, no database, no clock except the one you pass in
// — because every rule in here is the kind that's wrong by a quarter of an hour
// in a way you only notice on payday.
//
// The one idea the old version was missing: **scheduled and worked are allowed
// to disagree.** You book 6 to 3, you clock in at 6:07, lunch runs to an hour
// and a quarter, you leave at 2:40. Four numbers, none of them 9 hours. So each
// shift resolves to a `basis` — whether its hours came from the clock or from
// the plan — and the gap between the two is a number worth showing rather than
// an error to hide.
//
// What this still is not: payroll. It does not model tax, withholding, PTO
// accrual, shift differentials or your employer's rounding rules. Unpaid breaks
// and overtime are here because they change the hours by amounts you would
// notice; everything past that varies by state, employer and week, and a number
// that is confidently wrong about your pay is worse than no number.
// `take_home_pct` remains the one honest fudge factor, read off a real payslip.

import { dayStr, addDays, parseDay, parseTime, spanMinutes, timeStr } from '../dates';

const daysBetween = (a, b) => Math.round((parseDay(b) - parseDay(a)) / 86400000);
const round2 = (n) => Math.round(n * 100) / 100;

export const usd = (n) =>
  n == null
    ? null
    : Math.abs(n) >= 1000
      ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      : `$${n.toFixed(2)}`;

// Statuses a past shift can carry. 'scheduled' isn't in the list because it
// isn't a decision — it's the absence of one, which is what `unconfirmed` means
// below.
export const SHIFT_STATUSES = [
  ['worked', 'Worked', '✓'],
  ['called_off', 'Called off', '✕'],
  ['pto', 'Paid time off', '🌴'],
  ['holiday', 'Holiday', '🎉'],
  ['no_show', 'Missed', '⚠️'],
];

export const statusMeta = (key) => SHIFT_STATUSES.find(([k]) => k === key) ?? SHIFT_STATUSES[0];

// Statuses that pay the scheduled hours without anyone having been there.
const PAID_ABSENCE = new Set(['pto', 'holiday']);
const UNPAID_ABSENCE = new Set(['called_off', 'no_show']);

export const PAY_PERIODS = [
  ['weekly', 'Weekly'],
  ['biweekly', 'Every two weeks'],
  ['semimonthly', 'Twice a month'],
  ['monthly', 'Monthly'],
];

// ---------------------------------------------------------------------------
// Weeks and pay periods
// ---------------------------------------------------------------------------

// The start of the workweek containing a date. Overtime is measured against the
// employer's week, which is often not Monday — hence the setting. 0 = Monday …
// 6 = Sunday, matching dates.js and recurrence.js.
export function weekStartFor(dayString, weekStartsOn = 6) {
  const index = (parseDay(dayString).getDay() + 6) % 7;
  const delta = (index - weekStartsOn + 7) % 7;
  return addDays(dayString, -delta);
}

// The pay period a date falls in. Weekly and fortnightly cycles are counted
// forward and back from one real payday you entered; twice-monthly and monthly
// are defined by the calendar and need no anchor.
export function payPeriodOf(dayString, job) {
  const period = job?.pay_period ?? 'biweekly';
  const d = parseDay(dayString);

  if (period === 'monthly') {
    const from = dayStr(new Date(d.getFullYear(), d.getMonth(), 1));
    return { from, to: dayStr(new Date(d.getFullYear(), d.getMonth() + 1, 0)), period };
  }

  if (period === 'semimonthly') {
    const day = d.getDate();
    return day <= 15
      ? { from: dayStr(new Date(d.getFullYear(), d.getMonth(), 1)), to: dayStr(new Date(d.getFullYear(), d.getMonth(), 15)), period }
      : {
          from: dayStr(new Date(d.getFullYear(), d.getMonth(), 16)),
          to: dayStr(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
          period,
        };
  }

  const length = period === 'weekly' ? 7 : 14;
  // With no payday on file, fall back to the workweek — a fortnight has to
  // start somewhere, and the week they already told us about is the least
  // arbitrary guess available.
  const anchor = job?.period_anchor || weekStartFor(dayString, job?.week_starts_on ?? 6);
  const offset = Math.floor(daysBetween(anchor, dayString) / length) * length;
  const from = addDays(anchor, offset);
  return { from, to: addDays(from, length - 1), period };
}

export const nextPayPeriod = (dayString, job) => payPeriodOf(addDays(payPeriodOf(dayString, job).to, 1), job);
export const previousPayPeriod = (dayString, job) => payPeriodOf(addDays(payPeriodOf(dayString, job).from, -1), job);

// How many of these periods there are in a year, for turning a salary into what
// one paycheque is worth.
export const periodsPerYear = (period) =>
  period === 'weekly' ? 52 : period === 'biweekly' ? 26 : period === 'semimonthly' ? 24 : 12;

// ---------------------------------------------------------------------------
// One shift
// ---------------------------------------------------------------------------

// The unpaid break to subtract.
//
// A punched or hand-entered break wins outright. Otherwise the job's policy
// applies, and only to shifts long enough to trigger it — which is the shape
// employers actually write it in ("30 minutes unpaid on anything over six
// hours"). An assumed break is flagged so the UI can say so, because a number
// nobody entered shouldn't look like one somebody did.
export function resolveBreak({ recorded, grossMinutes, job }) {
  if (recorded > 0) return { minutes: recorded, assumed: false };
  const policy = Number(job?.break_minutes) || 0;
  if (policy <= 0) return { minutes: 0, assumed: false };
  const after = Number(job?.break_after_hours);
  if (after > 0 && grossMinutes < after * 60) return { minutes: 0, assumed: false };
  return { minutes: policy, assumed: true };
}

// Everything about one day of one shift, from the occurrence and the record of
// what happened. `now` is passed in so a running clock is a rendering concern
// rather than a hidden dependency.
export function resolveShift({ occurrence, record, job, today = dayStr(), nowMinutes = null }) {
  const scheduledGross = spanMinutes(occurrence.startTime, occurrence.endTime);
  const status = record?.status ?? null;
  const past = occurrence.date < today;
  const isToday = occurrence.date === today;

  const actualStart = record?.actual_start ?? null;
  const actualEnd = record?.actual_end ?? null;
  const onBreak = Boolean(record?.break_started_at);
  const clockedIn = Boolean(actualStart && !actualEnd);

  // A shift still running is worth what it's worth *so far*, so the day's
  // number moves while you're in it instead of appearing at clock-out.
  const liveEnd = clockedIn && isToday && nowMinutes != null ? timeStr(nowMinutes) : null;
  const effectiveEnd = actualEnd ?? liveEnd;
  const actualGross = actualStart && effectiveEnd ? spanMinutes(actualStart, effectiveEnd) : null;

  // A break in progress counts the time already spent on it, so the total
  // doesn't jump when you come back.
  const runningBreak =
    onBreak && isToday && nowMinutes != null
      ? Math.max(0, nowMinutes - (parseTime(record.break_started_at) ?? nowMinutes))
      : 0;
  const recordedBreak = (Number(record?.break_minutes) || 0) + runningBreak;

  const basisGross = actualGross ?? scheduledGross ?? 0;
  const brk = resolveBreak({ recorded: recordedBreak, grossMinutes: basisGross, job });

  const scheduledBreak = resolveBreak({ recorded: 0, grossMinutes: scheduledGross ?? 0, job });
  const scheduledHours = scheduledGross == null ? null : round2(Math.max(0, scheduledGross - scheduledBreak.minutes) / 60);

  let hours;
  let basis;
  if (UNPAID_ABSENCE.has(status)) {
    hours = 0;
    basis = 'absent';
  } else if (PAID_ABSENCE.has(status)) {
    hours = scheduledHours ?? 0;
    basis = 'absent';
  } else if (actualGross != null) {
    hours = round2(Math.max(0, actualGross - brk.minutes) / 60);
    basis = 'worked';
  } else {
    hours = scheduledHours ?? 0;
    basis = 'scheduled';
  }

  return {
    ...occurrence,
    job: job ?? null,
    record: record ?? null,
    status,
    scheduledStart: occurrence.startTime,
    scheduledEnd: occurrence.endTime,
    scheduledHours,
    actualStart,
    actualEnd,
    breakMinutes: brk.minutes,
    breakAssumed: brk.assumed,
    onBreak,
    clockedIn,
    hours,
    basis,
    // Behind on the clock: a shift that has already happened with nothing
    // recorded against it. Counted at its scheduled hours so a projection isn't
    // wrong by a whole day, but counted out loud so it can be fixed.
    unconfirmed: past && basis === 'scheduled' && !status,
    upcoming: !past && basis === 'scheduled',
    // Positive means you were there longer than the plan said.
    varianceHours: scheduledHours == null ? null : round2(hours - scheduledHours),
  };
}

// ---------------------------------------------------------------------------
// Overtime
// ---------------------------------------------------------------------------

// Split a set of shifts into regular and overtime hours.
//
// Overtime is a property of a *week*, not a shift, which is why this can't live
// in resolveShift: the ninth hour on Thursday is only overtime depending on what
// Monday through Wednesday came to. Where a job has both a daily and a weekly
// rule, the greater of the two applies and no hour is counted twice — that's the
// FLSA rule and the one every employer that has both follows.
export function splitOvertime(shifts, job) {
  const total = round2(shifts.reduce((n, s) => n + (s.hours || 0), 0));
  const weekly = Number(job?.ot_weekly_hours) || 0;
  const daily = Number(job?.ot_daily_hours) || 0;

  const weeklyOT = weekly > 0 ? Math.max(0, round2(total - weekly)) : 0;

  let dailyOT = 0;
  if (daily > 0) {
    const byDay = new Map();
    for (const s of shifts) byDay.set(s.date, (byDay.get(s.date) || 0) + (s.hours || 0));
    for (const hours of byDay.values()) dailyOT += Math.max(0, hours - daily);
    dailyOT = round2(dailyOT);
  }

  const overtime = Math.min(total, Math.max(weeklyOT, dailyOT));
  return { total, regular: round2(total - overtime), overtime: round2(overtime) };
}

// Group shifts into the workweeks their job measures overtime against, then
// total the money. Shifts from different jobs are kept apart: two employers do
// not add up to overtime at either of them.
export function earningsFor(shifts, jobById) {
  const weeks = new Map();
  for (const s of shifts) {
    const job = s.job ?? (s.jobId ? jobById?.[s.jobId] : null);
    const key = `${job?.id ?? 'none'}:${weekStartFor(s.date, job?.week_starts_on ?? 6)}`;
    if (!weeks.has(key)) weeks.set(key, { job, shifts: [] });
    weeks.get(key).shifts.push(s);
  }

  let hours = 0;
  let regular = 0;
  let overtime = 0;
  let gross = 0;

  for (const { job, shifts: weekShifts } of weeks.values()) {
    const split = splitOvertime(weekShifts, job);
    hours += split.total;
    regular += split.regular;
    overtime += split.overtime;

    // A salary doesn't move with the hours. It's counted per pay period rather
    // than per shift, so it's left to the caller — see salaryForPeriod.
    if (job?.pay_kind === 'salary') continue;

    const rate = Number(job?.hourly_rate) || 0;
    const multiplier = Number(job?.ot_multiplier) || 1.5;
    gross += split.regular * rate + split.overtime * rate * multiplier;
  }

  return {
    hours: round2(hours),
    regular: round2(regular),
    overtime: round2(overtime),
    gross: round2(gross),
  };
}

// What one paycheque of a salary comes to, before the honest fudge factor.
export const salaryForPeriod = (job) =>
  job?.pay_kind === 'salary' && job.annual_salary
    ? round2(Number(job.annual_salary) / periodsPerYear(job.pay_period))
    : 0;

// The estimate, clearly an estimate. Null when nobody has set a percentage,
// because a made-up one would be worse than showing gross and saying so.
export const takeHome = (gross, job) => {
  const pct = Number(job?.take_home_pct);
  return pct > 0 ? round2(gross * (pct / 100)) : null;
};
