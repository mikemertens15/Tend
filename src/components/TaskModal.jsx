import { useState } from 'react';
import { colors, tone, fonts } from '../theme';
import { ModalShell, Label, Chip, inputStyle, PrimaryButton, GhostButton, DeleteButton, MemberPicker } from './Modal';
import { useHousehold } from '../household/HouseholdProvider';
import { REPEATS } from '../data/useTasks';
import { ROOMS, EFFORTS, guessRoom } from '../data/rooms';
import { dayStr, addDays, parseDay, shortDay } from '../dates';

const CATS = [
  ['chore', 'Chore'],
  ['system', 'Home system'],
];

// Adding and editing a task, in one dialog.
//
// It's the same form either way — a task you're changing and a task you're
// creating have exactly the same fields, and two dialogs that drift apart is
// how "where did the room picker go?" happens. Editing adds two things: a
// delete, and a line at the top when the thing you're editing is already
// finished, because that's the state you're most likely to have opened it from.
export function TaskModal({ task, onClose, onSave, onDelete, onToggle }) {
  const { currentMember } = useHousehold();
  const editing = Boolean(task);

  const [title, setTitle] = useState(task?.title ?? '');
  const [cat, setCat] = useState(task?.cat ?? 'chore');
  const [assigneeId, setAssigneeId] = useState(
    editing ? (task.assigneeId ?? null) : (currentMember?.id ?? null),
  );
  const [dueOn, setDueOn] = useState(task?.dueOn ?? dayStr());
  const [repeatDays, setRepeatDays] = useState(task?.repeatDays ?? null);
  const [note, setNote] = useState(task?.note ?? '');
  const [room, setRoom] = useState(task?.room ?? 'whole');
  const [effortMinutes, setEffortMinutes] = useState(task?.effortMinutes ?? null);
  // Once you've picked a room yourself, typing stops second-guessing you — and
  // an existing task's room was already a decision, so it's never re-guessed.
  const [roomTouched, setRoomTouched] = useState(editing);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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
    onSave({ title, cat, assigneeId, note, dueOn, repeatDays, room, effortMinutes });
    onClose();
  }

  return (
    <ModalShell
      title={editing ? 'Edit task' : 'Add a task'}
      onClose={onClose}
      footer={
        <>
          {editing && <DeleteButton onClick={() => setConfirmingDelete((v) => !v)}>Delete</DeleteButton>}
          <div style={{ marginLeft: editing ? 0 : 'auto', display: 'flex', gap: 10 }}>
            <GhostButton onClick={onClose}>Cancel</GhostButton>
            <PrimaryButton onClick={submit}>{editing ? 'Save' : 'Add task'}</PrimaryButton>
          </div>
        </>
      }
    >
      {confirmingDelete && (
        <div
          style={{
            background: colors.inputBg,
            border: `1px solid ${tone.red}`,
            borderRadius: 14,
            padding: '14px 16px',
            marginBottom: 20,
          }}
        >
          <div style={{ font: `400 12px/1.55 ${fonts.sans}`, color: colors.muted, marginBottom: 11 }}>
            Delete <strong style={{ color: colors.ink }}>{task.title}</strong> for good? There’s no archive to get it
            back from.
            {task.repeatDays != null && ' Any follow-up this one already booked stays on the board.'}
          </div>
          <button
            onClick={() => {
              onDelete(task.id);
              onClose();
            }}
            style={{ padding: '8px 14px', borderRadius: 20, background: tone.red, color: colors.onAccent, font: `600 12px ${fonts.sans}` }}
          >
            Delete it
          </button>
        </div>
      )}

      {editing && task.done && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            background: colors.chipBg,
            borderRadius: 12,
            padding: '11px 14px',
            marginBottom: 20,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ flex: 1, minWidth: 140, font: `500 12.5px ${fonts.sans}`, color: colors.muted2 }}>
            Ticked off. If that was a slip, put it back — or delete it.
          </span>
          {onToggle && (
            <button
              onClick={() => {
                onToggle(task.id);
                onClose();
              }}
              style={{ padding: '7px 13px', borderRadius: 18, background: colors.card, border: `1px solid ${colors.cardBorder}`, color: colors.ink, font: `600 12px ${fonts.sans}` }}
            >
              Mark as not done
            </button>
          )}
        </div>
      )}

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
          {editing && ' Changing the interval applies to the next one it books, not to one already on the board.'}
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
