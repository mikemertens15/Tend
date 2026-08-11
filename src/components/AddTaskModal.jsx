import { useState } from 'react';
import { colors, fonts } from '../theme';
import { ModalShell, Label, Chip, inputStyle, PrimaryButton, GhostButton, MemberPicker } from './Modal';
import { useHousehold } from '../household/HouseholdProvider';
import { REPEATS } from '../data/useTasks';
import { ROOMS, EFFORTS, guessRoom } from '../data/rooms';
import { dayStr, addDays, parseDay, shortDay } from '../dates';

const CATS = [
  ['chore', 'Chore'],
  ['system', 'Home system'],
];

// Rebuilt on ModalShell (it used to hand-roll its own backdrop and chrome) so
// it picks up Escape-to-close and both skins for free.
export function AddTaskModal({ onClose, onAdd }) {
  const { members, currentMember } = useHousehold();
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState('chore');
  const [assigneeId, setAssigneeId] = useState(currentMember?.id ?? null);
  const [dueOn, setDueOn] = useState(dayStr());
  const [repeatDays, setRepeatDays] = useState(null);
  const [note, setNote] = useState('');
  const [room, setRoom] = useState('whole');
  const [effortMinutes, setEffortMinutes] = useState(null);
  // Once you've picked a room yourself, typing stops second-guessing you.
  const [roomTouched, setRoomTouched] = useState(false);

  function retitle(next) {
    setTitle(next);
    if (roomTouched) return;
    const guess = guessRoom(next);
    if (guess) setRoom(guess);
  }

  function pickRoom(next) {
    setRoom(next);
    setRoomTouched(true);
  }

  // Quick dates cover nearly every real answer to "when?", with the date input
  // underneath for the rest.
  const quick = [
    ['Today', dayStr()],
    ['Tomorrow', addDays(dayStr(), 1)],
    [shortDay(parseDay(addDays(dayStr(), 2))), addDays(dayStr(), 2)],
    ['Next week', addDays(dayStr(), 7)],
  ];

  function submit() {
    if (!title.trim()) return;
    onAdd({
      title,
      cat,
      who: members.find((m) => m.id === assigneeId)?.name ?? null,
      note,
      dueOn,
      repeatDays,
      room,
      effortMinutes,
    });
    onClose();
  }

  return (
    <ModalShell
      title="Add a task"
      onClose={onClose}
      footer={
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={submit}>Add task</PrimaryButton>
        </div>
      }
    >
      <Label>What needs doing?</Label>
      <input
        autoFocus
        value={title}
        onChange={(e) => retitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="e.g. Clean out the garage"
        style={inputStyle}
      />

      <Label>Where?</Label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {ROOMS.map(([key, label, icon]) => (
          <Chip key={key} active={room === key} onClick={() => pickRoom(key)}>
            {icon} {label}
          </Chip>
        ))}
      </div>

      <Label>How long does it take?</Label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {EFFORTS.map(([mins, label]) => (
          <Chip
            key={mins}
            active={effortMinutes === mins}
            onClick={() => setEffortMinutes(effortMinutes === mins ? null : mins)}
          >
            {label}
          </Chip>
        ))}
      </div>

      <Label>Category</Label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {CATS.map(([key, label]) => (
          <Chip key={key} active={cat === key} onClick={() => setCat(key)}>
            {label}
          </Chip>
        ))}
      </div>

      <Label>When?</Label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {quick.map(([label, value]) => (
          <Chip key={label} active={dueOn === value} onClick={() => setDueOn(value)}>
            {label}
          </Chip>
        ))}
      </div>
      <input type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} style={inputStyle} />

      <Label>Repeat</Label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {REPEATS.map(([days, label]) => (
          <Chip key={label} active={repeatDays === days} onClick={() => setRepeatDays(days)}>
            {label}
          </Chip>
        ))}
      </div>
      {repeatDays !== null && (
        <div style={{ font: `400 12px/1.5 ${fonts.sans}`, color: colors.muted, marginBottom: 20 }}>
          Checking this off books the next one automatically.
        </div>
      )}

      <Label>Assign to</Label>
      <MemberPicker value={assigneeId} onChange={setAssigneeId} none="Anyone" />

      <Label>Note</Label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="Optional"
        style={{ ...inputStyle, marginBottom: 0 }}
      />
    </ModalShell>
  );
}
