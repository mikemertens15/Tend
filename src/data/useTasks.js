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
        // The id as well as the name: `who` is what the views display and filter
        // on, but the edit form has to hand back the same person it was given,
        // and two members can share a name.
        assigneeId: r.assignee_id ?? null,
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
    async (fields) => {
      if (!householdId) return;
      const { error } = await supabase
        .from('tasks')
        .insert({ household_id: householdId, ...taskColumns(fields), done: false });
      if (!error) fetchTasks();
    },
    [householdId, fetchTasks],
  );

  // Editing a task changes the task and nothing else. In particular it doesn't
  // touch `done`, and it doesn't reach forward into an occurrence that has
  // already been booked: changing a chore from daily to weekly means the *next*
  // one it books is a week out, not that tomorrow's — already sitting on the
  // board — moves.
  const updateTask = useCallback(
    async (id, fields) => {
      const patch = taskColumns(fields);
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      const { error } = await supabase.from('tasks').update(patch).eq('id', id);
      if (error) fetchTasks();
    },
    [fetchTasks],
  );

  // Deleting is deleting. There's no archive to fall back on, which is why both
  // callers ask twice — but a finished chore you never meant to tick off has to
  // be removable, and "mark it not done" leaves a job on the board that nobody
  // is going to do.
  const removeTasks = useCallback(
    async (ids) => {
      const list = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
      if (list.length === 0) return;
      const set = new Set(list);
      setRows((rs) => rs.filter((r) => !set.has(r.id)));
      const { error } = await supabase.from('tasks').delete().in('id', list);
      if (error) fetchTasks();
    },
    [fetchTasks],
  );

  const removeTask = useCallback((id) => removeTasks([id]), [removeTasks]);

  // Re-date overdue work to today. Used by the catch-up card on the dashboard
  // when a rhythm has been broken by an absence.
  //
  // Deliberately not "mark them done": they weren't done, and recording work
  // that never happened would corrupt the one thing this app is for. Rolling
  // says something different and true — this recurs, the missed beat is gone,
  // the next one is now.
  const rollForward = useCallback(
    async (ids) => {
      if (!ids?.length) return;
      const today = dayStr();
      const set = new Set(ids);
      setRows((rs) => rs.map((r) => (set.has(r.id) ? { ...r, due_on: today } : r)));
      await supabase.from('tasks').update({ due_on: today }).in('id', ids);
      fetchTasks();
    },
    [fetchTasks],
  );

  return { tasks, toggle, addTask, updateTask, removeTask, removeTasks, rollForward };
}

// The columns a task form owns, in one place, so adding and editing can't drift
// into disagreeing about what a task is.
function taskColumns({ title, cat, assigneeId, note, dueOn, repeatDays, room, effortMinutes }) {
  return {
    title: (title || '').trim() || 'Untitled task',
    cat,
    assignee_id: assigneeId ?? null,
    note: (note || '').trim() || null,
    due_on: dueOn || dayStr(),
    repeat_days: repeatDays ?? null,
    room: room || 'whole',
    effort_minutes: effortMinutes ?? null,
  };
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
