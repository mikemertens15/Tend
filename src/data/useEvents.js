import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useHousehold } from '../household/HouseholdProvider';
import { useCalendars } from './useCalendars';
import {
  dayStr,
  addDays,
  parseDay,
  daysUntil,
  monthDay,
  parseTime,
  timeLabel,
  timeRangeLabel,
  shiftHours,
} from '../dates';
import { occurrenceDates, repeatSummary, indexExceptions, applyException, exceptionKey } from './recurrence';

// Everything that happens on a date: birthdays, appointments, the school play,
// a weekend away, and the shifts you get paid for.
//
// One row is a *series*, not an occurrence. A class that meets Monday,
// Wednesday and Friday until December is one row; reading expands it into
// whichever window you asked about. That's what keeps entering a semester a
// thirty-second job rather than forty-five separate events, and it's why almost
// everything below is about the difference between the two.
//
// Three things a caller gets for free by going through `between`:
//   * repeats expanded, with the rule read from the row (see recurrence.js)
//   * occurrences that were cancelled dropped, and ones that moved honoured
//   * multi-day events repeated onto every day they cover, so a trip already
//     under way still shows on Wednesday
//
// Visibility is *not* enforced here. It's enforced by row-level security, so a
// private event never reaches the browser at all — filtering in JavaScript
// would look identical right up until someone opened the network tab. What the
// fields below are for is showing a lock on your own private events.

export const EVENT_KINDS = [
  ['event', 'Event', '📌'],
  ['birthday', 'Birthday', '🎂'],
  ['appointment', 'Appointment', '🕐'],
  ['school', 'School', '🎒'],
  ['trip', 'Trip', '✈️'],
  ['holiday', 'Holiday', '🎉'],
  // A shift is a calendar event, because that's where you were already putting
  // it. Everything the Earned view knows, it knows from here.
  ['work', 'Work', '💼'],
];

export const WORK_KIND = 'work';

export const kindMeta = (key) => EVENT_KINDS.find(([k]) => k === key) ?? EVENT_KINDS[0];

export const VISIBILITIES = [
  ['household', 'Everyone', '🏡', 'Anyone in the house can see it'],
  ['members', 'Just some of us', '👥', 'You, plus the people you pick'],
  ['private', 'Only me', '🔒', 'Nobody else sees it, on any device'],
];

export const visibilityMeta = (key) => VISIBILITIES.find(([k]) => k === key) ?? VISIBILITIES[0];

const daysBetween = (a, b) => Math.round((parseDay(b) - parseDay(a)) / 86400000);

// The repeat rule, in the shape recurrence.js wants.
const ruleOf = (r) => ({
  onDate: r.on_date,
  freq: r.repeat_freq,
  interval: r.repeat_interval,
  weekdays: r.repeat_weekdays,
  until: r.repeat_until,
  count: r.repeat_count,
});

