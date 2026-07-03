import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Tracks the Supabase auth session and exposes the auth actions the app needs:
// magic-link sign-in (first-time setup + fallback), password sign-in for
// return visits on new devices, setting a password, and signing out.
const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Passwordless sign-in: emails a one-click link that redirects back here.
  const signInWithMagicLink = useCallback(async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: (email || '').trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  }, []);

  // Email + password sign-in — no email round-trip. Works once the user has
  // set a password (HouseholdModal → "Your sign-in").
  const signInWithPassword = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: (email || '').trim(),
      password,
    });
    if (error) throw error;
  }, []);

  // Attach a password to the signed-in (magic-link-created) account.
  const setPassword = useCallback(async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = { session, loading, signInWithMagicLink, signInWithPassword, setPassword, signOut };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
