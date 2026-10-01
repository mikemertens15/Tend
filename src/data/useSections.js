import { useCallback, useMemo } from 'react';
import { useHousehold } from '../household/HouseholdProvider';
import { visibleNavGroups, phoneTabs, isCore, NAV_ITEMS } from '../nav';

// Optional household tools share one setting across the nav, routes, and data
// hooks. Unknown legacy keys never turn retired sections back on.
export function useSections() {
  const { settings, saveSettings } = useHousehold();

  const disabled = useMemo(
    () => (Array.isArray(settings.disabledSections) ? settings.disabledSections : []),
    [settings],
  );
  const off = useMemo(() => new Set(disabled), [disabled]);

  const isOn = useCallback(
    (key) => NAV_ITEMS.some(([k]) => k === key) && (isCore(key) || !off.has(key)),
    [off],
  );

  const setEnabled = useCallback(
    (key, on) => {
      if (isCore(key) || !NAV_ITEMS.some(([k]) => k === key)) return;
      const next = on ? disabled.filter((k) => k !== key) : [...new Set([...disabled, key])];
      saveSettings({ disabledSections: next });
    },
    [disabled, saveSettings],
  );

  const groups = useMemo(() => visibleNavGroups(disabled), [disabled]);
  const tabs = useMemo(() => phoneTabs(disabled), [disabled]);

  return { isOn, setEnabled, groups, tabs, disabled };
}
