import { useState } from 'react';
import { ModalShell, Label, Chip, inputStyle, PrimaryButton, GhostButton, DeleteButton } from './Modal';
import { PET_CADENCES } from '../data/cadence';
import { dayStr } from '../dates';

// A recurring pet job. Same shape as a home system, different vocabulary —
// plus a pet picker, because the litter box belongs to everyone and the
// thyroid pill belongs to one cat.
export function PetCareModal({ job, pets, onClose, onSave, onDelete }) {
  const editing = Boolean(job);
  const presetDays = PET_CADENCES.map(([d]) => d);

  const [name, setName] = useState(job?.name ?? '');
  const [petId, setPetId] = useState(job?.pet_id ?? null);
  const [interval, setInterval] = useState(job?.interval_days ?? 1);
  const [customDays, setCustomDays] = useState(
    job && !presetDays.includes(job.interval_days) ? String(job.interval_days) : '',
  );
  const [lastDone, setLastDone] = useState(job?.last_done_on ?? dayStr());
  const [note, setNote] = useState(job?.note ?? '');

  const custom = customDays !== '';

  function submit() {
    if (!name.trim()) return;
    const days = custom ? parseInt(customDays, 10) : interval;
    if (!days || days < 1) return;
    onSave({
      name: name.trim(),
      pet_id: petId,
      interval_days: days,
      last_done_on: lastDone || null,
      note: note.trim() || null,
    });
    onClose();
  }

  return (
    <ModalShell
      title={editing ? 'Edit care job' : 'Add a care job'}
      onClose={onClose}
      footer={
        <>
          {editing && (
            <DeleteButton
              onClick={() => {
                onDelete(job.id);
                onClose();
              }}
            >
              Remove
            </DeleteButton>
          )}
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={submit}>{editing ? 'Save changes' : 'Start tracking'}</PrimaryButton>
        </>
      }
    >
      <Label>What needs doing regularly?</Label>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="e.g. Scoop the litter box"
        style={inputStyle}
      />

      <Label>Who's it for?</Label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <Chip active={petId === null} onClick={() => setPetId(null)}>
          🏡 Everyone
        </Chip>
        {pets.map((p) => (
          <Chip key={p.id} active={petId === p.id} onClick={() => setPetId(p.id)}>
            {p.emoji} {p.name}
          </Chip>
        ))}
      </div>

      <Label>How often?</Label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {PET_CADENCES.map(([days, label]) => (
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
        placeholder="e.g. Litter's under the basement stairs"
        style={{ ...inputStyle, marginBottom: 0 }}
      />
    </ModalShell>
  );
}
