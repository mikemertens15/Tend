import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useHousehold } from '../household/HouseholdProvider';
import { getWeek, dayStr } from '../dates';

// Supabase-backed store for the weekly meal plan. Fetches a four-week window
// (last week through two weeks out) so the planner can page between weeks
// without refetching, and the home card always has today covered. At most one
// row exists per household/day/slot — saves go through an upsert on that key,
// so editing a day replaces the meal instead of stacking duplicates.
export function useMeals() {
  const { household, members } = useHousehold();
  const householdId = household?.id ?? null;
  const [rows, setRows] = useState([]);

  const nameById = useMemo(() => {
    const m = {};
    for (const mem of members) m[mem.id] = mem.name;
    return m;
  }, [members]);

  // Computed once per mount, like the dashboard's week.
  const range = useMemo(() => {
    const { monday } = getWeek();
    const start = new Date(monday);
    start.setDate(start.getDate() - 7);
    const end = new Date(monday);
    end.setDate(end.getDate() + 20);
    return { start: dayStr(start), end: dayStr(end) };
  }, []);

  const fetchMeals = useCallback(async () => {
    if (!householdId) {
      setRows([]);
      return;
    }
    const { data } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('household_id', householdId)
      .gte('on_date', range.start)
      .lte('on_date', range.end)
      .order('on_date', { ascending: true });
    setRows(data ?? []);
  }, [householdId, range]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  // Live sync: any insert/update/delete in this household refreshes the list.
  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`meal_plans:${householdId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meal_plans', filter: `household_id=eq.${householdId}` },
        () => fetchMeals(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, fetchMeals]);

  // Keyed lookup the views use: mealsByKey['2026-07-03:dinner'] → meal.
  const mealsByKey = useMemo(() => {
    const m = {};
    for (const r of rows) {
      m[`${r.on_date}:${r.slot}`] = {
        id: r.id,
        date: r.on_date,
        slot: r.slot,
        title: r.title,
        note: r.note ?? undefined,
        cook: nameById[r.cook_member_id] ?? null,
        raw: r,
      };
    }
    return m;
  }, [rows, nameById]);

  // Insert-or-replace the meal for a given day + slot.
  const setMeal = useCallback(
    async ({ on_date, slot = 'dinner', title, note, cook_member_id }) => {
      if (!householdId) return;
      const { error } = await supabase
        .from('meal_plans')
        .upsert(
          { household_id: householdId, on_date, slot, title, note: note || null, cook_member_id },
          { onConflict: 'household_id,on_date,slot' },
        );
      if (!error) fetchMeals();
    },
    [householdId, fetchMeals],
  );

  const removeMeal = useCallback(
    async (id) => {
      setRows((rs) => rs.filter((r) => r.id !== id));
      const { error } = await supabase.from('meal_plans').delete().eq('id', id);
      if (error) fetchMeals();
    },
    [fetchMeals],
  );

  return { mealsByKey, setMeal, removeMeal };
}
