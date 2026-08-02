import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useHousehold } from '../household/HouseholdProvider';
import { detailKeys } from './collections';

// One store for every collection-shaped hobby. Pass the domains a view cares
// about — useCollection(['show', 'movie']) — and it fetches, subscribes and
// writes just those. Because each view calls this itself, only the mounted
// view holds a realtime channel, rather than the app opening one per domain on
// every page.
//
// Columns shared by all domains live on the row; anything domain-specific goes
// into `details` and is flattened onto the item so views can read `item.author`
// or `item.platform` directly.
const COLUMNS = [
  'title',
  'status',
  'rating',
  'note',
  'progress_current',
  'progress_total',
  'started_on',
  'finished_on',
];

export function useCollection(domains) {
  const { household, members } = useHousehold();
  const householdId = household?.id ?? null;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // A new array literal every render would restart the fetch and the realtime
  // subscription on each one; the joined key keeps the identity stable.
  const domainKey = domains.join(',');
  const domainList = useMemo(() => domainKey.split(','), [domainKey]);

  const nameById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m.name])), [members]);
  const idByName = useMemo(() => Object.fromEntries(members.map((m) => [m.name, m.id])), [members]);

  const fetchItems = useCallback(async () => {
    if (!householdId) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('collection_items')
      .select('*')
      .eq('household_id', householdId)
      .in('domain', domainList)
      .order('created_at', { ascending: true });
    setRows(data ?? []);
    setLoading(false);
  }, [householdId, domainList]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Live sync across devices. The filter can only match one column, so the
  // domain is narrowed in the refetch rather than in the subscription.
  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`collection:${householdId}:${domainKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collection_items',
          filter: `household_id=eq.${householdId}`,
        },
        () => fetchItems(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, domainKey, fetchItems]);

  const items = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        domain: r.domain,
        title: r.title,
        status: r.status,
        owner: nameById[r.owner_member_id] ?? null,
        rating: r.rating ?? undefined,
        note: r.note ?? undefined,
        progressCurrent: r.progress_current ?? undefined,
        progressTotal: r.progress_total ?? undefined,
        ...(r.details ?? {}),
      })),
    [rows, nameById],
  );

  // Split a flat patch from the UI into real columns and `details` keys.
  function toRow(domain, patch) {
    const row = {};
    const details = {};
    for (const [k, v] of Object.entries(patch)) {
      if (k === 'owner') row.owner_member_id = idByName[v] ?? null;
      else if (k === 'progressCurrent') row.progress_current = v === '' ? null : v;
      else if (k === 'progressTotal') row.progress_total = v === '' ? null : v;
      else if (COLUMNS.includes(k)) row[k] = v;
      else if (detailKeys(domain).includes(k)) details[k] = v || undefined;
    }
    return { row, details };
  }

  const addItem = useCallback(
    async ({ domain, ...patch }) => {
      if (!householdId) return;
      const { row, details } = toRow(domain, patch);
      const { error } = await supabase.from('collection_items').insert({
        household_id: householdId,
        domain,
        status: 'backlog',
        ...row,
        title: (row.title || '').trim() || 'Untitled',
        details,
      });
      if (!error) fetchItems();
    },
    // toRow closes over idByName, which is derived from members.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [householdId, idByName, fetchItems],
  );

  const updateItem = useCallback(
    async (id, patch) => {
      const current = rows.find((r) => r.id === id);
      if (!current) return;
      const { row, details } = toRow(current.domain, patch);
      // `details` is replaced wholesale, so merge onto what's already stored.
      const next = Object.keys(details).length
        ? { ...row, details: { ...(current.details ?? {}), ...details } }
        : row;

      // Optimistic; realtime and the refetch reconcile the truth.
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...next } : r)));
      const { error } = await supabase.from('collection_items').update(next).eq('id', id);
      if (error) fetchItems();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, idByName, fetchItems],
  );

  const removeItem = useCallback(
    async (id) => {
      setRows((rs) => rs.filter((r) => r.id !== id));
      const { error } = await supabase.from('collection_items').delete().eq('id', id);
      if (error) fetchItems();
    },
    [fetchItems],
  );

  return { items, loading, addItem, updateItem, removeItem };
}
