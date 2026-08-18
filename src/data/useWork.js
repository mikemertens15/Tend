import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useHousehold } from '../household/HouseholdProvider';
import { useWallClock } from '../useWallClock';
import { useEvents, WORK_KIND } from './useEvents';
import { useJobs } from './useJobs';
import { dayStr, addDays, timeStr } from '../dates';
import { nowMinutes } from './layout';
import {
  resolveShift,
  payPeriodOf,
  earningsFor,
  takeHome,
  salaryForPeriod,
  weekStartFor,
} from './pay';

// What the work has earned, and what it actually cost you in hours.
//
// The shape that makes this cheap: a shift is a `work` event on the calendar,
// so there is no second list to keep in sync — you were already putting your
// rota somewhere. What's new is that a shift now has a *record* alongside it
// (public.work_shifts, one row per occurrence) holding what the clock said, and
// everything below is about the difference between the two.
//
// The rules themselves — breaks, overtime, pay periods — are in pay.js, with no
// React or database anywhere near them, because they're the part worth being
// able to check by reading.

export { usd } from './pay';

// Records older than this stop loading. Long enough for a year of history and
// last year's total to still be there.
const RECORD_WINDOW_DAYS = 420;

const recordKey = (eventId, occurrenceDate) => `${eventId}:${occurrenceDate}`;
const round2 = (n) => Math.round(n * 100) / 100;

