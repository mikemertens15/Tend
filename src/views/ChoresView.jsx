import { useState } from 'react';
import { colors, shadows, fonts, catLabel } from '../theme';
import { Card } from '../components/ui';
import { TaskRow } from '../components/TaskRow';
import { useHousehold } from '../household/HouseholdProvider';

export function ChoresView({ tasks, onToggle, onAdd }) {
  const [filter, setFilter] = useState('all');
  const { order } = useHousehold();

  const chores = tasks.filter((t) => t.cat === 'chore');
  const visible = chores
    .filter((t) => filter === 'all' || t.who === filter)
    // Open work first, most overdue at the top; finished chores sink.
    .sort((a, b) => Number(a.done) - Number(b.done) || a.daysLeft - b.daysLeft);
  const done = chores.filter((t) => t.done).length;

  const chips = [['all', 'Everyone'], ...order.map((n) => [n, n])];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <div style={{ font: `400 30px ${fonts.serif}`, color: colors.ink }}>Chores</div>
          <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted, marginTop: 2 }}>
            {done} of {chores.length} chores done
          </div>
        </div>
        <button
          onClick={onAdd}
          style={{ padding: '9px 17px', borderRadius: 22, background: colors.accent, color: colors.onAccent, font: `600 13px ${fonts.sans}`, boxShadow: shadows.accent }}
        >
          + Add chore
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {chips.map(([key, label]) => {
          const active = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={
                active
                  ? { padding: '7px 15px', borderRadius: 20, background: colors.accent, color: colors.onAccent, font: `600 12.5px ${fonts.sans}` }
                  : { padding: '7px 15px', borderRadius: 20, background: colors.card, border: `1px solid ${colors.cardBorder}`, color: colors.muted2, font: `500 12.5px ${fonts.sans}` }
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      <Card style={{ padding: '6px 26px 10px' }}>
        {visible.length === 0 ? (
          <div style={{ padding: '28px 0', textAlign: 'center', font: `400 14px ${fonts.sans}`, color: colors.muted }}>
            Nothing here yet.
          </div>
        ) : (
          visible.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              showAvatar
              subtitle={[catLabel[t.cat], t.who ?? 'Anyone', t.repeatLabel].filter(Boolean).join(' · ')}
              onToggle={onToggle}
              pad={15}
            />
          ))
        )}
      </Card>
    </div>
  );
}
