import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useHousehold } from '../household/HouseholdProvider';
import { useAuth } from '../auth/AuthProvider';
import { isNative, enablePush, pushPermission } from './native';

// Notifications, from this device's point of view.
//
// The state machine is smaller than it looks. A device is in exactly one of:
//
//   unsupported  — a browser, or a PWA that hasn't been installed to the home
//                  screen. Nothing to offer.
//   prompt       — the app can ask. iOS grants exactly one chance at this, so
//                  it only happens when someone taps the switch.
//   denied       — asked and refused. Only Settings can undo it, so say so
//                  rather than showing a switch that does nothing.
//   granted      — registered, and there's a row in push_subscriptions.
//
// The row is per *device*, not per person: the same account on a phone and an
// iPad should get told twice, because they're two places you might be.

export function usePush() {
  const { household, currentMember } = useHousehold();
  // The context carries the whole session, not a bare user — matching App.jsx.
  const { session } = useAuth();
  const user = session?.user ?? null;
  const [permission, setPermission] = useState('checking');
  const [devices, setDevices] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const householdId = household?.id ?? null;

  useEffect(() => {
    let live = true;
    pushPermission().then((p) => live && setPermission(p));
    return () => {
      live = false;
    };
  }, []);

  const fetchDevices = useCallback(async () => {
    if (!user?.id) {
      setDevices([]);
      return;
    }
    // RLS already scopes this to the signed-in user; the filter is here so the
    // query is obviously right when read on its own.
    const { data } = await supabase
      .from('push_subscriptions')
      .select('id, platform, label, created_at, last_used_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setDevices(data ?? []);
  }, [user?.id]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Store the APNs token this device was handed. Upserting on the unique index
  // means re-registering the same phone updates a row rather than adding one.
  const saveToken = useCallback(
    async (deviceToken) => {
      if (!householdId || !user?.id) return;
      const { error: err } = await supabase.from('push_subscriptions').upsert(
        {
          household_id: householdId,
          member_id: currentMember?.id ?? null,
          user_id: user.id,
          platform: 'ios',
          device_token: deviceToken,
          label: deviceLabel(),
          user_agent: navigator.userAgent,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,device_token' },
      );
      if (err) setError(err.message);
      fetchDevices();
    },
    [householdId, currentMember, user?.id, fetchDevices],
  );

  const turnOn = useCallback(async () => {
    setBusy(true);
    setError(null);
    const result = await enablePush({
      onToken: saveToken,
      onError: (e) => setError(e?.error ?? 'Registration failed'),
    });
    setPermission(result.granted ? 'granted' : (result.reason ?? 'denied'));
    setBusy(false);
    return result;
  }, [saveToken]);

  // Turning it off on *this* device. The permission itself belongs to iOS and
  // can only be withdrawn in Settings, so what we can do is stop sending — and
  // dropping the row is the honest way to do that.
  const turnOff = useCallback(
    async (id) => {
      setDevices((ds) => ds.filter((d) => d.id !== id));
      const { error: err } = await supabase.from('push_subscriptions').delete().eq('id', id);
      if (err) fetchDevices();
    },
    [fetchDevices],
  );

  return {
    supported: isNative,
    permission,
    devices,
    busy,
    error,
    turnOn,
    turnOff,
    refresh: fetchDevices,
  };
}

// Something recognisable in a list of devices. Not a fingerprint — just enough
// to tell a phone from an iPad when you're deciding which one to switch off.
function deviceLabel() {
  const ua = navigator.userAgent;
  if (/iPad/.test(ua)) return 'iPad';
  if (/iPhone/.test(ua)) return 'iPhone';
  return 'This device';
}
