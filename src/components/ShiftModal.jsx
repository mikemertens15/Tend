import { useState } from 'react';
import { colors, tone, fonts } from '../theme';
import { ModalShell, Label, Chip, inputStyle, PrimaryButton, GhostButton, DeleteButton } from './Modal';
import { SHIFT_STATUSES, usd } from '../data/pay';
import { tint } from '../data/calendars';
import { parseDay, longDate, timeRangeLabel, hoursLabel, timeLabel } from '../dates';

// One shift: what was booked, what the clock said, and the gap between them.
//
// The two ways in are deliberate. The punch clock is for the day itself — one
// tap on the way in, one at lunch, one on the way out. The fields underneath are
// for every shift you forgot to punch, which is most of them. Neither is the
// "real" one; a clock you can't correct is worse than no clock, and a form you
// have to fill in at the end of a nine-hour day doesn't get filled in.

export function ShiftModal({ shift, onClose, onClockIn, onStartBreak, onEndBreak, onClockOut, onSave, onClear }) {
  const [actualStart, setActualStart] = useState(shift.actualStart?.slice(0, 5) ?? '');
  const [actualEnd, setActualEnd] = useState(shift.actualEnd?.slice(0, 5) ?? '');
  const [breakMinutes, setBreakMinutes] = useState(shift.record?.break_minutes ?? '');
  const [status, setStatus] = useState(shift.status ?? 'worked');
  const [note, setNote] = useState(shift.record?.note ?? '');

  const live = shift.clockedIn;
  const color = shift.job?.color ?? shift.color ?? colors.accent;

  function save() {
    onSave({ actualStart, actualEnd, breakMinutes, status, note });
    onClose();
  }

  return (
    <ModalShell
      title={shift.title}
      onClose={onClose}
      width={500}
      footer={
        <>
          {shift.record && (
            <DeleteButton
              onClick={() => {
                onClear();
                onClose();
              }}
            >
              Clear
            </DeleteButton>
          )}
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={save}>Save</PrimaryButton>
        </>
      }
    >
      {/* What was booked */}
      <div
        style={{
          background: tint(color, 0.12),
          border: `1px solid ${tint(color, 0.4)}`,
          borderRadius: 14,
          padding: '13px 16px',
          marginBottom: 18,
        }}
      >
        <div style={{ font: `600 11px ${fonts.sans}`, color: colors.muted2, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>
          Booked · {longDate(parseDay(shift.date))}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ font: `400 19px ${fonts.serif}`, color: colors.ink }}>
            {timeRangeLabel(shift.scheduledStart, shift.scheduledEnd) ?? 'No times set'}
          </span>
          <span style={{ font: `500 12.5px ${fonts.sans}`, color: colors.muted }}>
            {shift.scheduledHours != null ? `${hoursLabel(shift.scheduledHours)} paid` : '—'}
            {shift.job ? ` · ${shift.job.name}` : ''}
          </span>
        </div>
      </div>

      {/* The clock */}
      <Label>The clock</Label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        {!shift.actualStart && (
          <ClockButton primary onClick={() => onClockIn(shift)}>
            Clock in
          </ClockButton>
        )}
        {live && !shift.onBreak && (
          <>
            <ClockButton onClick={() => onStartBreak(shift)}>Start break</ClockButton>
            <ClockButton primary onClick={() => onClockOut(shift)}>
              Clock out
            </ClockButton>
          </>
        )}
        {live && shift.onBreak && (
          <ClockButton primary onClick={() => onEndBreak(shift)}>
            Back from break
          </ClockButton>
        )}
        {!live && shift.actualStart && (
          <div style={{ font: `500 12.5px ${fonts.sans}`, color: colors.muted, padding: '10px 0' }}>
            Clocked out at {timeLabel(shift.actualEnd)}. Change it below if that isn’t right.
          </div>
        )}
      </div>

      {live && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            background: shift.onBreak ? colors.inputBg : tint('#5c7f3f', 0.16),
            borderRadius: 12,
            padding: '10px 14px',
            marginBottom: 20,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: shift.onBreak ? colors.muted : '#5c7f3f',
              flexShrink: 0,
            }}
          />
          <span style={{ font: `500 12.5px ${fonts.sans}`, color: colors.ink }}>
            {shift.onBreak
              ? `On a break — ${hoursLabel(shift.breakMinutes / 60)} so far`
              : `On the clock since ${timeLabel(shift.actualStart)} — ${hoursLabel(shift.hours)} in`}
          </span>
        </div>
      )}

      {/* What actually happened */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 110px', minWidth: 0 }}>
          <Label>Clocked in</Label>
          <input type="time" value={actualStart} onChange={(e) => setActualStart(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: '1 1 110px', minWidth: 0 }}>
          <Label>Clocked out</Label>
          <input type="time" value={actualEnd} onChange={(e) => setActualEnd(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: '1 1 110px', minWidth: 0 }}>
          <Label>Unpaid break</Label>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              min="0"
              step="5"
              inputMode="numeric"
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(e.target.value)}
              placeholder={shift.breakAssumed ? String(shift.breakMinutes) : '0'}
              style={{ ...inputStyle, paddingRight: 42 }}
            />
            <span style={{ position: 'absolute', right: 13, top: 13, font: `500 12px ${fonts.sans}`, color: colors.muted, pointerEvents: 'none' }}>
              min
            </span>
          </div>
        </div>
      </div>

      {shift.breakAssumed && !breakMinutes && (
        <div style={{ font: `400 11.5px/1.5 ${fonts.sans}`, color: colors.muted, marginTop: -10, marginBottom: 20 }}>
          Nothing entered, so {shift.job?.name ?? 'this job'}’s policy is being assumed:{' '}
          <strong style={{ color: colors.ink }}>{shift.breakMinutes} minutes</strong> off a shift this long. Type a real
          number here and it wins.
        </div>
      )}

      <Label>How did it go?</Label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {SHIFT_STATUSES.map(([key, label, icon]) => (
          <Chip key={key} active={status === key} onClick={() => setStatus(key)}>
            {icon} {label}
          </Chip>
        ))}
      </div>

      {/* The comparison, which is the point of the whole screen */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: 1,
          background: colors.divider,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 14,
          overflow: 'hidden',
          marginBottom: 20,
        }}
      >
        <Compare label="Booked" value={hoursLabel(shift.scheduledHours) ?? '—'} />
        <Compare label={shift.basis === 'worked' ? 'Worked' : 'Counting'} value={hoursLabel(shift.hours) ?? '—'} strong />
        <Compare
          label="Difference"
          value={shift.varianceHours == null || shift.varianceHours === 0 ? 'none' : hoursLabel(shift.varianceHours)}
          color={shift.varianceHours > 0 ? '#5c7f3f' : shift.varianceHours < 0 ? tone.red : colors.muted}
        />
        {shift.job?.hourly_rate > 0 && (
          <Compare label="Worth" value={usd(Math.round(shift.hours * Number(shift.job.hourly_rate) * 100) / 100)} />
        )}
      </div>

      {shift.unconfirmed && (
        <div style={{ font: `400 11.5px/1.5 ${fonts.sans}`, color: colors.muted, marginBottom: 18 }}>
          Nothing was recorded for this one, so it’s being counted at its booked hours. That keeps the month roughly
          right — but it’s a guess until you say otherwise.
        </div>
      )}

      <Label>Note</Label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        placeholder="Optional — covered someone, left early, stayed late"
        style={{ ...inputStyle, marginBottom: 0 }}
      />
    </ModalShell>
  );
}

function ClockButton({ primary, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 20px',
        borderRadius: 24,
        background: primary ? colors.accent : colors.inputBg,
        color: primary ? colors.onAccent : colors.muted2,
        border: primary ? 'none' : `1px solid ${colors.cardBorder}`,
        font: `600 13.5px ${fonts.sans}`,
      }}
    >
      {children}
    </button>
  );
}

function Compare({ label, value, strong, color }) {
  return (
    <div style={{ flex: 1, background: colors.card, padding: '11px 12px', minWidth: 0 }}>
      <div style={{ font: `${strong ? 600 : 500} 14px ${fonts.sans}`, color: color ?? (strong ? colors.ink : colors.muted2), whiteSpace: 'nowrap' }}>
        {value}
      </div>
      <div style={{ font: `500 10.5px ${fonts.sans}`, color: colors.faint, marginTop: 2 }}>{label}</div>
    </div>
  );
}
