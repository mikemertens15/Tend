import { useState } from 'react';
import { colors, fonts } from '../theme';
import { Card, Check } from '../components/ui';

// Shared shopping list: add at the top, check off at the store, clear the
// checked ones when the cart's unloaded.
export function GroceriesView({ items, onAdd, onToggle, onRemove, onClearDone }) {
  const [title, setTitle] = useState('');
  const [qty, setQty] = useState('');

  const toBuy = items.filter((i) => !i.done).length;
  const checked = items.length - toBuy;

  function add() {
    if (!title.trim()) return;
    onAdd({ title, qty });
    setTitle('');
    setQty('');
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, gap: 16 }}>
        <div>
          <div style={{ font: `400 30px ${fonts.serif}`, color: colors.ink, marginBottom: 4 }}>Groceries</div>
          <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted }}>
            {toBuy === 0 ? 'The list is clear.' : `${toBuy} ${toBuy === 1 ? 'thing' : 'things'} to pick up.`}
          </div>
        </div>
        {checked > 0 && (
          <button
            onClick={onClearDone}
            style={{ padding: '9px 17px', borderRadius: 22, background: colors.chipBg, color: colors.muted2, font: `600 13px ${fonts.sans}`, whiteSpace: 'nowrap' }}
          >
            Clear checked ({checked})
          </button>
        )}
      </div>

      <Card style={{ padding: '18px 26px' }}>
        {/* add row */}
        <div style={{ display: 'flex', gap: 10, paddingBottom: 14, borderBottom: `1px solid ${colors.divider}` }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="Add an item…"
            style={{
              flex: 1,
              border: '1px solid #e5d6c3',
              background: colors.inputBg,
              borderRadius: 12,
              padding: '11px 14px',
              font: `500 14px ${fonts.sans}`,
              color: colors.ink,
              outline: 'none',
              minWidth: 0,
            }}
          />
          <input
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="qty"
            style={{
              width: 84,
              border: '1px solid #e5d6c3',
              background: colors.inputBg,
              borderRadius: 12,
              padding: '11px 12px',
              font: `500 14px ${fonts.sans}`,
              color: colors.ink,
              outline: 'none',
            }}
          />
          <button
            onClick={add}
            disabled={!title.trim()}
            style={{
              padding: '11px 18px',
              borderRadius: 12,
              background: colors.accent,
              color: '#fff',
              font: `600 13px ${fonts.sans}`,
              opacity: title.trim() ? 1 : 0.6,
              cursor: title.trim() ? 'pointer' : 'default',
            }}
          >
            Add
          </button>
        </div>

        {items.length === 0 ? (
          <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted, padding: '18px 0 6px', textAlign: 'center' }}>
            Nothing on the list — add the staples, or plan some dinners first.
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: `1px solid ${colors.divider}` }}>
              <Check done={item.done} onClick={() => onToggle(item.id)} />
              <div
                style={{
                  flex: 1,
                  font: `500 14px ${fonts.sans}`,
                  color: item.done ? colors.faint : colors.ink,
                  textDecoration: item.done ? 'line-through' : 'none',
                  minWidth: 0,
                }}
              >
                {item.title}
                {item.qty && (
                  <span style={{ font: `400 12px ${fonts.sans}`, color: colors.muted, textDecoration: 'none', marginLeft: 8 }}>
                    {item.qty}
                  </span>
                )}
              </div>
              <button
                onClick={() => onRemove(item.id)}
                aria-label={`Remove ${item.title}`}
                title="Remove"
                style={{ width: 26, height: 26, borderRadius: '50%', background: 'transparent', color: colors.faint, fontSize: 15, flexShrink: 0 }}
              >
                ×
              </button>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
