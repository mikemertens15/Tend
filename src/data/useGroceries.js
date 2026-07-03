import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useHousehold } from '../household/HouseholdProvider';

// Supabase-backed shared shopping list. Household-scoped + realtime like the
// other hooks. Unchecked items come first (oldest first); checked ones sink
// to the bottom until "Clear checked" deletes them.
export function useGroceries() {
  const { household } = useHousehold();
  const householdId = household?.id ?? null;
  const [rows, setRows] = useState([]);

  const fetchItems = useCallback(async () => {
    if (!householdId) {
      setRows([]);
      return;
    }
    const { data } = await supabase
      .from('grocery_items')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true });
    setRows(data ?? []);
  }, [householdId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Live sync: any insert/update/delete in this household refreshes the list.
  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`grocery_items:${householdId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'grocery_items', filter: `household_id=eq.${householdId}` },
        () => fetchItems(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, fetchItems]);

  const items = useMemo(
    () =>
      [...rows]
        .sort((a, b) => Number(a.done) - Number(b.done))
        .map((r) => ({ id: r.id, title: r.title, qty: r.qty ?? null, done: r.done })),
    [rows],
  );

  const addItem = useCallback(
    async ({ title, qty }) => {
      if (!householdId || !(title || '').trim()) return;
      const { error } = await supabase
        .from('grocery_items')
        .insert({ household_id: householdId, title: title.trim(), qty: (qty || '').trim() || null });
      if (!error) fetchItems();
    },
    [householdId, fetchItems],
  );

  const toggle = useCallback(
    async (id) => {
      const current = rows.find((r) => r.id === id);
      if (!current) return;
      // Optimistic flip; realtime + refetch reconcile the truth.
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, done: !r.done } : r)));
      const { error } = await supabase.from('grocery_items').update({ done: !current.done }).eq('id', id);
      if (error) fetchItems();
    },
    [rows, fetchItems],
  );

  const removeItem = useCallback(
    async (id) => {
      setRows((rs) => rs.filter((r) => r.id !== id));
      const { error } = await supabase.from('grocery_items').delete().eq('id', id);
      if (error) fetchItems();
    },
    [fetchItems],
  );

  // Sweep everything checked — the "unload the cart" button.
  const clearDone = useCallback(async () => {
    if (!householdId) return;
    setRows((rs) => rs.filter((r) => !r.done));
    const { error } = await supabase
      .from('grocery_items')
      .delete()
      .eq('household_id', householdId)
      .eq('done', true);
    if (error) fetchItems();
  }, [householdId, fetchItems]);

  return { items, addItem, toggle, removeItem, clearDone };
}
