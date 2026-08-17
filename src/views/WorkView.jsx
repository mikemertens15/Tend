import { useState } from 'react';
import { colors, fonts, shadows } from '../theme';
import { Card, Avatar } from '../components/ui';
import { useIsNarrow } from '../useMediaQuery';
import { useHousehold } from '../household/HouseholdProvider';
import { useWork, usd, rateFor } from '../data/useWork';
import { parseDay, monthDay, shortDay } from '../dates';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// What the month has earned. Small on purpose — the calendar already holds the
// shifts, so this is a read-out rather than another place to enter things.
export function WorkView({ navigate }) {
  const narrow = useIsNarrow();
  const { members, settings, saveSettings } = useHousehold();
  const work = useWork();
  const [editingRates, setEditingRates] = useState(false);

  const monthName = MONTHS[parseDay(work.monthFrom).getMonth()];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <div style={{ font: `400 30px ${fonts.serif}`, color: colors.ink }}>Earned</div>
          <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted, marginTop: 2 }}>
            {monthName}, from the shifts on your calendar.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => setEditingRates((v) => !v)}
            style={{ padding: '9px 15px', borderRadius: 22, background: colors.chipBg, color: colors.muted3, font: `600 12.5px ${fonts.sans}` }}
          >
            {editingRates ? 'Done' : 'Hourly rates'}
          </button>
          <button
            onClick={() => navigate('calendar')}
            style={{ padding: '9px 16px', borderRadius: 22, background: colors.accent, color: colors.onAccent, font: `600 13px ${fonts.sans}`, boxShadow: shadows.accent }}
          >
            + Add a shift
          </button>
        </div>
      </div>

      {editingRates && <Rates members={members} settings={settings} saveSettings={saveSettings} />}

      {!work.configured && !editingRates ? (
        <Card style={{ padding: '36px 26px', textAlign: 'center' }}>
          <div style={{ font: `400 15px/1.6 ${fonts.sans}`, color: colors.muted, maxWidth: 460, margin: '0 auto' }}>
            Set an hourly rate, then put your shifts on the calendar as <strong style={{ color: colors.ink }}>Work</strong> with
            a start and an end. Tend counts the hours and does the rest — no bank, no receipts, nothing to import.
          </div>
          <button
            onClick={() => setEditingRates(true)}
            style={{ marginTop: 18, padding: '10px 18px', borderRadius: 22, background: colors.accent, color: colors.onAccent, font: `600 13px ${fonts.sans}`, boxShadow: shadows.accent }}
          >
            Set a rate
          </button>
        </Card>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
            <Stat label="Earned so far" value={usd(work.earned)} big />
            <Stat label="Still booked" value={usd(work.scheduled)} />
            <Stat label="Month lands on" value={usd(work.projected)} />
            <Stat label="Hours this week" value={String(work.hoursThisWeek)} />
          </div>

          {work.takeHome != null && (
            <Card style={{ padding: '14px 22px', marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ font: `400 13px ${fonts.sans}`, color: colors.muted }}>
                Roughly what lands in the account, at {work.takeHomePct}% — an estimate you set, not a tax calculation.
              </span>
              <span style={{ font: `400 22px ${fonts.serif}`, color: colors.ink }}>{usd(work.takeHome)}</span>
            </Card>
          )}

          {work.byMember.length > 1 && (
            <Card style={{ padding: '18px 24px', marginBottom: 22 }}>
              {work.byMember.map((m, i) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '10px 0', borderTop: i > 0 ? `1px solid ${colors.divider}` : 'none' }}>
                  <Avatar who={m.name} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: `600 13.5px ${fonts.sans}`, color: colors.ink }}>{m.name}</div>
                    <div style={{ font: `400 12px ${fonts.sans}`, color: colors.muted, marginTop: 1 }}>
                      {m.hours} h{m.rate > 0 ? ` · ${usd(m.rate)}/h` : ' · no rate set'}
                    </div>
                  </div>
                  <div style={{ font: `600 14px ${fonts.sans}`, color: colors.ink, whiteSpace: 'nowrap' }}>{usd(m.earned)}</div>
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
              <div style={{ font: `400 14px ${fonts.sans}`, color: colors.muted }}>
                Nothing on the calendar this month yet.
              </div>
            </Card>
          ) : (
            <Card style={{ padding: '4px 22px 8px' }}>
              {work.shifts.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 0', borderTop: i > 0 ? `1px solid ${colors.divider}` : 'none', opacity: s.worked ? 1 : 0.6 }}>
                  <div style={{ width: 46, flexShrink: 0 }}>
                    <div style={{ font: `600 11px ${fonts.sans}`, color: colors.muted2, textTransform: 'uppercase' }}>
                      {shortDay(parseDay(s.date))}
                    </div>
                    <div style={{ font: `500 12px ${fonts.sans}`, color: colors.faint }}>{monthDay(parseDay(s.date))}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: `600 13.5px ${fonts.sans}`, color: colors.ink }}>{s.title}</div>
                    <div style={{ font: `400 12px ${fonts.sans}`, color: colors.muted, marginTop: 1 }}>
                      {[s.who, s.timeRange, s.hours ? `${s.hours} h` : 'no end time'].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div style={{ font: `600 13.5px ${fonts.sans}`, color: s.pay > 0 ? colors.ink : colors.faint, whiteSpace: 'nowrap' }}>
                    {s.pay > 0 ? usd(s.pay) : '—'}
                  </div>
                </div>
              ))}
            </Card>
          )}
        </>
      )}
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

