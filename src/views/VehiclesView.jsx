import { useState } from 'react';
import { colors, tone, shadows, fonts } from '../theme';
import { Card, ProgressBar } from '../components/ui';
import { VehicleModal } from '../components/VehicleModal';
import { useIsNarrow } from '../useMediaQuery';

export function VehiclesView({ vehicles, onAdd, onUpdate, onRemove }) {
  const narrow = useIsNarrow();
  // null = closed, 'new' = adding, otherwise the vehicle being edited.
  const [editing, setEditing] = useState(null);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, gap: 16 }}>
        <div>
          <div style={{ font: `400 30px ${fonts.serif}`, color: colors.ink, marginBottom: 4 }}>Vehicles</div>
          <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted }}>
            Keep the family rolling — service, registration, tires.
          </div>
        </div>
        <button
          onClick={() => setEditing('new')}
          style={{ padding: '9px 17px', borderRadius: 22, background: colors.accent, color: colors.onAccent, font: `600 13px ${fonts.sans}`, boxShadow: shadows.accent, whiteSpace: 'nowrap' }}
        >
          + Add vehicle
        </button>
      </div>

      {vehicles.length === 0 ? (
        <Card style={{ padding: '38px 30px', textAlign: 'center' }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>🚗</div>
          <div style={{ font: `400 20px ${fonts.serif}`, color: colors.ink, marginBottom: 6 }}>Nothing in the driveway yet</div>
          <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted }}>
            Add a car to track oil changes, registration, insurance and service.
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr', gap: 22 }}>
          {vehicles.map((v) => (
            <Card key={v.id} style={{ padding: '24px 26px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ font: `600 17px ${fonts.sans}`, color: colors.ink }}>{v.name}</div>
                  <div style={{ font: `400 12.5px ${fonts.sans}`, color: colors.muted, marginTop: 2 }}>
                    {[v.milesLabel, v.driver].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <button
                  onClick={() => setEditing(v.raw)}
                  aria-label={`Edit ${v.name}`}
                  style={{ font: `500 12.5px ${fonts.sans}`, color: colors.accent, padding: '6px 0 6px 12px', flexShrink: 0 }}
                >
                  Edit
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', font: `500 12px ${fonts.sans}`, color: colors.muted, margin: '22px 0 7px' }}>
                <span>Next oil change</span>
                <span style={{ color: v.oil.tracked ? (v.oil.urgent ? tone.red : tone.green) : colors.faint, fontWeight: 600 }}>
                  {v.oil.label}
                </span>
              </div>
              <ProgressBar pct={v.oil.pct} height={8} fill={v.oil.urgent ? colors.accent : tone.green} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 22 }}>
                <Stat label="Registration" value={v.reg} />
                <Stat label="Tires rotated" value={v.tires} />
                <Stat label="Insurance" value={v.ins} />
                <Stat label="Last service" value={v.service} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing !== null && (
        <VehicleModal
          vehicle={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(fields) => (editing === 'new' ? onAdd(fields) : onUpdate(editing.id, fields))}
          onDelete={onRemove}
        />
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ background: colors.inputBg, borderRadius: 12, padding: '13px 15px' }}>
      <div style={{ font: `400 11px ${fonts.sans}`, color: colors.muted }}>{label}</div>
      <div style={{ font: `600 15px ${fonts.sans}`, color: value ? colors.ink : colors.faint, marginTop: 3 }}>
        {value ?? '—'}
      </div>
    </div>
  );
}
