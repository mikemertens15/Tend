import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { colors, tone, shadows, fonts } from '../theme';
import {
  weekRangeLabel,
  dayStr,
  addDays,
  parseDay,
  getWeek,
  longDate,
  monthDay,
  shortDay,
  timeLabel,
  timeStr,
  MONTH_NAMES,
} from '../dates';
import { useIsNarrow } from '../useMediaQuery';
import { useWallClock } from '../useWallClock';
import { useHousehold } from '../household/HouseholdProvider';
import { useEvents } from '../data/useEvents';
import { useJobs } from '../data/useJobs';
import { useWeather } from '../data/useWeather';
import { formatTemp } from '../data/weather';
import { layoutTimed, busyWindow, nowMinutes, DAY_MINUTES } from '../data/layout';
import { tint } from '../data/calendars';
import { matchesOwner, OWNER_ALL } from '../data/owner';
import { EventModal } from '../components/EventModal';
import { CalendarsModal } from '../components/CalendarsModal';
import { WidgetModal } from '../components/WidgetModal';
import { DisplaySetupModal } from '../components/DisplaySetupModal';
import { Card, Avatar } from '../components/ui';

const DOWS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// The household calendar.
//
// Four views of the same days, because the question changes with the range. Day
// and Week are drawn to scale on an hour grid — that's the only way a 6am shift
// with a lecture on top of it looks like what it is, and it's what the old
// list-of-chips version couldn't show at all. Month is for planning and doesn't
// need times. Agenda is for "what's actually coming", and is the one that reads
// well on a phone.
//
// Chores sit in the all-day band rather than in the hours. They have a date and
// no time — inventing 9am for the bins would be a lie the grid would then draw
// to scale.

const MODES = [
  ['day', 'Day'],
  ['week', 'Week'],
  ['month', 'Month'],
  ['agenda', 'Agenda'],
];

// Pixels per hour. Big enough that a 30-minute event can hold its title, small
// enough that a working day fits without scrolling on a laptop.
const HOUR_PX = 52;
const HOUR_PX_NARROW = 44;
const GUTTER = 54;

