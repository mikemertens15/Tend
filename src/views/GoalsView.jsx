import { useState } from 'react';
import { colors, fonts } from '../theme';
import { Card, Avatar } from '../components/ui';
import { GoalModal } from '../components/GoalModal';
import { targetTone } from '../data/useGoals';
import { statusColor } from './HomeView';
import { useIsNarrow } from '../useMediaQuery';

// Life goals — the long arcs that don't fit a weekly chore list.
export function GoalsView({ active, done, onAdd, onUpdate, onRemove, onMarkDone, onReopen }) {
  const narrow = useIsNarrow();
  // null = closed, 'new' = adding, otherwise the goal being edited.
  const [editing, setEditing] = useState(null);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, gap: 16 }}>
        <div>
          <div style={{ font: `400 30px ${fonts.serif}`, color: colors.ink, marginBottom: 4 }}>Goals</div>
          <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted }}>
            The long arcs — for each of you, and for the family.
          </div>
        </div>
        <button
          onClick={() => setEditing('new')}
          style={{ padding: '9px 17px', borderRadius: 22, background: colors.accent, color: '#fff', font: `600 13px ${fonts.sans}`, boxShadow: '0 2px 8px rgba(194,114,74,.3)', whiteSpace: 'nowrap' }}
        >
          + Add goal
        </button>
      </div>

      {active.length === 0 && done.length === 0 ? (
        <Card style={{ padding: '38px 30px', textAlign: 'center' }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>🎯</div>
          <div style={{ font: `400 20px ${fonts.serif}`, color: colors.ink, marginBottom: 6 }}>No goals yet</div>
          <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted }}>
            Big or small — a race to run, a room to renovate, a trip to save for.
          </div>
        </Card>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr', gap: 16 }}>
            {active.map((g) => (
              <Card key={g.id} style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <GoalAvatar owner={g.owner} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: `600 15.5px ${fonts.sans}`, color: colors.ink }}>{g.title}</div>
                    <div style={{ font: `400 12px ${fonts.sans}`, color: colors.muted, marginTop: 2 }}>
                      {g.owner ?? 'Family goal'}
                      {g.why ? ` · ${g.why}` : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => setEditing(g.raw)}
                    aria-label={`Edit ${g.title}`}
                    style={{ font: `500 12.5px ${fonts.sans}`, color: colors.accent, flexShrink: 0 }}
                  >
                    Edit
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  {g.target ? (
                    <span style={{ font: `600 12px ${fonts.sans}`, color: statusColor(targetTone(g.target.daysLeft)) }}>
                      {g.target.daysLeft < 0
                        ? `Was due ${g.target.label}`
                        : `Target ${g.target.label} · ${g.target.daysLeft}d left`}
                    </span>
                  ) : (
                    <span style={{ font: `500 12px ${fonts.sans}`, color: colors.faint }}>No target date</span>
                  )}
                  <button
                    onClick={() => onMarkDone(g.id)}
                    style={{ font: `600 11.5px ${fonts.sans}`, color: colors.muted2, background: colors.chipBg, padding: '5px 11px', borderRadius: 20, whiteSpace: 'nowrap' }}
                  >
                    Mark done
                  </button>
                </div>
              </Card>
            ))}
          </div>

          {done.length > 0 && (
            <>
              <div style={{ font: `400 20px ${fonts.serif}`, color: colors.ink, margin: '28px 0 12px' }}>Done 🎉</div>
              <Card style={{ padding: '8px 22px' }}>
                {done.map((g, i) => (
                  <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i > 0 ? `1px solid ${colors.divider}` : 'none' }}>
                    <span style={{ color: '#7f9b86', fontSize: 15 }}>✓</span>
                    <div style={{ flex: 1, font: `500 13.5px ${fonts.sans}`, color: colors.muted2, textDecoration: 'line-through' }}>
                      {g.title}
                    </div>
                    {g.doneOn && <span style={{ font: `400 12px ${fonts.sans}`, color: colors.muted }}>{g.doneOn}</span>}
                    <button
                      onClick={() => onReopen(g.id)}
                      style={{ font: `500 12px ${fonts.sans}`, color: colors.accent }}
                    >
                      Reopen
                    </button>
                  </div>
                ))}
              </Card>
            </>
          )}
        </>
      )}

      {editing !== null && (
        <GoalModal
          goal={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(fields) => (editing === 'new' ? onAdd(fields) : onUpdate(editing.id, fields))}
          onDelete={onRemove}
        />
      )}
    </div>
  );
}

function GoalAvatar({ owner }) {
  if (owner) return <Avatar who={owner} size={36} />;
  return (
    <div style={{ width: 36, height: 36, borderRadius: '50%', background: colors.chipBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
      🏡
    </div>
  );
}
