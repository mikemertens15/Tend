import { useState, useMemo } from 'react';
import { colors, tone, shadows, fonts } from '../theme';
import { Card, Check, ProgressBar } from '../components/ui';
import { useIsNarrow } from '../useMediaQuery';
import { useGroceries, AISLES } from '../data/useGroceries';
import { GroceryItemModal } from '../components/GroceryItemModal';
import { ShoppingSetupModal } from '../components/ShoppingSetupModal';

const usd = (n) => `$${(Number(n) || 0).toFixed(2)}`;

// The list, and the money. Two jobs on one screen because they're really the
// same job: what goes in the cart is decided by what it costs.
export function GroceriesView() {
  const narrow = useIsNarrow();
  const g = useGroceries();
  const { items, stores, cart, budget, history } = g;

  const [title, setTitle] = useState('');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('other');
  const [storeId, setStoreId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);

  // The whole reason purchases are archived rather than deleted: this line.
  const { suggestPrice } = g;
  const remembered = useMemo(() => suggestPrice(title, storeId), [suggestPrice, title, storeId]);

  function add() {
    if (!title.trim()) return;
    g.addItem({ title, qty, price, category, storeId });
    setTitle('');
    setQty('');
    setPrice('');
    setCategory('other');
  }

  async function finish() {
    const result = await g.finishTrip(storeId);
    if (result) setReceipt(result);
  }

  // Grouped by aisle so the list reads in roughly walking order.
  const groups = AISLES.map(([key, label, icon]) => ({
    key,
    label,
    icon,
    rows: items.filter((i) => i.category === key),
  })).filter((grp) => grp.rows.length > 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ font: `400 30px ${fonts.serif}`, color: colors.ink, marginBottom: 4 }}>Groceries</div>
          <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted }}>
            {cart.toBuy === 0 ? 'The list is clear.' : `${cart.toBuy} ${cart.toBuy === 1 ? 'thing' : 'things'} to pick up`}
            {cart.total > 0 && ` · ${usd(cart.total)} in the cart`}
          </div>
        </div>
        <button
          onClick={() => setSetupOpen(true)}
          style={{ padding: '9px 17px', borderRadius: 22, background: colors.chipBg, color: colors.muted3, font: `600 13px ${fonts.sans}`, whiteSpace: 'nowrap' }}
        >
          Stores & budget
        </button>
      </div>

      {budget.set ? (
        <Card style={{ padding: '18px 24px', marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
            <div style={{ font: `600 13.5px ${fonts.sans}`, color: colors.ink }}>
              {usd(budget.projected)}{' '}
              <span style={{ font: `400 13px ${fonts.sans}`, color: colors.muted }}>
                of {usd(budget.amount)} {budget.periodLabel}
              </span>
            </div>
            <div style={{ font: `600 12.5px ${fonts.sans}`, color: budget.over ? tone.red : tone.green }}>
              {budget.over ? `${usd(-budget.remaining)} over` : `${usd(budget.remaining)} left`}
            </div>
          </div>
          <ProgressBar pct={budget.pct} height={8} fill={budget.over ? tone.red : colors.accent} />
          <div style={{ font: `400 11.5px ${fonts.sans}`, color: colors.faint, marginTop: 8 }}>
            {budget.tripCount} {budget.tripCount === 1 ? 'trip' : 'trips'} since {budget.since} · {usd(budget.spent)}
            {cart.total > 0 && ` · plus ${usd(cart.total)} in the cart`}
          </div>
        </Card>
      ) : (
        <Card style={{ padding: '16px 24px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, font: `400 13.5px ${fonts.sans}`, color: colors.muted }}>
            Set a weekly or monthly budget and every trip counts against it.
          </div>
          <button
            onClick={() => setSetupOpen(true)}
            style={{ padding: '8px 15px', borderRadius: 20, background: colors.accent, color: colors.onAccent, font: `600 12.5px ${fonts.sans}`, boxShadow: shadows.accent }}
          >
            Set a budget
          </button>
        </Card>
      )}

      {stores.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ font: `600 11px ${fonts.sans}`, color: colors.faint, letterSpacing: '.06em', textTransform: 'uppercase' }}>
            Shopping at
          </span>
          <button onClick={() => setStoreId(null)} style={chipStyle(storeId === null)}>
            Anywhere
          </button>
          {stores.map((s) => (
            <button key={s.id} onClick={() => setStoreId(s.id)} style={chipStyle(storeId === s.id)}>
              {s.name}
            </button>
          ))}
        </div>
      )}

      <Card style={{ padding: '18px 24px', marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingBottom: 14, borderBottom: `1px solid ${colors.divider}` }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="Add an item…"
            style={{ ...fieldStyle, flex: '3 1 180px' }}
          />
          <input
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="qty"
            style={{ ...fieldStyle, flex: '0 1 84px' }}
          />
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            inputMode="decimal"
            placeholder={remembered ? usd(remembered.price) : '$'}
            style={{ ...fieldStyle, flex: '0 1 92px' }}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Aisle"
            style={{ ...fieldStyle, flex: narrow ? '1 1 140px' : '0 1 152px', cursor: 'pointer' }}
          >
            {AISLES.map(([key, label, icon]) => (
              <option key={key} value={key}>
                {icon} {label}
              </option>
            ))}
          </select>
          <button
            onClick={add}
            disabled={!title.trim()}
            style={{
              padding: '11px 18px',
              borderRadius: 12,
              background: colors.accent,
              color: colors.onAccent,
              font: `600 13px ${fonts.sans}`,
              opacity: title.trim() ? 1 : 0.6,
              cursor: title.trim() ? 'pointer' : 'default',
              flex: '0 0 auto',
            }}
          >
            Add
          </button>
        </div>

        {remembered && (
          <div style={{ font: `500 12px ${fonts.sans}`, color: colors.accent, paddingTop: 10 }}>
            Last paid {usd(remembered.price)}
            {remembered.storeName ? ` at ${remembered.storeName}` : ''} on {remembered.on}
            {!remembered.sameStore && remembered.storeName ? ' (different store)' : ''} — leave the price blank to use it.
          </div>
        )}

        {items.length === 0 ? (
          <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted, padding: '22px 0 6px', textAlign: 'center' }}>
            Nothing on the list — add the staples, or plan some dinners first.
          </div>
        ) : (
          groups.map((grp) => (
            <div key={grp.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, font: `600 11px ${fonts.sans}`, color: colors.faint, letterSpacing: '.06em', textTransform: 'uppercase', margin: '18px 0 2px' }}>
                <span aria-hidden="true">{grp.icon}</span>
                {grp.label}
              </div>
              {grp.rows.map((item) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 0', borderBottom: `1px solid ${colors.divider}` }}>
                  <Check done={item.done} onClick={() => g.toggle(item.id)} />
                  <button
                    onClick={() => setEditing(item)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      textAlign: 'left',
                      font: `500 14px ${fonts.sans}`,
                      color: item.done ? colors.faint : colors.ink,
                      textDecoration: item.done ? 'line-through' : 'none',
                    }}
                  >
                    {item.title}
                    {item.qty && (
                      <span style={{ font: `400 12px ${fonts.sans}`, color: colors.muted, textDecoration: 'none', marginLeft: 8 }}>
                        {item.qty}
                      </span>
                    )}
                  </button>
                  <span
                    style={{
                      font: `600 13px ${fonts.mono}`,
                      color: item.price == null ? colors.faint : item.done ? colors.muted : colors.muted3,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {item.price == null ? '—' : usd(item.price)}
                  </span>
                  <button
                    onClick={() => g.removeItem(item.id)}
                    aria-label={`Remove ${item.title}`}
                    title="Remove"
                    style={{ width: 26, height: 26, borderRadius: '50%', color: colors.faint, fontSize: 15, flexShrink: 0 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ))
        )}

        {items.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingTop: 14, flexWrap: 'wrap' }}>
            <div style={{ font: `400 12.5px ${fonts.sans}`, color: colors.muted }}>
              {cart.unpriced > 0
                ? `${cart.unpriced} ${cart.unpriced === 1 ? 'item has' : 'items have'} no price yet — the total is short by whatever they cost.`
                : 'Everything on the list is priced.'}
            </div>
            <div style={{ font: `600 15px ${fonts.mono}`, color: colors.ink }}>{usd(cart.total)}</div>
          </div>
        )}
      </Card>

      {cart.checkedCount > 0 && (
        <Card style={{ padding: '18px 24px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ font: `600 14px ${fonts.sans}`, color: colors.ink }}>
              {cart.checkedCount} {cart.checkedCount === 1 ? 'item' : 'items'} checked off · {usd(cart.checkedTotal)}
            </div>
            <div style={{ font: `400 12.5px ${fonts.sans}`, color: colors.muted, marginTop: 2 }}>
              Finishing the trip files them against the budget and remembers what you paid.
            </div>
          </div>
          <button
            onClick={g.clearDone}
            style={{ padding: '9px 15px', borderRadius: 20, background: 'transparent', border: `1px solid ${colors.cardBorder}`, color: colors.muted2, font: `600 12.5px ${fonts.sans}`, whiteSpace: 'nowrap' }}
          >
            Just clear them
          </button>
          <button
            onClick={finish}
            style={{ padding: '10px 18px', borderRadius: 20, background: colors.accent, color: colors.onAccent, font: `600 13px ${fonts.sans}`, boxShadow: shadows.accent, whiteSpace: 'nowrap' }}
          >
            Finish trip
          </button>
        </Card>
      )}

      {receipt && (
        <Card style={{ padding: '14px 24px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span aria-hidden="true">✅</span>
          <div style={{ flex: 1, font: `500 13.5px ${fonts.sans}`, color: colors.ink }}>
            Trip logged — {receipt.count} {receipt.count === 1 ? 'item' : 'items'}, {usd(receipt.total)}.
          </div>
          <button onClick={() => setReceipt(null)} aria-label="Dismiss" style={{ color: colors.faint, fontSize: 15 }}>
            ×
          </button>
        </Card>
      )}

      {history.length > 0 && (
        <>
          <div style={{ font: `400 22px ${fonts.serif}`, color: colors.ink, marginBottom: 10 }}>Recent trips</div>
          <Card style={{ padding: '6px 24px 10px' }}>
            {history.slice(0, 8).map((t, i) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i > 0 ? `1px solid ${colors.divider}` : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: `600 13.5px ${fonts.sans}`, color: colors.ink }}>{t.store ?? 'Shopping trip'}</div>
                  <div style={{ font: `400 12px ${fonts.sans}`, color: colors.muted, marginTop: 1 }}>
                    {t.date} · {t.itemCount} {t.itemCount === 1 ? 'item' : 'items'}
                  </div>
                </div>
                <div style={{ font: `600 13.5px ${fonts.mono}`, color: colors.muted3, flexShrink: 0 }}>{usd(t.total)}</div>
              </div>
            ))}
          </Card>
        </>
      )}

      {editing && (
        <GroceryItemModal
          item={editing}
          stores={stores}
          suggestPrice={g.suggestPrice}
          onClose={() => setEditing(null)}
          onSave={(patch) => g.updateItem(editing.id, patch)}
          onRemove={g.removeItem}
        />
      )}
      {setupOpen && (
        <ShoppingSetupModal
          stores={stores}
          budget={budget}
          onAddStore={g.addStore}
          onRemoveStore={g.removeStore}
          onSetBudget={g.setBudget}
          onClose={() => setSetupOpen(false)}
        />
      )}
    </div>
  );
}

const fieldStyle = {
  border: `1px solid ${colors.inputBorder}`,
  background: colors.inputBg,
  borderRadius: 12,
  padding: '11px 13px',
  font: `500 14px ${fonts.sans}`,
  color: colors.ink,
  outline: 'none',
  minWidth: 0,
};

const chipStyle = (active) =>
  active
    ? { padding: '6px 13px', borderRadius: 18, background: colors.accent, color: colors.onAccent, font: `600 12.5px ${fonts.sans}` }
    : { padding: '6px 13px', borderRadius: 18, background: colors.card, border: `1px solid ${colors.cardBorder}`, color: colors.muted2, font: `500 12.5px ${fonts.sans}` };
