import { colors, shadows, fonts } from '../theme';
import { Avatar } from './ui';
import { useHousehold } from '../household/HouseholdProvider';
import { useIsPhone } from '../useMediaQuery';
import { useSections } from '../data/useSections';
import { BUILD } from '../data/releases';

export function TopNav({ view, setView, onAdd, onOpenHousehold, hobbyRoute }) {
  const { currentMember } = useHousehold();
  const phone = useIsPhone();
  // Only the sections this household kept.
  const { groups } = useSections();

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
        padding: phone ? '12px 18px' : '16px 36px',
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
          {/* Small, quiet, clickable — the release log behind it is the point. */}
          <button
            onClick={() => setView('releases')}
            title="What's new"
            aria-label={`Version ${BUILD.version} — what's new`}
            style={{
              padding: '3px 8px',
              borderRadius: 20,
              background: view === 'releases' ? colors.accent : colors.chipBg,
              color: view === 'releases' ? colors.onAccent : colors.muted2,
              font: `700 10px ${fonts.mono}`,
              lineHeight: 1.4,
              flexShrink: 0,
            }}
          >
            v{BUILD.version}
          </button>
        </div>

        {/* On a phone this collapses and the bottom tab bar takes over. */}
        {!phone && (
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
            {groups.map((group, gi) => (
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
                  // Keep Hobbies lit while you're inside one of its sections.
                  const active = view === key || (key === 'hobbies' && hobbyRoute);
                  return (
                    <button
                      key={key}
                      onClick={() => setView(key)}
                      aria-current={active ? 'page' : undefined}
                      style={{
                        padding: '8px 14px',
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
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: phone ? 10 : 14, flexShrink: 0 }}>
        <button
          onClick={onAdd}
          aria-label="Add a task"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: phone ? '8px 13px' : '9px 17px',
            borderRadius: 22,
            background: colors.accent,
            color: colors.onAccent,
            font: `600 13px ${fonts.sans}`,
            boxShadow: shadows.accent,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1, marginTop: -1 }}>+</span>
          {!phone && 'Add task'}
        </button>
        <button
          onClick={onOpenHousehold}
          aria-label="Household and account"
          title="Household & account"
          style={{ borderRadius: '50%', padding: 0, lineHeight: 0, cursor: 'pointer' }}
        >
          <Avatar who={currentMember?.name} size={phone ? 32 : 36} />
        </button>
      </div>
    </div>
  );
}
