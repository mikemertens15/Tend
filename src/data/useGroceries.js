import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useHousehold } from '../household/HouseholdProvider';
import { dayStr, parseDay, monthDay, getWeek } from '../dates';

// The shopping list, plus the money side of it.
//
// The design choice worth knowing: checked-off items are *archived onto a
// trip*, never deleted. That single decision buys the budget history and the
// price book for free — "what does milk normally cost at Aldi" is just a query
// over past purchases (the grocery_price_book view), not a second store of
// prices that could drift out of sync with what you actually paid.

// Aisle order, roughly the order you walk a supermarket — so the list sorts
// itself into something you can shop top to bottom.
export const AISLES = [
  ['produce', 'Produce', '🥬'],
  ['bakery', 'Bakery', '🍞'],
  ['meat', 'Meat & seafood', '🥩'],
  ['dairy', 'Dairy & eggs', '🥚'],
  ['frozen', 'Frozen', '🧊'],
  ['pantry', 'Pantry', '🥫'],
  ['snacks', 'Snacks', '🍪'],
  ['drinks', 'Drinks', '🧃'],
  ['household', 'Household', '🧻'],
  ['personal', 'Personal care', '🧴'],
  ['pet', 'Pet', '🐾'],
  ['other', 'Other', '🛒'],
];

const AISLE_RANK = Object.fromEntries(AISLES.map(([key], i) => [key, i]));

// Quick-add chips so setting up your stores is three taps, not three forms.
// Just a starting list — anything typed in gets saved the same way.
export const COMMON_STORES = [
  'Kroger',
  'Meijer',
  'Aldi',
  'Costco',
  'Walmart',
  'Target',
  "Trader Joe's",
  'Whole Foods',
  'Publix',
  'Safeway',
  'Wegmans',
  'H-E-B',
  "Sam's Club",
  'Sprouts',
];

export const BUDGET_PERIODS = [
  ['week', 'a week'],
  ['month', 'a month'],
];

const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
const keyOf = (title) => (title || '').trim().toLowerCase();

