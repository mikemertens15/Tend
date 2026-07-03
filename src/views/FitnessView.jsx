import { useState } from 'react';
import { colors, fonts } from '../theme';
import { Card, Avatar } from '../components/ui';
import { WorkoutModal } from '../components/WorkoutModal';
import { KIND_META } from '../data/useWorkouts';
import { getWeek, dayStr, parseDay, monthDay } from '../dates';
import { useHousehold } from '../household/HouseholdProvider';
import { useIsNarrow } from '../useMediaQuery';

// Activity log: this week's tally per person plus the recent session history.
export function FitnessView({ workouts, onAdd, onRemove }) {
  const narrow = useIsNarrow();
  const { order } = useHousehold();
  const [logOpen, setLogOpen] = useState(false);

  const week = getWeek();
  const start = dayStr(week.monday);
  const end = dayStr(week.days[6].date);
  const thisWeek = workouts.filter((w) => w.date >= start && w.date <= end);

  const perMember = order.map((name) => {
    const mine = thisWeek.filter((w) => w.who === name);
    return {
      name,
      count: mine.length,
      minutes: mine.reduce((sum, w) => sum + (w.minutes || 0), 0),
    };
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, gap: 16 }}>
        <div>
          <div style={{ font: `400 30px ${fonts.serif}`, color: colors.ink, marginBottom: 4 }}>Fitness</div>
          <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted }}>
            Moving counts. Log it, however small.
          </div>
        </div>
        <button
          onClick={() => setLogOpen(true)}
          style={{ padding: '9px 17px', borderRadius: 22, background: colors.accent, color: '#fff', font: `600 13px ${fonts.sans}`, boxShadow: '0 2px 8px rgba(194,114,74,.3)', whiteSpace: 'nowrap' }}
        >
          + Log activity
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1.5fr', gap: 22, alignItems: 'start' }}>
        <Card style={{ padding: '22px 26px' }}>
          <div style={{ font: `400 22px ${fonts.serif}`, color: colors.ink, marginBottom: 16 }}>This week</div>
          {perMember.map((p) => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 15 }}>
              <Avatar who={p.name} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ font: `600 14px ${fonts.sans}`, color: colors.ink }}>{p.name}</div>
                <div style={{ font: `400 12px ${fonts.sans}`, color: colors.muted, marginTop: 2 }}>
                  {p.count === 0
                    ? 'Nothing yet this week'
                    : `${p.count} ${p.count === 1 ? 'session' : 'sessions'}${p.minutes ? ` · ${p.minutes} min` : ''}`}
                </div>
              </div>
            </div>
          ))}
        </Card>

        <Card style={{ padding: '22px 26px' }}>
          <div style={{ font: `400 22px ${fonts.serif}`, color: colors.ink, marginBottom: 8 }}>Recent activity</div>
          {workouts.length === 0 ? (
            <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted, marginTop: 8 }}>
              No sessions logged yet — a walk around the block counts.
            </div>
          ) : (
            workouts.slice(0, 30).map((w) => {
              const meta = KIND_META[w.kind];
              return (
                <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 0', borderTop: `1px solid ${colors.divider}` }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: colors.chipBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
                    {meta.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: `600 14px ${fonts.sans}`, color: colors.ink }}>
                      {w.who ? `${w.who} · ` : ''}
                      {meta.label}
                      {w.minutes ? <span style={{ fontWeight: 500, color: colors.muted2 }}> · {w.minutes} min</span> : null}
                    </div>
                    {w.note && <div style={{ font: `400 12px ${fonts.sans}`, color: colors.muted, marginTop: 2 }}>{w.note}</div>}
                  </div>
                  <div style={{ font: `500 12px ${fonts.sans}`, color: colors.muted, flexShrink: 0 }}>
                    {monthDay(parseDay(w.date))}
                  </div>
                  <button
                    onClick={() => onRemove(w.id)}
                    aria-label="Remove this session"
                    title="Remove"
                    style={{ width: 26, height: 26, borderRadius: '50%', background: 'transparent', color: colors.faint, fontSize: 15, flexShrink: 0 }}
                  >
                    ×
                  </button>
                </div>
              );
            })
          )}
        </Card>
      </div>

      {logOpen && <WorkoutModal onClose={() => setLogOpen(false)} onAdd={onAdd} />}
    </div>
  );
}
