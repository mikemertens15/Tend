import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useHousehold } from '../household/HouseholdProvider';
import { dayStr, addDays, parseDay, daysUntil, monthDay, shortDay } from '../dates';

// Tasks are dated. `due_on` is the only stored schedule — the "overdue /
// today / soon" bucket, the label on the pill and the calendar column are all
// derived from it at read time, so they can never disagree with each other.
//
// `repeat_days` turns a task into a habit: completing it files the finished
// one and books the next.

// Repeat options offered in the add form. null = one-shot.
export const REPEATS = [
  [null, 'One-off'],
  [1, 'Daily'],
  [7, 'Weekly'],
  [14, 'Every 2 weeks'],
  [30, 'Monthly'],
  [90, 'Quarterly'],
];

export const repeatLabel = (days) =>
  days == null ? null : (REPEATS.find(([d]) => d === days)?.[1] ?? `Every ${days} days`);

// How far back finished tasks stay loaded. Unfinished ones always load, however
// old — an overdue chore doesn't stop mattering because it's stale.
const DONE_WINDOW_DAYS = 60;

export function useTasks() {
  const { household, members } = useHousehold();
  const householdId = household?.id ?? null;
  const [rows, setRows] = useState([]);

  const nameById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m.name])), [members]);
  const idByName = useMemo(() => Object.fromEntries(members.map((m) => [m.name, m.id])), [members]);

  const fetchTasks = useCallback(async () => {
    if (!householdId) {
      setRows([]);
      return;
    }
    const cutoff = addDays(dayStr(), -DONE_WINDOW_DAYS);
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('household_id', householdId)
      .or(`done.eq.false,due_on.gte.${cutoff}`)
      .order('due_on', { ascending: true })
      .order('created_at', { ascending: true });
    setRows(data ?? []);
  }, [householdId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Live sync: any insert/update/delete in this household refreshes the list.
  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`tasks:${householdId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `household_id=eq.${householdId}` },
        () => fetchTasks(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, fetchTasks]);

  const tasks = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        cat: r.cat,
        who: nameById[r.assignee_id] ?? null,
        note: r.note ?? undefined,
        done: r.done,
        room: r.room ?? 'whole',
        effortMinutes: r.effort_minutes ?? null,
        dueOn: r.due_on,
        repeatDays: r.repeat_days ?? null,
        repeatLabel: repeatLabel(r.repeat_days),
        ...describeDue(r.due_on),
      })),
    [rows, nameById],
  );

  // Completing a repeating task books the next one. Un-completing just
  // un-completes — the booked follow-up stays, which is why spawning checks
  // for one first rather than blindly inserting.
  const toggle = useCallback(
    async (id) => {
      const current = rows.find((r) => r.id === id);
      if (!current) return;
      const nowDone = !current.done;

      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, done: nowDone } : r)));
      const { error } = await supabase.from('tasks').update({ done: nowDone }).eq('id', id);
      if (error) {
        fetchTasks();
        return;
      }

      if (nowDone && current.repeat_days) {
        const already = rows.some(
          (r) =>
            r.id !== current.id &&
            !r.done &&
            r.title === current.title &&
            r.cat === current.cat &&
            r.assignee_id === current.assignee_id &&
            r.due_on > current.due_on,
        );
        if (!already) {
          await supabase.from('tasks').insert({
            household_id: current.household_id,
            title: current.title,
            cat: current.cat,
            assignee_id: current.assignee_id,
            note: current.note,
            repeat_days: current.repeat_days,
            room: current.room,
            effort_minutes: current.effort_minutes,
            due_on: nextOccurrence(current.due_on, current.repeat_days),
            done: false,
          });
        }
      }
      fetchTasks();
    },
    [rows, fetchTasks],
  );

  const addTask = useCallback(
    async ({ title, cat, who, note, dueOn, repeatDays, room, effortMinutes }) => {
      if (!householdId) return;
      const { error } = await supabase.from('tasks').insert({
        household_id: householdId,
        title: (title || '').trim() || 'Untitled task',
        cat,
        assignee_id: idByName[who] ?? null,
        note: (note || '').trim() || null,
        due_on: dueOn || dayStr(),
        repeat_days: repeatDays ?? null,
        room: room || 'whole',
        effort_minutes: effortMinutes ?? null,
        done: false,
      });
      if (!error) fetchTasks();
    },
    [householdId, idByName, fetchTasks],
  );

  const removeTask = useCallback(
    async (id) => {
      setRows((rs) => rs.filter((r) => r.id !== id));
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) fetchTasks();
    },
    [fetchTasks],
  );

  return { tasks, toggle, addTask, removeTask };
}

// Step forward by the repeat interval until the date is actually ahead of us,
// so a chore you're three weeks late on lands on the next real occurrence
// rather than another overdue one.
function nextOccurrence(dueOn, repeatDays) {
  let next = addDays(dueOn, repeatDays);
  let guard = 0;
  while (daysUntil(parseDay(next)) < 0 && guard++ < 400) next = addDays(next, repeatDays);
  return next;
}

// The single source of "when is this due" for pills, sorting and grouping.
function describeDue(dueOn) {
  const date = parseDay(dueOn);
  const daysLeft = daysUntil(date);

  if (daysLeft < 0) {
    return {
      date,
      daysLeft,
      dueType: 'overdue',
      dueLabel: daysLeft === -1 ? 'Yesterday' : `${-daysLeft}d late`,
    };
  }
  if (daysLeft === 0) return { date, daysLeft, dueType: 'today', dueLabel: 'Today' };
  return {
    date,
    daysLeft,
    dueType: 'soon',
    dueLabel: daysLeft === 1 ? 'Tomorrow' : daysLeft < 7 ? shortDay(date) : monthDay(date),
  };
}
