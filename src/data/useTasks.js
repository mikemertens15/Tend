import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useHousehold } from '../household/HouseholdProvider';

// Supabase-backed replacement for the old localStorage useStore. Keeps the exact
// same surface — { tasks, toggle, addTask } — so the views don't have to change.
// Tasks are scoped to the current household (enforced by RLS) and stay in sync
// across devices via a realtime subscription.
export function useTasks() {
  const { household, members } = useHousehold();
  const householdId = household?.id ?? null;
  const [rows, setRows] = useState([]);

  const nameById = useMemo(() => {
    const m = {};
    for (const mem of members) m[mem.id] = mem.name;
    return m;
  }, [members]);

  const idByName = useMemo(() => {
    const m = {};
    for (const mem of members) m[mem.name] = mem.id;
    return m;
  }, [members]);

  const fetchTasks = useCallback(async () => {
    if (!householdId) {
      setRows([]);
      return;
    }
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('household_id', householdId)
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

  // Map DB rows to the shape the views expect (assignee_id → who name).
  const tasks = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        cat: r.cat,
        who: nameById[r.assignee_id] ?? null,
        note: r.note ?? undefined,
        dueType: r.due_type,
        dueLabel: r.due_label,
        day: r.day,
        done: r.done,
      })),
    [rows, nameById],
  );

  const toggle = useCallback(
    async (id) => {
      const current = rows.find((r) => r.id === id);
      if (!current) return;
      // Optimistic flip; realtime + refetch reconcile the truth.
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, done: !r.done } : r)));
      const { error } = await supabase.from('tasks').update({ done: !current.done }).eq('id', id);
      if (error) fetchTasks();
    },
    [rows, fetchTasks],
  );

  const addTask = useCallback(
    async ({ title, cat, who }) => {
      if (!householdId) return;
      const jsDay = new Date().getDay(); // place it on today's calendar column (0 = Mon … 6 = Sun)
      const { error } = await supabase.from('tasks').insert({
        household_id: householdId,
        title: (title || '').trim() || 'Untitled task',
        cat,
        assignee_id: idByName[who] ?? null,
        due_type: 'soon',
        due_label: 'This week',
        day: jsDay === 0 ? 6 : jsDay - 1,
        done: false,
      });
      if (!error) fetchTasks();
    },
    [householdId, idByName, fetchTasks],
  );

  return { tasks, toggle, addTask };
}
