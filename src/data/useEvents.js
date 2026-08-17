import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useHousehold } from '../household/HouseholdProvider';
import { dayStr, addDays, parseDay, daysUntil, monthDay, shiftHours } from '../dates';

// Everything that happens on a date but isn't work: birthdays, appointments,
// the school play, a weekend away.

export const EVENT_KINDS = [
  ['event', 'Event', '📌'],
  ['birthday', 'Birthday', '🎂'],
  ['appointment', 'Appointment', '🕐'],
  ['school', 'School', '🎒'],
  ['trip', 'Trip', '✈️'],
  ['holiday', 'Holiday', '🎉'],
  // A shift is a calendar event, because that's where you were already putting
  // it. Giving it an end time is the whole of what income tracking needed.
  ['work', 'Work', '💼'],
];

export const WORK_KIND = 'work';

export const kindMeta = (key) => EVENT_KINDS.find(([k]) => k === key) ?? EVENT_KINDS[0];

// A yearly event is stored once on the date it first happened; reading expands
// it into whichever year you're looking at. That way a birthday is entered
// once and the original date still says which year they were born.
function occurrencesIn(row, fromDay, toDay) {
  if (!row.repeat_yearly) {
    return row.on_date >= fromDay && row.on_date <= toDay ? [row.on_date] : [];
  }
  const [, month, day] = row.on_date.split('-');
  const years = new Set([fromDay.slice(0, 4), toDay.slice(0, 4)]);
  return [...years]
    .map((y) => `${y}-${month}-${day}`)
    .filter((d) => d >= fromDay && d <= toDay)
    .sort();
}

// "4:30 PM" from a Postgres time. Null (all-day) is the common case.
function timeLabel(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour} ${period}` : `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

// `enabled: false` parks the hook — see the note in useSystems.
export function useEvents({ enabled = true } = {}) {
  const { household, members } = useHousehold();
  const householdId = enabled ? (household?.id ?? null) : null;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const nameById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m.name])), [members]);

  const fetchEvents = useCallback(async () => {
    if (!householdId) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('household_id', householdId)
      .order('on_date', { ascending: true });
    setRows(data ?? []);
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
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, fetchEvents]);

  // Every occurrence between two dates, flattened and sorted — the shape both
  // the calendar grid and the hub want.
  const between = useCallback(
    (fromDay, toDay) => {
      const out = [];
      for (const r of rows) {
        for (const date of occurrencesIn(r, fromDay, toDay)) {
          const spanDays =
            r.end_date && !r.repeat_yearly
              ? Math.max(0, Math.round((parseDay(r.end_date) - parseDay(r.on_date)) / 86400000))
              : 0;
          out.push({
            id: `${r.id}:${date}`,
            eventId: r.id,
            title: r.title,
            note: r.note,
            kind: r.kind,
            icon: kindMeta(r.kind)[2],
            date,
            endDate: r.end_date,
            spanDays,
            time: timeLabel(r.start_time),
            startTime: r.start_time,
            endTime: r.end_time,
            timeRange:
              r.start_time && r.end_time ? `${timeLabel(r.start_time)}–${timeLabel(r.end_time)}` : timeLabel(r.start_time),
            hours: shiftHours(r.start_time, r.end_time),
            allDay: !r.start_time,
            who: nameById[r.member_id] ?? null,
            repeatYearly: r.repeat_yearly,
            // A birthday knows which one it is.
            age: r.repeat_yearly && r.kind === 'birthday' ? Number(date.slice(0, 4)) - Number(r.on_date.slice(0, 4)) : null,
            daysLeft: daysUntil(parseDay(date)),
            dateLabel: monthDay(parseDay(date)),
            raw: r,
          });
        }
        // A multi-day event should show on every day it covers, not just the
        // first, so the grid can paint the whole stay.
        if (r.end_date && !r.repeat_yearly && r.end_date > r.on_date) {
          let d = addDays(r.on_date, 1);
          while (d <= r.end_date) {
            if (d >= fromDay && d <= toDay) {
              out.push({
                id: `${r.id}:${d}`,
                eventId: r.id,
                title: r.title,
                note: r.note,
                kind: r.kind,
                icon: kindMeta(r.kind)[2],
                date: d,
                endDate: r.end_date,
                continuation: true,
                time: null,
                allDay: true,
                who: nameById[r.member_id] ?? null,
                daysLeft: daysUntil(parseDay(d)),
                dateLabel: monthDay(parseDay(d)),
                raw: r,
              });
            }
            d = addDays(d, 1);
          }
        }
      }
      return out.sort(
        (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) || (a.startTime ?? '').localeCompare(b.startTime ?? ''),
      );
    },
    [rows, nameById],
  );

  // The next N days, for the dashboard and the kitchen display.
  const upcoming = useCallback((days = 14) => between(dayStr(), addDays(dayStr(), days)), [between]);

  const addEvent = useCallback(
    async (fields) => {
      if (!householdId) return;
      const { error } = await supabase.from('events').insert({ household_id: householdId, ...fields });
      if (!error) fetchEvents();
    },
    [householdId, fetchEvents],
  );

  const updateEvent = useCallback(
    async (id, patch) => {
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      const { error } = await supabase.from('events').update(patch).eq('id', id);
      if (error) fetchEvents();
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

  return { events: rows, loading, between, upcoming, addEvent, updateEvent, removeEvent };
}
