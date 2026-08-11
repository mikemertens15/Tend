import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useHousehold } from '../household/HouseholdProvider';
import { dayStr } from '../dates';
import { dueStatus, intervalLabel } from './cadence';

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

// The countdown itself lives in cadence.js (pet care runs on the same clock);
// all this adds is the subtitle line, which a note can override.
function systemStatus(r) {
  const s = dueStatus(r.last_done_on, r.interval_days);
  const cadence = intervalLabel(r.interval_days);
  const detail =
    r.note ||
    (s.tracked ? `${cadence} · last done ${s.lastLabel}` : `${cadence} · mark it done once to start tracking`);
  return { tone: s.tone, status: s.status, detail, daysLeft: s.daysLeft };
}
