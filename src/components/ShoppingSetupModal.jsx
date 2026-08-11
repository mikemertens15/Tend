import { useState } from 'react';
import { colors, fonts } from '../theme';
import { ModalShell, Label, Chip, inputStyle, PrimaryButton, GhostButton } from './Modal';
import { COMMON_STORES, BUDGET_PERIODS } from '../data/useGroceries';

// Where you shop and what you mean to spend. Both live here because they're
// the two things you set once and then forget about.
export function ShoppingSetupModal({ stores, budget, onAddStore, onRemoveStore, onSetBudget, onClose }) {
  const [amount, setAmount] = useState(budget.amount ? String(budget.amount) : '');
  const [period, setPeriod] = useState(budget.period);
  const [custom, setCustom] = useState('');

  const have = new Set(stores.map((s) => s.name.toLowerCase()));
  const suggestions = COMMON_STORES.filter((n) => !have.has(n.toLowerCase()));

  function addCustom() {
    const name = custom.trim();
    if (!name) return;
    onAddStore(name);
    setCustom('');
  }

  function save() {
    onSetBudget(amount === '' ? 0 : Number(amount), period);
    onClose();
  }

  return (
    <ModalShell
      title="Stores & budget"
      onClose={onClose}
      footer={
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <GhostButton onClick={onClose}>Close</GhostButton>
          <PrimaryButton onClick={save}>Save budget</PrimaryButton>
        </div>
      }
    >
      <Label>Your stores</Label>
      {stores.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {stores.map((s) => (
            <span
              key={s.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 8px 8px 14px',
                borderRadius: 12,
                background: colors.chipBg,
                color: colors.muted3,
                font: `600 12.5px ${fonts.sans}`,
              }}
            >
              {s.name}
              <button
                onClick={() => onRemoveStore(s.id)}
                aria-label={`Remove ${s.name}`}
                title="Remove"
                style={{ width: 18, height: 18, borderRadius: '50%', color: colors.muted, fontSize: 14, lineHeight: 1 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCustom()}
          placeholder="Add a store by name…"
          style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
        />
        <button
          onClick={addCustom}
          disabled={!custom.trim()}
          style={{
            padding: '12px 18px',
            borderRadius: 12,
            background: colors.chipBg,
            color: colors.muted3,
            font: `600 13px ${fonts.sans}`,
            opacity: custom.trim() ? 1 : 0.6,
            flexShrink: 0,
          }}
        >
          Add
        </button>
      </div>

      {suggestions.length > 0 && (
        <>
          <div style={{ font: `400 12px ${fonts.sans}`, color: colors.muted, marginBottom: 8 }}>
            Or tap a common one:
          </div>
          <div style={{ display: 'flex', gap: 7, marginBottom: 24, flexWrap: 'wrap' }}>
            {suggestions.map((name) => (
              <button
                key={name}
                onClick={() => onAddStore(name)}
                style={{
                  padding: '7px 12px',
                  borderRadius: 18,
                  background: colors.inputBg,
                  border: `1px solid ${colors.cardBorder}`,
                  color: colors.muted2,
                  font: `500 12px ${fonts.sans}`,
                }}
              >
                + {name}
              </button>
            ))}
          </div>
        </>
      )}

      <Label>Grocery budget</Label>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
        <span style={{ font: `500 15px ${fonts.sans}`, color: colors.muted2 }}>$</span>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          inputMode="decimal"
          placeholder="e.g. 600"
          style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
        />
        <span style={{ font: `500 13px ${fonts.sans}`, color: colors.muted, flexShrink: 0 }}>per</span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {BUDGET_PERIODS.map(([key, label]) => (
          <Chip key={key} active={period === key} onClick={() => setPeriod(key)}>
            {label}
          </Chip>
        ))}
      </div>
      <div style={{ font: `400 12px/1.5 ${fonts.sans}`, color: colors.muted, marginTop: 12 }}>
        Spending is counted from finished trips {period === 'week' ? 'this week' : 'this month'}, plus whatever's
        currently in the cart. Set it to 0 to turn the budget off.
      </div>
    </ModalShell>
  );
}
