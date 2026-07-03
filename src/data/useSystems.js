import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useHousehold } from '../household/HouseholdProvider';
import { parseDay, daysUntil, monthDay, dayStr } from '../dates';

// Supabase-backed store for recurring home upkeep (HVAC filter, gutters, ...).
// Same shape as the other data hooks: household-scoped rows, realtime sync.
// Each row's tone/status/detail is derived from last_done_on + interval_days,
// and the list comes back sorted most-urgent-first.
export function useSystems() {
  const { household } = useHousehold();
  const householdId = household?.id ?? null;
  const [rows, setRows] = useState([]);

  const fetchSystems = useCallback(async () => {
    if (!householdId) {
      setRows([]);
      return;
    }
    const { data } = await supabase
      .from('home_systems')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true });
    setRows(data ?? []);
  }, [householdId]);

  useEffect(() => {
    fetchSystems();
  }, [fetchSystems]);

  // Live sync: any insert/update/delete in this household refreshes the list.
  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`home_systems:${householdId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'home_systems', filter: `household_id=eq.${householdId}` },
        () => fetchSystems(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, fetchSystems]);

  const systems = useMemo(
    () =>
      rows
        .map((r) => ({ id: r.id, name: r.name, ...systemStatus(r), raw: r }))
        .sort((a, b) => a.daysLeft - b.daysLeft),
    [rows],
  );

  const addSystem = useCallback(
    async (fields) => {
      if (!householdId) return;
      const { error } = await supabase
        .from('home_systems')
        .insert({ household_id: householdId, ...fields });
      if (!error) fetchSystems();
    },
    [householdId, fetchSystems],
  );

  const updateSystem = useCallback(
    async (id, patch) => {
      // Optimistic; realtime + refetch reconcile the truth.
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      const { error } = await supabase.from('home_systems').update(patch).eq('id', id);
      if (error) fetchSystems();
    },
    [fetchSystems],
  );

  const removeSystem = useCallback(
    async (id) => {
      setRows((rs) => rs.filter((r) => r.id !== id));
      const { error } = await supabase.from('home_systems').delete().eq('id', id);
      if (error) fetchSystems();
    },
    [fetchSystems],
  );

  // "I just did this" — restarts the countdown from today.
  const markDone = useCallback((id) => updateSystem(id, { last_done_on: dayStr() }), [updateSystem]);

  return { systems, addSystem, updateSystem, removeSystem, markDone };
}

// Sort sentinel for items with no last-done date: a finite "very far away"
// (Infinity - Infinity is NaN, which would make the sort comparator unstable).
export const UNTRACKED = Number.MAX_SAFE_INTEGER;

// Derive the traffic-light state a row renders with. Never-logged items sit at
// the end of the list with an amber "log it" nudge.
function systemStatus(r) {
  const cadence = intervalLabel(r.interval_days);
  if (!r.last_done_on) {
    return {
      tone: 'amber',
      status: 'Not logged',
      detail: r.note || `${cadence} · mark it done once to start tracking`,
      daysLeft: UNTRACKED,
    };
  }
  const due = parseDay(r.last_done_on);
  due.setDate(due.getDate() + r.interval_days);
  const daysLeft = daysUntil(due);
  const detail = r.note || `${cadence} · last done ${monthDay(parseDay(r.last_done_on))}`;

  if (daysLeft < 0) return { tone: 'red', status: `Overdue ${-daysLeft}d`, detail, daysLeft };
  if (daysLeft === 0) return { tone: 'red', status: 'Due today', detail, daysLeft };
  if (daysLeft <= 21) {
    const status = daysLeft <= 10 ? `In ${daysLeft}d` : `In ${Math.round(daysLeft / 7)} wks`;
    return { tone: 'amber', status, detail, daysLeft };
  }
  const status = daysLeft > 60 ? 'Good' : `In ${Math.round(daysLeft / 7)} wks`;
  return { tone: 'green', status, detail, daysLeft };
}

export function intervalLabel(days) {
  const named = INTERVAL_PRESETS.find(([d]) => d === days);
  if (named) return named[1];
  return `Every ${days} days`;
}

// Cadence chips for the system modal.
export const INTERVAL_PRESETS = [
  [7, 'Weekly'],
  [30, 'Monthly'],
  [90, 'Every 3 months'],
  [180, 'Every 6 months'],
  [365, 'Yearly'],
];
