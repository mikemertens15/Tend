import { useState } from 'react';
import { colors, fonts } from '../theme';
import { useHousehold } from '../household/HouseholdProvider';
import { ModalShell, Label, Chip, inputStyle, PrimaryButton, GhostButton, MemberPicker, DeleteButton } from './Modal';
import { DOMAINS, firstStatus, optionValue, optionLabel, optionColor } from '../data/collections';

// Add or edit any collection item. Every input below is driven by the domain
// spec, so a new hobby gets a working form without touching this file.
export function CollectionItemModal({ section, item, onClose, onSave, onRemove }) {
  const { members, currentMember } = useHousehold();
  const editing = Boolean(item);

  const [domain, setDomain] = useState(item?.domain ?? section.domains[0]);
  const spec = DOMAINS[domain];

  const [title, setTitle] = useState(item?.title ?? '');
  // Without this the form could only ever create backlog items, so "I'm
  // already playing this" had to be a second step on the row afterwards —
  // easy to think you'd done and not have.
  const [status, setStatus] = useState(item?.status ?? firstStatus(domain));
  const [note, setNote] = useState(item?.note ?? '');
  // Hobbies are personal, so a new item belongs to whoever is signed in.
  const [ownerId, setOwnerId] = useState(
    item ? (members.find((m) => m.name === item.owner)?.id ?? null) : (currentMember?.id ?? null),
  );
  const [progressCurrent, setProgressCurrent] = useState(item?.progressCurrent ?? '');
  const [progressTotal, setProgressTotal] = useState(item?.progressTotal ?? '');
  // Extra fields keyed by spec field key; seeded from the item when editing.
  const [extras, setExtras] = useState(() => {
    const seed = {};
    for (const f of spec.fields) seed[f.key] = item?.[f.key] ?? '';
    return seed;
  });

  function pickDomain(next) {
    setDomain(next);
    // Lifecycles differ between domains — a movie has no "Planned" — so the
    // status has to reset rather than carry across.
    setStatus(firstStatus(next));
    const seed = {};
    for (const f of DOMAINS[next].fields) seed[f.key] = extras[f.key] ?? '';
    setExtras(seed);
  }

  const setExtra = (key, value) => setExtras((e) => ({ ...e, [key]: value }));

  function submit() {
    if (!title.trim()) return;
    const num = (v) => (v === '' || v === null ? null : Number(v));
    onSave({
      domain,
      title: title.trim(),
      status,
      note: spec.noteLabel ? note.trim() || null : null,
      owner: members.find((m) => m.id === ownerId)?.name ?? null,
      progressCurrent: num(progressCurrent),
      progressTotal: num(progressTotal),
      ...extras,
    });
    onClose();
  }

  return (
    <ModalShell
      title={editing ? `Edit ${spec.noun.toLowerCase()}` : `Add a ${spec.noun.toLowerCase()}`}
      onClose={onClose}
      footer={
        <>
          {editing && onRemove && (
            <DeleteButton
              onClick={() => {
                onRemove(item.id);
                onClose();
              }}
            >
              Delete
            </DeleteButton>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <GhostButton onClick={onClose}>Cancel</GhostButton>
            <PrimaryButton onClick={submit}>{editing ? 'Save' : `Add ${spec.noun.toLowerCase()}`}</PrimaryButton>
          </div>
        </>
      }
    >
      {/* Only sections holding more than one domain need the picker. */}
      {!editing && section.domains.length > 1 && (
        <>
          <Label>What is it?</Label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {section.domains.map((d) => (
              <Chip key={d} active={domain === d} onClick={() => pickDomain(d)}>
                {DOMAINS[d].noun}
              </Chip>
            ))}
          </div>
        </>
      )}

      <Label>{spec.noun}</Label>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={spec.titlePlaceholder}
        style={inputStyle}
      />

      <Label>Where's it at?</Label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {spec.statuses.map((s) => (
          <Chip key={s.key} active={status === s.key} onClick={() => setStatus(s.key)}>
            {s.short}
          </Chip>
        ))}
      </div>

      {spec.fields.map((field) =>
        field.type === 'chips' ? (
          <div key={field.key}>
            <Label>{field.label}</Label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {field.options.map((opt) => {
                const value = optionValue(opt);
                return (
                  <Chip
                    key={value}
                    active={extras[field.key] === value}
                    tint={optionColor(opt)}
                    onClick={() => setExtra(field.key, extras[field.key] === value ? '' : value)}
                  >
                    {optionLabel(opt)}
                  </Chip>
                );
              })}
            </div>
          </div>
        ) : (
          <div key={field.key}>
            <Label>{field.label}</Label>
            <input
              // `money` gets a numeric keypad on a phone and a currency mark in
              // front of it; everything else is a plain text box as before.
              type={field.type === 'money' ? 'number' : 'text'}
              inputMode={field.type === 'money' ? 'decimal' : undefined}
              min={field.type === 'money' ? '0' : undefined}
              step={field.type === 'money' ? '0.01' : undefined}
              value={extras[field.key] ?? ''}
              onChange={(e) => setExtra(field.key, e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder={field.placeholder}
              style={
                field.type === 'money'
                  ? { ...inputStyle, paddingLeft: 26, backgroundImage: 'none' }
                  : inputStyle
              }
            />
            {field.type === 'money' && (
              <span
                aria-hidden="true"
                style={{ position: 'relative', top: -46, left: 13, font: `500 14px ${fonts.sans}`, color: colors.muted, height: 0, display: 'block' }}
              >
                $
              </span>
            )}
          </div>
        ),
      )}

      {spec.progress && (
        <>
          <Label>{spec.progress.label}</Label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
            <input
              type="number"
              min="0"
              value={progressCurrent}
              onChange={(e) => setProgressCurrent(e.target.value)}
              placeholder={spec.progress.current}
              style={{ ...inputStyle, marginBottom: 0 }}
            />
            <span style={{ font: `500 13px ${fonts.sans}`, color: colors.muted, flexShrink: 0 }}>of</span>
            <input
              type="number"
              min="0"
              value={progressTotal}
              onChange={(e) => setProgressTotal(e.target.value)}
              placeholder={spec.progress.total}
              style={{ ...inputStyle, marginBottom: 0 }}
            />
          </div>
        </>
      )}

      <Label>Whose is it?</Label>
      <MemberPicker value={ownerId} onChange={setOwnerId} none="Shared" />

      {spec.noteLabel && (
        <>
          <Label>{spec.noteLabel}</Label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={spec.noteLabel === 'Next step' ? 'e.g. wire up the settings screen' : 'Optional'}
            style={{ ...inputStyle, marginBottom: 0, resize: 'vertical', font: `500 14px ${fonts.sans}` }}
          />
        </>
      )}
    </ModalShell>
  );
}
