import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useHousehold } from '../household/HouseholdProvider';

// The reference sheet: filter sizes, paint colours, model numbers, the wifi
// password. Deliberately dumb — a label, a value, and enough grouping to find
// it while standing in an aisle. No schema per category, because the next
// thing worth writing down is always one you didn't anticipate.

export const FACT_CATEGORIES = [
  ['filters', 'Filters & sizes', '🔲', 'Furnace, fridge, humidifier — the numbers you re-buy'],
  ['paint', 'Paint & finishes', '🎨', 'Colour, brand, sheen, which room'],
  ['appliances', 'Appliances', '🧺', 'Model and serial numbers for warranty calls'],
  ['network', 'Network & accounts', '📶', 'Wifi, thermostat, whatever needs a login'],
  ['utilities', 'Utilities & services', '🔧', 'Account numbers, the plumber who actually turned up'],
  ['measurements', 'Measurements', '📏', 'Room sizes, window dimensions, ceiling height'],
  ['other', 'Other', '📋', 'Everything else worth not forgetting'],
];

// Starter suggestions for an empty section — the things people most reliably
// wish they'd written down.
export const FACT_SUGGESTIONS = [
  { category: 'filters', label: 'Furnace filter', value: '', detail: 'e.g. 20x25x1 MERV 11' },
  { category: 'filters', label: 'Fridge water filter', value: '', detail: 'Model number' },
  { category: 'paint', label: 'Living room paint', value: '', detail: 'Colour, brand, sheen' },
  { category: 'network', label: 'Wifi password', value: '', detail: '', secret: true },
  { category: 'measurements', label: 'Ceiling height', value: '', detail: '' },
];

export function useHouseFacts() {
  const { household } = useHousehold();
  const householdId = household?.id ?? null;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFacts = useCallback(async () => {
    if (!householdId) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('house_facts')
      .select('*')
      .eq('household_id', householdId)
      .order('sort_order')
      .order('created_at');
    setRows(data ?? []);
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    fetchFacts();
  }, [fetchFacts]);

  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`house_facts:${householdId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'house_facts', filter: `household_id=eq.${householdId}` },
        () => fetchFacts(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, fetchFacts]);

  // Grouped in the order the categories are declared, empty groups dropped.
  const groups = useMemo(
    () =>
      FACT_CATEGORIES.map(([key, label, icon, blurb]) => ({
        key,
        label,
        icon,
        blurb,
        facts: rows.filter((r) => (r.category ?? 'other') === key),
      })).filter((g) => g.facts.length > 0),
    [rows],
  );

  const addFact = useCallback(
    async (fields) => {
      if (!householdId) return;
      const { error } = await supabase
        .from('house_facts')
        .insert({ household_id: householdId, sort_order: rows.length, ...fields });
      if (!error) fetchFacts();
    },
    [householdId, rows.length, fetchFacts],
  );

  const updateFact = useCallback(
    async (id, patch) => {
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      const { error } = await supabase.from('house_facts').update(patch).eq('id', id);
      if (error) fetchFacts();
    },
    [fetchFacts],
  );

  const removeFact = useCallback(
    async (id) => {
      setRows((rs) => rs.filter((r) => r.id !== id));
      const { error } = await supabase.from('house_facts').delete().eq('id', id);
      if (error) fetchFacts();
    },
    [fetchFacts],
  );

  return { facts: rows, groups, loading, addFact, updateFact, removeFact };
}
