import { useState } from 'react';
import { colors, fonts } from '../theme';
import { ModalShell, Label, Chip, inputStyle, PrimaryButton, GhostButton, DeleteButton } from './Modal';
import { FACT_CATEGORIES } from '../data/useHouseFacts';

// One fact. `fact` may be a saved row (edit), a half-filled suggestion with a
// null id (pre-seeded add), or null (blank add).
export function HouseFactModal({ fact, onClose, onSave, onDelete }) {
  const editing = Boolean(fact?.id);

  const [category, setCategory] = useState(fact?.category ?? 'filters');
  const [label, setLabel] = useState(fact?.label ?? '');
  const [value, setValue] = useState(fact?.value ?? '');
  const [detail, setDetail] = useState(fact?.detail ?? '');
  const [location, setLocation] = useState(fact?.location ?? '');
  const [secret, setSecret] = useState(fact?.secret ?? false);
  const [shareable, setShareable] = useState(fact?.shareable ?? false);

  function submit() {
    if (!label.trim() || !value.trim()) return;
    onSave({
      category,
      label: label.trim(),
      value: value.trim(),
      detail: detail.trim() || null,
      location: location.trim() || null,
      secret,
      shareable,
    });
    onClose();
  }

  return (
    <ModalShell
      title={editing ? 'Edit fact' : 'Add a fact'}
      onClose={onClose}
      footer={
        <>
          {editing && (
            <DeleteButton
              onClick={() => {
                onDelete(fact.id);
                onClose();
              }}
            >
              Delete
            </DeleteButton>
          )}
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={submit}>{editing ? 'Save' : 'Add fact'}</PrimaryButton>
        </>
      }
    >
      <Label>What kind?</Label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {FACT_CATEGORIES.map(([key, name, icon]) => (
          <Chip key={key} active={category === key} onClick={() => setCategory(key)}>
            {icon} {name}
          </Chip>
        ))}
      </div>

      <Label>What is it?</Label>
      <input
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="e.g. Furnace filter"
        style={inputStyle}
      />

      <Label>The answer</Label>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="e.g. 20x25x1 MERV 11"
        style={{ ...inputStyle, font: `600 14px ${fonts.mono}` }}
      />

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Label>Detail</Label>
          <input
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="e.g. Honeywell, 2-pack"
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Label>Where</Label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Basement, north wall"
            style={inputStyle}
          />
        </div>
      </div>

      <Toggle
        on={secret}
        onClick={() => setSecret((s) => !s)}
        icon={secret ? '🙈' : '👁️'}
        title="Hide the value until tapped"
        blurb="Cover from a passing glance at the kitchen tablet — it's still stored as plain text, so don't put anything that really matters in here."
      />

      <Toggle
        on={shareable}
        onClick={() => setShareable((s) => !s)}
        icon={shareable ? '🔗' : '🔒'}
        title="A sitter can see this"
        blurb={
          shareable
            ? 'Shows in full on any sitter link that includes house facts — including hidden values, which are not masked there.'
            : 'Off by default. Nothing about the house appears on a sitter link unless you tick it here.'
        }
      />
    </ModalShell>
  );
}

function Toggle({ on, onClick, icon, title, blurb }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 11,
        width: '100%',
        padding: '12px 14px',
        borderRadius: 12,
        marginBottom: 10,
        background: on ? colors.chipBg : colors.inputBg,
        border: `1px solid ${on ? colors.selected : colors.cardBorder}`,
        textAlign: 'left',
      }}
    >
      <span style={{ fontSize: 15, lineHeight: 1.2 }}>{icon}</span>
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', font: `600 13px ${fonts.sans}`, color: colors.ink }}>{title}</span>
        <span style={{ display: 'block', font: `400 11.5px/1.5 ${fonts.sans}`, color: colors.muted, marginTop: 2 }}>
          {blurb}
        </span>
      </span>
    </button>
  );
}
