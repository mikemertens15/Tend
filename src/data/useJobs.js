import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useHousehold } from '../household/HouseholdProvider';
import { DEFAULT_CALENDAR_COLOR } from './calendars';

// A job is one employer's rules: the rate, when their week starts, what
// overtime they pay, how long the unpaid break is, and how often they pay you.
//
// It's a table rather than a household setting because two people in a house
// rarely work the same place, one person can hold two jobs, and none of that
// fits in a single number keyed by member — which is what it used to be. The
// old `settings.rates` was carried across by a migration, so nobody retyped a
// rate to get here.

export function useJobs({ enabled = true } = {}) {
  const { household, members, currentMember } = useHousehold();
  const householdId = enabled ? (household?.id ?? null) : null;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    if (!householdId) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('jobs')
      .select('*')
      .eq('household_id', householdId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    setRows(data ?? []);
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`jobs:${householdId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs', filter: `household_id=eq.${householdId}` },
        () => fetchJobs(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, fetchJobs]);

  const jobById = useMemo(() => Object.fromEntries(rows.map((j) => [j.id, j])), [rows]);
  const active = useMemo(() => rows.filter((j) => j.active), [rows]);

  const jobsFor = useCallback((memberId) => active.filter((j) => j.member_id === memberId), [active]);

  // The job whose pay cycle the Earned view leads with. Someone with two jobs
  // has to be shown one period, and their first one is a better guess than the
  // calendar month it used to use.
  const primaryJob = useMemo(
    () => active.find((j) => j.member_id === currentMember?.id) ?? active[0] ?? null,
    [active, currentMember],
  );

  const nameById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m.name])), [members]);
  const labelFor = useCallback(
    (jobId) => {
      const job = jobById[jobId];
      if (!job) return null;
      const who = nameById[job.member_id];
      return who ? `${job.name} · ${who}` : job.name;
    },
    [jobById, nameById],
  );

  const addJob = useCallback(
    async (fields) => {
      if (!householdId) return null;
      const { data, error } = await supabase
        .from('jobs')
        .insert({
          household_id: householdId,
          color: DEFAULT_CALENDAR_COLOR,
          sort_order: rows.length,
          ...fields,
        })
        .select()
        .single();
      if (error) return null;
      fetchJobs();
      return data;
    },
    [householdId, rows.length, fetchJobs],
  );

  const updateJob = useCallback(
    async (id, patch) => {
      setRows((js) => js.map((j) => (j.id === id ? { ...j, ...patch } : j)));
      const { error } = await supabase.from('jobs').update(patch).eq('id', id);
      if (error) fetchJobs();
    },
    [fetchJobs],
  );

  // Leaving a job shouldn't delete the year you worked there. Marking it
  // inactive keeps every shift and every total intact and just stops it being
  // offered on new ones; `removeJob` is there for a job entered by mistake.
  const retireJob = useCallback((id) => updateJob(id, { active: false }), [updateJob]);

  const removeJob = useCallback(
    async (id) => {
      setRows((js) => js.filter((j) => j.id !== id));
      const { error } = await supabase.from('jobs').delete().eq('id', id);
      if (error) fetchJobs();
    },
    [fetchJobs],
  );

  return {
    jobs: rows,
    activeJobs: active,
    jobById,
    jobsFor,
    primaryJob,
    labelFor,
    loading,
    addJob,
    updateJob,
    retireJob,
    removeJob,
  };
}
