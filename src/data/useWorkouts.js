import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useHousehold } from '../household/HouseholdProvider';

// Supabase-backed activity log. Same household-scoped + realtime pattern as
// the other hooks; keeps the most recent 100 sessions, newest first.
export function useWorkouts() {
  const { household, members } = useHousehold();
  const householdId = household?.id ?? null;
  const [rows, setRows] = useState([]);

  const nameById = useMemo(() => {
    const m = {};
    for (const mem of members) m[mem.id] = mem.name;
    return m;
  }, [members]);

  const fetchWorkouts = useCallback(async () => {
    if (!householdId) {
      setRows([]);
      return;
    }
    const { data } = await supabase
      .from('workouts')
      .select('*')
      .eq('household_id', householdId)
      .order('done_on', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100);
    setRows(data ?? []);
  }, [householdId]);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  // Live sync: any insert/update/delete in this household refreshes the list.
  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`workouts:${householdId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workouts', filter: `household_id=eq.${householdId}` },
        () => fetchWorkouts(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, fetchWorkouts]);

  const workouts = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        who: nameById[r.member_id] ?? null,
        kind: r.kind,
        minutes: r.minutes ?? null,
        date: r.done_on,
        note: r.note ?? undefined,
      })),
    [rows, nameById],
  );

  const addWorkout = useCallback(
    async (fields) => {
      if (!householdId) return;
      const { error } = await supabase
        .from('workouts')
        .insert({ household_id: householdId, ...fields });
      if (!error) fetchWorkouts();
    },
    [householdId, fetchWorkouts],
  );

  const removeWorkout = useCallback(
    async (id) => {
      setRows((rs) => rs.filter((r) => r.id !== id));
      const { error } = await supabase.from('workouts').delete().eq('id', id);
      if (error) fetchWorkouts();
    },
    [fetchWorkouts],
  );

  return { workouts, addWorkout, removeWorkout };
}

// Activity kinds for the log modal and list rows.
export const WORKOUT_KINDS = [
  ['run', 'Run', '🏃'],
  ['walk', 'Walk', '🚶'],
  ['ride', 'Ride', '🚴'],
  ['lift', 'Lift', '🏋️'],
  ['yoga', 'Yoga', '🧘'],
  ['swim', 'Swim', '🏊'],
  ['sport', 'Sport', '⚽'],
  ['other', 'Other', '✨'],
];

export const KIND_META = Object.fromEntries(WORKOUT_KINDS.map(([key, label, emoji]) => [key, { label, emoji }]));
