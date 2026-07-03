import { colors, fonts } from '../theme';
import { Avatar } from './ui';
import { useHousehold } from '../household/HouseholdProvider';

// Grouped navigation. Home is the always-first landing pad; the rest cluster
// into the "Household" (home-maintenance) and "Life" domains so the app can grow
// past the home dashboard without crowding a flat tab bar.
const NAV_GROUPS = [
  { label: null, items: [['home', 'Home']] },
  {
    label: 'Household',
    items: [
      ['chores', 'Chores'],
      ['meals', 'Meals'],
      ['groceries', 'Groceries'],
      ['vehicles', 'Vehicles'],
      ['systems', 'Systems'],
      ['calendar', 'Calendar'],
    ],
  },
  {
    label: 'Life',
    items: [
      ['watchlist', 'Watchlist'],
      ['fitness', 'Fitness'],
      ['goals', 'Goals'],
    ],
  },
];

export function TopNav({ view, setView, onAdd, onOpenHousehold }) {
  const { currentMember } = useHousehold();
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '16px 36px',
        background: colors.navBar,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${colors.cardBorder}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 30, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: colors.accent }} />
          <div style={{ font: `400 25px ${fonts.serif}`, color: colors.ink, lineHeight: 1 }}>Tend</div>
        </div>
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.label ?? 'home'} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              {gi > 0 && (
                <span
                  aria-hidden="true"
                  style={{ width: 1, height: 18, background: colors.cardBorder, margin: '0 8px', flexShrink: 0 }}
                />
              )}
              {group.label && (
                <span
                  style={{
                    font: `600 9.5px ${fonts.sans}`,
                    letterSpacing: '.06em',
                    textTransform: 'uppercase',
                    color: colors.faint,
                    marginRight: 2,
                    flexShrink: 0,
                  }}
                >
                  {group.label}
                </span>
              )}
              {group.items.map(([key, label]) => {
                const active = view === key;
                return (
                  <button
                    key={key}
                    onClick={() => setView(key)}
                    style={{
                      padding: '8px 15px',
                      borderRadius: 22,
                      whiteSpace: 'nowrap',
                      background: active ? colors.chipBg : 'transparent',
                      color: active ? colors.ink : colors.muted2,
                      font: `${active ? 600 : 500} 13.5px ${fonts.sans}`,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <button
          onClick={onAdd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '9px 17px',
            borderRadius: 22,
            background: colors.accent,
            color: '#fff',
            font: `600 13px ${fonts.sans}`,
            boxShadow: '0 2px 8px rgba(194,114,74,.3)',
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1, marginTop: -1 }}>+</span> Add task
        </button>
        <button
          onClick={onOpenHousehold}
          aria-label="Household and account"
          title="Household & account"
          style={{ borderRadius: '50%', padding: 0, lineHeight: 0, cursor: 'pointer' }}
        >
          <Avatar who={currentMember?.name} size={36} />
        </button>
      </div>
    </div>
  );
}
