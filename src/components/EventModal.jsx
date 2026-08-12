import { useState } from 'react';
import { colors, fonts } from '../theme';
import { ModalShell, Label, Chip, inputStyle, PrimaryButton, GhostButton, DeleteButton, MemberPicker } from './Modal';
import { EVENT_KINDS } from '../data/useEvents';
import { dayStr } from '../dates';

export function EventModal({ date, event, onClose, onSave, onDelete }) {
  const editing = Boolean(event);

  const [title, setTitle] = useState(event?.title ?? '');
  const [kind, setKind] = useState(event?.kind ?? 'event');
  const [onDate, setOnDate] = useState(event?.on_date ?? date ?? dayStr());
  const [endDate, setEndDate] = useState(event?.end_date ?? '');
  const [startTime, setStartTime] = useState(event?.start_time?.slice(0, 5) ?? '');
  const [memberId, setMemberId] = useState(event?.member_id ?? null);
  const [repeatYearly, setRepeatYearly] = useState(event?.repeat_yearly ?? false);
  const [note, setNote] = useState(event?.note ?? '');

  // A birthday that doesn't come back every year isn't a birthday.
  function pickKind(next) {
    setKind(next);
    if (next === 'birthday') setRepeatYearly(true);
  }

  function submit() {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      kind,
      on_date: onDate,
      end_date: endDate && endDate > onDate ? endDate : null,
      start_time: startTime || null,
      member_id: memberId,
      repeat_yearly: repeatYearly,
      note: note.trim() || null,
    });
    onClose();
  }

  return (
    <ModalShell
      title={editing ? 'Edit event' : 'Add an event'}
      onClose={onClose}
      footer={
        <>
          {editing && (
            <DeleteButton
              onClick={() => {
                onDelete(event.id);
                onClose();
              }}
            >
              Delete
            </DeleteButton>
          )}
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={submit}>{editing ? 'Save' : 'Add event'}</PrimaryButton>
        </>
      }
    >
      <Label>What is it?</Label>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="e.g. Mum's birthday"
        style={inputStyle}
      />

      <Label>Kind</Label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {EVENT_KINDS.map(([key, label, icon]) => (
          <Chip key={key} active={kind === key} onClick={() => pickKind(key)}>
            {icon} {label}
          </Chip>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Label>{kind === 'birthday' ? 'Date of birth' : 'Date'}</Label>
          <input type="date" value={onDate} onChange={(e) => setOnDate(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Label>Time (optional)</Label>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {!repeatYearly && (
        <>
          <Label>Runs until (optional)</Label>
          <input type="date" value={endDate} min={onDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
        </>
      )}

      <button
        onClick={() => setRepeatYearly((r) => !r)}
        aria-pressed={repeatYearly}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 11,
          width: '100%',
          padding: '12px 14px',
          borderRadius: 12,
          marginBottom: 20,
          textAlign: 'left',
          background: repeatYearly ? colors.chipBg : colors.inputBg,
          border: `1px solid ${repeatYearly ? colors.selected : colors.cardBorder}`,
        }}
      >
        <span style={{ fontSize: 15, lineHeight: 1.2 }}>{repeatYearly ? '🔁' : '📅'}</span>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', font: `600 13px ${fonts.sans}`, color: colors.ink }}>
            Every year
          </span>
          <span style={{ display: 'block', font: `400 11.5px/1.5 ${fonts.sans}`, color: colors.muted, marginTop: 2 }}>
            {kind === 'birthday'
              ? 'Enter the year they were born and Tend works out which birthday it is each time.'
              : 'Anniversaries, renewals, the day the bins change.'}
          </span>
        </span>
      </button>

      <Label>Whose is it?</Label>
      <MemberPicker value={memberId} onChange={setMemberId} none="Everyone" />

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
