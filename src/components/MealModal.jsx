import { useState } from 'react';
import { ModalShell, Label, inputStyle, PrimaryButton, GhostButton, DeleteButton, MemberPicker } from './Modal';
import { parseDay, longDate } from '../dates';

// Plan (or edit) one day's dinner. `date` is the 'YYYY-MM-DD' day being
// planned; pass `meal` (the raw DB row) when editing an existing plan.
export function MealModal({ date, meal, onClose, onSave, onRemove }) {
  const editing = Boolean(meal);
  const [title, setTitle] = useState(meal?.title ?? '');
  const [cookId, setCookId] = useState(meal?.cook_member_id ?? null);
  const [note, setNote] = useState(meal?.note ?? '');

  function submit() {
    if (!title.trim()) return;
    onSave({
      on_date: date,
      slot: 'dinner',
      title: title.trim(),
      note: note.trim() || null,
      cook_member_id: cookId,
    });
    onClose();
  }

  return (
    <ModalShell
      title={`Dinner · ${longDate(parseDay(date))}`}
      onClose={onClose}
      footer={
        <>
          {editing && <DeleteButton onClick={() => { onRemove(meal.id); onClose(); }}>Clear day</DeleteButton>}
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={submit}>{editing ? 'Save changes' : 'Add to the plan'}</PrimaryButton>
        </>
      }
    >
      <Label>What's cooking?</Label>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="e.g. Taco night"
        style={inputStyle}
      />

      <Label>Who's cooking?</Label>
      <MemberPicker value={cookId} onChange={setCookId} />

      <Label>Note (optional)</Label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="e.g. Thaw the chicken in the morning"
        style={inputStyle}
      />
    </ModalShell>
  );
}
