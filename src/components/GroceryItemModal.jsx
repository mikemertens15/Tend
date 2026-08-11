import { useState } from 'react';
import { colors, fonts } from '../theme';
import { ModalShell, Label, Chip, inputStyle, PrimaryButton, GhostButton, DeleteButton } from './Modal';
import { AISLES } from '../data/useGroceries';

const usd = (n) => `$${(Number(n) || 0).toFixed(2)}`;

// Edit one line of the list — price, aisle, quantity, which store it's for.
export function GroceryItemModal({ item, stores, suggestPrice, onClose, onSave, onRemove }) {
  const [title, setTitle] = useState(item.title);
  const [qty, setQty] = useState(item.qty ?? '');
  const [price, setPrice] = useState(item.price == null ? '' : String(item.price));
  const [category, setCategory] = useState(item.category);
  const [storeId, setStoreId] = useState(item.storeId ?? null);

  const remembered = suggestPrice(title, storeId);

  function submit() {
    if (!title.trim()) return;
    onSave({ title, qty, price, category, storeId });
    onClose();
  }

  return (
    <ModalShell
      title="Edit item"
      onClose={onClose}
      footer={
        <>
          <DeleteButton
            onClick={() => {
              onRemove(item.id);
              onClose();
            }}
          >
            Remove
          </DeleteButton>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={submit}>Save</PrimaryButton>
        </>
      }
    >
      <Label>Item</Label>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        style={inputStyle}
      />

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Label>Quantity</Label>
          <input
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="e.g. 2 lbs"
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Label>Price</Label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            inputMode="decimal"
            placeholder={remembered ? usd(remembered.price) : '0.00'}
            style={inputStyle}
          />
        </div>
      </div>

      {remembered && (
        <div style={{ font: `500 12px ${fonts.sans}`, color: colors.accent, margin: '-12px 0 20px' }}>
          Last paid {usd(remembered.price)}
          {remembered.storeName ? ` at ${remembered.storeName}` : ''} on {remembered.on}.
        </div>
      )}

      <Label>Aisle</Label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {AISLES.map(([key, label, icon]) => (
          <Chip key={key} active={category === key} onClick={() => setCategory(key)}>
            {icon} {label}
          </Chip>
        ))}
      </div>

      {stores.length > 0 && (
        <>
          <Label>Buy it at</Label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 0, flexWrap: 'wrap' }}>
            <Chip active={storeId === null} onClick={() => setStoreId(null)}>
              Anywhere
            </Chip>
            {stores.map((s) => (
              <Chip key={s.id} active={storeId === s.id} onClick={() => setStoreId(s.id)}>
                {s.name}
              </Chip>
            ))}
          </div>
        </>
      )}
    </ModalShell>
  );
}
