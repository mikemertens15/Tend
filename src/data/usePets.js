import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useHousehold } from '../household/HouseholdProvider';
import { dayStr, parseDay, daysUntil, monthDay } from '../dates';
import { dueStatus, intervalLabel } from './cadence';

// Three tables behind one hook, because the pets view needs all three at once
// and they're small: the animals, their recurring care, and a log of what
// actually happened.
//
// The question this section exists to answer is "has anyone fed the cats?",
// so today's meals are the thing that gets derived most carefully. Everything
// else — litter, vet visits, weights — hangs off the same log.

// Meal slots by how many times a day the pet eats. Keyed by count so changing
// a pet from two meals to three doesn't orphan the mornings already logged.
const MEAL_SLOTS = {
  1: [['day', 'Fed']],
  2: [
    ['am', 'Morning'],
    ['pm', 'Evening'],
  ],
  3: [
    ['am', 'Morning'],
    ['mid', 'Midday'],
    ['pm', 'Evening'],
  ],
  4: [
    ['am', 'Morning'],
    ['mid', 'Midday'],
    ['pm', 'Evening'],
    ['night', 'Night'],
  ],
};

export const LOG_KINDS = {
  fed: { label: 'Meal', icon: '🍽️' },
  vet: { label: 'Vet', icon: '🩺' },
  med: { label: 'Medication', icon: '💊' },
  weight: { label: 'Weight', icon: '⚖️' },
  groom: { label: 'Grooming', icon: '🪮' },
  note: { label: 'Note', icon: '📝' },
};

// Suggested care jobs offered as one-tap chips on an empty pet section.
export const CARE_SUGGESTIONS = [
  { name: 'Scoop the litter box', interval_days: 1 },
  { name: 'Change the litter', interval_days: 14 },
  { name: 'Wash the food bowls', interval_days: 3 },
  { name: 'Flea & tick treatment', interval_days: 30 },
  { name: 'Trim claws', interval_days: 21 },
  { name: 'Annual vet checkup', interval_days: 365 },
];

// How far back the log is fetched. Enough for a weight trend and a year of vet
// visits without pulling the whole history onto a phone.
const LOG_WINDOW_DAYS = 400;

