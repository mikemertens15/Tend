import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useHousehold } from '../household/HouseholdProvider';

// Two hooks either side of the same token, like the sitter link — but a widget
// token is one *person's* rather than the household's, because the point of it
// is to show your day, including the events only you can see.
//
// The owner's side can only ever see its own rows: the RLS policy is keyed on
// the member, not the household, so another member listing widget_tokens gets
// nothing back. Anything else would hand them a URL that reads your private
// calendar.

export function useWidgetTokens() {
  const { household, currentMember } = useHousehold();
  const householdId = household?.id ?? null;
  const memberId = currentMember?.id ?? null;
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTokens = useCallback(async () => {
    if (!householdId || !memberId) {
      setTokens([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('widget_tokens')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });
    setTokens(data ?? []);
    setLoading(false);
  }, [householdId, memberId]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const createToken = useCallback(
    async (label) => {
      if (!householdId || !memberId) return null;
      // The token itself comes from the database default, so it never depends
      // on the browser's randomness.
      const { data, error } = await supabase
        .from('widget_tokens')
        .insert({ household_id: householdId, member_id: memberId, label: label?.trim() || null })
        .select()
        .single();
      if (error) return null;
      fetchTokens();
      return data;
    },
    [householdId, memberId, fetchTokens],
  );

  const revokeToken = useCallback(
    async (id) => {
      setTokens((ts) => ts.map((t) => (t.id === id ? { ...t, revoked: true } : t)));
      const { error } = await supabase.from('widget_tokens').update({ revoked: true }).eq('id', id);
      if (error) fetchTokens();
    },
    [fetchTokens],
  );

  const deleteToken = useCallback(
    async (id) => {
      setTokens((ts) => ts.filter((t) => t.id !== id));
      const { error } = await supabase.from('widget_tokens').delete().eq('id', id);
      if (error) fetchTokens();
    },
    [fetchTokens],
  );

  return { tokens, loading, createToken, revokeToken, deleteToken };
}

// The reading side: no session at all, one RPC, a fixed shape. This is exactly
// what the iOS widget will call — the web page at #/widget/<token> exists so the
// endpoint can be seen working before a line of Swift is written, and so there's
// something to compare the native rendering against.
export function useWidgetAgenda(token, days = 3) {
  const [data, setData] = useState(undefined); // undefined = loading, null = bad token

  useEffect(() => {
    let live = true;
    supabase.rpc('widget_agenda', { p_token: token, p_days: days }).then(({ data: payload, error }) => {
      if (live) setData(error ? null : (payload ?? null));
    });
    return () => {
      live = false;
    };
  }, [token, days]);

  return { payload: data, loading: data === undefined };
}

export const widgetUrl = (token) => `${window.location.origin}/#/widget/${token}`;
