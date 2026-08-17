import { useCallback, useMemo } from 'react';
import { useHousehold } from '../household/HouseholdProvider';
import { visibleNavGroups, phoneTabs, isCore } from '../nav';

// Which parts of Tend this household actually wants.
//
// The app keeps growing outward — money, shopping, whatever comes after — and
// an app that shows everyone everything eventually shows most people mostly
// noise. So the section list is a household preference rather than a constant.
//
// It's a household setting, not a personal one, on purpose: these are shared
// screens in a shared house, and a section half the family can see and the
// other half can't is a support conversation waiting to happen. Per-person
// preference belongs to things that are actually personal — which skin you're
// in, which four tabs are on *your* phone.
//
// Stored as `disabledSections` in the households.settings jsonb, so there's no
// migration and no new table. See nav.js for why it's a deny list.
//
// Switching a section off isn't cosmetic. The nav loses it, the route stops
// resolving, the dashboard drops its card, and the hook behind it stops
// fetching and stops holding a realtime channel open. That last part only works
// because each section already owns its data.
export function useSections() {
  const { settings, saveSettings } = useHousehold();

  const disabled = useMemo(() => settings.disabledSections ?? [], [settings]);
  const off = useMemo(() => new Set(disabled), [disabled]);

  const isOn = useCallback((key) => isCore(key) || !off.has(key), [off]);

  const setEnabled = useCallback(
    (key, on) => {
      if (isCore(key)) return;
      const next = on ? disabled.filter((k) => k !== key) : [...new Set([...disabled, key])];
      saveSettings({ disabledSections: next });
    },
    [disabled, saveSettings],
  );

  const groups = useMemo(() => visibleNavGroups(disabled), [disabled]);
  const tabs = useMemo(() => phoneTabs(disabled), [disabled]);

  return { isOn, setEnabled, groups, tabs, disabled };
}