export function useWork({ enabled = true } = {}) {
  const { household, members, currentMember } = useHousehold();
  const householdId = enabled ? (household?.id ?? null) : null;

  const ev = useEvents({ enabled });
  const { jobs, activeJobs, jobById, jobsFor, primaryJob, labelFor, addJob, updateJob, retireJob, removeJob } =
    useJobs({ enabled });

  // Ticks on the minute. A shift in progress is worth what it's worth *so far*,
  // and the number moving while you're in it is the point — the same cost the
  // kitchen display already pays.
  const now = useWallClock();
  const today = dayStr(now);
  const minutesNow = nowMinutes(now);

  const [records, setRecords] = useState([]);
  const [offset, setOffset] = useState(0);

  const fetchRecords = useCallback(async () => {
    if (!householdId) {
      setRecords([]);
      return;
    }
    const { data } = await supabase
      .from('work_shifts')
      .select('*')
      .eq('household_id', householdId)
      .gte('occurrence_date', addDays(dayStr(), -RECORD_WINDOW_DAYS));
    setRecords(data ?? []);
  }, [householdId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`work_shifts:${householdId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'work_shifts', filter: `household_id=eq.${householdId}` },
        () => fetchRecords(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, fetchRecords]);

  const recordByKey = useMemo(() => {
    const m = new Map();
    for (const r of records) m.set(recordKey(r.event_id, r.occurrence_date), r);
    return m;
  }, [records]);

  // ------------------------------------------------------------------------
  // The window being looked at
  // ------------------------------------------------------------------------

  // The pay period, stepped by the pager. Whose period? The current member's
  // first job — somebody with two jobs on different cycles has to be shown one
  // of them, and this beats the calendar month it used to be.
  const period = useMemo(() => {
    let p = payPeriodOf(today, primaryJob);
    for (let i = 0; i < Math.abs(offset); i++) {
      p = offset > 0 ? payPeriodOf(addDays(p.to, 1), primaryJob) : payPeriodOf(addDays(p.from, -1), primaryJob);
    }
    return p;
  }, [today, primaryJob, offset]);

  const shiftsBetween = useCallback(
    (from, to) =>
      ev
        .between(from, to)
        .filter((o) => o.kind === WORK_KIND && !o.continuation)
        .map((o) =>
          resolveShift({
            occurrence: o,
            record: recordByKey.get(recordKey(o.eventId, o.occurrenceDate)) ?? null,
            // A shift with no job named falls back to its owner's first job, so
            // adding one in a hurry still counts toward something.
            job: (o.jobId ? jobById[o.jobId] : null) ?? jobsFor(o.memberId)[0] ?? null,
            today,
            nowMinutes: minutesNow,
          }),
        ),
    [ev, recordByKey, jobById, jobsFor, today, minutesNow],
  );

  const periodShifts = useMemo(() => shiftsBetween(period.from, period.to), [shiftsBetween, period]);

  const weekShifts = useMemo(() => {
    const start = weekStartFor(today, primaryJob?.week_starts_on ?? 6);
    return shiftsBetween(start, addDays(start, 6));
  }, [shiftsBetween, today, primaryJob]);

  // ------------------------------------------------------------------------
  // Adding it up
  // ------------------------------------------------------------------------

  // Grouped by job first, because overtime and the take-home percentage are
  // both properties of an employer and adding two of them together would be
  // meaningless.
  const summarize = useCallback(
    (shifts) => {
      const groups = new Map();
      for (const s of shifts) {
        const key = s.job?.id ?? 'none';
        if (!groups.has(key)) groups.set(key, { job: s.job ?? null, shifts: [] });
        groups.get(key).shifts.push(s);
      }

      let hours = 0;
      let regular = 0;
      let overtime = 0;
      let gross = 0;
      let net = 0;
      // Take-home is only reported when *every* job that contributed money has
      // a percentage set. Mixing a real estimate with an assumed 100% would
      // produce a number that looks precise and isn't.
      let netKnown = true;

      for (const { job, shifts: js } of groups.values()) {
        const e = earningsFor(js, jobById);
        hours += e.hours;
        regular += e.regular;
        overtime += e.overtime;
        gross += e.gross;
        const th = takeHome(e.gross, job);
        if (th == null) {
          if (e.gross > 0) netKnown = false;
        } else {
          net += th;
        }
      }

      return {
        hours: round2(hours),
        regular: round2(regular),
        overtime: round2(overtime),
        gross: round2(gross),
        takeHome: netKnown && gross > 0 ? round2(net) : null,
        count: shifts.length,
      };
    },
    [jobById],
  );

  const doneSoFar = useMemo(() => periodShifts.filter((s) => s.date <= today), [periodShifts, today]);
  const stillBooked = useMemo(() => periodShifts.filter((s) => s.date > today), [periodShifts, today]);

  const earnedSummary = useMemo(() => summarize(doneSoFar), [summarize, doneSoFar]);
  const projectedSummary = useMemo(() => summarize(periodShifts), [summarize, periodShifts]);
  const weekSummary = useMemo(() => summarize(weekShifts), [summarize, weekShifts]);

  // Salary doesn't move with the hours, so it's counted once per period rather
  // than per shift — and kept apart from `gross` so it can't be double-counted
  // by a salaried job that also books its hours on the calendar.
  const salary = useMemo(() => {
    const mine = activeJobs.filter((j) => j.pay_kind === 'salary');
    return round2(mine.reduce((n, j) => n + salaryForPeriod(j), 0));
  }, [activeJobs]);

  // ------------------------------------------------------------------------
  // Today, and what needs fixing
  // ------------------------------------------------------------------------

  const todayShifts = useMemo(() => shiftsBetween(today, today), [shiftsBetween, today]);

  const myShiftToday = useMemo(
    () => todayShifts.find((s) => s.memberId === currentMember?.id) ?? null,
    [todayShifts, currentMember],
  );

  // Shifts that have already happened with nothing recorded against them. Their
  // scheduled hours are still counted, so a total is never wrong by a whole day
  // — but they're listed so the guess can be replaced with the truth.
  const needsConfirming = useMemo(
    () => shiftsBetween(addDays(today, -45), addDays(today, -1)).filter((s) => s.unconfirmed),
    [shiftsBetween, today],
  );

  const byMember = useMemo(() => {
    const rows = members
      .map((m) => {
        const mine = periodShifts.filter((s) => s.memberId === m.id);
        const jobsOf = jobsFor(m.id);
        return {
          id: m.id,
          name: m.name,
          jobs: jobsOf,
          rate: Number(jobsOf[0]?.hourly_rate) || 0,
          worked: summarize(mine.filter((s) => s.date <= today)),
          period: summarize(mine),
          shifts: mine.length,
        };
      })
      .filter((r) => r.jobs.length > 0 || r.shifts > 0);
    return rows;
  }, [members, periodShifts, jobsFor, summarize, today]);

  // ------------------------------------------------------------------------
  // The clock
  // ------------------------------------------------------------------------

  // One row per occurrence, created the first time anything is recorded against
  // it. Upsert rather than insert so a second tap can't produce a second row —
  // the unique index would reject it, but the user would see an error rather
  // than the thing they asked for.
  const saveRecord = useCallback(
    async (shift, patch) => {
      if (!householdId || !shift) return;
      const existing = shift.record;
      if (existing) {
        setRecords((rs) => rs.map((r) => (r.id === existing.id ? { ...r, ...patch } : r)));
        const { error } = await supabase.from('work_shifts').update(patch).eq('id', existing.id);
        if (error) fetchRecords();
        return;
      }
      await supabase.from('work_shifts').insert({
        household_id: householdId,
        event_id: shift.eventId,
        occurrence_date: shift.occurrenceDate,
        ...patch,
      });
      // Re-read either way: on success to pick up the new row's id, and on
      // failure because the unique index rejecting a double-tap means a row is
      // already there and this copy doesn't have it.
      fetchRecords();
    },
    [householdId, fetchRecords],
  );

  const clockIn = useCallback(
    (shift, at = timeStr(minutesNow)) =>
      saveRecord(shift, { actual_start: at, actual_end: null, status: 'worked' }),
    [saveRecord, minutesNow],
  );

  const startBreak = useCallback(
    (shift, at = timeStr(minutesNow)) => saveRecord(shift, { break_started_at: at }),
    [saveRecord, minutesNow],
  );

  // Coming back folds the elapsed break into the total and clears the marker,
  // so the running clock and the saved number never disagree.
  const endBreak = useCallback(
    (shift, at = minutesNow) => {
      if (!shift?.record?.break_started_at) return;
      const startedAt = shift.record.break_started_at;
      const [h, m] = startedAt.split(':').map(Number);
      const elapsed = Math.max(0, at - (h * 60 + (m || 0)));
      return saveRecord(shift, {
        break_minutes: (Number(shift.record.break_minutes) || 0) + elapsed,
        break_started_at: null,
      });
    },
    [saveRecord, minutesNow],
  );

  const clockOut = useCallback(
    (shift, at = timeStr(minutesNow)) => {
      // Clocking out while still on a break shouldn't lose the break.
      const patch = { actual_end: at, status: 'worked' };
      if (shift?.record?.break_started_at) {
        const [h, m] = shift.record.break_started_at.split(':').map(Number);
        patch.break_minutes = (Number(shift.record.break_minutes) || 0) + Math.max(0, minutesNow - (h * 60 + (m || 0)));
        patch.break_started_at = null;
      }
      return saveRecord(shift, patch);
    },
    [saveRecord, minutesNow],
  );

  // The after-the-fact path: type in what actually happened, which is what
  // you'll do for every shift you forgot to punch.
  const saveActuals = useCallback(
    (shift, { actualStart, actualEnd, breakMinutes, status, note }) =>
      saveRecord(shift, {
        actual_start: actualStart || null,
        actual_end: actualEnd || null,
        break_minutes: Number(breakMinutes) || 0,
        break_started_at: null,
        status: status || 'worked',
        note: note?.trim() || null,
      }),
    [saveRecord],
  );

  // "Worked as planned" — one tap for a shift that went the way the rota said.
  const confirmAsScheduled = useCallback(
    (shift) =>
      saveRecord(shift, {
        actual_start: shift.scheduledStart,
        actual_end: shift.scheduledEnd,
        break_minutes: 0,
        break_started_at: null,
        status: 'worked',
      }),
    [saveRecord],
  );

  const setStatus = useCallback((shift, status) => saveRecord(shift, { status }), [saveRecord]);

  // Back to knowing nothing about it, which is different from knowing it was
  // worked exactly as scheduled.
  const clearRecord = useCallback(
    async (shift) => {
      if (!shift?.record) return;
      setRecords((rs) => rs.filter((r) => r.id !== shift.record.id));
      const { error } = await supabase.from('work_shifts').delete().eq('id', shift.record.id);
      if (error) fetchRecords();
    },
    [fetchRecords],
  );

  return {
    loading: ev.loading,
    // Nothing to show until somebody has a job. A rate with no shifts is a
    // sensible state to be in — it's how you start.
    configured: activeJobs.length > 0,
    today,
    now,

    jobs,
    activeJobs,
    jobById,
    jobsFor,
    primaryJob,
    jobLabel: labelFor,
    addJob,
    updateJob,
    retireJob,
    removeJob,

    period,
    periodOffset: offset,
    stepPeriod: (n) => setOffset((o) => o + n),
    resetPeriod: () => setOffset(0),

    shifts: periodShifts,
    doneSoFar,
    stillBooked,
    weekShifts,
    todayShifts,
    myShiftToday,
    needsConfirming,
    shiftsBetween,

    earned: earnedSummary,
    projected: projectedSummary,
    // The increment the rest of the period adds, computed as the difference
    // rather than on its own — overtime belongs to a whole week, so totalling
    // the remaining shifts in isolation would miss the hour that tips it over.
    booked: round2(projectedSummary.gross - earnedSummary.gross),
    week: weekSummary,
    salary,
    byMember,

    clockIn,
    startBreak,
    endBreak,
    clockOut,
    saveActuals,
    confirmAsScheduled,
    setStatus,
    clearRecord,
    refresh: fetchRecords,
  };
}
