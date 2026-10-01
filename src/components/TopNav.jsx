import { useState, useEffect } from 'react';
import { colors, fonts } from '../theme';
import { Avatar } from './ui';
import { useHousehold } from '../household/HouseholdProvider';
import { useIsPhone } from '../useMediaQuery';
import { useSections } from '../data/useSections';

export function TopNav({ view, setView, onAdd, onOpenHousehold }) {
  const { currentMember } = useHousehold();
  const phone = useIsPhone();
  const { groups } = useSections();
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => {
    const close = (e) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  const more = groups.slice(1).flatMap((g) => g.items);
  const go = (key) => {
    setMoreOpen(false);
    setView(key);
  };
  return (
    <header
      className="tend-top-nav"
      style={{ background: colors.navBar, borderBottom: `1px solid ${colors.cardBorder}` }}
    >
      <button className="tend-brand" aria-label="Tend home" onClick={() => go('home')}>
        <span aria-hidden="true" className="tend-brand-mark">
          ⌂
        </span>
        <span style={{ font: `400 28px ${fonts.serif}` }}>Tend</span>
      </button>
      {!phone && (
        <nav className="tend-desktop-nav" aria-label="Main navigation">
          {groups[0].items.map(([key, label]) => (
            <button key={key} aria-current={view === key ? 'page' : undefined} onClick={() => go(key)}>
              {label}
            </button>
          ))}
          <div style={{ position: 'relative' }}>
            <button
              aria-expanded={moreOpen}
              aria-controls="tend-more-menu"
              aria-current={more.some(([key]) => key === view) ? 'page' : undefined}
              onClick={() => setMoreOpen((open) => !open)}
            >
              More <span aria-hidden="true">⌄</span>
            </button>
            {moreOpen && (
              <>
                <button
                  className="tend-menu-backdrop"
                  aria-label="Close navigation menu"
                  onClick={() => setMoreOpen(false)}
                />
                <div id="tend-more-menu" className="tend-more-menu">
                  {more.map(([key, label, icon]) => (
                    <button
                      key={key}
                      aria-current={view === key ? 'page' : undefined}
                      onClick={() => go(key)}
                    >
                      <span aria-hidden="true">{icon}</span> {label}
                    </button>
                  ))}
                  <button onClick={() => go('releases')}>What’s new</button>
                </div>
              </>
            )}
          </div>
        </nav>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button className="tend-primary" onClick={onAdd} aria-label="Add a task">
          {phone ? '+' : '+ Add task'}
        </button>
        <button onClick={onOpenHousehold} aria-label="Household and account" title="Household and account">
          <Avatar who={currentMember?.name} size={34} />
        </button>
      </div>
    </header>
  );
}
