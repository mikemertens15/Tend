import { useState } from 'react';
import { colors, tone, fonts } from '../theme';
import { ModalShell, Label, Chip, inputStyle, PrimaryButton, GhostButton, DeleteButton, MemberPicker } from './Modal';
import { CALENDAR_COLORS } from '../data/calendars';
import { PAY_PERIODS } from '../data/pay';
import { DOWS } from '../data/recurrence';
import { useHousehold } from '../household/HouseholdProvider';
import { dayStr } from '../dates';

// One employer's rules.
//
// Everything here exists because it changes the hours or the money by an amount
// you would notice, and nothing here is a guess: if you don't know when your
// employer's week starts, leave it, and if you don't know your take-home
// percentage, leave that too and Tend will show you gross and say so.
//
// The two settings people skip and shouldn't: the unpaid break, which is the
// difference between a nine-hour shift and eight and a half hours of pay, and
// the payday anchor, which is what turns "this month" into "this cheque".

export function JobModal({ job, onClose, onSave, onDelete, onRetire }) {
  const { currentMember } = useHousehold();
  const editing = Boolean(job);

  const [name, setName] = useState(job?.name ?? '');
  const [memberId, setMemberId] = useState(job?.member_id ?? currentMember?.id ?? null);
  const [color, setColor] = useState(job?.color ?? CALENDAR_COLORS[1][0]);
  const [payKind, setPayKind] = useState(job?.pay_kind ?? 'hourly');
  const [hourlyRate, setHourlyRate] = useState(job?.hourly_rate ?? '');
  const [annualSalary, setAnnualSalary] = useState(job?.annual_salary ?? '');
  const [otWeekly, setOtWeekly] = useState(job?.ot_weekly_hours ?? 40);
  const [otDaily, setOtDaily] = useState(job?.ot_daily_hours ?? '');
  const [otMultiplier, setOtMultiplier] = useState(job?.ot_multiplier ?? 1.5);
  const [breakMinutes, setBreakMinutes] = useState(job?.break_minutes ?? '');
  const [breakAfter, setBreakAfter] = useState(job?.break_after_hours ?? '');
  const [payPeriod, setPayPeriod] = useState(job?.pay_period ?? 'biweekly');
  const [anchor, setAnchor] = useState(job?.period_anchor ?? '');
  const [weekStart, setWeekStart] = useState(job?.week_starts_on ?? 6);
  const [takeHomePct, setTakeHomePct] = useState(job?.take_home_pct ?? '');
  const [confirming, setConfirming] = useState(false);

  const hourly = payKind === 'hourly';
  const num = (v) => (v === '' || v == null ? null : Number(v));

  function submit() {
    if (!name.trim()) return;
    // The table insists an hourly job has a rate and a salaried one has a
    // salary, so a half-filled form is caught here rather than by a database
    // error nobody can read.
    if (hourly && !num(hourlyRate)) return;
    if (!hourly && !num(annualSalary)) return;

    onSave({
      name: name.trim(),
      member_id: memberId,
      color,
      pay_kind: payKind,
      hourly_rate: hourly ? num(hourlyRate) : null,
      annual_salary: hourly ? null : num(annualSalary),
      ot_weekly_hours: hourly ? num(otWeekly) : null,
      ot_daily_hours: hourly ? num(otDaily) : null,
      ot_multiplier: num(otMultiplier) ?? 1.5,
      break_minutes: num(breakMinutes) ?? 0,
      break_after_hours: num(breakAfter),
      pay_period: payPeriod,
      period_anchor: anchor || null,
      week_starts_on: Number(weekStart),
      take_home_pct: num(takeHomePct),
    });
    onClose();
  }

  return (
    <ModalShell
      title={editing ? 'Edit job' : 'Add a job'}
      onClose={onClose}
      width={520}
      footer={
        <>
          {editing && <DeleteButton onClick={() => setConfirming((v) => !v)}>Remove</DeleteButton>}
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={submit}>{editing ? 'Save' : 'Add job'}</PrimaryButton>
        </>
      }
    >
      {confirming && (
        <div style={{ background: colors.inputBg, border: `1px solid ${tone.red}`, borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ font: `400 11.5px/1.5 ${fonts.sans}`, color: colors.muted, marginBottom: 11 }}>
            Left this job? <strong style={{ color: colors.ink }}>Finish it</strong> — every shift and every total you
            worked there stays, it just stops being offered on new ones. Deleting is for a job entered by mistake, and
            takes its history with it.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                onRetire(job.id);
                onClose();
              }}
              style={{ padding: '8px 14px', borderRadius: 20, background: colors.chipBg, color: colors.ink, font: `600 12px ${fonts.sans}` }}
            >
              Finished this job
            </button>
            <button
              onClick={() => {
                onDelete(job.id);
                onClose();
              }}
              style={{ padding: '8px 14px', borderRadius: 20, background: tone.red, color: colors.onAccent, font: `600 12px ${fonts.sans}` }}
            >
              Delete it entirely
            </button>
          </div>
        </div>
      )}

      <Label>Where?</Label>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="e.g. Wegmans"
        style={inputStyle}
      />

      <Label>Whose job?</Label>
      <MemberPicker value={memberId} onChange={setMemberId} />

      <Label>Colour</Label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {CALENDAR_COLORS.map(([hex, label]) => (
          <button
            key={hex}
            onClick={() => setColor(hex)}
            aria-label={label}
            title={label}
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: hex,
              border: color === hex ? `2px solid ${colors.ink}` : '2px solid transparent',
              boxShadow: color === hex ? `0 0 0 2px ${colors.card}` : 'none',
            }}
          />
        ))}
      </div>

      <Label>Paid how?</Label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <Chip active={hourly} onClick={() => setPayKind('hourly')}>
          By the hour
        </Chip>
        <Chip active={!hourly} onClick={() => setPayKind('salary')}>
          Salary
        </Chip>
      </div>

      {hourly ? (
        <>
          <Label>Hourly rate</Label>
          <Money value={hourlyRate} onChange={setHourlyRate} placeholder="0.00" step="0.25" />

          <Section title="Overtime" blurb="Left blank, no overtime is worked out at all — which is right for a job that doesn’t pay any.">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Field label="After (hours a week)">
                <input type="number" min="0" step="0.5" inputMode="decimal" value={otWeekly} onChange={(e) => setOtWeekly(e.target.value)} placeholder="40" style={{ ...inputStyle, marginBottom: 0 }} />
              </Field>
              <Field label="Or after (hours a day)">
                <input type="number" min="0" step="0.5" inputMode="decimal" value={otDaily} onChange={(e) => setOtDaily(e.target.value)} placeholder="none" style={{ ...inputStyle, marginBottom: 0 }} />
              </Field>
              <Field label="Paid at">
                <input type="number" min="1" step="0.1" inputMode="decimal" value={otMultiplier} onChange={(e) => setOtMultiplier(e.target.value)} placeholder="1.5" style={{ ...inputStyle, marginBottom: 0 }} />
              </Field>
            </div>
            <div style={{ font: `400 11.5px/1.5 ${fonts.sans}`, color: colors.muted, marginTop: 10 }}>
              With both a daily and a weekly rule, whichever gives more overtime applies — no hour is counted twice.
            </div>
          </Section>

          <Section
            title="Unpaid break"
            blurb="What to assume when nobody punched one. A break you actually record always wins over this."
          >
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Field label="Minutes off">
                <input type="number" min="0" step="5" inputMode="numeric" value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)} placeholder="0" style={{ ...inputStyle, marginBottom: 0 }} />
              </Field>
              <Field label="On shifts over (hours)">
                <input type="number" min="0" step="0.5" inputMode="decimal" value={breakAfter} onChange={(e) => setBreakAfter(e.target.value)} placeholder="always" style={{ ...inputStyle, marginBottom: 0 }} />
              </Field>
            </div>
          </Section>
        </>
      ) : (
        <>
          <Label>Salary a year</Label>
          <Money value={annualSalary} onChange={setAnnualSalary} placeholder="0" step="100" />
        </>
      )}

      <Section title="Payday" blurb="What turns a pile of shifts into a cheque with a date on it.">
        <Label>How often</Label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {PAY_PERIODS.map(([key, label]) => (
            <Chip key={key} active={payPeriod === key} onClick={() => setPayPeriod(key)}>
              {label}
            </Chip>
          ))}
        </div>

        {(payPeriod === 'weekly' || payPeriod === 'biweekly') && (
          <>
            <Label>A payday you remember</Label>
            <input
              type="date"
              value={anchor}
              onChange={(e) => setAnchor(e.target.value)}
              style={inputStyle}
            />
            <div style={{ font: `400 11.5px/1.5 ${fonts.sans}`, color: colors.muted, marginTop: -12, marginBottom: 20 }}>
              Any one of them. Every other period is counted forward and back from it.
              {!anchor && (
                <button onClick={() => setAnchor(dayStr())} style={{ font: `600 11.5px ${fonts.sans}`, color: colors.accent, marginLeft: 6 }}>
                  Use today
                </button>
              )}
            </div>
          </>
        )}

        {hourly && (
          <>
            <Label>Their week starts on</Label>
            <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
              {DOWS.map((d, i) => (
                <button
                  key={d}
                  onClick={() => setWeekStart(i)}
                  aria-pressed={Number(weekStart) === i}
                  style={{
                    padding: '7px 11px',
                    borderRadius: 10,
                    background: Number(weekStart) === i ? colors.accent : colors.inputBg,
                    color: Number(weekStart) === i ? colors.onAccent : colors.muted2,
                    border: `1px solid ${Number(weekStart) === i ? colors.accent : colors.cardBorder}`,
                    font: `600 11.5px ${fonts.sans}`,
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
            <div style={{ font: `400 11.5px/1.5 ${fonts.sans}`, color: colors.muted, marginBottom: 20 }}>
              Overtime is counted against this week, not the calendar one. Most US employers use Sunday; check a payslip
              if you’re not sure.
            </div>
          </>
        )}
      </Section>

      <Section
        title="Take-home estimate"
        blurb="Roughly what percentage of gross actually reaches the account. One number off a real payslip — Tend doesn’t model tax, and pretending to would be wrong in ways that matter. Leave it blank to see gross only."
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="number"
            min="1"
            max="100"
            inputMode="numeric"
            value={takeHomePct}
            onChange={(e) => setTakeHomePct(e.target.value)}
            placeholder="e.g. 78"
            style={{ ...inputStyle, width: 120, marginBottom: 0 }}
          />
          <span style={{ font: `500 13px ${fonts.sans}`, color: colors.muted }}>% of gross</span>
        </div>
      </Section>
    </ModalShell>
  );
}

function Money({ value, onChange, placeholder, step }) {
  return (
    <div style={{ position: 'relative', marginBottom: 20 }}>
      <span style={{ position: 'absolute', left: 14, top: 13, font: `500 13.5px ${fonts.sans}`, color: colors.muted }}>$</span>
      <input
        type="number"
        min="0"
        step={step}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...inputStyle, marginBottom: 0, paddingLeft: 28 }}
      />
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ flex: '1 1 120px', minWidth: 0 }}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Section({ title, blurb, children }) {
  return (
    <div style={{ borderTop: `1px solid ${colors.divider}`, paddingTop: 18, marginBottom: 20 }}>
      <div style={{ font: `600 13px ${fonts.sans}`, color: colors.ink, marginBottom: 4 }}>{title}</div>
      {blurb && (
        <div style={{ font: `400 11.5px/1.55 ${fonts.sans}`, color: colors.muted, marginBottom: 14 }}>{blurb}</div>
      )}
      {children}
    </div>
  );
}
