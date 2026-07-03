import { useState } from 'react';
import { ModalShell, Label, Chip, inputStyle, PrimaryButton, GhostButton, DeleteButton } from './Modal';
import { INTERVAL_PRESETS } from '../data/useSystems';
import { dayStr } from '../dates';

// Add or edit a recurring home-upkeep item. Pass `system` (the raw DB row) to
// edit; omit it to add. onSave receives DB-column-shaped fields.
export function SystemModal({ system, onClose, onSave, onDelete }) {
  const editing = Boolean(system);
  const presetDays = INTERVAL_PRESETS.map(([d]) => d);

  const [name, setName] = useState(system?.name ?? '');
  const [interval, setInterval] = useState(system?.interval_days ?? 90);
  const [customDays, setCustomDays] = useState(
    system && !presetDays.includes(system.interval_days) ? String(system.interval_days) : '',
  );
  const [lastDone, setLastDone] = useState(system?.last_done_on ?? dayStr());
  const [note, setNote] = useState(system?.note ?? '');

  const custom = customDays !== '';

  function submit() {
    if (!name.trim()) return;
    const days = custom ? parseInt(customDays, 10) : interval;
    if (!days || days < 1) return;
    onSave({
      name: name.trim(),
      interval_days: days,
      last_done_on: lastDone || null,
      note: note.trim() || null,
    });
    onClose();
  }

  return (
    <ModalShell
      title={editing ? 'Edit home system' : 'Track a home system'}
      onClose={onClose}
      footer={
        <>
          {editing && <DeleteButton onClick={() => { onDelete(system.id); onClose(); }}>Remove</DeleteButton>}
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={submit}>{editing ? 'Save changes' : 'Start tracking'}</PrimaryButton>
        </>
      }
    >
      <Label>What needs regular attention?</Label>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="e.g. HVAC filter"
        style={inputStyle}
      />

      <Label>How often?</Label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {INTERVAL_PRESETS.map(([days, label]) => (
          <Chip
            key={days}
            active={!custom && interval === days}
            onClick={() => {
              setInterval(days);
              setCustomDays('');
            }}
          >
            {label}
          </Chip>
        ))}
      </div>
      <input
        type="number"
        min="1"
        value={customDays}
        onChange={(e) => setCustomDays(e.target.value)}
        placeholder="…or a custom number of days"
        style={inputStyle}
      />

      <Label>When was it last done?</Label>
      <input type="date" value={lastDone} onChange={(e) => setLastDone(e.target.value)} style={inputStyle} />

      <Label>Note (optional — shown instead of the default detail line)</Label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="e.g. Filters are in the hall closet"
        style={inputStyle}
      />
    </ModalShell>
  );
}
