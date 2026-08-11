import { useState, useMemo } from 'react';
import { colors, shadows, fonts } from '../theme';
import { Card, Avatar } from '../components/ui';
import { MealModal } from '../components/MealModal';
import { useGroceries } from '../data/useGroceries';
import { getWeek, weekRangeLabel, dayStr } from '../dates';

const usd = (n) => `$${(Number(n) || 0).toFixed(2)}`;

// Weekly dinner planner. Pages between last week and two weeks out — the same
// window useMeals fetches, so paging never waits on the network.
export function MealsView({ mealsByKey, setMeal, removeMeal }) {
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState(null); // { date, meal: raw row | null }
  const [pushed, setPushed] = useState(null);
  const groceries = useGroceries();

  const week = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + offset * 7);
    return getWeek(base);
  }, [offset]);

  const weekWord =
    offset === -1 ? 'Last week' : offset === 0 ? 'This week' : offset === 1 ? 'Next week' : 'In two weeks';

  // Everything this week's dinners need, and what the price book thinks that
  // costs. This is the number the meal plan exists to produce.
  const weekIngredients = week.days.flatMap((d) => mealsByKey[`${dayStr(d.date)}:dinner`]?.ingredients ?? []);
  const cost = groceries.estimate(weekIngredients);

  async function shopTheWeek() {
    const result = await groceries.addIngredients(weekIngredients);
    setPushed(result);
  }

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

      {weekIngredients.length > 0 && (
        <Card style={{ padding: '16px 24px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ font: `600 14px ${fonts.sans}`, color: colors.ink }}>
              {weekIngredients.length} {weekIngredients.length === 1 ? 'ingredient' : 'ingredients'} across the week
              {cost.priced > 0 && ` · about ${usd(cost.total)}`}
            </div>
            <div style={{ font: `400 12.5px ${fonts.sans}`, color: colors.muted, marginTop: 2 }}>
              {cost.unpriced > 0
                ? `${cost.priced} priced from what you've paid before; ${cost.unpriced} ${cost.unpriced === 1 ? "hasn't" : "haven't"} been bought yet.`
                : "Every one of them priced from what you've paid before."}
            </div>
          </div>
          <button
            onClick={shopTheWeek}
            style={{ padding: '10px 18px', borderRadius: 20, background: colors.accent, color: colors.onAccent, font: `600 13px ${fonts.sans}`, boxShadow: shadows.accent, whiteSpace: 'nowrap' }}
          >
            Add to groceries
          </button>
        </Card>
      )}

      {pushed && (
        <Card style={{ padding: '14px 24px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span aria-hidden="true">🛒</span>
          <div style={{ flex: 1, font: `500 13.5px ${fonts.sans}`, color: colors.ink }}>
            {pushed.added === 0
              ? 'Everything was already on the list.'
              : `${pushed.added} added to the grocery list${pushed.skipped > 0 ? ` · ${pushed.skipped} already there` : ''}.`}
          </div>
          <button onClick={() => setPushed(null)} aria-label="Dismiss" style={{ color: colors.faint, fontSize: 15 }}>
            ×
          </button>
        </Card>
      )}

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
                  color: isToday ? colors.onAccent : colors.muted3,
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
                    {(meal.note || meal.cook || meal.ingredients.length > 0) && (
                      <div style={{ font: `400 12px ${fonts.sans}`, color: colors.muted, marginTop: 2 }}>
                        {[
                          meal.cook && `${meal.cook} cooking`,
                          meal.ingredients.length > 0 && `${meal.ingredients.length} ingredients`,
                          meal.note,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
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
