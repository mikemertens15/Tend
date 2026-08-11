import { useState } from 'react';
import { colors, fonts } from '../theme';
import { ModalShell, Label, Chip, inputStyle, PrimaryButton, GhostButton, MemberPicker } from './Modal';
import { useHousehold } from '../household/HouseholdProvider';
import { dayStr } from '../dates';

// One entry in the pet log. A future date is a booking; a past one is a
// record. Same form either way, so "book the checkup" and "log the checkup"
// aren't two different things to learn.
const KINDS = [
  ['vet', '🩺 Vet visit', 'e.g. Annual checkup & shots'],
  ['med', '💊 Medication', 'e.g. Flea treatment'],
  ['weight', '⚖️ Weight', 'Optional note'],
  ['groom', '🪮 Grooming', 'e.g. Nail trim'],
  ['note', '📝 Note', 'What happened?'],
];

export function PetLogModal({ pets, defaultPetId, onClose, onSave }) {
  const { currentMember } = useHousehold();
  const [kind, setKind] = useState('vet');
  const [petId, setPetId] = useState(defaultPetId ?? pets[0]?.id ?? null);
  const [onDate, setOnDate] = useState(dayStr());
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [memberId, setMemberId] = useState(currentMember?.id ?? null);

  const placeholder = KINDS.find(([k]) => k === kind)?.[2] ?? '';

  function submit() {
    if (!petId) return;
    onSave({
      pet_id: petId,
      kind,
      on_date: onDate,
      value: kind === 'weight' && value !== '' ? Number(value) : null,
      note: note.trim() || null,
      member_id: memberId,
    });
    onClose();
  }

  return (
    <ModalShell
      title="Log something"
      onClose={onClose}
      footer={
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={submit}>Save</PrimaryButton>
        </div>
      }
    >
      <Label>What kind?</Label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {KINDS.map(([key, label]) => (
          <Chip key={key} active={kind === key} onClick={() => setKind(key)}>
            {label}
          </Chip>
        ))}
      </div>

      <Label>Which pet?</Label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {pets.map((p) => (
          <Chip key={p.id} active={petId === p.id} onClick={() => setPetId(p.id)}>
            {p.emoji} {p.name}
          </Chip>
        ))}
      </div>

      <Label>When?</Label>
      <input type="date" value={onDate} onChange={(e) => setOnDate(e.target.value)} style={inputStyle} />
      <div style={{ font: `400 12px ${fonts.sans}`, color: colors.muted, margin: '-12px 0 20px' }}>
        A date in the future books it; today or earlier records it.
      </div>

      {kind === 'weight' && (
        <>
          <Label>Weight (lb)</Label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 10.4"
            style={inputStyle}
          />
        </>
      )}

      <Label>Details</Label>
      <input
        autoFocus
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={placeholder}
        style={inputStyle}
      />

      <Label>Who's handling it?</Label>
      <MemberPicker value={memberId} onChange={setMemberId} none="Anyone" />
    </ModalShell>
  );
}
