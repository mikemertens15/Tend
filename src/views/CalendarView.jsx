import { useState, useMemo } from 'react';
import { colors, tone, shadows, fonts } from '../theme';
import { weekRangeLabel, dayStr, addDays, parseDay, getWeek } from '../dates';
import { useIsNarrow } from '../useMediaQuery';
import { useHousehold } from '../household/HouseholdProvider';
import { useEvents } from '../data/useEvents';
import { EventModal } from '../components/EventModal';
import { DisplaySetupModal } from '../components/DisplaySetupModal';
import { Card } from '../components/ui';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOWS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function chipColor(t, peopleMap) {
  if (t.done) return tone.green;
  if (t.dueType === 'overdue') return tone.red;
  return peopleMap[t.who] ? peopleMap[t.who].bg : tone.amber;
}

// The household calendar: chores and everything else, on the same grid.
// Week view is the working view; month is the planning one.
export function CalendarView({ tasks, navigate }) {
  const narrow = useIsNarrow();
  const { peopleMap } = useHousehold();
  const ev = useEvents();

  const [mode, setMode] = useState('week');
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState(null); // { date, event } | null
  const [displayOpen, setDisplayOpen] = useState(false);

  const today = dayStr();

  // The visible window, in both modes, as a flat list of day cells.
  const view = useMemo(() => {
    if (mode === 'week') {
      const base = new Date();
      base.setDate(base.getDate() + offset * 7);
      const w = getWeek(base);
      return {
        title: offset === 0 ? 'This week' : offset === -1 ? 'Last week' : offset === 1 ? 'Next week' : weekRangeLabel(w.days),
        subtitle: weekRangeLabel(w.days),
        days: w.days.map((d) => ({ date: dayStr(d.date), num: d.num, dow: d.dow, inMonth: true })),
      };
    }
    // Month: pad to whole Monday-start weeks so the grid is rectangular.
    const anchor = new Date();
    anchor.setDate(1);
    anchor.setMonth(anchor.getMonth() + offset);
    const year = anchor.getFullYear();
    const month = anchor.getMonth();
    const first = new Date(year, month, 1);
    const lead = (first.getDay() + 6) % 7;
    const start = addDays(dayStr(first), -lead);
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const date = addDays(start, i);
      const d = parseDay(date);
      cells.push({ date, num: d.getDate(), dow: DOWS[(d.getDay() + 6) % 7], inMonth: d.getMonth() === month });
      // Stop after the last full week containing the month.
      if (i >= 27 && d.getMonth() !== month && (i + 1) % 7 === 0) break;
    }
    return { title: `${MONTHS[month]} ${year}`, subtitle: null, days: cells };
  }, [mode, offset]);

  const from = view.days[0].date;
  const to = view.days.at(-1).date;
  const events = ev.between(from, to);

  const byDay = useMemo(() => {
    const m = {};
    for (const d of view.days) m[d.date] = { tasks: [], events: [] };
    for (const t of tasks) if (m[t.dueOn]) m[t.dueOn].tasks.push(t);
    for (const e of events) if (m[e.date]) m[e.date].events.push(e);
    return m;
  }, [view.days, tasks, events]);

  // Anything overdue sits before this window entirely, which is where an
  // overdue chore belongs anyway.
  const overdue = tasks.filter((t) => !t.done && t.dueOn < from).sort((a, b) => a.daysLeft - b.daysLeft);
  const cellMin = mode === 'month' ? (narrow ? 'auto' : 112) : narrow ? 'auto' : 240;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <div style={{ font: `400 30px ${fonts.serif}`, color: colors.ink }}>{view.title}</div>
          <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted, marginTop: 2 }}>
            {view.subtitle ? `${view.subtitle} · ` : ''}
            Chores, birthdays and everything else.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 3, background: colors.inputBg, borderRadius: 20, padding: 3 }}>
            {['week', 'month'].map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setOffset(0);
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: 18,
                  background: mode === m ? colors.accent : 'transparent',
                  color: mode === m ? colors.onAccent : colors.muted2,
                  font: `${mode === m ? 600 : 500} 12.5px ${fonts.sans}`,
                  textTransform: 'capitalize',
                }}
              >
                {m}
              </button>
            ))}
          </div>
          <Pager onClick={() => setOffset(offset - 1)} label="Previous">
            ‹
          </Pager>
          {offset !== 0 && (
            <button
              onClick={() => setOffset(0)}
              style={{ font: `600 12.5px ${fonts.sans}`, color: colors.accent, padding: '0 4px' }}
            >
              Today
            </button>
          )}
          <Pager onClick={() => setOffset(offset + 1)} label="Next">
            ›
          </Pager>
          <button
            onClick={() => setDisplayOpen(true)}
            title="Put this on a kitchen tablet or TV"
            style={{ padding: '9px 15px', borderRadius: 22, background: colors.chipBg, color: colors.muted3, font: `600 12.5px ${fonts.sans}`, whiteSpace: 'nowrap' }}
          >
            📺 Kitchen display
          </button>
          <button
            onClick={() => setEditing({ date: today, event: null })}
            style={{ padding: '9px 16px', borderRadius: 22, background: colors.accent, color: colors.onAccent, font: `600 13px ${fonts.sans}`, boxShadow: shadows.accent, whiteSpace: 'nowrap' }}
          >
            + Event
          </button>
        </div>
      </div>

      {overdue.length > 0 && offset === 0 && (
        <Card style={{ padding: '13px 20px', marginBottom: 14, borderColor: tone.red }}>
          <div style={{ font: `600 11px ${fonts.sans}`, color: tone.red, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 9 }}>
            Ran late · {overdue.length}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {overdue.map((t) => (
              <span
                key={t.id}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 18, background: colors.inputBg, font: `500 12px ${fonts.sans}`, color: colors.ink }}
              >
                {t.title}
                <span style={{ font: `600 11px ${fonts.sans}`, color: tone.red }}>{t.dueLabel}</span>
              </span>
            ))}
          </div>
        </Card>
      )}

      {mode === 'month' && !narrow && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 10, marginBottom: 6 }}>
          {DOWS.map((d) => (
            <div key={d} style={{ font: `600 10.5px ${fonts.sans}`, color: colors.faint, letterSpacing: '.06em', textTransform: 'uppercase', paddingLeft: 4 }}>
              {d}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : 'repeat(7,1fr)', gap: 10 }}>
        {view.days.map((d) => {
          const isToday = d.date === today;
          const cell = byDay[d.date];
          const dim = mode === 'month' && !d.inMonth;
          // On a phone the grid becomes a list, so empty days are just noise.
          if (narrow && cell.tasks.length === 0 && cell.events.length === 0 && !isToday) return null;

          return (
            <div
              key={d.date}
              style={{
                background: isToday ? colors.todayBg : colors.card,
                border: `1px solid ${isToday ? colors.selected : colors.cardBorder}`,
                borderRadius: 14,
                padding: '11px 10px',
                minHeight: cellMin,
                opacity: dim ? 0.45 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <div style={{ font: `600 11px ${fonts.sans}`, color: colors.muted2, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  {mode === 'week' || narrow ? d.dow : ''}
                </div>
                <button
                  onClick={() => setEditing({ date: d.date, event: null })}
                  title="Add an event"
                  style={
                    isToday
                      ? { width: 22, height: 22, borderRadius: '50%', background: colors.accent, color: colors.onAccent, font: `600 12px ${fonts.sans}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }
                      : { font: `600 13px ${fonts.sans}`, color: colors.ink }
                  }
                >
                  {d.num}
                </button>
              </div>

              {cell.events.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setEditing({ date: e.date, event: e.raw })}
                  style={{
                    display: 'flex',
                    gap: 6,
                    alignItems: 'flex-start',
                    width: '100%',
                    textAlign: 'left',
                    background: colors.chipBg,
                    borderRadius: 8,
                    padding: '6px 8px',
                    marginBottom: 5,
                    opacity: e.continuation ? 0.6 : 1,
                  }}
                >
                  <span aria-hidden="true" style={{ fontSize: 11, lineHeight: 1.35 }}>
                    {e.icon}
                  </span>
                  <span style={{ font: `600 11px ${fonts.sans}`, color: colors.ink, lineHeight: 1.3, minWidth: 0 }}>
                    {e.title}
                    {e.age != null && e.age > 0 && ` (${e.age})`}
                    {e.time && (
                      <span style={{ display: 'block', font: `500 10px ${fonts.sans}`, color: colors.muted }}>
                        {e.time}
                      </span>
                    )}
                  </span>
                </button>
              ))}

              {cell.tasks.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    gap: 6,
                    alignItems: 'flex-start',
                    background: colors.inputBg,
                    borderRadius: 8,
                    padding: '6px 8px',
                    marginBottom: 5,
                    opacity: t.done ? 0.55 : 1,
                  }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: chipColor(t, peopleMap), flexShrink: 0, marginTop: 4 }} />
                  <div
                    style={{
                      font: `500 11px ${fonts.sans}`,
                      color: colors.ink,
                      lineHeight: 1.25,
                      overflow: 'hidden',
                      textDecoration: t.done ? 'line-through' : 'none',
                    }}
                  >
                    {t.title}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {displayOpen && (
        <DisplaySetupModal onClose={() => setDisplayOpen(false)} onStart={() => navigate('hub')} />
      )}

      {editing && (
        <EventModal
          date={editing.date}
          event={editing.event}
          onClose={() => setEditing(null)}
          onSave={(fields) => (editing.event ? ev.updateEvent(editing.event.id, fields) : ev.addEvent(fields))}
          onDelete={ev.removeEvent}
        />
      )}
    </div>
  );
}

function Pager({ onClick, label, children }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: colors.chipBg,
        color: colors.muted3,
        fontSize: 17,
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}
