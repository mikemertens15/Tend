import { useState } from 'react';
import { colors, tone, fonts } from '../theme';
import { ModalShell, Label, Chip, inputStyle, PrimaryButton, GhostButton, DeleteButton, MemberPicker } from './Modal';
import { Avatar } from './ui';
import { EVENT_KINDS, WORK_KIND, VISIBILITIES } from '../data/useEvents';
import { FREQS, DOWS, DOW_INITIALS, weekdayIndex, repeatSummary } from '../data/recurrence';
import { suggestCalendar, tint } from '../data/calendars';
import { useHousehold } from '../household/HouseholdProvider';
import { dayStr, addDays, shiftHours, hoursLabel } from '../dates';

// Adding and editing one thing on the calendar.
//
// Two ideas carry most of the weight here.
//
// The first is that **a repeating event is one thing, not forty.** So editing
// one asks which of them you meant: this Tuesday, this Tuesday and every one
// after it, or all of them. Most calendars either don't ask (and quietly rewrite
// your history) or ask every time (including when there's only one). This asks
// exactly when there's an ambiguity to resolve.
//
// The second is that **who can see it should already be right.** Picking a
// calendar sets the visibility, because a calendar called School is a statement
// about privacy as much as colour. Nobody should have to answer a question about
// permissions to write down a lecture.

// Which fields an exception row can actually hold. Editing a single occurrence
// of a series can change when it is and what it's called; it can't move it to a
// different calendar, because there's nowhere to record that.
const OCCURRENCE_FIELDS = 'the time, the date, the title and the note';

