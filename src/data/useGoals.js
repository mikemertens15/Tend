import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useHousehold } from '../household/HouseholdProvider';
import { parseDay, daysUntil, monthDay, dayStr } from '../dates';

// Supabase-backed store for life goals — personal (owner set) or family-wide
// (owner null). Household-scoped + realtime like the other hooks. Active goals
// come back soonest-target-first; finished ones most-recently-done-first.
// `enabled: false` parks the hook — see the note in useSystems.
export function useGoals({ enabled = true } = {}) {
  const { household, members } = useHousehold();
  const householdId = enabled ? (household?.id ?? null) : null;
  const [rows, setRows] = useState([]);

  const nameById = useMemo(() => {
    const m = {};
    for (const mem of members) m[mem.id] = mem.name;
    return m;
  }, [members]);

  const fetchGoals = useCallback(async () => {
    if (!householdId) {
      setRows([]);
      return;
    }
    const { data } = await supabase
      .from('goals')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true });
    setRows(data ?? []);
  }, [householdId]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // Live sync: any insert/update/delete in this household refreshes the list.
  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`goals:${householdId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'goals', filter: `household_id=eq.${householdId}` },
        () => fetchGoals(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, fetchGoals]);

  const goals = useMemo(() => rows.map((r) => shapeGoal(r, nameById)), [rows, nameById]);

  const active = useMemo(
    () => goals.filter((g) => g.status === 'active').sort((a, b) => a.sortKey - b.sortKey),
    [goals],
  );

  const done = useMemo(
    () =>
      goals
        .filter((g) => g.status === 'done')
        .sort((a, b) => (b.raw.done_on ?? '').localeCompare(a.raw.done_on ?? '')),
    [goals],
  );

  const addGoal = useCallback(
    async (fields) => {
      if (!householdId) return;
      const { error } = await supabase.from('goals').insert({ household_id: householdId, ...fields });
      if (!error) fetchGoals();
    },
    [householdId, fetchGoals],
  );

  const updateGoal = useCallback(
    async (id, patch) => {
      // Optimistic; realtime + refetch reconcile the truth.
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      const { error } = await supabase.from('goals').update(patch).eq('id', id);
      if (error) fetchGoals();
    },
    [fetchGoals],
  );

  const removeGoal = useCallback(
    async (id) => {
      setRows((rs) => rs.filter((r) => r.id !== id));
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if (error) fetchGoals();
    },
    [fetchGoals],
  );

  const markDone = useCallback((id) => updateGoal(id, { status: 'done', done_on: dayStr() }), [updateGoal]);
  const reopen = useCallback((id) => updateGoal(id, { status: 'active', done_on: null }), [updateGoal]);

  return { active, done, addGoal, updateGoal, removeGoal, markDone, reopen };
}

// Goals without a target date sort after every dated one (finite sentinel —
// Infinity - Infinity is NaN, which would make the comparator unstable).
const NO_TARGET = Number.MAX_SAFE_INTEGER;

function shapeGoal(r, nameById) {
  const target = r.target_date ? parseDay(r.target_date) : null;
  const daysLeft = target ? daysUntil(target) : null;
  return {
    id: r.id,
    title: r.title,
    why: r.why ?? undefined,
    owner: nameById[r.owner_member_id] ?? null, // null = family goal
    status: r.status,
    target: target ? { label: monthDay(target), daysLeft } : null,
    doneOn: r.done_on ? monthDay(parseDay(r.done_on)) : null,
    sortKey: daysLeft ?? NO_TARGET,
    raw: r,
  };
}

// Tone for a goal's target chip: overdue red, closing-in amber, plenty green.
export function targetTone(daysLeft) {
  if (daysLeft < 0) return 'red';
  if (daysLeft <= 30) return 'amber';
  return 'green';
}
