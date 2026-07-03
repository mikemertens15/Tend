import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useHousehold } from '../household/HouseholdProvider';
import { parseDay, monthDay, monthYear } from '../dates';

// Supabase-backed store for the household's cars, modeled on useTasks/useMedia:
// rows are scoped to the current household (RLS) and a realtime subscription
// keeps them in sync. Oil-change progress and the little date chips are derived
// here from the raw columns so the views stay purely presentational.
export function useVehicles() {
  const { household, members } = useHousehold();
  const householdId = household?.id ?? null;
  const [rows, setRows] = useState([]);

  const nameById = useMemo(() => {
    const m = {};
    for (const mem of members) m[mem.id] = mem.name;
    return m;
  }, [members]);

  const fetchVehicles = useCallback(async () => {
    if (!householdId) {
      setRows([]);
      return;
    }
    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true });
    setRows(data ?? []);
  }, [householdId]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // Live sync: any insert/update/delete in this household refreshes the list.
  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`vehicles:${householdId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicles', filter: `household_id=eq.${householdId}` },
        () => fetchVehicles(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, fetchVehicles]);

  const vehicles = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        miles: r.miles,
        milesLabel: `${r.miles.toLocaleString()} mi`,
        driver: nameById[r.driver_member_id] ?? null,
        oil: oilStatus(r),
        reg: r.registration_due ? monthDay(parseDay(r.registration_due)) : null,
        ins: r.insurance_renews ? monthDay(parseDay(r.insurance_renews)) : null,
        tires: r.tires_rotated_on ? monthYear(parseDay(r.tires_rotated_on)) : null,
        service: r.last_service_on ? monthYear(parseDay(r.last_service_on)) : null,
        raw: r, // the edit modal works off the raw row
      })),
    [rows, nameById],
  );

  const addVehicle = useCallback(
    async (fields) => {
      if (!householdId) return;
      const { error } = await supabase
        .from('vehicles')
        .insert({ household_id: householdId, ...fields });
      if (!error) fetchVehicles();
    },
    [householdId, fetchVehicles],
  );

  const updateVehicle = useCallback(
    async (id, patch) => {
      // Optimistic; realtime + refetch reconcile the truth.
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      const { error } = await supabase.from('vehicles').update(patch).eq('id', id);
      if (error) fetchVehicles();
    },
    [fetchVehicles],
  );

  const removeVehicle = useCallback(
    async (id) => {
      setRows((rs) => rs.filter((r) => r.id !== id));
      const { error } = await supabase.from('vehicles').delete().eq('id', id);
      if (error) fetchVehicles();
    },
    [fetchVehicles],
  );

  return { vehicles, addVehicle, updateVehicle, removeVehicle };
}

// How far along the oil-change interval this car is. `tracked` is false until
// the owner records a due mileage; `urgent` flips inside the last 500 miles.
function oilStatus(r) {
  if (r.oil_due_miles == null) {
    return { tracked: false, pct: 0, left: null, label: 'Not tracked', urgent: false };
  }
  const left = r.oil_due_miles - r.miles;
  const interval = r.oil_interval_miles || 5000;
  const pct = Math.min(100, Math.max(0, Math.round(((interval - left) / interval) * 100)));
  return {
    tracked: true,
    pct,
    left,
    label: left <= 0 ? 'Overdue' : `~${left.toLocaleString()} mi`,
    urgent: left <= 500,
  };
}

// Mileage presets for the oil-change interval chips in the vehicle modal.
export const OIL_INTERVALS = [3000, 5000, 7500, 10000];