// `enabled: false` parks the hook — see the note in useSystems. The dashboard
// passes it, because Home loads pets for its own card rather than waiting to be
// routed at the Pets section.
export function usePets({ enabled = true } = {}) {
  const { household, members } = useHousehold();
  const householdId = enabled ? (household?.id ?? null) : null;
  const [pets, setPets] = useState([]);
  const [care, setCare] = useState([]);
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);

  const nameById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m.name])), [members]);
  const today = dayStr();

  const fetchAll = useCallback(async () => {
    if (!householdId) {
      setPets([]);
      setCare([]);
      setLog([]);
      setLoading(false);
      return;
    }
    const since = new Date();
    since.setDate(since.getDate() - LOG_WINDOW_DAYS);

    const [p, c, l] = await Promise.all([
      supabase.from('pets').select('*').eq('household_id', householdId).order('sort_order').order('created_at'),
      supabase.from('pet_care').select('*').eq('household_id', householdId).order('created_at'),
      supabase
        .from('pet_log')
        .select('*')
        .eq('household_id', householdId)
        .gte('on_date', dayStr(since))
        .order('on_date', { ascending: false })
        .order('created_at', { ascending: false }),
    ]);
    setPets(p.data ?? []);
    setCare(c.data ?? []);
    setLog(l.data ?? []);
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // One channel for the three tables — they're always shown together, so
  // there's no point subscribing to them separately.
  useEffect(() => {
    if (!householdId) return;
    const channel = supabase.channel(`pets:${householdId}`);
    for (const table of ['pets', 'pet_care', 'pet_log']) {
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

  const roster = useMemo(
    () =>
      pets.map((p) => {
        const slots = MEAL_SLOTS[p.meals_per_day] ?? MEAL_SLOTS[2];
        const meals = slots.map(([slot, label]) => {
          const entry = log.find(
            (e) => e.kind === 'fed' && e.pet_id === p.id && e.on_date === today && e.slot === slot,
          );
          return { slot, label, fed: Boolean(entry), by: entry ? nameById[entry.member_id] : null, entryId: entry?.id };
        });
        const weight = log.find((e) => e.kind === 'weight' && e.pet_id === p.id && e.value != null);

        return {
          id: p.id,
          name: p.name,
          species: p.species,
          emoji: p.emoji,
          breed: p.breed,
          birthday: p.birthday,
          age: ageLabel(p.birthday),
          food: p.food,
          vetName: p.vet_name,
          vetPhone: p.vet_phone,
          microchip: p.microchip,
          note: p.note,
          mealsPerDay: p.meals_per_day,
          meals,
          allFed: meals.every((m) => m.fed),
          weight: weight ? { value: Number(weight.value), on: monthDay(parseDay(weight.on_date)) } : null,
          raw: p,
        };
      }),
    [pets, log, nameById, today],
  );

  // Care jobs sorted most-urgent-first, exactly like home systems.
  const careJobs = useMemo(
    () =>
      care
        .map((r) => {
          const s = dueStatus(r.last_done_on, r.interval_days);
          const petName = r.pet_id ? (pets.find((p) => p.id === r.pet_id)?.name ?? null) : null;
          const cadence = intervalLabel(r.interval_days);
          return {
            id: r.id,
            name: r.name,
            petId: r.pet_id,
            petName,
            tone: s.tone,
            status: s.status,
            daysLeft: s.daysLeft,
            detail:
              r.note ||
              (s.tracked ? `${cadence} · last done ${s.lastLabel}` : `${cadence} · mark it done once to start`),
            raw: r,
          };
        })
        .sort((a, b) => a.daysLeft - b.daysLeft),
    [care, pets],
  );

  // Appointments and doses dated today or later — the "don't forget" list.
  const upcoming = useMemo(
    () =>
      log
        .filter(isBooking)
        .map((e) => ({ ...decorate(e, pets, nameById), daysLeft: daysUntil(parseDay(e.on_date)) }))
        .sort((a, b) => a.daysLeft - b.daysLeft),
    [log, pets, nameById],
  );

  // Everything else that isn't a meal, newest first. Defined as "not upcoming"
  // rather than "in the past", so a weight taken this morning still lands
  // somewhere instead of falling between the two lists.
  const history = useMemo(
    () =>
      log.filter((e) => e.kind !== 'fed' && !isBooking(e)).map((e) => decorate(e, pets, nameById)),
    [log, pets, nameById],
  );

  const fedToday = roster.length > 0 && roster.every((p) => p.allFed);
  const mealsLeft = roster.reduce((n, p) => n + p.meals.filter((m) => !m.fed).length, 0);

  const addPet = useCallback(
    async (fields) => {
      if (!householdId) return;
      const { error } = await supabase.from('pets').insert({ household_id: householdId, ...fields });
      if (!error) fetchAll();
    },
    [householdId, fetchAll],
  );

  const updatePet = useCallback(
    async (id, patch) => {
      setPets((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      const { error } = await supabase.from('pets').update(patch).eq('id', id);
      if (error) fetchAll();
    },
    [fetchAll],
  );

  const removePet = useCallback(
    async (id) => {
      setPets((ps) => ps.filter((p) => p.id !== id));
      const { error } = await supabase.from('pets').delete().eq('id', id);
      if (error) fetchAll();
    },
    [fetchAll],
  );

  // Tap a meal to log it, tap again to undo — the same button both ways, since
  // "wait, that was yesterday's" needs to be one tap too.
  const toggleMeal = useCallback(
    async (petId, slot, entryId, memberId) => {
      if (!householdId) return;
      if (entryId) {
        setLog((ls) => ls.filter((e) => e.id !== entryId));
        const { error } = await supabase.from('pet_log').delete().eq('id', entryId);
        if (error) fetchAll();
        return;
      }
      await supabase.from('pet_log').insert({
        household_id: householdId,
        pet_id: petId,
        kind: 'fed',
        slot,
        on_date: dayStr(),
        member_id: memberId ?? null,
      });
      // Refetch either way: a unique index turns a double-tap from two phones
      // into a duplicate-key error rather than two breakfasts, and the refetch
      // is what shows the other person's tap.
      fetchAll();
    },
    [householdId, fetchAll],
  );

  const addLogEntry = useCallback(
    async (fields) => {
      if (!householdId) return;
      const { error } = await supabase.from('pet_log').insert({ household_id: householdId, ...fields });
      if (!error) fetchAll();
    },
    [householdId, fetchAll],
  );

  const removeLogEntry = useCallback(
    async (id) => {
      setLog((ls) => ls.filter((e) => e.id !== id));
      const { error } = await supabase.from('pet_log').delete().eq('id', id);
      if (error) fetchAll();
    },
    [fetchAll],
  );

  const addCare = useCallback(
    async (fields) => {
      if (!householdId) return;
      const { error } = await supabase.from('pet_care').insert({ household_id: householdId, ...fields });
      if (!error) fetchAll();
    },
    [householdId, fetchAll],
  );

  const updateCare = useCallback(
    async (id, patch) => {
      setCare((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
      const { error } = await supabase.from('pet_care').update(patch).eq('id', id);
      if (error) fetchAll();
    },
    [fetchAll],
  );

  const removeCare = useCallback(
    async (id) => {
      setCare((cs) => cs.filter((c) => c.id !== id));
      const { error } = await supabase.from('pet_care').delete().eq('id', id);
      if (error) fetchAll();
    },
    [fetchAll],
  );

  const markCareDone = useCallback((id) => updateCare(id, { last_done_on: dayStr() }), [updateCare]);

  return {
    pets: roster,
    care: careJobs,
    upcoming,
    history,
    loading,
    fedToday,
    mealsLeft,
    addPet,
    updatePet,
    removePet,
    toggleMeal,
    addLogEntry,
    removeLogEntry,
    addCare,
    updateCare,
    removeCare,
    markCareDone,
  };
}

// An appointment or dose still ahead of us. Only vet visits and medications
// can be booked — you don't schedule a weigh-in, you record one.
const isBooking = (e) =>
  (e.kind === 'vet' || e.kind === 'med') && daysUntil(parseDay(e.on_date)) >= 0;

function decorate(entry, pets, nameById) {
  return {
    id: entry.id,
    kind: entry.kind,
    petId: entry.pet_id,
    petName: entry.pet_id ? (pets.find((p) => p.id === entry.pet_id)?.name ?? null) : null,
    onDate: entry.on_date,
    dateLabel: monthDay(parseDay(entry.on_date)),
    by: nameById[entry.member_id] ?? null,
    value: entry.value == null ? null : Number(entry.value),
    note: entry.note,
  };
}

// "3 yrs" / "7 mos" — precise enough for a vet form, short enough for a chip.
function ageLabel(birthday) {
  if (!birthday) return null;
  const days = -daysUntil(parseDay(birthday));
  if (days < 0) return null;
  if (days < 60) return `${days} days`;
  const months = Math.floor(days / 30.44);
  if (months < 24) return `${months} mos`;
  return `${Math.floor(days / 365.25)} yrs`;
}
