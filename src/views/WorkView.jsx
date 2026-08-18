import { useState } from 'react';
import { colors, tone, fonts, shadows } from '../theme';
import { Card, Avatar } from '../components/ui';
import { useIsNarrow } from '../useMediaQuery';
import { useWork } from '../data/useWork';
import { usd, statusMeta } from '../data/pay';
import { tint } from '../data/calendars';
import { ShiftModal } from '../components/ShiftModal';
import { JobModal } from '../components/JobModal';
import { parseDay, monthDay, shortDay, hoursLabel, timeLabel, timeRangeLabel } from '../dates';

// What the work came to.
//
// Built around the pay period rather than the calendar month, because a month is
// not a thing anyone is paid for. The number at the top is what this cheque is
// looking like; the list underneath is every shift that made it, with what was
// booked and what the clock said side by side.
//
// Shifts are still entered on the calendar. This is where they're settled up.

export function WorkView({ navigate }) {
  const narrow = useIsNarrow();
  const work = useWork();
  const [editingShift, setEditingShift] = useState(null);
  const [editingJob, setEditingJob] = useState(null); // job row, or 'new'
  const [jobsOpen, setJobsOpen] = useState(false);

  const period = work.period;
  const periodLabel = `${monthDay(parseDay(period.from))} – ${monthDay(parseDay(period.to))}`;

  if (!work.configured && !editingJob) {
    return (
      <>
        <Header
          title="Earned"
          subtitle="Set up a job and your shifts start counting."
          right={
            <button
              onClick={() => setEditingJob('new')}
              style={primaryButton}
            >
              + Add a job
            </button>
          }
        />
        <Card style={{ padding: '38px 28px', textAlign: 'center' }}>
          <div style={{ font: `400 15px/1.65 ${fonts.sans}`, color: colors.muted, maxWidth: 480, margin: '0 auto' }}>
            Tell Tend where you work, what it pays and when payday is. Then put your shifts on the calendar as{' '}
            <strong style={{ color: colors.ink }}>Work</strong> — clock in and out as you go, or fix the times up
            afterwards, and this page keeps the running total. No bank, no receipts, nothing to import.
          </div>
          <button onClick={() => setEditingJob('new')} style={{ ...primaryButton, marginTop: 20 }}>
            Add a job
          </button>
        </Card>
        {editingJob && (
          <JobModal
            job={null}
            onClose={() => setEditingJob(null)}
            onSave={work.addJob}
            onDelete={work.removeJob}
            onRetire={work.retireJob}
          />
        )}
      </>
    );
  }

  return (
    <div>
      <Header
        title="Earned"
        subtitle={`${periodLabel} · ${work.primaryJob ? periodWord(work.primaryJob.pay_period) : 'this period'}`}
        right={
          <>
            <Pager onClick={() => work.stepPeriod(-1)} label="Previous period">
              ‹
            </Pager>
            {work.periodOffset !== 0 && (
              <button onClick={work.resetPeriod} style={{ font: `600 12.5px ${fonts.sans}`, color: colors.accent, padding: '0 4px' }}>
                Now
              </button>
            )}
            <Pager onClick={() => work.stepPeriod(1)} label="Next period">
              ›
            </Pager>
            <button
              onClick={() => setJobsOpen((v) => !v)}
              style={{ padding: '9px 15px', borderRadius: 22, background: colors.chipBg, color: colors.muted3, font: `600 12.5px ${fonts.sans}` }}
            >
              {jobsOpen ? 'Done' : 'Jobs'}
            </button>
            <button onClick={() => navigate('calendar')} style={primaryButton}>
              + Add a shift
            </button>
          </>
        }
      />

      {jobsOpen && (
        <Card style={{ padding: '18px 22px', marginBottom: 20 }}>
          <div style={{ font: `600 12px ${fonts.sans}`, color: colors.muted2, marginBottom: 12 }}>Jobs</div>
          {work.jobs.map((j) => (
            <button
              key={j.id}
              onClick={() => setEditingJob(j)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                textAlign: 'left',
                padding: '11px 12px',
                borderRadius: 12,
                marginBottom: 6,
                background: tint(j.color, 0.1),
                border: `1px solid ${tint(j.color, 0.32)}`,
                opacity: j.active ? 1 : 0.55,
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: j.color, flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', font: `600 13.5px ${fonts.sans}`, color: colors.ink }}>
                  {j.name}
                  {!j.active && <span style={{ color: colors.muted, fontWeight: 500 }}> · finished</span>}
                </span>
                <span style={{ display: 'block', font: `400 11.5px ${fonts.sans}`, color: colors.muted, marginTop: 1 }}>
                  {describeJob(j)}
                </span>
              </span>
              <span style={{ font: `600 11.5px ${fonts.sans}`, color: colors.accent }}>Edit</span>
            </button>
          ))}
          <button
            onClick={() => setEditingJob('new')}
            style={{ marginTop: 8, padding: '9px 16px', borderRadius: 20, background: colors.chipBg, color: colors.ink, font: `600 12.5px ${fonts.sans}` }}
          >
            + Add a job
          </button>
        </Card>
      )}

      {/* Today, if there's a shift on. The one card on this page you might
          actually tap during a working day. */}
      {work.myShiftToday && <TodayCard work={work} shift={work.myShiftToday} onOpen={() => setEditingShift(work.myShiftToday)} />}

      <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <Stat label="Earned so far" value={usd(work.earned.gross)} big />
        <Stat label="Still booked" value={usd(work.booked)} />
        <Stat label="This cheque lands on" value={usd(work.projected.gross + work.salary)} />
        <Stat
          label={work.projected.overtime > 0 ? `Hours · ${hoursLabel(work.projected.overtime)} overtime` : 'Hours this period'}
          value={hoursLabel(work.projected.hours) ?? '0h'}
        />
      </div>

      {work.earned.takeHome != null && (
        <Card style={{ padding: '14px 22px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ font: `400 13px ${fonts.sans}`, color: colors.muted }}>
            Roughly what reaches the account so far — an estimate you set, not a tax calculation.
          </span>
          <span style={{ font: `400 22px ${fonts.serif}`, color: colors.ink }}>{usd(work.earned.takeHome)}</span>
        </Card>
      )}

      {work.salary > 0 && (
        <Card style={{ padding: '14px 22px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ font: `400 13px ${fonts.sans}`, color: colors.muted }}>Salary for this period, which doesn’t move with the hours.</span>
          <span style={{ font: `400 22px ${fonts.serif}`, color: colors.ink }}>{usd(work.salary)}</span>
        </Card>
      )}

      {work.needsConfirming.length > 0 && (
        <Card style={{ padding: '16px 22px', marginBottom: 20, borderColor: tone.amber }}>
          <div style={{ font: `600 11px ${fonts.sans}`, color: tone.amberText, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 7 }}>
            Behind on the clock · {work.needsConfirming.length}
          </div>
          <div style={{ font: `400 12.5px/1.6 ${fonts.sans}`, color: colors.muted, marginBottom: 12 }}>
            These have already happened with nothing recorded, so they’re being counted at their booked hours. One tap if
            they went to plan.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {work.needsConfirming.slice(0, 6).map((s) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap' }}>
                <span style={{ font: `600 12px ${fonts.sans}`, color: colors.ink, minWidth: 92 }}>
                  {shortDay(parseDay(s.date))} {monthDay(parseDay(s.date))}
                </span>
                <span style={{ flex: 1, font: `400 12px ${fonts.sans}`, color: colors.muted, minWidth: 90 }}>
                  {timeRangeLabel(s.scheduledStart, s.scheduledEnd)}
                </span>
                <button
                  onClick={() => work.confirmAsScheduled(s)}
                  style={{ padding: '6px 12px', borderRadius: 18, background: colors.accent, color: colors.onAccent, font: `600 11.5px ${fonts.sans}` }}
                >
                  Worked as booked
                </button>
                <button
                  onClick={() => setEditingShift(s)}
                  style={{ padding: '6px 12px', borderRadius: 18, background: colors.chipBg, color: colors.muted3, font: `600 11.5px ${fonts.sans}` }}
                >
                  Not quite
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {work.byMember.length > 1 && (
        <Card style={{ padding: '18px 24px', marginBottom: 20 }}>
          {work.byMember.map((m, i) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '10px 0', borderTop: i > 0 ? `1px solid ${colors.divider}` : 'none' }}>
              <Avatar who={m.name} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: `600 13.5px ${fonts.sans}`, color: colors.ink }}>{m.name}</div>
                <div style={{ font: `400 12px ${fonts.sans}`, color: colors.muted, marginTop: 1 }}>
                  {hoursLabel(m.worked.hours) ?? '0h'} worked
                  {m.worked.overtime > 0 ? ` · ${hoursLabel(m.worked.overtime)} overtime` : ''}
                  {m.rate > 0 ? ` · ${usd(m.rate)}/h` : m.jobs.length === 0 ? ' · no job set' : ''}
                </div>
              </div>
              <div style={{ font: `600 14px ${fonts.sans}`, color: colors.ink, whiteSpace: 'nowrap' }}>{usd(m.worked.gross)}</div>
            </div>
          ))}
        </Card>
      )}

      <div style={{ font: `400 18px ${fonts.serif}`, color: colors.ink, marginBottom: 10 }}>
        Shifts
        <span style={{ font: `500 12px ${fonts.sans}`, color: colors.muted, marginLeft: 8 }}>{work.shifts.length}</span>
      </div>

      {work.shifts.length === 0 ? (
        <Card style={{ padding: '28px 24px' }}>
          <div style={{ font: `400 14px/1.6 ${fonts.sans}`, color: colors.muted }}>
            Nothing on the calendar for this period. Add a shift as a <strong style={{ color: colors.ink }}>Work</strong>{' '}
            event and it shows up here — set it to repeat and a whole rota is one entry.
          </div>
        </Card>
      ) : (
        <Card style={{ padding: '4px 20px 8px' }}>
          {work.shifts.map((s, i) => (
            <ShiftRow key={s.id} shift={s} first={i === 0} narrow={narrow} onClick={() => setEditingShift(s)} />
          ))}
        </Card>
      )}

      {editingShift && (
        <ShiftModal
          shift={editingShift}
          onClose={() => setEditingShift(null)}
          onClockIn={work.clockIn}
          onStartBreak={work.startBreak}
          onEndBreak={work.endBreak}
          onClockOut={work.clockOut}
          onSave={(fields) => work.saveActuals(editingShift, fields)}
          onClear={() => work.clearRecord(editingShift)}
        />
      )}

      {editingJob && (
        <JobModal
          job={editingJob === 'new' ? null : editingJob}
          onClose={() => setEditingJob(null)}
          onSave={(fields) => (editingJob === 'new' ? work.addJob(fields) : work.updateJob(editingJob.id, fields))}
          onDelete={work.removeJob}
          onRetire={work.retireJob}
        />
      )}
    </div>
  );
}

// The card you tap on the way in and on the way out.
function TodayCard({ work, shift, onOpen }) {
  const color = shift.job?.color ?? colors.accent;
  const running = shift.clockedIn;

  return (
    <Card
      style={{
        padding: '18px 22px',
        marginBottom: 20,
        background: tint(color, 0.11),
        borderColor: tint(color, 0.4),
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ font: `600 11px ${fonts.sans}`, color: colors.muted2, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>
            {running ? (shift.onBreak ? 'On a break' : 'On the clock') : 'Today'}
          </div>
          <div style={{ font: `400 21px ${fonts.serif}`, color: colors.ink }}>{shift.title}</div>
          <div style={{ font: `400 12.5px ${fonts.sans}`, color: colors.muted, marginTop: 3 }}>
            {running
              ? `In at ${timeLabel(shift.actualStart)} · ${hoursLabel(shift.hours)} so far${shift.breakMinutes > 0 ? ` · ${hoursLabel(shift.breakMinutes / 60)} break` : ''}`
              : shift.actualEnd
                ? `${timeRangeLabel(shift.actualStart, shift.actualEnd)} · ${hoursLabel(shift.hours)}`
                : `Booked ${timeRangeLabel(shift.scheduledStart, shift.scheduledEnd)} · ${hoursLabel(shift.scheduledHours)}`}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!shift.actualStart && (
            <button onClick={() => work.clockIn(shift)} style={primaryButton}>
              Clock in
            </button>
          )}
          {running && !shift.onBreak && (
            <>
              <button onClick={() => work.startBreak(shift)} style={quietButton}>
                Start break
              </button>
              <button onClick={() => work.clockOut(shift)} style={primaryButton}>
                Clock out
              </button>
            </>
          )}
          {running && shift.onBreak && (
            <button onClick={() => work.endBreak(shift)} style={primaryButton}>
              Back from break
            </button>
          )}
          <button onClick={onOpen} style={quietButton}>
            {shift.actualEnd ? 'Edit' : 'Details'}
          </button>
        </div>
      </div>
    </Card>
  );
}

function ShiftRow({ shift: s, first, narrow, onClick }) {
  const off = s.status && s.status !== 'worked';
  const variance = s.varianceHours;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        width: '100%',
        textAlign: 'left',
        padding: '13px 0',
        borderTop: first ? 'none' : `1px solid ${colors.divider}`,
        opacity: s.upcoming ? 0.62 : 1,
      }}
    >
      <div style={{ width: 46, flexShrink: 0 }}>
        <div style={{ font: `600 11px ${fonts.sans}`, color: colors.muted2, textTransform: 'uppercase' }}>
          {shortDay(parseDay(s.date))}
        </div>
        <div style={{ font: `500 12px ${fonts.sans}`, color: colors.faint }}>{monthDay(parseDay(s.date))}</div>
      </div>

      {s.job && <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: s.job.color, flexShrink: 0 }} />}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: `600 13.5px ${fonts.sans}`, color: colors.ink }}>
          {s.title}
          {off && <span style={{ color: colors.muted, fontWeight: 500 }}> · {statusMeta(s.status)[1]}</span>}
        </div>
        <div style={{ font: `400 12px ${fonts.sans}`, color: colors.muted, marginTop: 1 }}>
          {s.basis === 'worked' && !narrow ? (
            <>
              <span style={{ textDecoration: variance ? 'line-through' : 'none', opacity: variance ? 0.6 : 1 }}>
                {timeRangeLabel(s.scheduledStart, s.scheduledEnd)}
              </span>
              {variance ? <> → {timeRangeLabel(s.actualStart, s.actualEnd)}</> : null}
            </>
          ) : (
            timeRangeLabel(s.scheduledStart, s.scheduledEnd)
          )}
          {s.breakMinutes > 0 && ` · ${hoursLabel(s.breakMinutes / 60)} off`}
          {s.clockedIn && ' · on the clock'}
          {s.unconfirmed && ' · not confirmed'}
        </div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ font: `600 13.5px ${fonts.sans}`, color: colors.ink, whiteSpace: 'nowrap' }}>
          {hoursLabel(s.hours) ?? '—'}
        </div>
        {variance ? (
          <div style={{ font: `500 11px ${fonts.sans}`, color: variance > 0 ? '#5c7f3f' : tone.red, whiteSpace: 'nowrap' }}>
            {variance > 0 ? '+' : ''}
            {hoursLabel(variance)}
          </div>
        ) : (
          s.job?.hourly_rate > 0 && (
            <div style={{ font: `500 11px ${fonts.sans}`, color: colors.faint, whiteSpace: 'nowrap' }}>
              {usd(Math.round(s.hours * Number(s.job.hourly_rate) * 100) / 100)}
            </div>
          )
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------

const primaryButton = {
  padding: '9px 16px',
  borderRadius: 22,
  background: colors.accent,
  color: colors.onAccent,
  font: `600 13px ${fonts.sans}`,
  boxShadow: shadows.accent,
  whiteSpace: 'nowrap',
};

const quietButton = {
  padding: '9px 15px',
  borderRadius: 22,
  background: colors.chipBg,
  color: colors.muted3,
  font: `600 12.5px ${fonts.sans}`,
  whiteSpace: 'nowrap',
};

const periodWord = (p) =>
  p === 'weekly' ? 'paid weekly' : p === 'biweekly' ? 'paid every two weeks' : p === 'semimonthly' ? 'paid twice a month' : 'paid monthly';

function describeJob(j) {
  const bits = [];
  if (j.pay_kind === 'salary') bits.push(`${usd(Number(j.annual_salary))} a year`);
  else if (j.hourly_rate) bits.push(`${usd(Number(j.hourly_rate))}/h`);
  if (j.ot_weekly_hours) bits.push(`overtime over ${Number(j.ot_weekly_hours)}h`);
  if (j.break_minutes > 0) bits.push(`${j.break_minutes}m unpaid`);
  bits.push(periodWord(j.pay_period));
  return bits.join(' · ');
}

function Header({ title, subtitle, right }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
      <div>
        <div style={{ font: `400 30px ${fonts.serif}`, color: colors.ink }}>{title}</div>
        <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted, marginTop: 2 }}>{subtitle}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>{right}</div>
    </div>
  );
}

function Stat({ label, value, big }) {
  return (
    <Card style={{ padding: '16px 18px' }}>
      <div style={{ font: `400 ${big ? 27 : 22}px ${fonts.serif}`, color: big ? colors.accent : colors.ink }}>{value}</div>
      <div style={{ font: `500 11.5px ${fonts.sans}`, color: colors.muted, marginTop: 3 }}>{label}</div>
    </Card>
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