// `enabled: false` parks the hook — see the note in useSystems.
export function useEvents({ enabled = true } = {}) {
  const { household, members } = useHousehold();
  const householdId = enabled ? (household?.id ?? null) : null;
  const { calendars, byId: calendarById } = useCalendars({ enabled });

  const [rows, setRows] = useState([]);
  const [exceptionRows, setExceptionRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const nameById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m.name])), [members]);

  const fetchEvents = useCallback(async () => {
    if (!householdId) {
      setRows([]);
      setExceptionRows([]);
      setLoading(false);
      return;
    }
    // Both in flight together: the grid can't draw a series correctly without
    // knowing which of its occurrences were cancelled, so showing one before
    // the other would flash a lecture that isn't happening.
    const [events, exceptions] = await Promise.all([
      supabase.from('events').select('*').eq('household_id', householdId).order('on_date', { ascending: true }),
      supabase.from('event_exceptions').select('*').eq('household_id', householdId),
    ]);
    setRows(events.data ?? []);
    setExceptionRows(exceptions.data ?? []);
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`events:${householdId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `household_id=eq.${householdId}` },
        () => fetchEvents(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_exceptions', filter: `household_id=eq.${householdId}` },
        () => fetchEvents(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, fetchEvents]);

  const exceptions = useMemo(() => indexExceptions(exceptionRows), [exceptionRows]);

  // One occurrence, before exceptions are applied to it.
  const buildOccurrence = useCallback(
    (r, occurrenceDate, spanDays) => {
      const cal = r.calendar_id ? (calendarById[r.calendar_id] ?? null) : null;
      return {
        eventId: r.id,
        occurrenceDate,
        date: occurrenceDate,
        title: r.title,
        note: r.note,
        kind: r.kind,
        icon: kindMeta(r.kind)[2],
        location: r.location,
        endDate: r.end_date,
        spanDays,
        startTime: r.start_time,
        endTime: r.end_time,
        startMinutes: parseTime(r.start_time),
        endMinutes: parseTime(r.end_time),
        memberId: r.member_id,
        who: nameById[r.member_id] ?? null,
        visibility: r.visibility,
        visibleTo: r.visible_to ?? [],
        jobId: r.job_id,
        calendar: cal,
        color: cal?.color ?? null,
        repeats: Boolean(r.repeat_freq),
        repeatText: repeatSummary(ruleOf(r)),
        moved: false,
        edited: false,
        raw: r,
      };
    },
    [calendarById, nameById],
  );

  // The derived fields every consumer wants and nobody should compute twice.
  const decorate = (o) => {
    const allDay = o.startMinutes == null;
    return {
      ...o,
      id: `${o.eventId}:${o.occurrenceDate}`,
      allDay,
      time: timeLabel(o.startTime),
      timeRange: timeRangeLabel(o.startTime, o.endTime),
      hours: shiftHours(o.startTime, o.endTime),
      daysLeft: daysUntil(parseDay(o.date)),
      dateLabel: monthDay(parseDay(o.date)),
      // A birthday knows which one it is: the series is stored on the day they
      // were born, so the year of the occurrence does the arithmetic.
      age:
        o.kind === 'birthday' && o.raw.repeat_freq === 'yearly'
          ? Number(o.date.slice(0, 4)) - Number(o.raw.on_date.slice(0, 4))
          : null,
    };
  };

  // A day after the first of a multi-day event. It carries no time of its own —
  // a four-day trip isn't four events that each start at 9am.
  const continuationOf = (o, day) =>
    decorate({
      ...o,
      date: day,
      startTime: null,
      endTime: null,
      startMinutes: null,
      endMinutes: null,
      continuation: true,
    });

  // Every occurrence between two dates, flattened and sorted — the shape the
  // grid, the agenda, the hub and the Earned view all want.
  const between = useCallback(
    (fromDay, toDay) => {
      const out = [];
      for (const r of rows) {
        const spanDays = r.end_date && r.end_date > r.on_date ? daysBetween(r.on_date, r.end_date) : 0;
        // Widened by the span so an event that began before the window is still
        // found by it.
        const dates = occurrenceDates(ruleOf(r), addDays(fromDay, -spanDays), toDay);

        for (const occurrenceDate of dates) {
          const resolved = applyException(
            buildOccurrence(r, occurrenceDate, spanDays),
            exceptions.get(exceptionKey(r.id, occurrenceDate)),
          );
          // Cancelled.
          if (!resolved) continue;

          for (let n = 0; n <= spanDays; n++) {
            const day = addDays(resolved.date, n);
            if (day < fromDay || day > toDay) continue;
            out.push(n === 0 ? decorate({ ...resolved, date: day, continuation: false }) : continuationOf(resolved, day));
          }
        }
      }
      return out.sort(
        (a, b) =>
          (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) ||
          // All-day things sit above the timed ones, which is where a banner
          // belongs and also how every other calendar does it.
          Number(b.allDay) - Number(a.allDay) ||
          (a.startMinutes ?? 0) - (b.startMinutes ?? 0) ||
          a.title.localeCompare(b.title),
      );
    },
    [rows, exceptions, buildOccurrence],
  );

  // The next N days, for the dashboard and the kitchen display.
  const upcoming = useCallback((days = 14) => between(dayStr(), addDays(dayStr(), days)), [between]);

  // ------------------------------------------------------------------------
  // The series
  // ------------------------------------------------------------------------

  const addEvent = useCallback(
    async (fields) => {
      if (!householdId) return null;
      const { data, error } = await supabase
        .from('events')
        .insert({ household_id: householdId, ...fields })
        .select()
        .single();
      if (error) return null;
      fetchEvents();
      return data;
    },
    [householdId, fetchEvents],
  );

  const updateEvent = useCallback(
    async (id, patch) => {
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      await supabase.from('events').update(patch).eq('id', id);
      // Always re-read rather than trusting the patch: changing a repeat rule
      // changes which dates exist, and the optimistic row above can't know that.
      fetchEvents();
    },
    [fetchEvents],
  );

  const removeEvent = useCallback(
    async (id) => {
      setRows((rs) => rs.filter((r) => r.id !== id));
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) fetchEvents();
    },
    [fetchEvents],
  );

  // ------------------------------------------------------------------------
  // One occurrence of a series
  // ------------------------------------------------------------------------

  const setException = useCallback(
    async (eventId, occurrenceDate, fields) => {
      if (!householdId) return;
      const { error } = await supabase.from('event_exceptions').upsert(
        {
          household_id: householdId,
          event_id: eventId,
          occurrence_date: occurrenceDate,
          title: null,
          on_date: null,
          start_time: null,
          end_time: null,
          note: null,
          ...fields,
        },
        { onConflict: 'event_id,occurrence_date' },
      );
      if (!error) fetchEvents();
    },
    [householdId, fetchEvents],
  );

  // "Not this week." The occurrence disappears; the series is untouched.
  const skipOccurrence = useCallback(
    (eventId, occurrenceDate) => setException(eventId, occurrenceDate, { action: 'skip' }),
    [setException],
  );

  // "This one is different." Only the fields you pass override the series, so a
  // moved lecture at a new time keeps its title and its room.
  const overrideOccurrence = useCallback(
    (eventId, occurrenceDate, fields) => setException(eventId, occurrenceDate, { action: 'override', ...fields }),
    [setException],
  );

  // Back to whatever the series says.
  const clearException = useCallback(
    async (eventId, occurrenceDate) => {
      const { error } = await supabase
        .from('event_exceptions')
        .delete()
        .eq('event_id', eventId)
        .eq('occurrence_date', occurrenceDate);
      if (!error) fetchEvents();
    },
    [fetchEvents],
  );

  // "Stop after last week" — the third option every calendar needs and most get
  // wrong. Ending the series the day before keeps the history and drops the
  // future, where deleting the row would erase shifts you have already been
  // paid for.
  const endSeriesBefore = useCallback(
    async (eventId, occurrenceDate) => {
      const until = addDays(occurrenceDate, -1);
      await supabase.from('events').update({ repeat_until: until, repeat_count: null }).eq('id', eventId);
      // Exceptions past the new end are noise; they'd come back if the series
      // were ever extended again.
      await supabase.from('event_exceptions').delete().eq('event_id', eventId).gt('occurrence_date', until);
      fetchEvents();
    },
    [fetchEvents],
  );

  // "Change this one and everything after it" — the third option, and the only
  // one that needs two rows: the old series is stopped the day before, and a new
  // one carrying the changes starts here. That's what keeps last term's
  // timetable looking like last term's rather than being rewritten by this
  // term's room change.
  const splitSeriesAt = useCallback(
    async (eventId, occurrenceDate, fields) => {
      if (!householdId) return;
      const original = rows.find((r) => r.id === eventId);
      if (!original) return;

      const until = addDays(occurrenceDate, -1);
      // A series that would end before it began was only ever this one
      // occurrence forward, so there's nothing to keep — edit it in place.
      if (until < original.on_date) {
        await supabase.from('events').update(fields).eq('id', eventId);
        fetchEvents();
        return;
      }

      // Everything the old row carried except its identity and its timestamps.
      const carried = { ...original };
      delete carried.id;
      delete carried.created_at;
      delete carried.updated_at;

      await supabase.from('events').update({ repeat_until: until, repeat_count: null }).eq('id', eventId);
      await supabase.from('event_exceptions').delete().eq('event_id', eventId).gte('occurrence_date', occurrenceDate);
      await supabase
        .from('events')
        .insert({ ...carried, on_date: occurrenceDate, repeat_until: original.repeat_until, ...fields });
      fetchEvents();
    },
    [householdId, rows, fetchEvents],
  );

  return {
    events: rows,
    exceptions: exceptionRows,
    calendars,
    calendarById,
    loading,
    between,
    upcoming,
    addEvent,
    updateEvent,
    removeEvent,
    skipOccurrence,
    overrideOccurrence,
    clearException,
    endSeriesBefore,
    splitSeriesAt,
    refresh: fetchEvents,
  };
}