// Rates are per member and live in household settings, so there's no migration
// and no per-person account setting to keep in sync.
function Rates({ members, settings, saveSettings }) {
  const pct = settings.takeHomePct ?? '';
  return (
    <Card style={{ padding: '20px 24px', marginBottom: 22 }}>
      <div style={{ font: `600 12px ${fonts.sans}`, color: colors.muted2, marginBottom: 10 }}>Hourly rate</div>
      {members.map((m) => (
        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <Avatar who={m.name} size={30} />
          <div style={{ flex: 1, font: `600 13.5px ${fonts.sans}`, color: colors.ink }}>{m.name}</div>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: 11, font: `500 13px ${fonts.sans}`, color: colors.muted }}>$</span>
            <input
              type="number"
              min="0"
              step="0.25"
              inputMode="decimal"
              value={rateFor(settings, m.id) || ''}
              onChange={(e) =>
                saveSettings({ rates: { ...(settings.rates ?? {}), [m.id]: e.target.value } })
              }
              placeholder="0.00"
              style={{ width: 120, border: `1px solid ${colors.inputBorder}`, background: colors.inputBg, borderRadius: 10, padding: '9px 12px 9px 24px', font: `500 13.5px ${fonts.sans}`, color: colors.ink, outline: 'none' }}
            />
          </div>
        </div>
      ))}

      <div style={{ borderTop: `1px solid ${colors.divider}`, marginTop: 14, paddingTop: 14 }}>
        <div style={{ font: `600 12px ${fonts.sans}`, color: colors.muted2, marginBottom: 6 }}>Take-home estimate</div>
        <div style={{ font: `400 12px/1.5 ${fonts.sans}`, color: colors.muted, marginBottom: 10 }}>
          Roughly what percentage of gross actually reaches your account. One number you set from a real payslip —
          Tend doesn't model tax, and pretending to would be wrong in ways that matter. Leave it blank to see gross only.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="number"
            min="1"
            max="100"
            inputMode="numeric"
            value={pct}
            onChange={(e) => saveSettings({ takeHomePct: e.target.value === '' ? null : Number(e.target.value) })}
            placeholder="e.g. 78"
            style={{ width: 120, border: `1px solid ${colors.inputBorder}`, background: colors.inputBg, borderRadius: 10, padding: '9px 12px', font: `500 13.5px ${fonts.sans}`, color: colors.ink, outline: 'none' }}
          />
          <span style={{ font: `500 13px ${fonts.sans}`, color: colors.muted }}>% of gross</span>
        </div>
      </div>
    </Card>
  );
}

