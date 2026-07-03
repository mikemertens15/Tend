import { useState } from 'react';
import { ModalShell, Label, Chip, inputStyle, PrimaryButton, GhostButton, MemberPicker } from './Modal';
import { useHousehold } from '../household/HouseholdProvider';
import { WORKOUT_KINDS } from '../data/useWorkouts';
import { dayStr } from '../dates';

// Log an activity session. Defaults to the signed-in member and today.
export function WorkoutModal({ onClose, onAdd }) {
  const { currentMember, members } = useHousehold();
  const [memberId, setMemberId] = useState(currentMember?.id ?? members[0]?.id ?? null);
  const [kind, setKind] = useState('run');
  const [minutes, setMinutes] = useState('');
  const [date, setDate] = useState(dayStr());
  const [note, setNote] = useState('');

  function submit() {
    if (!memberId) return;
    onAdd({
      member_id: memberId,
      kind,
      minutes: parseInt(minutes, 10) > 0 ? parseInt(minutes, 10) : null,
      done_on: date || dayStr(),
      note: note.trim() || null,
    });
    onClose();
  }

  return (
    <ModalShell
      title="Log activity"
      onClose={onClose}
      footer={
        <>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={submit}>Log it</PrimaryButton>
        </>
      }
    >
      <Label>What did you do?</Label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {WORKOUT_KINDS.map(([key, label, emoji]) => (
          <Chip key={key} active={kind === key} onClick={() => setKind(key)}>
            {emoji} {label}
          </Chip>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 12 }}>
        <div>
          <Label>For how long? (minutes)</Label>
          <input
            autoFocus
            type="number"
            min="1"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="30"
            style={inputStyle}
          />
        </div>
        <div>
          <Label>When?</Label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <Label>Who was it?</Label>
      <MemberPicker value={memberId} onChange={(id) => id && setMemberId(id)} />

      <Label>Note (optional)</Label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="e.g. 5k around the lake, felt great"
        style={inputStyle}
      />
    </ModalShell>
  );
}
