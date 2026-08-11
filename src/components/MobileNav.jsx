import { useState } from 'react';
import { colors, shadows, fonts } from '../theme';
import { NAV_GROUPS, NAV_ITEMS, PHONE_TABS } from '../nav';

// Phone navigation. The top bar's inline nav side-scrolled, which meant half
// the app was hidden behind a swipe nobody knew was there. Four fixed tabs and
// a More sheet puts everything one tap from the thumb instead.
export function MobileNav({ view, setView, hobbyRoute }) {
  const [moreOpen, setMoreOpen] = useState(false);

  const tabs = PHONE_TABS.map((key) => NAV_ITEMS.find(([k]) => k === key)).filter(Boolean);
  const moreActive = !PHONE_TABS.includes(view);

  const go = (key) => {
    setMoreOpen(false);
    setView(key);
  };

  return (
    <>
      {moreOpen && (
        <div
          onClick={() => setMoreOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 28,
            background: shadows.backdrop,
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="All sections"
            style={{
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              background: colors.card,
              borderRadius: '22px 22px 0 0',
              padding: '10px 20px 84px',
              boxShadow: shadows.modal,
            }}
          >
            <div
              aria-hidden="true"
              style={{ width: 40, height: 4, borderRadius: 4, background: colors.cardBorder, margin: '6px auto 16px' }}
            />
            {NAV_GROUPS.map((group) => (
              <div key={group.label ?? 'home'} style={{ marginBottom: 18 }}>
                {group.label && (
                  <div
                    style={{
                      font: `600 9.5px ${fonts.sans}`,
                      letterSpacing: '.06em',
                      textTransform: 'uppercase',
                      color: colors.faint,
                      marginBottom: 8,
                    }}
                  >
                    {group.label}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {group.items.map(([key, label, icon]) => {
                    const active = view === key || (key === 'hobbies' && hobbyRoute);
                    return (
                      <button
                        key={key}
                        onClick={() => go(key)}
                        aria-current={active ? 'page' : undefined}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '13px 14px',
                          borderRadius: 14,
                          background: active ? colors.chipBg : colors.inputBg,
                          border: `1px solid ${active ? colors.selected : 'transparent'}`,
                          color: active ? colors.ink : colors.muted2,
                          font: `${active ? 600 : 500} 13.5px ${fonts.sans}`,
                          textAlign: 'left',
                        }}
                      >
                        <span aria-hidden="true" style={{ fontSize: 16 }}>
                          {icon}
                        </span>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <nav
        className="tend-safe-bottom"
        aria-label="Sections"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 30,
          display: 'flex',
          background: colors.navBar,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderTop: `1px solid ${colors.cardBorder}`,
        }}
      >
        {tabs.map(([key, label, icon]) => (
          <TabButton
            key={key}
            icon={icon}
            label={label}
            active={view === key}
            onClick={() => go(key)}
          />
        ))}
        <TabButton
          icon="⋯"
          label="More"
          active={moreActive}
          onClick={() => setMoreOpen((o) => !o)}
          expanded={moreOpen}
        />
      </nav>
    </>
  );
}

function TabButton({ icon, label, active, onClick, expanded }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      aria-expanded={expanded}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        padding: '9px 2px 10px',
        color: active ? colors.accent : colors.muted,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>
        {icon}
      </span>
      <span style={{ font: `${active ? 600 : 500} 10.5px ${fonts.sans}` }}>{label}</span>
    </button>
  );
}
