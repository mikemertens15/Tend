import { useState } from 'react';
import { colors, tone, shadows, fonts } from '../theme';
import { Card } from '../components/ui';
import { SystemModal } from '../components/SystemModal';
import { statusColor } from './HomeView';
import { useIsNarrow } from '../useMediaQuery';

export function SystemsView({ systems, onAdd, onUpdate, onRemove, onMarkDone }) {
  const narrow = useIsNarrow();
  // null = closed, 'new' = adding, otherwise the system being edited.
  const [editing, setEditing] = useState(null);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, gap: 16 }}>
        <div>
          <div style={{ font: `400 30px ${fonts.serif}`, color: colors.ink, marginBottom: 4 }}>Home systems</div>
          <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted }}>
            The slow, easy-to-forget upkeep that keeps the house healthy.
          </div>
        </div>
        <button
          onClick={() => setEditing('new')}
          style={{ padding: '9px 17px', borderRadius: 22, background: colors.accent, color: colors.onAccent, font: `600 13px ${fonts.sans}`, boxShadow: shadows.accent, whiteSpace: 'nowrap' }}
        >
          + Track a system
        </button>
      </div>

      {systems.length === 0 ? (
        <Card style={{ padding: '38px 30px', textAlign: 'center' }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>🏠</div>
          <div style={{ font: `400 20px ${fonts.serif}`, color: colors.ink, marginBottom: 6 }}>Nothing tracked yet</div>
          <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted }}>
            Add the HVAC filter, gutters, smoke detectors — anything on a "do it every so often" cycle.
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr', gap: 16 }}>
          {systems.map((s) => (
            <Card key={s.id} style={{ padding: '20px 22px', borderRadius: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: tone[s.tone],
                  flexShrink: 0,
                  boxShadow: `0 0 0 5px ${tone[s.tone]}22`,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <button
                  onClick={() => setEditing(s.raw)}
                  style={{ font: `600 15.5px ${fonts.sans}`, color: colors.ink, textAlign: 'left', padding: 0 }}
                  title="Edit"
                >
                  {s.name}
                </button>
                <div style={{ font: `400 12px ${fonts.sans}`, color: colors.muted, marginTop: 2 }}>{s.detail}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                <div style={{ font: `600 12px ${fonts.sans}`, color: statusColor(s.tone), whiteSpace: 'nowrap' }}>{s.status}</div>
                <button
                  onClick={() => onMarkDone(s.id)}
                  style={{ font: `600 11.5px ${fonts.sans}`, color: colors.muted2, background: colors.chipBg, padding: '5px 11px', borderRadius: 20, whiteSpace: 'nowrap' }}
                >
                  Done today
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing !== null && (
        <SystemModal
          system={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(fields) => (editing === 'new' ? onAdd(fields) : onUpdate(editing.id, fields))}
          onDelete={onRemove}
        />
      )}
    </div>
  );
}
