import { colors, tone, fonts } from '../theme';
import { useWidgetAgenda } from '../data/useWidget';
import { parseDay, monthDay, shortDay, timeLabel, timeRangeLabel, hoursLabel } from '../dates';
import { tint } from '../data/calendars';

// The widget, rendered on the web.
//
// This page exists for two reasons and neither of them is that anyone will use
// it daily. It proves the endpoint works — one RPC call, one token, no session —
// and it's the reference the SwiftUI version gets compared against, so the
// native widget has something to look like rather than being designed twice.
//
// It renders outside the auth gate, like the sitter page, because a widget on a
// phone home screen has no session either.

export function WidgetView({ token }) {
  const { payload, loading } = useWidgetAgenda(token, 3);

  if (loading) return <Frame><Muted>Loading…</Muted></Frame>;
  if (!payload) {
    return (
      <Frame>
        <Muted>
          This link isn’t live. It may have been revoked, or it may have expired — make a new one from the calendar.
        </Muted>
      </Frame>
    );
  }

  const days = payload.days ?? [];
  const work = payload.work;

  return (
    <Frame>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
        <div style={{ font: `400 22px ${fonts.serif}`, color: colors.ink }}>{payload.member}’s day</div>
        <div style={{ font: `500 11px ${fonts.sans}`, color: colors.faint }}>{payload.household}</div>
      </div>

      {work && (
        <div
          style={{
            background: work.clockedIn ? tint('#5c7f3f', 0.16) : colors.inputBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: 12,
            padding: '10px 13px',
            marginBottom: 14,
          }}
        >
          <div style={{ font: `600 10.5px ${fonts.sans}`, color: colors.muted2, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            {work.clockedIn ? (work.onBreak ? 'On a break' : 'On the clock') : 'Work today'}
          </div>
          <div style={{ font: `600 13.5px ${fonts.sans}`, color: colors.ink, marginTop: 3 }}>
            {work.title}
            {work.job ? ` · ${work.job}` : ''}
          </div>
          <div style={{ font: `400 11.5px ${fonts.sans}`, color: colors.muted, marginTop: 1 }}>
            {work.clockedIn
              ? `In at ${timeLabel(work.actualStart)}${work.breakMinutes ? ` · ${hoursLabel(work.breakMinutes / 60)} break` : ''}`
              : (timeRangeLabel(work.scheduledStart, work.scheduledEnd) ?? '')}
          </div>
        </div>
      )}

      {days.map((day) => {
        const d = parseDay(day.date);
        const isToday = day.date === payload.today;
        const events = day.events ?? [];
        return (
          <div key={day.date} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 7 }}>
              <span style={{ font: `600 10.5px ${fonts.sans}`, color: isToday ? colors.accent : colors.muted2, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                {isToday ? 'Today' : shortDay(d)}
              </span>
              <span style={{ font: `500 11px ${fonts.sans}`, color: colors.faint }}>{monthDay(d)}</span>
            </div>

            {events.length === 0 ? (
              <div style={{ font: `400 12px ${fonts.sans}`, color: colors.faint, paddingLeft: 2 }}>Nothing on.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {events.map((e, i) => (
                  <div key={`${day.date}:${i}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ width: 46, flexShrink: 0, font: `600 10.5px ${fonts.sans}`, color: colors.muted, paddingTop: 2 }}>
                      {e.allDay ? (e.continuation ? '·' : 'all day') : (timeLabel(e.startTime) ?? '').replace(' ', '')}
                    </span>
                    <span style={{ width: 3, alignSelf: 'stretch', minHeight: 15, borderRadius: 2, background: e.color ?? colors.accent, flexShrink: 0 }} />
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ display: 'block', font: `600 12.5px ${fonts.sans}`, color: colors.ink }}>{e.title}</span>
                      {(e.location || e.who) && (
                        <span style={{ display: 'block', font: `400 11px ${fonts.sans}`, color: colors.muted }}>
                          {[e.location, e.who].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {payload.openChores > 0 && (
        <div style={{ font: `500 11.5px ${fonts.sans}`, color: tone.amberText, borderTop: `1px solid ${colors.divider}`, paddingTop: 10 }}>
          {payload.openChores} {payload.openChores === 1 ? 'chore' : 'chores'} waiting
        </div>
      )}
    </Frame>
  );
}

// Roughly the proportions of a large iOS widget, so what's on this page is what
// will fit on that one.
function Frame({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: '22px 18px', display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          background: colors.card,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 22,
          padding: '20px 20px 22px',
          alignSelf: 'flex-start',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Muted({ children }) {
  return <div style={{ font: `400 13.5px/1.6 ${fonts.sans}`, color: colors.muted }}>{children}</div>;
}
