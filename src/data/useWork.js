import { useMemo } from 'react';
import { useHousehold } from '../household/HouseholdProvider';
import { useEvents, WORK_KIND } from './useEvents';
import { dayStr, getWeek, addDays } from '../dates';

// What you've earned so far this month, from shifts already on the calendar.
//
// The design decision that makes this cheap: a shift is a `work` event, not a
// new table. You were already putting work on the calendar, so there's nothing
// new to enter and nothing to keep in sync — the hours come from the start and
// end time, and the money is hours × your rate.
//
// What this deliberately is NOT: payroll. No tax, no withholding, no overtime
// multiplier, no PTO accrual. Those are wrong in ways that matter and vary by
// state, employer and week, and a number that's confidently wrong about your
// pay is worse than no number. `takeHomePct` is the one concession — a single
// honest fudge factor you set yourself, clearly labelled as an estimate.

export const rateFor = (settings, memberId) => Number(settings.rates?.[memberId]) || 0;

const monthStart = (d = new Date()) => dayStr(new Date(d.getFullYear(), d.getMonth(), 1));
const monthEnd = (d = new Date()) => dayStr(new Date(d.getFullYear(), d.getMonth() + 1, 0));

export function useWork({ enabled = true } = {}) {
  const { settings, members, currentMember } = useHousehold();
  const { between, loading } = useEvents({ enabled });

  const from = monthStart();
  const to = monthEnd();
  const today = dayStr();

  // `between` expands repeats, which shifts never have — but going through it
  // keeps one reader of the events table rather than two that could disagree.
  const shifts = useMemo(
    () =>
      between(from, to)
        .filter((e) => e.kind === WORK_KIND && !e.continuation)
        .map((e) => {
          const hours = e.hours ?? 0;
          const rate = rateFor(settings, e.raw.member_id);
          return {
            ...e,
            hours,
            rate,
            pay: Math.round(hours * rate * 100) / 100,
            worked: e.date <= today,
          };
        }),
    [between, from, to, today, settings],
  );

  const week = useMemo(() => {
    const w = getWeek();
    const start = dayStr(w.monday);
    const end = addDays(start, 6);
    return shifts.filter((s) => s.date >= start && s.date <= end);
  }, [shifts]);

  const sum = (rows, key) => Math.round(rows.reduce((n, r) => n + (r[key] || 0), 0) * 100) / 100;

  const worked = shifts.filter((s) => s.worked);
  const ahead = shifts.filter((s) => !s.worked);

  // Per person, so a two-earner household sees two lines rather than one
  // meaningless total.
  const byMember = useMemo(() => {
    const rows = members
      .map((m) => {
        const mine = shifts.filter((s) => s.raw.member_id === m.id);
        return {
          id: m.id,
          name: m.name,
          rate: rateFor(settings, m.id),
          hours: sum(mine.filter((s) => s.worked), 'hours'),
          earned: sum(mine.filter((s) => s.worked), 'pay'),
          scheduled: sum(mine.filter((s) => !s.worked), 'pay'),
        };
      })
      .filter((r) => r.rate > 0 || r.hours > 0 || r.scheduled > 0);
    return rows;
  }, [members, shifts, settings]);

  const earned = sum(worked, 'pay');
  const scheduled = sum(ahead, 'pay');
  const takeHomePct = Number(settings.takeHomePct) || null;

  return {
    loading,
    shifts,
    monthFrom: from,
    monthTo: to,
    hoursWorked: sum(worked, 'hours'),
    hoursScheduled: sum(ahead, 'hours'),
    hoursThisWeek: sum(week.filter((s) => s.worked), 'hours'),
    earned,
    scheduled,
    // What the month lands on if every booked shift happens.
    projected: Math.round((earned + scheduled) * 100) / 100,
    takeHomePct,
    takeHome: takeHomePct ? Math.round(earned * takeHomePct) / 100 : null,
    byMember,
    // Nothing to show until someone has a rate and a shift.
    configured: byMember.length > 0,
    myRate: rateFor(settings, currentMember?.id),
  };
}

export const usd = (n) =>
  n >= 1000 ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `$${n.toFixed(2)}`;