export function useGroceries() {
  const { household, settings, saveSettings } = useHousehold();
  const householdId = household?.id ?? null;

  const [rows, setRows] = useState([]);
  const [stores, setStores] = useState([]);
  const [trips, setTrips] = useState([]);
  const [priceBook, setPriceBook] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!householdId) {
      setRows([]);
      setStores([]);
      setTrips([]);
      setPriceBook([]);
      setLoading(false);
      return;
    }
    const [items, st, tr, pb] = await Promise.all([
      // Only the live list: bought items stay in the table but belong to a trip.
      supabase
        .from('grocery_items')
        .select('*')
        .eq('household_id', householdId)
        .is('trip_id', null)
        .order('created_at', { ascending: true }),
      supabase.from('stores').select('*').eq('household_id', householdId).order('sort_order').order('created_at'),
      supabase
        .from('shopping_trips')
        .select('*')
        .eq('household_id', householdId)
        .order('on_date', { ascending: false })
        .limit(60),
      supabase.from('grocery_price_book').select('*').eq('household_id', householdId),
    ]);
    setRows(items.data ?? []);
    setStores(st.data ?? []);
    setTrips(tr.data ?? []);
    setPriceBook(pb.data ?? []);
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!householdId) return;
    const channel = supabase.channel(`groceries:${householdId}`);
    for (const table of ['grocery_items', 'stores', 'shopping_trips']) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `household_id=eq.${householdId}` },
        () => fetchAll(),
      );
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, fetchAll]);

  const storeName = useCallback((id) => stores.find((s) => s.id === id)?.name ?? null, [stores]);

  // Unchecked first in aisle order, checked sinking to the bottom.
  const items = useMemo(
    () =>
      [...rows]
        .map((r) => ({
          id: r.id,
          title: r.title,
          qty: r.qty ?? null,
          done: r.done,
          category: r.category ?? 'other',
          price: r.price == null ? null : Number(r.price),
          storeId: r.store_id,
          storeName: storeName(r.store_id),
        }))
        .sort(
          (a, b) =>
            Number(a.done) - Number(b.done) ||
            (AISLE_RANK[a.category] ?? 99) - (AISLE_RANK[b.category] ?? 99) ||
            a.title.localeCompare(b.title),
        ),
    [rows, storeName],
  );

  // What's in the basket right now. `unpriced` is what stops the running total
  // from quietly lying: a $0 item and an item you haven't priced look the same
  // in a sum, so they're counted separately and surfaced.
  const cart = useMemo(() => {
    const toBuy = items.filter((i) => !i.done);
    const checked = items.filter((i) => i.done);
    const sum = (list) => money(list.reduce((n, i) => n + (i.price ?? 0), 0));
    return {
      toBuy: toBuy.length,
      checkedCount: checked.length,
      total: sum(items),
      checkedTotal: sum(checked),
      unpriced: items.filter((i) => i.price == null).length,
    };
  }, [items]);

  const budget = useMemo(() => {
    const amount = Number(settings.groceryBudget) || 0;
    const period = settings.groceryBudgetPeriod === 'week' ? 'week' : 'month';
    const start = period === 'week' ? getWeek().monday : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const from = dayStr(start);

    const inPeriod = trips.filter((t) => t.on_date >= from);
    const spent = money(inPeriod.reduce((n, t) => n + Number(t.total), 0));
    // The live cart counts against the budget too — the number you want to see
    // in the aisle is what you'll have spent, not what you already spent.
    const projected = money(spent + cart.total);

    return {
      amount,
      period,
      set: amount > 0,
      spent,
      projected,
      remaining: money(amount - projected),
      pct: amount > 0 ? Math.min(100, Math.round((projected / amount) * 100)) : 0,
      over: amount > 0 && projected > amount,
      tripCount: inPeriod.length,
      periodLabel: period === 'week' ? 'this week' : 'this month',
      since: monthDay(start),
    };
  }, [settings, trips, cart.total]);

  const history = useMemo(
    () =>
      trips.map((t) => ({
        id: t.id,
        date: monthDay(parseDay(t.on_date)),
        onDate: t.on_date,
        total: Number(t.total),
        itemCount: t.item_count,
        store: storeName(t.store_id),
      })),
    [trips, storeName],
  );

  // What this item cost last time. Same store wins; failing that, anywhere —
  // an old price from the other supermarket still beats a blank box.
  const suggestPrice = useCallback(
    (title, storeId) => {
      const key = keyOf(title);
      if (!key) return null;
      const matches = priceBook.filter((p) => p.item_key === key);
      if (matches.length === 0) return null;
      const here = matches.find((p) => p.store_id === storeId);
      const pick = here ?? [...matches].sort((a, b) => (a.bought_on < b.bought_on ? 1 : -1))[0];
      return {
        price: Number(pick.price),
        category: pick.category,
        storeName: storeName(pick.store_id),
        sameStore: Boolean(here),
        on: monthDay(parseDay(pick.bought_on)),
      };
    },
    [priceBook, storeName],
  );

  const addItem = useCallback(
    async ({ title, qty, price, category, storeId }) => {
      if (!householdId || !(title || '').trim()) return;
      const trimmed = title.trim();
      // Fall back to what we know: last price paid, and the aisle it was in.
      const remembered = suggestPrice(trimmed, storeId ?? null);
      const { error } = await supabase.from('grocery_items').insert({
        household_id: householdId,
        title: trimmed,
        qty: (qty || '').trim() || null,
        price: price === '' || price == null ? (remembered?.price ?? null) : money(price),
        category: category || remembered?.category || 'other',
        store_id: storeId ?? null,
      });
      if (!error) fetchAll();
    },
    [householdId, fetchAll, suggestPrice],
  );

  const updateItem = useCallback(
    async (id, patch) => {
      const row = {};
      if ('title' in patch) row.title = patch.title.trim();
      if ('qty' in patch) row.qty = (patch.qty || '').trim() || null;
      if ('price' in patch) row.price = patch.price === '' || patch.price == null ? null : money(patch.price);
      if ('category' in patch) row.category = patch.category;
      if ('storeId' in patch) row.store_id = patch.storeId;
      if ('done' in patch) row.done = patch.done;

      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...row } : r)));
      const { error } = await supabase.from('grocery_items').update(row).eq('id', id);
      if (error) fetchAll();
    },
    [fetchAll],
  );

  const toggle = useCallback(
    async (id) => {
      const current = rows.find((r) => r.id === id);
      if (!current) return;
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, done: !r.done } : r)));
      const { error } = await supabase.from('grocery_items').update({ done: !current.done }).eq('id', id);
      if (error) fetchAll();
    },
    [rows, fetchAll],
  );

  const removeItem = useCallback(
    async (id) => {
      setRows((rs) => rs.filter((r) => r.id !== id));
      const { error } = await supabase.from('grocery_items').delete().eq('id', id);
      if (error) fetchAll();
    },
    [fetchAll],
  );

  // "Unload the cart": everything checked becomes one trip, with a total. This
  // is what feeds both the budget and the price book, so it's the one action
  // in here that's worth doing deliberately rather than as a side effect.
  const finishTrip = useCallback(
    async (storeId) => {
      if (!householdId) return null;
      const checked = rows.filter((r) => r.done);
      if (checked.length === 0) return null;

      const total = money(checked.reduce((n, r) => n + Number(r.price ?? 0), 0));
      const { data: trip, error } = await supabase
        .from('shopping_trips')
        .insert({
          household_id: householdId,
          store_id: storeId ?? null,
          on_date: dayStr(),
          total,
          item_count: checked.length,
        })
        .select()
        .single();
      if (error || !trip) return null;

      await supabase
        .from('grocery_items')
        .update({ trip_id: trip.id, bought_on: dayStr(), ...(storeId ? { store_id: storeId } : {}) })
        .in(
          'id',
          checked.map((r) => r.id),
        );
      fetchAll();
      return { total, count: checked.length };
    },
    [householdId, rows, fetchAll],
  );

  // Drop the checked items without recording a trip — for the times the list
  // got tidied rather than shopped.
  const clearDone = useCallback(async () => {
    if (!householdId) return;
    setRows((rs) => rs.filter((r) => !r.done));
    const { error } = await supabase
      .from('grocery_items')
      .delete()
      .eq('household_id', householdId)
      .is('trip_id', null)
      .eq('done', true);
    if (error) fetchAll();
  }, [householdId, fetchAll]);

  const addStore = useCallback(
    async (name) => {
      const trimmed = (name || '').trim();
      if (!householdId || !trimmed) return;
      if (stores.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) return;
      const { error } = await supabase
        .from('stores')
        .insert({ household_id: householdId, name: trimmed, sort_order: stores.length });
      if (!error) fetchAll();
    },
    [householdId, stores, fetchAll],
  );

  const removeStore = useCallback(
    async (id) => {
      setStores((ss) => ss.filter((s) => s.id !== id));
      const { error } = await supabase.from('stores').delete().eq('id', id);
      if (error) fetchAll();
    },
    [fetchAll],
  );

  const setBudget = useCallback(
    (amount, period) => saveSettings({ groceryBudget: money(amount), groceryBudgetPeriod: period }),
    [saveSettings],
  );

  return {
    items,
    stores,
    history,
    cart,
    budget,
    loading,
    addItem,
    updateItem,
    toggle,
    removeItem,
    clearDone,
    finishTrip,
    addStore,
    removeStore,
    setBudget,
    suggestPrice,
  };
}
