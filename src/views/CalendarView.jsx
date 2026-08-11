import { colors, tone, fonts } from '../theme';
import { weekRangeLabel, dayStr } from '../dates';
import { useIsNarrow } from '../useMediaQuery';
import { useHousehold } from '../household/HouseholdProvider';
import { Card } from '../components/ui';

function chipColor(t, peopleMap) {
  if (t.done) return tone.green;
  if (t.dueType === 'overdue') return tone.red;
  return peopleMap[t.who] ? peopleMap[t.who].bg : tone.amber;
}

export function CalendarView({ tasks, week }) {
  const narrow = useIsNarrow();
  const { peopleMap } = useHousehold();
  const { days, todayIndex } = week;

  // Tasks carry a real date now, so a column is "everything due on this date"
  // rather than a stored 0–6 slot. The trade is that anything overdue falls
  // outside the grid entirely — hence the strip above it, which is where an
  // overdue chore ought to be anyway.
  const monday = dayStr(days[0].date);
  const overdue = tasks
    .filter((t) => !t.done && t.dueOn < monday)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <div>
      <div style={{ font: `400 30px ${fonts.serif}`, color: colors.ink, marginBottom: 4 }}>This week</div>
      <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted, marginBottom: 20 }}>
        {weekRangeLabel(days)} · everything due, by day.
      </div>

      {overdue.length > 0 && (
        <Card style={{ padding: '14px 20px', marginBottom: 14, borderColor: tone.red }}>
          <div style={{ font: `600 11px ${fonts.sans}`, color: tone.red, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>
            Ran late · {overdue.length}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {overdue.map((t) => (
              <span
                key={t.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '6px 12px',
                  borderRadius: 18,
                  background: colors.inputBg,
                  font: `500 12px ${fonts.sans}`,
                  color: colors.ink,
                }}
              >
                {t.title}
                <span style={{ font: `600 11px ${fonts.sans}`, color: tone.red }}>{t.dueLabel}</span>
              </span>
            ))}
          </div>
        </Card>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: narrow ? '1fr' : 'repeat(7,1fr)',
          gap: 10,
        }}
      >
        {days.map((d, i) => {
          const isToday = i === todayIndex;
          const items = tasks.filter((t) => t.dueOn === dayStr(d.date));
          return (
            <div
              key={d.dow}
              style={{
                background: isToday ? colors.todayBg : colors.card,
                border: `1px solid ${isToday ? colors.selected : colors.cardBorder}`,
                borderRadius: 14,
                padding: '12px 10px',
                minHeight: narrow ? 'auto' : 260,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <div style={{ font: `600 12px ${fonts.sans}`, color: colors.muted2, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  {d.dow}
                </div>
                <div
                  style={
                    isToday
                      ? { width: 22, height: 22, borderRadius: '50%', background: colors.accent, color: colors.onAccent, font: `600 12px ${fonts.sans}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }
                      : { font: `600 13px ${fonts.sans}`, color: colors.ink }
                  }
                >
                  {d.num}
                </div>
              </div>

              {items.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    gap: 6,
                    alignItems: 'flex-start',
                    background: colors.inputBg,
                    borderRadius: 8,
                    padding: '7px 8px',
                    marginBottom: 6,
                    opacity: t.done ? 0.55 : 1,
                  }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: chipColor(t, peopleMap), flexShrink: 0, marginTop: 4 }} />
                  <div style={{ font: `500 11px ${fonts.sans}`, color: colors.ink, lineHeight: 1.25, overflow: 'hidden' }}>
                    {t.title}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
