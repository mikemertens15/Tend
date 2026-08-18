import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useHousehold } from '../household/HouseholdProvider';
import { DEFAULT_CALENDAR_COLOR } from './calendars';

// The household's calendars. Four are seeded when a household is created
// (Family, Work, School, Personal) so nobody's first calendar screen is an
// empty state with a button on it; everything after that is renaming,
// recolouring and adding.
//
// `default_visibility` is the column that does the quiet work: an event added
// to School or Personal starts private to whoever it belongs to, and one added
// to Family starts visible to the house. See calendars.js.

export function useCalendars({ enabled = true } = {}) {
  const { household } = useHousehold();
  const householdId = enabled ? (household?.id ?? null) : null;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCalendars = useCallback(async () => {
    if (!householdId) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('calendars')
      .select('*')
      .eq('household_id', householdId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    setRows(data ?? []);
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`calendars:${householdId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendars', filter: `household_id=eq.${householdId}` },
        () => fetchCalendars(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, fetchCalendars]);

  const byId = useMemo(() => Object.fromEntries(rows.map((c) => [c.id, c])), [rows]);

  const addCalendar = useCallback(
    async (fields) => {
      if (!householdId) return null;
      const { data, error } = await supabase
        .from('calendars')
        .insert({
          household_id: householdId,
          color: DEFAULT_CALENDAR_COLOR,
          sort_order: rows.length,
          ...fields,
        })
        .select()
        .single();
      if (error) return null;
      fetchCalendars();
      return data;
    },
    [householdId, rows.length, fetchCalendars],
  );

  const updateCalendar = useCallback(
    async (id, patch) => {
      setRows((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
      const { error } = await supabase.from('calendars').update(patch).eq('id', id);
      if (error) fetchCalendars();
    },
    [fetchCalendars],
  );

  // Deleting a calendar doesn't delete what was on it — the foreign key is ON
  // DELETE SET NULL, so those events survive with no calendar and are drawn in
  // the accent colour. Losing a birthday because you tidied up your colours
  // would be the wrong trade.
  const removeCalendar = useCallback(
    async (id) => {
      setRows((cs) => cs.filter((c) => c.id !== id));
      const { error } = await supabase.from('calendars').delete().eq('id', id);
      if (error) fetchCalendars();
    },
    [fetchCalendars],
  );

  return { calendars: rows, byId, loading, addCalendar, updateCalendar, removeCalendar };
}
