import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import { AVATAR_PALETTE } from '../theme';

// Loads the signed-in user's household + member roster and exposes them in the
// shapes the existing views already expect:
//   - `peopleMap` : { name: { initial, bg, color } }  (was theme.people)
//   - `order`     : [name, …] in display order        (was theme.order)
//   - `currentMember` : the member row tied to this login (was theme.currentUser)
const HouseholdContext = createContext(null);

export function useHousehold() {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error('useHousehold must be used inside <HouseholdProvider>');
  return ctx;
}

export function HouseholdProvider({ children }) {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);

  const load = useCallback(async () => {
    if (!userId) {
      setHousehold(null);
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    // RLS only returns households this user belongs to; take the first.
    const { data: households } = await supabase
      .from('households')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1);
    const h = households?.[0] ?? null;
    setHousehold(h);

    if (h) {
      const { data: mems } = await supabase
        .from('household_members')
        .select('*')
        .eq('household_id', h.id)
        .order('sort_order', { ascending: true });
      setMembers(mems ?? []);
    } else {
      setMembers([]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const createHousehold = useCallback(
    async (householdName, memberName) => {
      const { data, error } = await supabase.rpc('create_household', {
        p_household_name: householdName,
        p_member_name: memberName,
      });
      if (error) throw error;
      await load();
      return data;
    },
    [load],
  );

  const joinHousehold = useCallback(
    async (code, memberName) => {
      const { data, error } = await supabase.rpc('join_household', {
        p_code: code,
        p_member_name: memberName,
      });
      if (error) throw error;
      await load();
      return data;
    },
    [load],
  );

  // Add a person who gets assigned chores but doesn't need their own login.
  const addMember = useCallback(
    async (name) => {
      const trimmed = (name || '').trim();
      if (!household || !trimmed) return;
      const c = AVATAR_PALETTE[members.length % AVATAR_PALETTE.length];
      const { error } = await supabase.from('household_members').insert({
        household_id: household.id,
        name: trimmed,
        avatar_bg: c.bg,
        avatar_color: c.color,
        initial: trimmed[0].toUpperCase(),
        sort_order: members.length,
      });
      if (error) throw error;
      await load();
    },
    [household, members, load],
  );

  // Per-household preferences (the grocery budget, so far). Stored as one
  // jsonb column so a new setting is a key, not a migration.
  const settings = useMemo(() => household?.settings ?? {}, [household]);

  const saveSettings = useCallback(
    async (patch) => {
      if (!household) return;
      const next = { ...(household.settings ?? {}), ...patch };
      setHousehold((h) => (h ? { ...h, settings: next } : h));
      const { error } = await supabase.from('households').update({ settings: next }).eq('id', household.id);
      if (error) load();
    },
    [household, load],
  );

  const peopleMap = useMemo(() => {
    const m = {};
    for (const mem of members) {
      m[mem.name] = { initial: mem.initial, bg: mem.avatar_bg, color: mem.avatar_color };
    }
    return m;
  }, [members]);

  const order = useMemo(() => members.map((m) => m.name), [members]);

  const currentMember = useMemo(
    () => members.find((m) => m.user_id === userId) ?? null,
    [members, userId],
  );

  const value = {
    loading,
    household,
    members,
    settings,
    saveSettings,
    peopleMap,
    order,
    currentMember,
    createHousehold,
    joinHousehold,
    addMember,
    refresh: load,
  };

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}
