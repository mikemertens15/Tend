import { useState } from 'react';
import { ModalShell, Label, inputStyle, PrimaryButton, GhostButton, DeleteButton, MemberPicker } from './Modal';

// Add or edit a life goal. Pass `goal` (the raw DB row) to edit; omit to add.
// Owner is optional — no owner means it's a family goal.
export function GoalModal({ goal, onClose, onSave, onDelete }) {
  const editing = Boolean(goal);
  const [title, setTitle] = useState(goal?.title ?? '');
  const [ownerId, setOwnerId] = useState(goal?.owner_member_id ?? null);
  const [why, setWhy] = useState(goal?.why ?? '');
  const [target, setTarget] = useState(goal?.target_date ?? '');

  function submit() {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      owner_member_id: ownerId,
      why: why.trim() || null,
      target_date: target || null,
    });
    onClose();
  }

  return (
    <ModalShell
      title={editing ? 'Edit goal' : 'Add a goal'}
      onClose={onClose}
      footer={
        <>
          {editing && <DeleteButton onClick={() => { onDelete(goal.id); onClose(); }}>Delete</DeleteButton>}
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={submit}>{editing ? 'Save changes' : 'Add goal'}</PrimaryButton>
        </>
      }
    >
      <Label>What's the goal?</Label>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="e.g. Run a half marathon"
        style={inputStyle}
      />

      <Label>Whose goal is it?</Label>
      <MemberPicker value={ownerId} onChange={setOwnerId} none="Family" />

      <Label>Why does it matter? (optional)</Label>
      <input
        value={why}
        onChange={(e) => setWhy(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="e.g. Want to feel strong at 40"
        style={inputStyle}
      />

      <Label>Target date (optional)</Label>
      <input type="date" value={target} onChange={(e) => setTarget(e.target.value)} style={inputStyle} />
    </ModalShell>
  );
}