export function CalendarView({ tasks, navigate }) {
  const narrow = useIsNarrow();
  const { peopleMap, members, currentMember } = useHousehold();
  const ev = useEvents();
  const { activeJobs } = useJobs();
  const weather = useWeather();
  const now = useWallClock();

  const [mode, setMode] = useState(narrow ? 'day' : 'week');
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState(null); // { date, time, occurrence } | null
  const [displayOpen, setDisplayOpen] = useState(false);
  const [calendarsOpen, setCalendarsOpen] = useState(false);
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [hiddenCalendars, setHiddenCalendars] = useState(() => new Set());
  const [owner, setOwner] = useState(OWNER_ALL);

  const today = dayStr(now);
  const hourPx = narrow ? HOUR_PX_NARROW : HOUR_PX;

  // The visible window, in every mode, as a flat list of day cells plus the
  // range to ask the events layer about.
  const view = useMemo(() => {
    if (mode === 'day') {
      const date = addDays(today, offset);
      const d = parseDay(date);
      return {
        title: offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : offset === -1 ? 'Yesterday' : longDate(d),
        subtitle: longDate(d),
        days: [{ date, num: d.getDate(), dow: shortDay(d), inMonth: true }],
        from: date,
        to: date,
      };
    }

    if (mode === 'week') {
      const base = new Date(now);
      base.setDate(base.getDate() + offset * 7);
      const w = getWeek(base);
      const days = w.days.map((d) => ({ date: dayStr(d.date), num: d.num, dow: d.dow, inMonth: true }));
      return {
        title: offset === 0 ? 'This week' : offset === -1 ? 'Last week' : offset === 1 ? 'Next week' : weekRangeLabel(w.days),
        subtitle: weekRangeLabel(w.days),
        days,
        from: days[0].date,
        to: days.at(-1).date,
      };
    }

    if (mode === 'agenda') {
      const from = addDays(today, offset * 30);
      const days = Array.from({ length: 30 }, (_, i) => {
        const date = addDays(from, i);
        const d = parseDay(date);
        return { date, num: d.getDate(), dow: shortDay(d), inMonth: true };
      });
      return {
        title: offset === 0 ? 'What’s coming' : `${monthDay(parseDay(from))} onward`,
        subtitle: `${monthDay(parseDay(from))} – ${monthDay(parseDay(days.at(-1).date))}`,
        days,
        from,
        to: days.at(-1).date,
      };
    }

    // Month: padded to whole Monday-start weeks so the grid is rectangular.
    const anchor = new Date(now);
    anchor.setDate(1);
    anchor.setMonth(anchor.getMonth() + offset);
    const year = anchor.getFullYear();
    const month = anchor.getMonth();
    const lead = (new Date(year, month, 1).getDay() + 6) % 7;
    const start = addDays(dayStr(new Date(year, month, 1)), -lead);
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const date = addDays(start, i);
      const d = parseDay(date);
      cells.push({ date, num: d.getDate(), dow: DOWS[(d.getDay() + 6) % 7], inMonth: d.getMonth() === month });
      if (i >= 27 && d.getMonth() !== month && (i + 1) % 7 === 0) break;
    }
    return {
      title: `${MONTH_NAMES[month]} ${year}`,
      subtitle: null,
      days: cells,
      from: cells[0].date,
      to: cells.at(-1).date,
    };
  }, [mode, offset, today, now]);

  const allOccurrences = ev.between(view.from, view.to);

  // Filters are a view concern, not a data one: hiding a calendar shouldn't stop
  // it syncing, and it has nothing to do with who is *allowed* to see it.
  const occurrences = useMemo(
    () =>
      allOccurrences.filter(
        (o) => !(o.calendar && hiddenCalendars.has(o.calendar.id)) && matchesOwner(owner, o.who),
      ),
    [allOccurrences, hiddenCalendars, owner],
  );

  const visibleTasks = useMemo(() => tasks.filter((t) => matchesOwner(owner, t.who)), [tasks, owner]);

  const byDay = useMemo(() => {
    const m = {};
    for (const d of view.days) m[d.date] = { timed: [], allDay: [], tasks: [] };
    for (const o of occurrences) {
      if (!m[o.date]) continue;
      (o.allDay ? m[o.date].allDay : m[o.date].timed).push(o);
    }
    for (const t of visibleTasks) if (m[t.dueOn]) m[t.dueOn].tasks.push(t);
    return m;
  }, [view.days, occurrences, visibleTasks]);

  // Overdue chores sit before this window entirely, which is where an overdue
  // chore belongs anyway.
  const overdue = visibleTasks
    .filter((t) => !t.done && t.dueOn < view.from)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const openNew = (date, minutes = null) =>
    setEditing({ date, time: minutes == null ? null : timeStr(minutes), occurrence: null });

  const modes = narrow ? MODES.filter(([m]) => m !== 'week') : MODES;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ font: `400 30px ${fonts.serif}`, color: colors.ink }}>{view.title}</div>
          <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted, marginTop: 2 }}>
            {view.subtitle ? `${view.subtitle} · ` : ''}
            Everyone’s, on one grid.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 3, background: colors.inputBg, borderRadius: 20, padding: 3 }}>
            {modes.map(([m, label]) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setOffset(0);
                }}
                style={{
                  padding: '6px 13px',
                  borderRadius: 18,
                  background: mode === m ? colors.accent : 'transparent',
                  color: mode === m ? colors.onAccent : colors.muted2,
                  font: `${mode === m ? 600 : 500} 12.5px ${fonts.sans}`,
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <Pager onClick={() => setOffset(offset - 1)} label="Previous">
            ‹
          </Pager>
          {offset !== 0 && (
            <button onClick={() => setOffset(0)} style={{ font: `600 12.5px ${fonts.sans}`, color: colors.accent, padding: '0 4px' }}>
              Today
            </button>
          )}
          <Pager onClick={() => setOffset(offset + 1)} label="Next">
            ›
          </Pager>
          <button
            onClick={() => openNew(mode === 'day' ? view.days[0].date : today)}
            style={{ padding: '9px 16px', borderRadius: 22, background: colors.accent, color: colors.onAccent, font: `600 13px ${fonts.sans}`, boxShadow: shadows.accent, whiteSpace: 'nowrap' }}
          >
            + Event
          </button>
        </div>
      </div>

      {/* Filters. Only rendered when there's something to filter — a single
          person's household doesn't need a person filter, and a household that
          hasn't added a calendar doesn't need calendar chips. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {ev.calendars.map((c) => {
          const on = !hiddenCalendars.has(c.id);
          return (
            <button
              key={c.id}
              onClick={() =>
                setHiddenCalendars((s) => {
                  const next = new Set(s);
                  if (next.has(c.id)) next.delete(c.id);
                  else next.add(c.id);
                  return next;
                })
              }
              aria-pressed={on}
              title={on ? `Hide ${c.name}` : `Show ${c.name}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 12px',
                borderRadius: 20,
                background: on ? tint(c.color, 0.16) : 'transparent',
                border: `1px solid ${on ? tint(c.color, 0.45) : colors.cardBorder}`,
                font: `600 12px ${fonts.sans}`,
                color: on ? colors.ink : colors.faint,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: on ? c.color : colors.faint }} />
              {c.name}
            </button>
          );
        })}

        {members.length > 1 && (
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
            <FilterPill active={owner === OWNER_ALL} onClick={() => setOwner(OWNER_ALL)}>
              Everyone
            </FilterPill>
            {members.map((m) => (
              <FilterPill key={m.id} active={owner === m.name} onClick={() => setOwner(owner === m.name ? OWNER_ALL : m.name)}>
                {m.name}
              </FilterPill>
            ))}
          </div>
        )}

        <button
          onClick={() => setCalendarsOpen(true)}
          style={{ padding: '6px 12px', borderRadius: 20, background: colors.chipBg, color: colors.muted3, font: `600 12px ${fonts.sans}`, marginLeft: members.length > 1 ? 0 : 'auto' }}
        >
          Calendars
        </button>
        <button
          onClick={() => setWidgetOpen(true)}
          title="A link your phone's home screen can read"
          style={{ padding: '6px 12px', borderRadius: 20, background: colors.chipBg, color: colors.muted3, font: `600 12px ${fonts.sans}`, whiteSpace: 'nowrap' }}
        >
          📱 Widget
        </button>
        <button
          onClick={() => setDisplayOpen(true)}
          title="Put this on a kitchen tablet or TV"
          style={{ padding: '6px 12px', borderRadius: 20, background: colors.chipBg, color: colors.muted3, font: `600 12px ${fonts.sans}`, whiteSpace: 'nowrap' }}
        >
          📺 Display
        </button>
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

      {(mode === 'day' || (mode === 'week' && !narrow)) && (
        <TimeGrid
          days={view.days}
          byDay={byDay}
          today={today}
          nowMin={nowMinutes(now)}
          hourPx={hourPx}
          narrow={narrow}
          weather={weather}
          peopleMap={peopleMap}
          currentMemberId={currentMember?.id}
          onOpen={(o) => setEditing({ date: o.date, time: null, occurrence: o })}
          onOpenSlot={openNew}
          onPickDay={(date) => {
            setMode('day');
            setOffset(Math.round((parseDay(date) - parseDay(today)) / 86400000));
          }}
        />
      )}

      {mode === 'week' && narrow && (
        <AgendaList
          days={view.days}
          byDay={byDay}
          today={today}
          currentMemberId={currentMember?.id}
          onOpen={(o) => setEditing({ date: o.date, time: null, occurrence: o })}
          onAdd={openNew}
          emptyNote="Nothing on this week."
        />
      )}

      {mode === 'month' && (
        <MonthGrid
          days={view.days}
          byDay={byDay}
          today={today}
          narrow={narrow}
          currentMemberId={currentMember?.id}
          onOpen={(o) => setEditing({ date: o.date, time: null, occurrence: o })}
          onAdd={openNew}
          onPickDay={(date) => {
            setMode('day');
            setOffset(Math.round((parseDay(date) - parseDay(today)) / 86400000));
          }}
        />
      )}

      {mode === 'agenda' && (
        <AgendaList
          days={view.days}
          byDay={byDay}
          today={today}
          currentMemberId={currentMember?.id}
          onOpen={(o) => setEditing({ date: o.date, time: null, occurrence: o })}
          onAdd={openNew}
          emptyNote="Nothing booked in the next month."
        />
      )}

      {displayOpen && <DisplaySetupModal onClose={() => setDisplayOpen(false)} onStart={() => navigate('hub')} />}
      {calendarsOpen && <CalendarsModal onClose={() => setCalendarsOpen(false)} />}
      {widgetOpen && <WidgetModal onClose={() => setWidgetOpen(false)} />}

      {editing && (
        <EventModal
          date={editing.date}
          time={editing.time}
          occurrence={editing.occurrence}
          calendars={ev.calendars}
          jobs={activeJobs}
          onClose={() => setEditing(null)}
          onCreate={ev.addEvent}
          onUpdateSeries={ev.updateEvent}
          onSplitSeries={ev.splitSeriesAt}
          onOverrideOccurrence={ev.overrideOccurrence}
          onSkipOccurrence={ev.skipOccurrence}
          onEndSeriesBefore={ev.endSeriesBefore}
          onDeleteSeries={ev.removeEvent}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The hour grid — Day and Week
// ---------------------------------------------------------------------------

function TimeGrid({
  days,
  byDay,
  today,
  nowMin,
  hourPx,
  narrow,
  weather,
  peopleMap,
  currentMemberId,
  onOpen,
  onOpenSlot,
  onPickDay,
}) {
  const scroller = useRef(null);

  // The window is computed across every visible day, so the columns of a week
  // share one scale — a grid whose rows meant different things per column would
  // be unreadable.
  const window_ = useMemo(
    () => busyWindow(days.flatMap((d) => byDay[d.date]?.timed ?? [])),
    [days, byDay],
  );

  const laidOut = useMemo(() => {
    const m = {};
    for (const d of days) m[d.date] = layoutTimed(byDay[d.date]?.timed ?? []);
    return m;
  }, [days, byDay]);

  const startHour = Math.floor(window_.from / 60);
  const endHour = Math.ceil(window_.to / 60);
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const bodyHeight = hours.length * hourPx;
  const yOf = (minutes) => ((minutes - startHour * 60) / 60) * hourPx;

  // Open on the interesting part of the day rather than at the top of the
  // window: now, if today is in view, and the first thing booked otherwise.
  const anchorMinutes = days.some((d) => d.date === today)
    ? nowMin
    : Math.min(
        ...days.flatMap((d) => (byDay[d.date]?.timed ?? []).map((o) => o.startMinutes ?? DAY_MINUTES)),
        9 * 60,
      );

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = Math.max(0, yOf(anchorMinutes) - el.clientHeight / 3);
    // Only when the range or the scale changes — not on every tick of the clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days[0]?.date, days.length, hourPx, startHour]);

  // Clicking an empty part of a column books something at the time you clicked,
  // snapped to the quarter hour.
  const slotFromClick = useCallback(
    (e, date) => {
      const box = e.currentTarget.getBoundingClientRect();
      const minutes = startHour * 60 + ((e.clientY - box.top) / hourPx) * 60;
      onOpenSlot(date, Math.max(0, Math.min(DAY_MINUTES - 15, Math.round(minutes / 15) * 15)));
    },
    [startHour, hourPx, onOpenSlot],
  );

  const anyAllDay = days.some((d) => (byDay[d.date]?.allDay.length ?? 0) + (byDay[d.date]?.tasks.length ?? 0) > 0);

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: `${GUTTER}px repeat(${days.length}, 1fr)`, borderBottom: `1px solid ${colors.divider}` }}>
        <div />
        {days.map((d) => {
          const isToday = d.date === today;
          const forecast = weather?.forDay?.(d.date) ?? null;
          return (
            <button
              key={d.date}
              onClick={() => onPickDay(d.date)}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'center',
                gap: 7,
                padding: '11px 6px 10px',
                borderLeft: `1px solid ${colors.divider}`,
                background: isToday ? colors.todayBg : 'transparent',
              }}
            >
              <span style={{ font: `600 10.5px ${fonts.sans}`, color: isToday ? colors.accent : colors.muted2, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                {d.dow}
              </span>
              <span
                style={
                  isToday
                    ? { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 23, height: 23, borderRadius: '50%', background: colors.accent, color: colors.onAccent, font: `600 12.5px ${fonts.sans}` }
                    : { font: `600 15px ${fonts.sans}`, color: colors.ink }
                }
              >
                {d.num}
              </span>
              {forecast && !narrow && (
                <span
                  title={`${forecast.label} · ${forecast.rainChance ?? 0}% rain`}
                  style={{ font: `500 11px ${fonts.sans}`, color: colors.muted, whiteSpace: 'nowrap' }}
                >
                  {forecast.icon} {formatTemp(forecast.high, weather.unit)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* All-day band: banners, birthdays, and chores, which have a date and no
          time. Only takes space when something is in it. */}
      {anyAllDay && (
        <div style={{ display: 'grid', gridTemplateColumns: `${GUTTER}px repeat(${days.length}, 1fr)`, borderBottom: `1px solid ${colors.divider}`, background: colors.inputBg }}>
          <div style={{ font: `600 9.5px ${fonts.sans}`, color: colors.faint, textTransform: 'uppercase', letterSpacing: '.06em', padding: '9px 6px 0', textAlign: 'right' }}>
            All day
          </div>
          {days.map((d) => (
            <div key={d.date} style={{ borderLeft: `1px solid ${colors.divider}`, padding: '7px 5px', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              {(byDay[d.date]?.allDay ?? []).map((o) => (
                <AllDayChip key={o.id} occurrence={o} mine={o.memberId === currentMemberId} onClick={() => onOpen(o)} />
              ))}
              {(byDay[d.date]?.tasks ?? []).map((t) => (
                <ChoreChip key={t.id} task={t} peopleMap={peopleMap} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* The hours */}
      <div ref={scroller} style={{ maxHeight: narrow ? '58vh' : '64vh', overflowY: 'auto', position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `${GUTTER}px repeat(${days.length}, 1fr)`, height: bodyHeight, position: 'relative' }}>
          {/* Hour labels */}
          <div style={{ position: 'relative' }}>
            {hours.map((h, i) => (
              <div
                key={h}
                style={{
                  position: 'absolute',
                  top: i * hourPx - 6,
                  right: 8,
                  font: `500 10.5px ${fonts.sans}`,
                  color: colors.faint,
                  whiteSpace: 'nowrap',
                }}
              >
                {i === 0 ? '' : timeLabel(h * 60)}
              </div>
            ))}
          </div>

          {days.map((d) => {
            const isToday = d.date === today;
            return (
              <div
                key={d.date}
                onClick={(e) => slotFromClick(e, d.date)}
                style={{
                  position: 'relative',
                  borderLeft: `1px solid ${colors.divider}`,
                  background: isToday ? colors.todayBg : 'transparent',
                  cursor: 'copy',
                }}
              >
                {/* Hour rules. The half-hour is a fainter line, which is what
                    makes a 30-minute block readable without a label. */}
                {hours.map((h, i) => (
                  <div key={h}>
                    <div style={{ position: 'absolute', top: i * hourPx, left: 0, right: 0, borderTop: `1px solid ${colors.divider}` }} />
                    <div style={{ position: 'absolute', top: i * hourPx + hourPx / 2, left: 0, right: 0, borderTop: `1px dotted ${colors.divider}`, opacity: 0.5 }} />
                  </div>
                ))}

                {laidOut[d.date]?.map((b) => (
                  <EventBlock
                    key={b.id}
                    block={b}
                    top={yOf(b.fromMinutes)}
                    height={Math.max(18, ((b.toMinutes - b.fromMinutes) / 60) * hourPx)}
                    mine={b.memberId === currentMemberId}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(b);
                    }}
                  />
                ))}

                {isToday && nowMin >= startHour * 60 && nowMin <= endHour * 60 && (
                  <div style={{ position: 'absolute', top: yOf(nowMin), left: 0, right: 0, pointerEvents: 'none', zIndex: 3 }}>
                    <div style={{ height: 2, background: tone.red, opacity: 0.85 }} />
                    <div style={{ position: 'absolute', top: -4, left: -4, width: 9, height: 9, borderRadius: '50%', background: tone.red }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

// A block on the hour grid. The calendar's colour is a solid left bar with a
// low-alpha wash behind the text, so it reads as that calendar on any skin
// without the text ever sitting on a colour it can't be read on.
function EventBlock({ block, top, height, mine, onClick }) {
  const color = block.color ?? colors.accent;
  const tall = height >= 40;

  return (
    <button
      onClick={onClick}
      title={[block.title, block.timeRange, block.location].filter(Boolean).join(' · ')}
      style={{
        position: 'absolute',
        top,
        height,
        left: `calc(${block.left}% + 2px)`,
        width: `calc(${block.width}% - ${block.crowded ? 4 : 5}px)`,
        display: 'flex',
        alignItems: 'stretch',
        gap: 6,
        overflow: 'hidden',
        textAlign: 'left',
        background: tint(color, 0.17),
        borderRadius: 7,
        borderLeft: `3px solid ${color}`,
        padding: tall ? '4px 6px' : '1px 6px',
        zIndex: 2,
      }}
    >
      <span style={{ minWidth: 0, flex: 1 }}>
        <span
          style={{
            display: 'block',
            font: `600 11.5px/1.25 ${fonts.sans}`,
            color: colors.ink,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: tall ? 'normal' : 'nowrap',
          }}
        >
          {block.visibility !== 'household' && mine && <span title="Only you can see this">🔒 </span>}
          {block.title}
          {block.moved && <span style={{ color: colors.muted }}> (moved)</span>}
        </span>
        {tall && (
          <span style={{ display: 'block', font: `500 10px ${fonts.sans}`, color: colors.muted, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {[block.timeRange, block.location].filter(Boolean).join(' · ')}
          </span>
        )}
      </span>
      {tall && block.who && height >= 52 && <Avatar who={block.who} size={20} />}
    </button>
  );
}

function AllDayChip({ occurrence: o, mine, onClick }) {
  const color = o.color ?? colors.accent;
  return (
    <button
      onClick={onClick}
      title={[o.title, o.location].filter(Boolean).join(' · ')}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        width: '100%',
        textAlign: 'left',
        background: tint(color, 0.2),
        borderLeft: `3px solid ${color}`,
        borderRadius: 6,
        padding: '3px 6px',
        opacity: o.continuation ? 0.62 : 1,
        minWidth: 0,
      }}
    >
      <span style={{ font: `600 10.5px ${fonts.sans}`, color: colors.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {o.visibility !== 'household' && mine && '🔒 '}
        {o.icon} {o.title}
        {o.age != null && o.age > 0 && ` (${o.age})`}
      </span>
    </button>
  );
}

function ChoreChip({ task, peopleMap }) {
  const dot = task.done ? tone.green : task.dueType === 'overdue' ? tone.red : (peopleMap[task.who]?.bg ?? tone.amber);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: colors.card,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: 6,
        padding: '3px 6px',
        opacity: task.done ? 0.55 : 1,
        minWidth: 0,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />
      <span
        style={{
          font: `500 10.5px ${fonts.sans}`,
          color: colors.ink,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textDecoration: task.done ? 'line-through' : 'none',
        }}
      >
        {task.title}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Month
// ---------------------------------------------------------------------------

function MonthGrid({ days, byDay, today, narrow, currentMemberId, onOpen, onAdd, onPickDay }) {
  const perCell = narrow ? 20 : 4;

  if (narrow) {
    // A 7×6 grid of month cells on a phone is 42 boxes of nothing. The same
    // month as a list of the days that have something on them is the same
    // information and actually readable.
    return <AgendaList days={days.filter((d) => d.inMonth)} byDay={byDay} today={today} currentMemberId={currentMemberId} onOpen={onOpen} onAdd={onAdd} emptyNote="Nothing on this month." />;
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8, marginBottom: 6 }}>
        {DOWS.map((d) => (
          <div key={d} style={{ font: `600 10.5px ${fonts.sans}`, color: colors.faint, letterSpacing: '.06em', textTransform: 'uppercase', paddingLeft: 4 }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8 }}>
        {days.map((d) => {
          const isToday = d.date === today;
          const cell = byDay[d.date] ?? { timed: [], allDay: [], tasks: [] };
          const items = [...cell.allDay, ...cell.timed];
          const hidden = items.length - perCell;

          return (
            <div
              key={d.date}
              style={{
                background: isToday ? colors.todayBg : colors.card,
                border: `1px solid ${isToday ? colors.selected : colors.cardBorder}`,
                borderRadius: 12,
                padding: '8px 8px 9px',
                minHeight: 112,
                opacity: d.inMonth ? 1 : 0.45,
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <button
                  onClick={() => onPickDay(d.date)}
                  title="Open this day"
                  style={
                    isToday
                      ? { width: 22, height: 22, borderRadius: '50%', background: colors.accent, color: colors.onAccent, font: `600 12px ${fonts.sans}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }
                      : { font: `600 13px ${fonts.sans}`, color: colors.ink }
                  }
                >
                  {d.num}
                </button>
                <button onClick={() => onAdd(d.date)} aria-label={`Add on ${d.date}`} style={{ font: `500 14px ${fonts.sans}`, color: colors.faint, lineHeight: 1 }}>
                  +
                </button>
              </div>

              {items.slice(0, perCell).map((o) => (
                <MonthChip key={o.id} occurrence={o} mine={o.memberId === currentMemberId} onClick={() => onOpen(o)} />
              ))}
              {cell.tasks.slice(0, Math.max(0, perCell - items.length)).map((t) => (
                <div key={t.id} style={{ font: `500 10px ${fonts.sans}`, color: colors.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: t.done ? 'line-through' : 'none' }}>
                  · {t.title}
                </div>
              ))}
              {hidden > 0 && (
                <button onClick={() => onPickDay(d.date)} style={{ font: `600 10px ${fonts.sans}`, color: colors.accent, textAlign: 'left', marginTop: 1 }}>
                  +{hidden} more
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function MonthChip({ occurrence: o, mine, onClick }) {
  const color = o.color ?? colors.accent;
  return (
    <button
      onClick={onClick}
      title={[o.title, o.timeRange].filter(Boolean).join(' · ')}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        width: '100%',
        textAlign: 'left',
        minWidth: 0,
        background: o.allDay ? tint(color, 0.18) : 'transparent',
        borderRadius: 5,
        padding: o.allDay ? '2px 5px' : '1px 2px',
        opacity: o.continuation ? 0.62 : 1,
      }}
    >
      {!o.allDay && <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />}
      <span style={{ font: `${o.allDay ? 600 : 500} 10.5px ${fonts.sans}`, color: colors.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
        {o.visibility !== 'household' && mine && '🔒 '}
        {!o.allDay && o.time && <span style={{ color: colors.muted }}>{o.time.replace(' ', '')} </span>}
        {o.title}
        {o.age != null && o.age > 0 && ` (${o.age})`}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Agenda
// ---------------------------------------------------------------------------

function AgendaList({ days, byDay, today, currentMemberId, onOpen, onAdd, emptyNote }) {
  const filled = days.filter((d) => {
    const c = byDay[d.date];
    return c && (c.allDay.length > 0 || c.timed.length > 0 || c.tasks.length > 0);
  });

  if (filled.length === 0) {
    return (
      <Card style={{ padding: '34px 26px', textAlign: 'center' }}>
        <div style={{ font: `400 14.5px ${fonts.sans}`, color: colors.muted }}>{emptyNote}</div>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {filled.map((d) => {
        const cell = byDay[d.date];
        const isToday = d.date === today;
        const dd = parseDay(d.date);
        return (
          <Card key={d.date} style={{ padding: '13px 16px', borderColor: isToday ? colors.selected : colors.cardBorder, background: isToday ? colors.todayBg : colors.card }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
                <span style={{ font: `600 11px ${fonts.sans}`, color: isToday ? colors.accent : colors.muted2, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  {isToday ? 'Today' : d.dow}
                </span>
                <span style={{ font: `400 17px ${fonts.serif}`, color: colors.ink }}>{monthDay(dd)}</span>
              </div>
              <button onClick={() => onAdd(d.date)} style={{ font: `600 11.5px ${fonts.sans}`, color: colors.accent }}>
                + Add
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[...cell.allDay, ...cell.timed].map((o) => (
                <AgendaRow key={o.id} occurrence={o} mine={o.memberId === currentMemberId} onClick={() => onOpen(o)} />
              ))}
              {cell.tasks.map((t) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 2 }}>
                  <span style={{ width: 52, font: `500 11px ${fonts.sans}`, color: colors.faint, flexShrink: 0 }}>Chore</span>
                  <span style={{ font: `500 13px ${fonts.sans}`, color: colors.muted2, textDecoration: t.done ? 'line-through' : 'none' }}>
                    {t.title}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function AgendaRow({ occurrence: o, mine, onClick }) {
  const color = o.color ?? colors.accent;
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%', textAlign: 'left' }}>
      <span style={{ width: 52, flexShrink: 0, font: `600 11px ${fonts.sans}`, color: colors.muted, paddingTop: 2 }}>
        {o.allDay ? (o.continuation ? '·' : 'All day') : (o.time ?? '').replace(' ', '')}
      </span>
      <span style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: color, flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', font: `600 13px ${fonts.sans}`, color: colors.ink }}>
          {o.visibility !== 'household' && mine && '🔒 '}
          {o.icon} {o.title}
          {o.age != null && o.age > 0 && ` (${o.age})`}
          {o.moved && <span style={{ color: colors.muted, fontWeight: 500 }}> (moved)</span>}
        </span>
        {(o.timeRange || o.location || o.repeatText || o.note) && (
          <span style={{ display: 'block', font: `400 11.5px ${fonts.sans}`, color: colors.muted, marginTop: 1 }}>
            {[!o.allDay && o.timeRange, o.location, o.repeatText, o.note].filter(Boolean).join(' · ')}
          </span>
        )}
      </span>
      {o.who && <Avatar who={o.who} size={24} />}
    </button>
  );
}

// ---------------------------------------------------------------------------

function FilterPill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        padding: '6px 12px',
        borderRadius: 20,
        background: active ? colors.accent : colors.chipBg,
        color: active ? colors.onAccent : colors.muted3,
        font: `600 12px ${fonts.sans}`,
      }}
    >
      {children}
    </button>
  );
}

function Pager({ onClick, label, children }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{ width: 32, height: 32, borderRadius: '50%', background: colors.chipBg, color: colors.muted3, fontSize: 17, flexShrink: 0 }}
    >
      {children}
    </button>
  );
}