// An hour after a 'HH:MM', which is what an event dragged out of thin air
// should default to.
const addHour = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export function EventModal({
  date,
  // Set when the dialog was opened by clicking an empty slot on the hour grid,
  // so the time you pointed at is the time it starts.
  time,
  occurrence,
  calendars = [],
  jobs = [],
  onClose,
  onCreate,
  onUpdateSeries,
  onSplitSeries,
  onOverrideOccurrence,
  onSkipOccurrence,
  onEndSeriesBefore,
  onDeleteSeries,
}) {
  const { members, currentMember } = useHousehold();
  const event = occurrence?.raw ?? null;
  const editing = Boolean(event);
  const repeats = Boolean(event?.repeat_freq);

  const startDate = event?.on_date ?? date ?? dayStr();

  const [title, setTitle] = useState(event?.title ?? '');
  const [kind, setKind] = useState(event?.kind ?? 'event');
  const [calendarId, setCalendarId] = useState(event?.calendar_id ?? suggestCalendar('event', calendars)?.id ?? null);
  // Once someone picks a calendar by hand, choosing a kind stops moving it.
  const [calendarPinned, setCalendarPinned] = useState(Boolean(event?.calendar_id));
  const [onDate, setOnDate] = useState(occurrence?.date ?? startDate);
  const [startTime, setStartTime] = useState(occurrence?.startTime?.slice(0, 5) ?? time ?? '');
  const [endTime, setEndTime] = useState(
    occurrence?.endTime?.slice(0, 5) ?? (time ? addHour(time) : ''),
  );
  const [endDate, setEndDate] = useState(event?.end_date ?? '');
  const [location, setLocation] = useState(event?.location ?? '');
  const [note, setNote] = useState(occurrence?.note ?? '');
  const [memberId, setMemberId] = useState(event?.member_id ?? null);
  const [visibility, setVisibility] = useState(event?.visibility ?? 'household');
  const [visibleTo, setVisibleTo] = useState(event?.visible_to ?? []);
  const [jobId, setJobId] = useState(event?.job_id ?? null);

  const [freq, setFreq] = useState(event?.repeat_freq ?? null);
  const [interval, setInterval] = useState(event?.repeat_interval ?? 1);
  const [weekdays, setWeekdays] = useState(event?.repeat_weekdays ?? []);
  const [endMode, setEndMode] = useState(event?.repeat_until ? 'until' : event?.repeat_count ? 'count' : 'never');
  const [until, setUntil] = useState(event?.repeat_until ?? '');
  const [count, setCount] = useState(event?.repeat_count ?? 10);

  // Which of the series this edit is about. Only asked when there's more than
  // one of it.
  const [scope, setScope] = useState('all');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isWork = kind === WORK_KIND;
  const allDay = !startTime;
  const hours = shiftHours(startTime, endTime);
  const onlyThisOne = editing && repeats && scope === 'one';

  const rule = { onDate, freq, interval, weekdays, until: endMode === 'until' ? until : null, count: endMode === 'count' ? Number(count) : null };
  const summary = repeatSummary(rule);

  function pickKind(next) {
    setKind(next);
    // A birthday that doesn't come back every year isn't a birthday.
    if (next === 'birthday') {
      setFreq('yearly');
      setEndMode('never');
    }
    // A yearly shift is a mistake every time, and it would pay you for the same
    // hours in every year the calendar was asked about.
    if (next === WORK_KIND && freq === 'yearly') setFreq(null);
    if (!calendarPinned) {
      const suggested = suggestCalendar(next, calendars);
      if (suggested) {
        setCalendarId(suggested.id);
        if (!editing) applyCalendarDefaults(suggested);
      }
    }
  }

  // A calendar's default visibility is the whole of the "smart" behaviour: pick
  // School and it's yours, pick Family and it's everyone's.
  function applyCalendarDefaults(cal) {
    if (cal.default_visibility === 'private') {
      setVisibility('private');
      setMemberId((m) => m ?? currentMember?.id ?? null);
    } else {
      setVisibility('household');
    }
  }

  function pickCalendar(cal) {
    setCalendarId(cal.id);
    setCalendarPinned(true);
    if (!editing) applyCalendarDefaults(cal);
  }

  function pickVisibility(next) {
    setVisibility(next);
    // Anything narrower than the whole house needs to know whose it is —
    // the database rejects it otherwise, and rightly.
    if (next !== 'household') setMemberId((m) => m ?? currentMember?.id ?? null);
  }

  function pickFreq(next) {
    setFreq(next);
    // A weekly rule with no days named would repeat on whatever day it started,
    // which is right but invisible. Naming that day makes the rule readable and
    // gives somebody something to click.
    if (next === 'weekly' && weekdays.length === 0) setWeekdays([weekdayIndex(onDate)]);
  }

  function toggleWeekday(i) {
    setWeekdays((ws) => (ws.includes(i) ? ws.filter((w) => w !== i) : [...ws, i].sort((a, b) => a - b)));
  }

  function toggleVisibleMember(id) {
    setVisibleTo((vs) => (vs.includes(id) ? vs.filter((v) => v !== id) : [...vs, id]));
  }

  function setAllDay(on) {
    if (on) {
      setStartTime('');
      setEndTime('');
    } else {
      setStartTime('09:00');
      setEndTime('10:00');
    }
  }

  // The whole row, for creating or for changing a series.
  function seriesFields() {
    return {
      title: title.trim(),
      kind,
      calendar_id: calendarId,
      on_date: onDate,
      end_date: endDate && endDate > onDate ? endDate : null,
      start_time: startTime || null,
      end_time: startTime && endTime ? endTime : null,
      location: location.trim() || null,
      note: note.trim() || null,
      member_id: visibility === 'household' ? memberId : (memberId ?? currentMember?.id ?? null),
      visibility,
      visible_to: visibility === 'members' ? visibleTo.filter((v) => v !== memberId) : [],
      job_id: isWork ? jobId : null,
      repeat_freq: freq,
      repeat_interval: Math.max(1, Number(interval) || 1),
      repeat_weekdays: freq === 'weekly' && weekdays.length > 0 ? weekdays : null,
      repeat_until: freq && endMode === 'until' && until ? until : null,
      repeat_count: freq && endMode === 'count' ? Math.max(1, Number(count) || 1) : null,
    };
  }

  function submit() {
    if (!title.trim()) return;

    if (!editing) {
      onCreate(seriesFields());
      onClose();
      return;
    }

    if (!repeats) {
      onUpdateSeries(event.id, seriesFields());
      onClose();
      return;
    }

    if (scope === 'one') {
      onOverrideOccurrence(event.id, occurrence.occurrenceDate, {
        title: title.trim() === event.title ? null : title.trim(),
        on_date: onDate === occurrence.occurrenceDate ? null : onDate,
        start_time: startTime || null,
        end_time: startTime && endTime ? endTime : null,
        note: note.trim() || null,
      });
    } else if (scope === 'future') {
      onSplitSeries(event.id, occurrence.occurrenceDate, seriesFields());
    } else {
      onUpdateSeries(event.id, seriesFields());
    }
    onClose();
  }

  const cal = calendars.find((c) => c.id === calendarId) ?? null;
  const myJobs = jobs.filter((j) => j.active && (!memberId || j.member_id === memberId || !j.member_id));

  return (
    <ModalShell
      title={editing ? 'Edit event' : 'Add an event'}
      onClose={onClose}
      width={520}
      footer={
        <>
          {editing && (
            <DeleteButton onClick={() => setConfirmingDelete((v) => !v)}>Delete</DeleteButton>
          )}
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={submit}>{editing ? 'Save' : 'Add event'}</PrimaryButton>
        </>
      }
    >
      {confirmingDelete && (
        <div
          style={{
            background: tint('#b4506a', 0.1),
            border: `1px solid ${tone.red}`,
            borderRadius: 14,
            padding: '14px 16px',
            marginBottom: 20,
          }}
        >
          <div style={{ font: `600 12.5px ${fonts.sans}`, color: colors.ink, marginBottom: 4 }}>
            {repeats ? 'Delete which of them?' : 'Delete this event?'}
          </div>
          <div style={{ font: `400 11.5px/1.5 ${fonts.sans}`, color: colors.muted, marginBottom: 11 }}>
            {repeats
              ? 'Ending the series keeps everything before this date, which is what you want if you have already been paid for it.'
              : 'This cannot be undone.'}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {repeats && (
              <>
                <DangerChip
                  onClick={() => {
                    onSkipOccurrence(event.id, occurrence.occurrenceDate);
                    onClose();
                  }}
                >
                  Just this one
                </DangerChip>
                <DangerChip
                  onClick={() => {
                    onEndSeriesBefore(event.id, occurrence.occurrenceDate);
                    onClose();
                  }}
                >
                  This and future
                </DangerChip>
              </>
            )}
            <DangerChip
              onClick={() => {
                onDeleteSeries(event.id);
                onClose();
              }}
            >
              {repeats ? 'All of them' : 'Delete'}
            </DangerChip>
          </div>
        </div>
      )}

      {editing && repeats && (
        <>
          <Label>{summary ?? 'Part of a repeating series'} — change…</Label>
          <div style={{ display: 'flex', gap: 8, marginBottom: onlyThisOne ? 10 : 20, flexWrap: 'wrap' }}>
            {[
              ['one', 'Just this one'],
              ['future', 'This and future'],
              ['all', 'All of them'],
            ].map(([key, label]) => (
              <Chip key={key} active={scope === key} onClick={() => setScope(key)}>
                {label}
              </Chip>
            ))}
          </div>
          {onlyThisOne && (
            <div style={{ font: `400 11.5px/1.5 ${fonts.sans}`, color: colors.muted, marginBottom: 20 }}>
              One occurrence can only carry {OCCURRENCE_FIELDS} — a single day can't sit on a different calendar or have
              its own repeat rule. Pick <strong style={{ color: colors.ink }}>this and future</strong> to change those
              from here on.
            </div>
          )}
        </>
      )}

      <Label>What is it?</Label>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="e.g. Organic Chemistry, or Mum's birthday"
        style={inputStyle}
      />

      {!onlyThisOne && (
        <>
          <Label>Kind</Label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {EVENT_KINDS.map(([key, label, icon]) => (
              <Chip key={key} active={kind === key} onClick={() => pickKind(key)}>
                {icon} {label}
              </Chip>
            ))}
          </div>

          {calendars.length > 0 && (
            <>
              <Label>Calendar</Label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                {calendars.map((c) => (
                  <Chip key={c.id} active={calendarId === c.id} tint={c.color} onClick={() => pickCalendar(c)}>
                    {c.icon} {c.name}
                  </Chip>
                ))}
              </div>
              <div style={{ font: `400 11.5px/1.5 ${fonts.sans}`, color: colors.muted, marginBottom: 20 }}>
                {cal?.default_visibility === 'private'
                  ? `New events on ${cal.name} start private to whoever they belong to.`
                  : 'Sets the colour, and who it starts out visible to.'}
              </div>
            </>
          )}
        </>
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 140px', minWidth: 0 }}>
          <Label>{kind === 'birthday' ? 'Date of birth' : 'Date'}</Label>
          <input type="date" value={onDate} onChange={(e) => setOnDate(e.target.value)} style={inputStyle} />
        </div>
        {!allDay && (
          <>
            <div style={{ flex: '1 1 110px', minWidth: 0 }}>
              <Label>{isWork ? 'Starts' : 'From'}</Label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: '1 1 110px', minWidth: 0 }}>
              <Label>{isWork ? 'Ends' : 'To'}</Label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={inputStyle} />
            </div>
          </>
        )}
      </div>

      <PanelToggle
        on={allDay}
        onClick={() => setAllDay(!allDay)}
        icon={allDay ? '📅' : '🕐'}
        title="All day"
        blurb={
          allDay
            ? 'No time of day — it sits at the top of the day rather than in the hours.'
            : hours != null
              ? `${hoursLabel(hours)} long.`
              : 'Give it an end time and Tend counts the hours.'
        }
      />

      {isWork && (
        <>
          <Label>Which job?</Label>
          {myJobs.length === 0 ? (
            <div style={{ font: `400 12px/1.6 ${fonts.sans}`, color: colors.muted, marginBottom: 20 }}>
              No jobs set up yet. Add one on the Earned page and the hours here will start counting toward it.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {myJobs.map((j) => (
                <Chip key={j.id} active={jobId === j.id} tint={j.color} onClick={() => setJobId(jobId === j.id ? null : j.id)}>
                  {j.name}
                </Chip>
              ))}
            </div>
          )}
        </>
      )}

      {!onlyThisOne && (
        <>
          <Label>Repeats</Label>
          <div style={{ display: 'flex', gap: 8, marginBottom: freq ? 12 : 8, flexWrap: 'wrap' }}>
            {FREQS.map(([key, label]) => (
              <Chip key={label} active={freq === key} onClick={() => pickFreq(key)}>
                {label}
              </Chip>
            ))}
          </div>

          {freq && (
            <div
              style={{
                background: colors.inputBg,
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: 14,
                padding: '14px 16px',
                marginBottom: 8,
              }}
            >
              {freq === 'weekly' && (
                <>
                  <Label>On these days</Label>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                    {DOW_INITIALS.map((letter, i) => (
                      <button
                        key={DOWS[i]}
                        onClick={() => toggleWeekday(i)}
                        aria-label={DOWS[i]}
                        aria-pressed={weekdays.includes(i)}
                        style={{
                          flex: 1,
                          height: 38,
                          borderRadius: 10,
                          background: weekdays.includes(i) ? colors.accent : colors.card,
                          color: weekdays.includes(i) ? colors.onAccent : colors.muted2,
                          border: `1px solid ${weekdays.includes(i) ? colors.accent : colors.cardBorder}`,
                          font: `600 12.5px ${fonts.sans}`,
                        }}
                      >
                        {letter}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <div>
                  <Label>Every</Label>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    inputMode="numeric"
                    value={interval}
                    onChange={(e) => setInterval(e.target.value)}
                    style={{ ...inputStyle, width: 84, marginBottom: 0, background: colors.card }}
                  />
                </div>
                <span style={{ font: `500 13px ${fonts.sans}`, color: colors.muted, paddingBottom: 13 }}>
                  {freq === 'daily' ? 'days' : freq === 'weekly' ? 'weeks' : freq === 'monthly' ? 'months' : 'years'}
                </span>
              </div>

              <Label>Until</Label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {[
                  ['never', 'Forever'],
                  ['until', 'A date'],
                  ['count', 'A number of times'],
                ].map(([key, label]) => (
                  <Chip key={key} active={endMode === key} onClick={() => setEndMode(key)}>
                    {label}
                  </Chip>
                ))}
              </div>

              {endMode === 'until' && (
                <>
                  <input
                    type="date"
                    value={until}
                    min={onDate}
                    onChange={(e) => setUntil(e.target.value)}
                    style={{ ...inputStyle, marginBottom: 8, background: colors.card }}
                  />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[
                      ['End of this term', addDays(onDate, 112)],
                      ['A year', addDays(onDate, 364)],
                    ].map(([label, value]) => (
                      <button
                        key={label}
                        onClick={() => setUntil(value)}
                        style={{ font: `500 11.5px ${fonts.sans}`, color: colors.accent, padding: '2px 0' }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {endMode === 'count' && (
                <input
                  type="number"
                  min="1"
                  max="500"
                  inputMode="numeric"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  style={{ ...inputStyle, width: 110, marginBottom: 0, background: colors.card }}
                />
              )}
            </div>
          )}

          <div style={{ font: `500 12px/1.5 ${fonts.sans}`, color: freq ? colors.accent : colors.muted, marginBottom: 20 }}>
            {summary ?? 'Happens once.'}
          </div>

          {!freq && (
            <>
              <Label>Runs over more than one day?</Label>
              <input
                type="date"
                value={endDate}
                min={onDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={inputStyle}
              />
            </>
          )}

          <Label>Where?</Label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Optional — a room, an address"
            style={inputStyle}
          />

          <Label>Whose is it?</Label>
          <MemberPicker value={memberId} onChange={setMemberId} none={visibility === 'household' ? 'Everyone' : undefined} />

          <Label>Who can see it?</Label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            {VISIBILITIES.map(([key, label, icon]) => (
              <Chip key={key} active={visibility === key} onClick={() => pickVisibility(key)}>
                {icon} {label}
              </Chip>
            ))}
          </div>
          <div style={{ font: `400 11.5px/1.5 ${fonts.sans}`, color: colors.muted, marginBottom: visibility === 'members' ? 12 : 20 }}>
            {visibility === 'household'
              ? 'On the household calendar, the kitchen display and everyone’s widget.'
              : visibility === 'private'
                ? 'Nobody else can load it — this is enforced by the database, not just hidden in the app.'
                : 'You, plus whoever you tick below.'}
          </div>

          {visibility === 'members' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {members
                .filter((m) => m.id !== memberId)
                .map((m) => (
                  <button
                    key={m.id}
                    onClick={() => toggleVisibleMember(m.id)}
                    aria-pressed={visibleTo.includes(m.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '7px 12px 7px 7px',
                      borderRadius: 22,
                      background: visibleTo.includes(m.id) ? colors.chipBg : 'transparent',
                      border: `1px solid ${visibleTo.includes(m.id) ? colors.selected : colors.cardBorder}`,
                      font: `600 12.5px ${fonts.sans}`,
                      color: colors.ink,
                    }}
                  >
                    <Avatar who={m.name} size={26} />
                    {m.name}
                  </button>
                ))}
            </div>
          )}
        </>
      )}

      <Label>Note</Label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="Optional"
        style={{ ...inputStyle, marginBottom: 0 }}
      />
    </ModalShell>
  );
}

// The full-width toggle with a line of explanation under it, as used for the
// old "Every year" switch.
function PanelToggle({ on, onClick, icon, title, blurb }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 11,
        width: '100%',
        padding: '12px 14px',
        borderRadius: 12,
        marginBottom: 20,
        textAlign: 'left',
        background: on ? colors.chipBg : colors.inputBg,
        border: `1px solid ${on ? colors.selected : colors.cardBorder}`,
      }}
    >
      <span style={{ fontSize: 15, lineHeight: 1.2 }}>{icon}</span>
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', font: `600 13px ${fonts.sans}`, color: colors.ink }}>{title}</span>
        <span style={{ display: 'block', font: `400 11.5px/1.5 ${fonts.sans}`, color: colors.muted, marginTop: 2 }}>
          {blurb}
        </span>
      </span>
    </button>
  );
}

function DangerChip({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px',
        borderRadius: 20,
        background: tone.red,
        color: colors.onAccent,
        font: `600 12px ${fonts.sans}`,
      }}
    >
      {children}
    </button>
  );
}
