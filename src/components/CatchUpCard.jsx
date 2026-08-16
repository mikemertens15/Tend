import { colors, fonts, shadows } from '../theme';
import { Card } from './ui';
import { catchUpCopy } from '../data/catchup';

// The welcome back. Shown above everything else on the dashboard when you've
// been away a few days and something slipped while you were gone.
//
// The whole point is that it doesn't look like the rest of the overdue UI:
// no red, no "4d late" pills, no count of your failures. It states what
// happened, offers the one action that clears most of it, and shows at most
// three things that genuinely still want you. What's underneath is unchanged —
// this is a door back in, not a different set of facts.

// Enough to be honest about what's waiting, few enough to still feel finishable.
const SHOW_MAX = 3;

export function CatchUpCard({ catchUp, onRoll, onDismiss, navigate }) {
  const copy = catchUpCopy(catchUp);
  const shown = catchUp.standing.slice(0, SHOW_MAX);
  const more = catchUp.standing.length - shown.length;

  return (
    <Card style={{ padding: '22px 26px', marginBottom: 22, borderColor: colors.selected }}>
      <div
        style={{
          font: `600 11px ${fonts.sans}`,
          color: colors.faint,
          letterSpacing: '.06em',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        Welcome back
      </div>

      <div style={{ font: `400 22px ${fonts.serif}`, color: colors.ink }}>{copy.headline}</div>
      <div style={{ font: `400 13.5px/1.5 ${fonts.sans}`, color: colors.muted, marginTop: 6, maxWidth: 560 }}>
        {copy.body}
      </div>

      {shown.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {shown.map((t, i) => (
            <button
              key={t.id}
              onClick={() => navigate('chores')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                textAlign: 'left',
                padding: '11px 0',
                borderTop: i > 0 ? `1px solid ${colors.divider}` : 'none',
              }}
            >
              <div style={{ flex: 1, minWidth: 0, font: `600 14px ${fonts.sans}`, color: colors.ink }}>
                {t.title}
              </div>
              {/* Waiting, not late. Same number, no accusation. */}
              <span
                style={{
                  font: `600 11px ${fonts.sans}`,
                  color: colors.muted2,
                  background: colors.chipBg,
                  padding: '4px 10px',
                  borderRadius: 20,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                waiting {-t.daysLeft}d
              </span>
            </button>
          ))}
          {more > 0 && (
            <button
              onClick={() => navigate('chores')}
              style={{
                font: `500 12.5px ${fonts.sans}`,
                color: colors.accent,
                paddingTop: 12,
                borderTop: `1px solid ${colors.divider}`,
                width: '100%',
                textAlign: 'left',
              }}
            >
              and {more} more
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18, flexWrap: 'wrap' }}>
        {copy.rollLabel && (
          <button
            onClick={onRoll}
            style={{
              padding: '10px 18px',
              borderRadius: 22,
              background: colors.accent,
              color: colors.onAccent,
              font: `600 13px ${fonts.sans}`,
              boxShadow: shadows.accent,
            }}
          >
            {copy.rollLabel}
          </button>
        )}
        <button onClick={onDismiss} style={{ font: `500 12.5px ${fonts.sans}`, color: colors.muted2 }}>
          Leave it as it is
        </button>
      </div>
    </Card>
  );
}
