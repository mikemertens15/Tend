import { useState, useMemo } from 'react';
import { colors, fonts } from '../theme';
import { Card, Avatar } from '../components/ui';
import { MealModal } from '../components/MealModal';
import { getWeek, weekRangeLabel, dayStr } from '../dates';

// Weekly dinner planner. Pages between last week and two weeks out — the same
// window useMeals fetches, so paging never waits on the network.
export function MealsView({ mealsByKey, setMeal, removeMeal }) {
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState(null); // { date, meal: raw row | null }

  const week = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + offset * 7);
    return getWeek(base);
  }, [offset]);

  const weekWord =
    offset === -1 ? 'Last week' : offset === 0 ? 'This week' : offset === 1 ? 'Next week' : 'In two weeks';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ font: `400 30px ${fonts.serif}`, color: colors.ink, marginBottom: 4 }}>Meals</div>
          <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted }}>
            Answer "what's for dinner?" once, on Sunday.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <PagerButton disabled={offset <= -1} onClick={() => setOffset(offset - 1)} label="Previous week">
            ‹
          </PagerButton>
          <div style={{ textAlign: 'center', minWidth: 130 }}>
            <div style={{ font: `600 13.5px ${fonts.sans}`, color: colors.ink }}>{weekWord}</div>
            <div style={{ font: `400 11.5px ${fonts.sans}`, color: colors.muted }}>{weekRangeLabel(week.days)}</div>
          </div>
          <PagerButton disabled={offset >= 2} onClick={() => setOffset(offset + 1)} label="Next week">
            ›
          </PagerButton>
        </div>
      </div>

      <Card style={{ padding: '10px 26px' }}>
        {week.days.map((d, i) => {
          const date = dayStr(d.date);
          const meal = mealsByKey[`${date}:dinner`];
          const isToday = offset === 0 && i === week.todayIndex;
          return (
            <button
              key={date}
              onClick={() => setEditing({ date, meal: meal?.raw ?? null })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                width: '100%',
                textAlign: 'left',
                padding: '14px 0',
                borderTop: i > 0 ? `1px solid ${colors.divider}` : 'none',
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 13,
                  background: isToday ? colors.accent : colors.chipBg,
                  color: isToday ? '#fff' : colors.muted3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <div style={{ font: `600 10px ${fonts.sans}`, textTransform: 'uppercase', letterSpacing: '.04em' }}>{d.dow}</div>
                <div style={{ font: `600 15px ${fonts.sans}`, marginTop: 1 }}>{d.num}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {meal ? (
                  <>
                    <div style={{ font: `600 14.5px ${fonts.sans}`, color: colors.ink }}>{meal.title}</div>
                    {(meal.note || meal.cook) && (
                      <div style={{ font: `400 12px ${fonts.sans}`, color: colors.muted, marginTop: 2 }}>
                        {[meal.cook && `${meal.cook} cooking`, meal.note].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.faint }}>Nothing planned yet</div>
                )}
              </div>
              {meal?.cook && <Avatar who={meal.cook} size={32} />}
              <span style={{ font: `500 12.5px ${fonts.sans}`, color: colors.accent, flexShrink: 0 }}>
                {meal ? 'Edit' : 'Plan'}
              </span>
            </button>
          );
        })}
      </Card>

      {editing && (
        <MealModal
          date={editing.date}
          meal={editing.meal}
          onClose={() => setEditing(null)}
          onSave={setMeal}
          onRemove={removeMeal}
        />
      )}
    </div>
  );
}

function PagerButton({ disabled, onClick, label, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        width: 34,
        height: 34,
        borderRadius: '50%',
        background: colors.chipBg,
        color: disabled ? colors.faint : colors.muted3,
        fontSize: 18,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'default' : 'pointer',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}
